const db = require('../db');

function estimateROI(property) {
  if (!property.price) return null;
  let base = 6, mod = 0;
  if (property.type === 'commercial') mod += 2;
  if (property.market_trend === 'rising') mod += 1.5;
  if (property.market_trend === 'declining') mod -= 2;
  return parseFloat((base + mod).toFixed(1));
}

function getInvestmentGrade(property) {
  const roi = property.roi_estimate || estimateROI(property) || 0;
  if (roi >= 8) return 'A';
  if (roi >= 6) return 'B';
  if (roi >= 4) return 'C';
  return 'D';
}

function getRecommendation(property) {
  const grade = getInvestmentGrade(property);
  if (grade === 'A') return 'Strong Buy - Excellent ROI potential';
  if (grade === 'B') return 'Buy - Good investment opportunity';
  if (grade === 'C') return 'Hold - Monitor market conditions';
  return 'Pass - Below target returns';
}

module.exports = function(path, ctx) {
  const { method, query, body, sendJson } = ctx;

  // Properties CRUD
  if (path === '/properties' && method === 'GET') {
    const filter = {};
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.location) filter.location_like = query.location;
    return sendJson(db.findAll('properties', filter));
  }

  if (path === '/properties' && method === 'POST') {
    body.status = body.status || 'available';
    const prop = db.insert('properties', body);
    return sendJson(prop, 201);
  }

  // Investment analysis
  if (path === '/investment-analysis' && method === 'GET') {
    const properties = db.findAll('properties', { status: 'available' });
    const analysis = properties.map(p => ({
      id: p.id, title: p.title, location: p.location, price: p.price,
      roi_estimate: p.roi_estimate || estimateROI(p),
      price_per_sqft: p.size_sqft ? Math.round(p.price / p.size_sqft) : null,
      investment_grade: getInvestmentGrade(p),
      market_trend: p.market_trend,
      recommendation: getRecommendation(p)
    }));

    const summary = {
      total_properties: properties.length,
      avg_price: properties.length ? Math.round(properties.reduce((s, p) => s + (p.price || 0), 0) / properties.length) : 0,
      avg_roi: analysis.filter(a => a.roi_estimate).length ?
        (analysis.reduce((s, a) => s + (a.roi_estimate || 0), 0) / analysis.filter(a => a.roi_estimate).length).toFixed(1) : 0,
      top_picks: analysis.filter(a => a.investment_grade === 'A').slice(0, 3)
    };
    return sendJson({ summary, properties: analysis });
  }

  // Trends
  if (path === '/trends' && method === 'GET') {
    const properties = db.findAll('properties');
    const byLocation = {};
    properties.forEach(p => {
      if (!byLocation[p.location]) byLocation[p.location] = [];
      byLocation[p.location].push(p);
    });
    const trends = Object.entries(byLocation).map(([location, props]) => ({
      location, count: props.length,
      avg_price: Math.round(props.reduce((s, p) => s + (p.price || 0), 0) / props.length),
      trend: props[0]?.market_trend || 'stable'
    }));
    return sendJson(trends);
  }

  // Dashboard
  if (path === '/dashboard' && method === 'GET') {
    return sendJson({
      totalLeads: db.count('leads'),
      hotLeads: db.findAll('leads').filter(l => l.score > 50).length,
      totalContacts: db.count('contacts'),
      totalDeals: db.count('deals'),
      pipelineValue: db.sum('deals', 'value'),
      totalProperties: db.count('properties'),
      recentActivities: db.findAll('activities').slice(0, 5)
    });
  }

  sendJson({ error: 'Not found' }, 404);
};
