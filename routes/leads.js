const db = require('../db');

function calculateLeadScore(lead) {
  let score = 0;
  if (lead.email) score += 20;
  if (lead.phone) score += 20;
  if (lead.budget) {
    const b = parseInt(lead.budget);
    if (b > 1000000) score += 30;
    else if (b > 500000) score += 20;
    else score += 10;
  }
  if (lead.property_interest) score += 15;
  if (lead.source === 'referral') score += 15;
  else if (lead.source === 'website') score += 10;
  return Math.min(score, 100);
}

module.exports = function(path, ctx) {
  const { method, query, body, sendJson } = ctx;

  if (path === '/' && method === 'GET') {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    return sendJson(db.findAll('leads', filter));
  }

  if (path === '/' && method === 'POST') {
    body.score = body.score || calculateLeadScore(body);
    body.status = body.status || 'new';
    body.source = body.source || 'website';
    const lead = db.insert('leads', body);
    return sendJson(lead, 201);
  }

  const idMatch = path.match(/^\/(\d+)$/);
  if (idMatch && method === 'PATCH') {
    const updated = db.update('leads', parseInt(idMatch[1]), body);
    return sendJson(updated ? { success: true } : { error: 'Not found' });
  }

  if (idMatch && method === 'DELETE') {
    db.remove('leads', parseInt(idMatch[1]));
    return sendJson({ success: true });
  }

  sendJson({ error: 'Not found' }, 404);
};
