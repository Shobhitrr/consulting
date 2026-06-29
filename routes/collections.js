const db = require('../db');

module.exports = function(path, ctx) {
  const { method, body, sendJson } = ctx;

  if (path === '/' && method === 'GET') {
    const collections = db.findAll('collections');
    const products = db.findAll('products');
    const enriched = collections.map(c => ({
      ...c,
      product_count: products.filter(p => p.collection === c.name).length
    }));
    return sendJson(enriched);
  }

  if (path === '/' && method === 'POST') {
    const col = db.insert('collections', {
      name: body.name,
      description: body.description || '',
      cover_image: body.cover_image || '',
      status: body.status || 'active'
    });
    return sendJson(col, 201);
  }

  const idMatch = path.match(/^\/(\d+)$/);
  if (idMatch && method === 'PATCH') {
    const updated = db.update('collections', parseInt(idMatch[1]), body);
    return sendJson(updated || { error: 'Not found' });
  }

  if (idMatch && method === 'DELETE') {
    db.remove('collections', parseInt(idMatch[1]));
    return sendJson({ success: true });
  }

  sendJson({ error: 'Not found' }, 404);
};
