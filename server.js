const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

const leadsRouter = require('./routes/leads');
const crmRouter = require('./routes/crm');
const aiRouter = require('./routes/ai-followup');
const marketRouter = require('./routes/market');
const db = require('./db');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await parseBody(req) : {};
  const ctx = { method, query, body, sendJson: (d, s) => sendJson(res, d, s) };

  // API Routes
  let sub;
  if ((sub = route(pathname, '/api/leads')) !== null) return leadsRouter(sub, ctx);
  if ((sub = route(pathname, '/api/crm')) !== null) return crmRouter(sub, ctx);
  if ((sub = route(pathname, '/api/ai')) !== null) return aiRouter(sub, ctx);
  if ((sub = route(pathname, '/api/market')) !== null) return marketRouter(sub, ctx);

  if (pathname === '/api/seed' && method === 'POST') {
    db.reset();
    // Seed leads
    [
      { name:'John Smith', email:'john@email.com', phone:'555-0101', source:'website', status:'qualified', budget:'750000', property_interest:'Residential', score:65 },
      { name:'Sarah Johnson', email:'sarah@email.com', phone:'555-0102', source:'referral', status:'new', budget:'1200000', property_interest:'Commercial', score:85 },
      { name:'Mike Brown', email:'mike@email.com', phone:'555-0103', source:'social_media', status:'contacted', budget:'500000', property_interest:'Residential', score:45 },
      { name:'Emily Davis', email:'emily@email.com', phone:'555-0104', source:'website', status:'new', budget:'2000000', property_interest:'Investment', score:90 },
      { name:'Robert Wilson', email:'robert@email.com', phone:'555-0105', source:'referral', status:'qualified', budget:'800000', property_interest:'Commercial', score:70 },
    ].forEach(l => db.insert('leads', l));

    // Seed contacts
    [
      { lead_id:1, name:'John Smith', email:'john@email.com', phone:'555-0101', company:'Smith Corp', role:'CEO', stage:'negotiation', deal_value:750000 },
      { lead_id:2, name:'Sarah Johnson', email:'sarah@email.com', phone:'555-0102', company:'SJ Investments', role:'Investor', stage:'proposal', deal_value:1200000 },
      { lead_id:5, name:'Robert Wilson', email:'robert@email.com', phone:'555-0105', company:'Wilson Group', role:'Director', stage:'qualification', deal_value:800000 },
    ].forEach(c => db.insert('contacts', c));

    // Seed properties
    [
      { title:'Downtown Luxury Condo', type:'residential', location:'Manhattan, NY', price:1250000, size_sqft:1800, bedrooms:3, status:'available', roi_estimate:7.2, market_trend:'rising' },
      { title:'Commercial Office Space', type:'commercial', location:'Austin, TX', price:2500000, size_sqft:5000, bedrooms:null, status:'available', roi_estimate:9.1, market_trend:'rising' },
      { title:'Suburban Family Home', type:'residential', location:'Denver, CO', price:650000, size_sqft:2400, bedrooms:4, status:'available', roi_estimate:5.5, market_trend:'stable' },
      { title:'Beachfront Villa', type:'residential', location:'Miami, FL', price:3200000, size_sqft:3500, bedrooms:5, status:'available', roi_estimate:8.3, market_trend:'rising' },
      { title:'Industrial Warehouse', type:'commercial', location:'Dallas, TX', price:1800000, size_sqft:12000, bedrooms:null, status:'available', roi_estimate:10.2, market_trend:'stable' },
      { title:'Studio Apartment', type:'residential', location:'Seattle, WA', price:420000, size_sqft:650, bedrooms:1, status:'sold', roi_estimate:4.8, market_trend:'declining' },
    ].forEach(p => db.insert('properties', p));

    // Seed deals
    db.insert('deals', { contact_id:1, property_id:1, title:'Smith Condo Purchase', value:1250000, stage:'negotiation', probability:70, expected_close:'2026-07-15' });
    db.insert('deals', { contact_id:2, property_id:2, title:'SJ Office Investment', value:2500000, stage:'proposal', probability:50, expected_close:'2026-08-01' });

    return sendJson(res, { message: 'Sample data seeded successfully' });
  }

  // Static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) filePath = path.join(__dirname, 'public', 'index.html');
  const ext = path.extname(filePath);
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/html' });
    res.end(content);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Real Estate Consulting Platform running on http://localhost:${PORT}`);
});
