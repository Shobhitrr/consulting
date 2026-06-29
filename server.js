const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const collectionsRouter = require('./routes/collections');
const broadcastsRouter = require('./routes/broadcasts');
const customersRouter = require('./routes/customers');
const analyticsRouter = require('./routes/analytics');
const db = require('./db');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

// Image storage directory
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => { chunks.push(chunk); size += chunk.length; if (size > 50 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        try { resolve(JSON.parse(buffer.toString())); } catch { resolve({}); }
      } else if (contentType.includes('multipart/form-data')) {
        resolve(parseMultipart(buffer, contentType));
      } else {
        try { resolve(JSON.parse(buffer.toString())); } catch { resolve({}); }
      }
    });
  });
}

function parseMultipart(buffer, contentType) {
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return { files: [] };

  const parts = [];
  const raw = buffer.toString('binary');
  const sections = raw.split('--' + boundary).slice(1, -1);

  sections.forEach(section => {
    const headerEnd = section.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const headers = section.substring(0, headerEnd);
    const content = section.substring(headerEnd + 4, section.length - 2);

    const nameMatch = headers.match(/name="([^"]+)"/);
    const fileMatch = headers.match(/filename="([^"]+)"/);

    if (fileMatch && nameMatch) {
      const ext = path.extname(fileMatch[1]).toLowerCase() || '.jpg';
      const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, content, 'binary');
      parts.push({ field: nameMatch[1], filename, url: `/uploads/${filename}` });
    }
  });

  return { files: parts };
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function route(pathname, prefix) {
  if (pathname.startsWith(prefix)) return pathname.slice(prefix.length) || '/';
  return null;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;
  const query = parsed.query;

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await parseBody(req) : {};
  const ctx = { method, query, body, sendJson: (d, s) => sendJson(res, d, s) };

  // API Routes
  let sub;
  if ((sub = route(pathname, '/api/products')) !== null) return productsRouter(sub, ctx);
  if ((sub = route(pathname, '/api/categories')) !== null) return categoriesRouter(sub, ctx);
  if ((sub = route(pathname, '/api/collections')) !== null) return collectionsRouter(sub, ctx);
  if ((sub = route(pathname, '/api/broadcasts')) !== null) return broadcastsRouter(sub, ctx);
  if ((sub = route(pathname, '/api/customers')) !== null) return customersRouter(sub, ctx);
  if ((sub = route(pathname, '/api/analytics')) !== null) return analyticsRouter(sub, ctx);

  // Upload images endpoint
  if (pathname === '/api/upload' && method === 'POST') {
    if (body.files && body.files.length > 0) {
      return sendJson(res, { success: true, files: body.files });
    }
    return sendJson(res, { error: 'No files uploaded' }, 400);
  }

  // Settings
  if (pathname === '/api/settings' && method === 'GET') {
    return sendJson(res, db.getSettings());
  }
  if (pathname === '/api/settings' && method === 'PATCH') {
    return sendJson(res, db.updateSettings(body));
  }

  // Seed demo data
  if (pathname === '/api/seed' && method === 'POST') {
    db.reset();
    seedDemoData();
    return sendJson(res, { message: 'Demo data loaded!' });
  }

  // Static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) filePath = path.join(__dirname, 'public', 'index.html');
  const ext = path.extname(filePath);
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

function seedDemoData() {
  // Collections
  db.insert('collections', { name: 'Summer Collection 2026', description: 'Trendy pieces for summer', status: 'active' });
  db.insert('collections', { name: 'Bridal Edit', description: 'Wedding & bridal jewellery', status: 'active' });
  db.insert('collections', { name: 'Daily Wear Essentials', description: 'Affordable everyday pieces', status: 'active' });
  db.insert('collections', { name: 'Festive Special', description: 'Diwali & festival collection', status: 'active' });

  // Products
  const products = [
    { name: 'Kundan Pearl Necklace Set', category: 'Necklaces', collection: 'Bridal Edit', wholesale_price: 450, retail_price: 999, stock: 25, material: 'Alloy + Kundan', color: 'Gold/White', weight: '85g', tags: 'kundan,bridal,pearl,necklace' },
    { name: 'Temple Gold Jhumka', category: 'Earrings', collection: 'Festive Special', wholesale_price: 180, retail_price: 449, stock: 50, material: 'Brass Gold Plated', color: 'Antique Gold', weight: '28g', tags: 'jhumka,temple,traditional' },
    { name: 'Crystal Bangle Set (6pc)', category: 'Bangles', collection: 'Daily Wear Essentials', wholesale_price: 220, retail_price: 549, stock: 40, material: 'Crystal + Metal', color: 'Multi-Color', weight: '120g', tags: 'bangles,crystal,set' },
    { name: 'Oxidized Silver Cuff Bracelet', category: 'Bracelets', collection: 'Summer Collection 2026', wholesale_price: 150, retail_price: 399, stock: 35, material: 'Oxidized Silver', color: 'Silver', weight: '45g', tags: 'oxidized,cuff,boho' },
    { name: 'AD Stone Cocktail Ring', category: 'Rings', collection: 'Summer Collection 2026', wholesale_price: 120, retail_price: 299, stock: 60, material: 'AD Stone + Alloy', color: 'Rose Gold', weight: '12g', tags: 'ring,AD,cocktail,party' },
    { name: 'Gold Plated Mangalsutra', category: 'Mangalsutra', collection: 'Bridal Edit', wholesale_price: 350, retail_price: 849, stock: 20, material: '18K Gold Plated', color: 'Gold/Black', weight: '35g', tags: 'mangalsutra,bridal,gold' },
    { name: 'Matte Lipstick - Rose Berry', category: 'Lipsticks', collection: 'Summer Collection 2026', wholesale_price: 85, retail_price: 249, stock: 100, material: 'Cruelty-free formula', color: 'Rose Berry', weight: '4.5g', tags: 'lipstick,matte,rose' },
    { name: 'HD Foundation - Natural Beige', category: 'Foundations', collection: 'Daily Wear Essentials', wholesale_price: 180, retail_price: 499, stock: 45, material: 'Water-based formula', color: 'Natural Beige', weight: '30ml', tags: 'foundation,HD,natural' },
    { name: 'Vitamin C Serum', category: 'Skin Care', collection: 'Daily Wear Essentials', wholesale_price: 200, retail_price: 599, stock: 30, material: '20% Vitamin C', color: 'Clear', weight: '30ml', tags: 'serum,vitaminC,glow' },
    { name: 'Argan Oil Hair Mask', category: 'Hair Care', collection: 'Daily Wear Essentials', wholesale_price: 160, retail_price: 449, stock: 25, material: 'Argan Oil + Keratin', color: 'Amber', weight: '200ml', tags: 'hairmask,argan,repair' },
    { name: 'Layered Coin Necklace', category: 'Necklaces', collection: 'Summer Collection 2026', wholesale_price: 280, retail_price: 699, stock: 30, material: 'Stainless Steel', color: 'Gold', weight: '32g', tags: 'layered,coin,trendy,modern' },
    { name: 'Pearl Drop Earrings', category: 'Earrings', collection: 'Daily Wear Essentials', wholesale_price: 95, retail_price: 249, stock: 80, material: 'Faux Pearl + Alloy', color: 'White/Gold', weight: '15g', tags: 'pearl,drop,elegant,office' },
    { name: 'Silk Thread Bangles (12pc)', category: 'Bangles', collection: 'Festive Special', wholesale_price: 320, retail_price: 749, stock: 15, material: 'Silk Thread + Kundan', color: 'Red/Green/Gold', weight: '180g', tags: 'silk,thread,festival,set' },
    { name: 'Matte Lipstick - Nude Spice', category: 'Lipsticks', collection: 'Daily Wear Essentials', wholesale_price: 85, retail_price: 249, stock: 75, material: 'Cruelty-free formula', color: 'Nude Spice', weight: '4.5g', tags: 'lipstick,matte,nude,daily' },
    { name: 'Choker Necklace - Meenakari', category: 'Necklaces', collection: 'Festive Special', wholesale_price: 520, retail_price: 1299, stock: 12, material: 'Brass + Meenakari', color: 'Multi-Color', weight: '95g', tags: 'choker,meenakari,rajasthani,heavy' },
    { name: 'Diamond-Look Studs', category: 'Earrings', collection: 'Daily Wear Essentials', wholesale_price: 60, retail_price: 149, stock: 150, material: 'CZ Stone + Silver', color: 'Silver/Clear', weight: '5g', tags: 'studs,diamond,CZ,daily,office' },
  ];

  products.forEach(p => {
    p.sku = generateSKU(p.category, p.name);
    p.images = [];
    p.status = 'active';
    p.description = '';
    db.insert('products', p);
  });

  // Customers
  db.insert('customers', { name: 'Rahul Fashion Store', phone: '+91-9876500001', city: 'Meerut', type: 'retailer', total_orders: 12, total_value: 45000 });
  db.insert('customers', { name: 'Priya Cosmetics', phone: '+91-9812300002', city: 'Delhi', type: 'retailer', total_orders: 8, total_value: 32000 });
  db.insert('customers', { name: 'Shree Jewellers', phone: '+91-9410100003', city: 'Noida', type: 'wholesaler', total_orders: 25, total_value: 180000 });
  db.insert('customers', { name: 'Beauty Point', phone: '+91-9719800004', city: 'Ghaziabad', type: 'retailer', total_orders: 5, total_value: 15000 });

  // Broadcasts
  db.insert('broadcasts', { title: 'Summer Collection Launch', platform: 'whatsapp', product_ids: [1, 2, 3], caption: 'New summer arrivals!', status: 'sent', sent_at: new Date(Date.now() - 86400000).toISOString() });
  db.insert('broadcasts', { title: 'Festive Sale Alert', platform: 'instagram', product_ids: [6, 13, 15], caption: 'Festival ready!', hashtags: '#festive #jewellery', status: 'sent', sent_at: new Date(Date.now() - 172800000).toISOString() });
}

function generateSKU(category, name) {
  const prefix = (category || 'PRD').substring(0, 3).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

server.listen(PORT, () => {
  console.log(`GlamStore Wholesale Platform running on http://localhost:${PORT}`);
});
