const db = require('../db');

module.exports = function(path, ctx) {
  const { method, body, sendJson } = ctx;

  if (path === '/' && method === 'GET') {
    const categories = db.findAll('categories');
    // Enrich with product counts
    const products = db.findAll('products');
    const enriched = categories.map(c => ({
      ...c,
      count: products.filter(p => p.category === c.name).length
    }));
    return sendJson(enriched.sort((a, b) => (a.id || 0) - (b.id || 0)));
  }

  if (path === '/' && method === 'POST') {
    const cat = db.insert('categories', {
      name: body.name,
      icon: body.icon || '📦',
      color: body.color || '#6366f1',
      count: 0
    });
    return sendJson(cat, 201);
  }

  const idMatch = path.match(/^\/(\d+)$/);
  if (idMatch && method === 'PATCH') {
    const updated = db.update('categories', parseInt(idMatch[1]), body);
    return sendJson(updated || { error: 'Not found' });
  }

  if (idMatch && method === 'DELETE') {
    db.remove('categories', parseInt(idMatch[1]));
    return sendJson({ success: true });
  }

  sendJson({ error: 'Not found' }, 404);
};
