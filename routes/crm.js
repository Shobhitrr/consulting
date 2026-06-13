const db = require('../db');

module.exports = function(path, ctx) {
  const { method, query, body, sendJson } = ctx;

  // Contacts
  if (path === '/contacts' && method === 'GET') {
    const filter = {};
    if (query.stage) filter.stage = query.stage;
    return sendJson(db.findAll('contacts', filter));
  }

  if (path === '/contacts' && method === 'POST') {
    body.stage = body.stage || 'prospect';
    body.deal_value = body.deal_value || 0;
    const contact = db.insert('contacts', body);
    return sendJson(contact, 201);
  }

  const contactMatch = path.match(/^\/contacts\/(\d+)$/);
  if (contactMatch && method === 'PATCH') {
    const updated = db.update('contacts', parseInt(contactMatch[1]), body);
    return sendJson(updated ? { success: true } : { error: 'Not found' });
  }

  // Deals
  if (path === '/deals' && method === 'GET') {
    const deals = db.findAll('deals');
    const enriched = deals.map(d => {
      const contact = d.contact_id ? db.findById('contacts', d.contact_id) : null;
      const property = d.property_id ? db.findById('properties', d.property_id) : null;
      return { ...d, contact_name: contact?.name, property_title: property?.title };
    });
    return sendJson(enriched);
  }

  if (path === '/deals' && method === 'POST') {
    body.stage = body.stage || 'qualification';
    body.probability = body.probability || 10;
    const deal = db.insert('deals', body);
    return sendJson(deal, 201);
  }

  const dealMatch = path.match(/^\/deals\/(\d+)$/);
  if (dealMatch && method === 'PATCH') {
    const updated = db.update('deals', parseInt(dealMatch[1]), body);
    return sendJson(updated ? { success: true } : { error: 'Not found' });
  }

  // Activities
  if (path === '/activities' && method === 'GET') {
    return sendJson(db.findAll('activities').slice(0, 50));
  }

  if (path === '/activities' && method === 'POST') {
    const activity = db.insert('activities', body);
    return sendJson(activity, 201);
  }

  sendJson({ error: 'Not found' }, 404);
};
