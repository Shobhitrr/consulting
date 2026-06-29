const db = require('../db');

module.exports = function(path, ctx) {
  const { method, query, body, sendJson } = ctx;

  if (path === '/' && method === 'GET') {
    return sendJson(db.findAll('customers'));
  }

  if (path === '/' && method === 'POST') {
    const customer = db.insert('customers', {
      name: body.name,
      phone: body.phone || '',
      email: body.email || '',
      city: body.city || '',
      type: body.type || 'retailer',
      total_orders: 0,
      total_value: 0,
      notes: body.notes || ''
    });
    return sendJson(customer, 201);
  }

  const idMatch = path.match(/^\/(\d+)$/);
  if (idMatch && method === 'PATCH') {
    const updated = db.update('customers', parseInt(idMatch[1]), body);
    return sendJson(updated || { error: 'Not found' });
  }

  if (idMatch && method === 'DELETE') {
    db.remove('customers', parseInt(idMatch[1]));
    return sendJson({ success: true });
  }

  sendJson({ error: 'Not found' }, 404);
};
