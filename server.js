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
    // Seed leads - Meerut/NCR India
    [
      { name:'Rajesh Sharma', email:'rajesh.sharma@gmail.com', phone:'+91-9876543210', source:'website', status:'qualified', budget:'4500000', property_interest:'Residential', score:65 },
      { name:'Priya Agarwal', email:'priya.agarwal@outlook.com', phone:'+91-9812345678', source:'referral', status:'new', budget:'12000000', property_interest:'Commercial', score:85 },
      { name:'Amit Gupta', email:'amit.gupta@yahoo.com', phone:'+91-9897654321', source:'social_media', status:'contacted', budget:'3500000', property_interest:'Residential', score:45 },
      { name:'Neha Verma', email:'neha.verma@gmail.com', phone:'+91-9410987654', source:'website', status:'new', budget:'25000000', property_interest:'Investment', score:90 },
      { name:'Vikram Singh', email:'vikram.singh@hotmail.com', phone:'+91-9837123456', source:'referral', status:'qualified', budget:'8000000', property_interest:'Commercial', score:70 },
      { name:'Sunita Devi', email:'sunita.d@gmail.com', phone:'+91-9719876543', source:'cold_call', status:'new', budget:'2800000', property_interest:'Residential', score:55 },
      { name:'Mohit Tyagi', email:'mohit.tyagi@gmail.com', phone:'+91-9456789012', source:'referral', status:'contacted', budget:'6000000', property_interest:'Investment', score:72 },
      { name:'Deepak Chauhan', email:'deepak.c@outlook.com', phone:'+91-9358765432', source:'website', status:'qualified', budget:'15000000', property_interest:'Commercial', score:80 },
    ].forEach(l => db.insert('leads', l));

    // Seed contacts - Meerut/NCR
    [
      { lead_id:1, name:'Rajesh Sharma', email:'rajesh.sharma@gmail.com', phone:'+91-9876543210', company:'Sharma Builders', role:'Director', stage:'negotiation', deal_value:4500000 },
      { lead_id:2, name:'Priya Agarwal', email:'priya.agarwal@outlook.com', phone:'+91-9812345678', company:'Agarwal Investments Pvt Ltd', role:'Managing Partner', stage:'proposal', deal_value:12000000 },
      { lead_id:5, name:'Vikram Singh', email:'vikram.singh@hotmail.com', phone:'+91-9837123456', company:'Singh & Associates', role:'CEO', stage:'qualification', deal_value:8000000 },
      { lead_id:4, name:'Neha Verma', email:'neha.verma@gmail.com', phone:'+91-9410987654', company:'Verma Capital Group', role:'Investor', stage:'proposal', deal_value:25000000 },
      { lead_id:8, name:'Deepak Chauhan', email:'deepak.c@outlook.com', phone:'+91-9358765432', company:'NCR Developers', role:'Founder', stage:'negotiation', deal_value:15000000 },
    ].forEach(c => db.insert('contacts', c));

    // Seed properties - Meerut & NCR
    [
      { title:'3 BHK Luxury Flat - Pallavpuram', type:'residential', location:'Pallavpuram, Meerut', price:4500000, size_sqft:1450, bedrooms:3, status:'available', roi_estimate:7.5, market_trend:'rising' },
      { title:'Commercial Plaza - Begumpul', type:'commercial', location:'Begumpul, Meerut', price:18000000, size_sqft:6000, bedrooms:null, status:'available', roi_estimate:9.8, market_trend:'rising' },
      { title:'2 BHK Apartment - Shastri Nagar', type:'residential', location:'Shastri Nagar, Meerut', price:2800000, size_sqft:1100, bedrooms:2, status:'available', roi_estimate:6.2, market_trend:'stable' },
      { title:'Farmhouse - Delhi Road', type:'residential', location:'Delhi Road, Meerut', price:25000000, size_sqft:8000, bedrooms:5, status:'available', roi_estimate:8.1, market_trend:'rising' },
      { title:'Industrial Plot - Partapur', type:'commercial', location:'Partapur Industrial Area, Meerut', price:12000000, size_sqft:15000, bedrooms:null, status:'available', roi_estimate:11.5, market_trend:'stable' },
      { title:'1 BHK Flat - Saket', type:'residential', location:'Saket Colony, Meerut', price:1800000, size_sqft:650, bedrooms:1, status:'sold', roi_estimate:5.2, market_trend:'stable' },
      { title:'Office Space - Western Kutchery', type:'commercial', location:'Western Kutchery, Meerut', price:8500000, size_sqft:3200, bedrooms:null, status:'available', roi_estimate:8.9, market_trend:'rising' },
      { title:'4 BHK Villa - Cantt Area', type:'residential', location:'Cantt, Meerut', price:15000000, size_sqft:3500, bedrooms:4, status:'available', roi_estimate:7.8, market_trend:'rising' },
      { title:'Retail Shop - Abu Lane', type:'commercial', location:'Abu Lane, Meerut', price:6500000, size_sqft:800, bedrooms:null, status:'available', roi_estimate:10.5, market_trend:'rising' },
      { title:'Plot - Modipuram', type:'residential', location:'Modipuram, Meerut', price:3200000, size_sqft:2000, bedrooms:null, status:'available', roi_estimate:12.0, market_trend:'rising' },
    ].forEach(p => db.insert('properties', p));

    // Seed deals - Meerut
    db.insert('deals', { contact_id:1, property_id:1, title:'Sharma - Pallavpuram Flat', value:4500000, stage:'negotiation', probability:75, expected_close:'2026-07-15' });
    db.insert('deals', { contact_id:2, property_id:2, title:'Agarwal - Begumpul Plaza', value:18000000, stage:'proposal', probability:50, expected_close:'2026-08-01' });
    db.insert('deals', { contact_id:4, property_id:4, title:'Verma - Delhi Road Farmhouse', value:25000000, stage:'proposal', probability:60, expected_close:'2026-07-30' });
    db.insert('deals', { contact_id:5, property_id:7, title:'Chauhan - Western Kutchery Office', value:8500000, stage:'negotiation', probability:80, expected_close:'2026-07-10' });
    db.insert('deals', { contact_id:3, property_id:5, title:'Singh - Partapur Industrial', value:12000000, stage:'qualification', probability:30, expected_close:'2026-09-01' });

    // Seed some activities
    db.insert('activities', { lead_id:2, type:'call', subject:'Initial discovery call with Priya', description:'Discussed commercial investment goals in Begumpul area. Budget: 1.2 Cr+' });
    db.insert('activities', { contact_id:1, type:'meeting', subject:'Site visit - Pallavpuram flat', description:'Rajesh visited the 3BHK. Positive feedback, negotiating price.' });
    db.insert('activities', { lead_id:4, type:'email', subject:'Investment portfolio sent to Neha', description:'Shared top 5 properties with ROI analysis for Meerut market.' });
    db.insert('activities', { contact_id:5, type:'call', subject:'Follow-up with Deepak', description:'Confirmed interest in Western Kutchery office space. Scheduling final meeting.' });

    return sendJson(res, { message: 'Sample data seeded successfully' });
  }

  // CSV Upload
  if (pathname === '/api/upload' && method === 'POST') {
    const { table, data } = body;
    if (!table || !data || !Array.isArray(data)) {
      return sendJson(res, { error: 'Provide table and data array' }, 400);
    }
    const allowed = ['leads', 'contacts', 'properties', 'deals'];
    if (!allowed.includes(table)) return sendJson(res, { error: 'Invalid table' }, 400);
    let inserted = 0;
    data.forEach(row => {
      if (row && typeof row === 'object' && Object.keys(row).length > 0) {
        // Auto-score leads
        if (table === 'leads' && !row.score) {
          let score = 0;
          if (row.email) score += 20;
          if (row.phone) score += 20;
          if (row.budget) { const b = parseInt(row.budget); if (b > 10000000) score += 30; else if (b > 5000000) score += 20; else score += 10; }
          if (row.property_interest) score += 15;
          if (row.source === 'referral') score += 15; else if (row.source === 'website') score += 10;
          row.score = Math.min(score, 100);
        }
        if (table === 'leads') row.status = row.status || 'new';
        if (table === 'contacts') { row.stage = row.stage || 'prospect'; row.deal_value = row.deal_value || 0; }
        if (table === 'properties') { row.status = row.status || 'available'; }
        if (table === 'deals') { row.stage = row.stage || 'qualification'; row.probability = row.probability || 10; }
        db.insert(table, row);
        inserted++;
      }
    });
    return sendJson(res, { success: true, inserted, message: `Uploaded ${inserted} records to ${table}` });
  }

  // Export data as JSON
  if (pathname === '/api/export' && method === 'GET') {
    const table = query.table;
    const allowed = ['leads', 'contacts', 'properties', 'deals', 'activities'];
    if (!table || !allowed.includes(table)) return sendJson(res, { error: 'Provide valid table param' }, 400);
    return sendJson(res, db.findAll(table));
  }

  // Clear specific table
  if (pathname === '/api/clear' && method === 'POST') {
    const { table } = body;
    const allowed = ['leads', 'contacts', 'properties', 'deals', 'activities'];
    if (!table || !allowed.includes(table)) return sendJson(res, { error: 'Invalid table' }, 400);
    const data = db.load();
    data[table] = [];
    db.save(data);
    return sendJson(res, { success: true, message: `Cleared all ${table}` });
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
