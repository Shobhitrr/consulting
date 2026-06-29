const db = require('../db');

module.exports = function(path, ctx) {
  const { method, sendJson } = ctx;

  if (path === '/dashboard' && method === 'GET') {
    const products = db.findAll('products');
    const broadcasts = db.findAll('broadcasts');
    const categories = db.findAll('categories');
    const today = new Date().toISOString().slice(0, 10);

    const uploadedToday = products.filter(p => p.created_at && p.created_at.startsWith(today)).length;
    const lowStock = products.filter(p => p.stock <= 5 && p.stock >= 0).length;
    const totalValue = products.reduce((s, p) => s + (p.wholesale_price * p.stock || 0), 0);

    // Category breakdown
    const catBreakdown = {};
    products.forEach(p => {
      if (p.category) catBreakdown[p.category] = (catBreakdown[p.category] || 0) + 1;
    });
    const topCategories = Object.entries(catBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Weekly activity (last 7 days)
    const weeklyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayProducts = products.filter(p => p.created_at && p.created_at.startsWith(dateStr)).length;
      const dayBroadcasts = broadcasts.filter(b => b.created_at && b.created_at.startsWith(dateStr)).length;
      weeklyActivity.push({
        date: dateStr,
        day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        products: dayProducts,
        broadcasts: dayBroadcasts
      });
    }

    // Recent broadcasts
    const recentBroadcasts = broadcasts.slice(0, 5);

    return sendJson({
      total_products: products.length,
      uploaded_today: uploadedToday,
      low_stock: lowStock,
      total_inventory_value: totalValue,
      total_broadcasts: broadcasts.length,
      total_customers: db.count('customers'),
      top_categories: topCategories,
      weekly_activity: weeklyActivity,
      recent_broadcasts: recentBroadcasts
    });
  }

  if (path === '/products' && method === 'GET') {
    const products = db.findAll('products');
    const byCategory = {};
    const byCollection = {};
    products.forEach(p => {
      if (p.category) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      if (p.collection) byCollection[p.collection] = (byCollection[p.collection] || 0) + 1;
    });

    return sendJson({
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      out_of_stock: products.filter(p => p.stock <= 0).length,
      avg_wholesale: products.length ? Math.round(products.reduce((s, p) => s + (p.wholesale_price || 0), 0) / products.length) : 0,
      avg_retail: products.length ? Math.round(products.reduce((s, p) => s + (p.retail_price || 0), 0) / products.length) : 0,
      by_category: byCategory,
      by_collection: byCollection
    });
  }

  sendJson({ error: 'Not found' }, 404);
};
