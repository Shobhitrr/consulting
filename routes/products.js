const db = require('../db');

module.exports = function(path, ctx) {
  const { method, query, body, sendJson } = ctx;

  // List products with filters
  if (path === '/' && method === 'GET') {
    const filter = {};
    if (query.category) filter.category = query.category;
    if (query.collection) filter.collection = query.collection;
    if (query.search) filter.name_like = query.search;
    let products = db.findAll('products', filter);
    if (query.low_stock === 'true') products = products.filter(p => p.stock <= 5);
    if (query.today === 'true') {
      const today = new Date().toISOString().slice(0, 10);
      products = products.filter(p => p.created_at && p.created_at.startsWith(today));
    }
    return sendJson(products);
  }

  // Get single product
  const idMatch = path.match(/^\/(\d+)$/);
  if (idMatch && method === 'GET') {
    const product = db.findById('products', parseInt(idMatch[1]));
    if (!product) return sendJson({ error: 'Not found' }, 404);
    return sendJson(product);
  }

  // Create product
  if (path === '/' && method === 'POST') {
    const sku = body.sku || generateSKU(body.category, body.name);
    const product = db.insert('products', {
      name: body.name,
      sku,
      category: body.category || '',
      collection: body.collection || '',
      wholesale_price: parseFloat(body.wholesale_price) || 0,
      retail_price: parseFloat(body.retail_price) || 0,
      stock: parseInt(body.stock) || 0,
      material: body.material || '',
      color: body.color || '',
      weight: body.weight || '',
      description: body.description || '',
      tags: body.tags || '',
      images: body.images || [],
      status: body.status || 'active'
    });
    return sendJson(product, 201);
  }

  // Bulk create
  if (path === '/bulk' && method === 'POST') {
    const { products } = body;
    if (!Array.isArray(products)) return sendJson({ error: 'Provide products array' }, 400);
    let inserted = 0;
    products.forEach(p => {
      if (p.name) {
        p.sku = p.sku || generateSKU(p.category, p.name);
        p.images = p.images || [];
        p.status = p.status || 'active';
        p.wholesale_price = parseFloat(p.wholesale_price) || 0;
        p.retail_price = parseFloat(p.retail_price) || 0;
        p.stock = parseInt(p.stock) || 0;
        db.insert('products', p);
        inserted++;
      }
    });
    return sendJson({ success: true, inserted });
  }

  // Update product
  if (idMatch && method === 'PATCH') {
    const updated = db.update('products', parseInt(idMatch[1]), body);
    return sendJson(updated || { error: 'Not found' });
  }

  // Delete product
  if (idMatch && method === 'DELETE') {
    db.remove('products', parseInt(idMatch[1]));
    return sendJson({ success: true });
  }

  // Bulk delete
  if (path === '/bulk-delete' && method === 'POST') {
    const { ids } = body;
    if (!Array.isArray(ids)) return sendJson({ error: 'Provide ids array' }, 400);
    ids.forEach(id => db.remove('products', id));
    return sendJson({ success: true, deleted: ids.length });
  }

  sendJson({ error: 'Not found' }, 404);
};

function generateSKU(category, name) {
  const prefix = (category || 'PRD').substring(0, 3).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}
