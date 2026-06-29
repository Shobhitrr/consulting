const db = require('../db');

module.exports = function(path, ctx) {
  const { method, body, query, sendJson } = ctx;

  // List broadcasts
  if (path === '/' && method === 'GET') {
    return sendJson(db.findAll('broadcasts'));
  }

  // Create broadcast
  if (path === '/' && method === 'POST') {
    const broadcast = db.insert('broadcasts', {
      title: body.title || 'Untitled Broadcast',
      platform: body.platform || 'whatsapp',
      product_ids: body.product_ids || [],
      caption: body.caption || '',
      hashtags: body.hashtags || '',
      status: 'draft',
      sent_at: null
    });
    return sendJson(broadcast, 201);
  }

  // Generate WhatsApp caption
  if (path === '/generate-whatsapp' && method === 'POST') {
    const { product_ids, tone } = body;
    const products = (product_ids || []).map(id => db.findById('products', id)).filter(Boolean);
    if (!products.length) return sendJson({ error: 'No products found' }, 400);

    const settings = db.getSettings();
    const caption = generateWhatsAppMessage(products, settings, tone);
    return sendJson({ caption, product_count: products.length });
  }

  // Generate Instagram caption
  if (path === '/generate-instagram' && method === 'POST') {
    const { product_ids, style } = body;
    const products = (product_ids || []).map(id => db.findById('products', id)).filter(Boolean);
    if (!products.length) return sendJson({ error: 'No products found' }, 400);

    const caption = generateInstagramCaption(products, style);
    const hashtags = generateHashtags(products);
    return sendJson({ caption, hashtags, product_count: products.length });
  }

  // Generate product description
  if (path === '/generate-description' && method === 'POST') {
    const { product_id, style } = body;
    const product = db.findById('products', product_id);
    if (!product) return sendJson({ error: 'Product not found' }, 404);
    const description = generateDescription(product, style);
    return sendJson({ description });
  }

  // Suggest price
  if (path === '/suggest-price' && method === 'POST') {
    const { wholesale_price, category } = body;
    const wp = parseFloat(wholesale_price) || 0;
    const markup = getCategoryMarkup(category);
    return sendJson({
      suggested_retail: Math.round(wp * markup),
      markup_percent: Math.round((markup - 1) * 100),
      category_avg: getCategoryAvgPrice(category)
    });
  }

  // Mark as sent
  const idMatch = path.match(/^\/(\d+)\/send$/);
  if (idMatch && method === 'POST') {
    const updated = db.update('broadcasts', parseInt(idMatch[1]), {
      status: 'sent',
      sent_at: new Date().toISOString()
    });
    return sendJson(updated || { error: 'Not found' });
  }

  const delMatch = path.match(/^\/(\d+)$/);
  if (delMatch && method === 'DELETE') {
    db.remove('broadcasts', parseInt(delMatch[1]));
    return sendJson({ success: true });
  }

  sendJson({ error: 'Not found' }, 404);
};

function generateWhatsAppMessage(products, settings, tone = 'professional') {
  const biz = settings.business_name || 'GlamStore';
  const currency = settings.currency || '₹';

  let msg = `✨ *${biz} - New Arrivals!* ✨\n\n`;

  products.forEach((p, i) => {
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `*${i + 1}. ${p.name}*\n`;
    if (p.material) msg += `📦 Material: ${p.material}\n`;
    if (p.color) msg += `🎨 Color: ${p.color}\n`;
    if (p.weight) msg += `⚖️ Weight: ${p.weight}\n`;
    msg += `💰 Wholesale: ${currency}${p.wholesale_price}\n`;
    msg += `🏷️ Retail: ${currency}${p.retail_price}\n`;
    if (p.stock <= 5) msg += `🔥 *Limited Stock - Only ${p.stock} left!*\n`;
    msg += `\n`;
  });

  msg += `━━━━━━━━━━━━━━━\n`;
  msg += `📞 Order Now: ${settings.phone || 'Contact us'}\n`;
  msg += `📱 WhatsApp: ${settings.whatsapp || 'Message us'}\n`;
  msg += `\n✅ Bulk orders welcome\n`;
  msg += `🚚 Fast delivery across India\n`;
  msg += `💯 Quality guaranteed`;

  return msg;
}

function generateInstagramCaption(products, style = 'trendy') {
  const p = products[0];
  const captions = {
    trendy: `✨ New drop alert! ✨\n\n${p.name} - Because you deserve to shine 💫\n\n${p.material ? `Crafted in ${p.material}` : 'Premium quality'} | ${p.color ? `Available in ${p.color}` : 'Multiple colors available'}\n\n💰 Starting at ₹${p.wholesale_price} (wholesale)\n\n👆 DM to order | Link in bio\n\n${products.length > 1 ? `+ ${products.length - 1} more pieces in this collection ➡️` : ''}`,
    luxury: `Elegance redefined. ✨\n\n${p.name}\n\n${p.description || `A masterpiece of ${p.material || 'premium'} craftsmanship.`}\n\n${p.color ? `Color: ${p.color}` : ''}\nPrice on request.\n\n📩 DM for wholesale inquiries`,
    casual: `New in! 🛍️\n\n${p.name} just landed and we're obsessed! 😍\n\n${p.material ? `Made with ${p.material}` : ''} ${p.color ? `in gorgeous ${p.color}` : ''}\n\nWholesale: ₹${p.wholesale_price}\nRetail: ₹${p.retail_price}\n\nDM "ORDER" to grab yours! 🙌`
  };

  return captions[style] || captions.trendy;
}

function generateHashtags(products) {
  const base = ['#jewellery', '#fashion', '#wholesale', '#trending', '#newcollection', '#shopnow', '#indianjewellery'];
  const category = products[0]?.category?.toLowerCase() || '';

  const catTags = {
    necklaces: ['#necklace', '#necklaceset', '#goldnecklace', '#fashionnecklace'],
    earrings: ['#earrings', '#jhumkas', '#studs', '#earringsofinstagram'],
    bangles: ['#bangles', '#bangleset', '#indianbangles', '#banglelove'],
    bracelets: ['#bracelet', '#braceletsofinstagram', '#handchain'],
    rings: ['#rings', '#fingerring', '#statementring'],
    mangalsutra: ['#mangalsutra', '#mangalsutradesign', '#bridal'],
    cosmetics: ['#cosmetics', '#beauty', '#makeup', '#skincare'],
    lipsticks: ['#lipstick', '#lips', '#matte', '#lipliner'],
    foundations: ['#foundation', '#basemakeup', '#flawless'],
    'skin care': ['#skincare', '#glow', '#naturalbeauty', '#skincareRoutine'],
    'hair care': ['#haircare', '#hairproducts', '#healthyhair']
  };

  const extra = catTags[category] || ['#accessories', '#style'];
  return [...base, ...extra].slice(0, 15).join(' ');
}

function generateDescription(product, style = 'professional') {
  const { name, material, color, weight, category, wholesale_price } = product;

  const descs = {
    professional: `${name} - A stunning piece from our ${category || 'premium'} collection. ${material ? `Crafted with high-quality ${material}` : 'Premium quality craftsmanship'}${color ? ` in elegant ${color}` : ''}${weight ? `, weighing ${weight}` : ''}. Perfect for wholesale buyers looking for trendy, fast-moving stock. Available at competitive wholesale pricing with assured quality.`,
    casual: `Meet your new favorite ${category || 'accessory'}! 💫 ${name} is here to steal the show. ${material ? `Made with ${material}` : 'Premium finish'}${color ? ` in beautiful ${color}` : ''} - this one's flying off the shelves! Grab it before it's gone.`,
    luxury: `Introducing ${name} — where elegance meets artistry. ${material ? `Each piece is meticulously crafted in ${material}` : 'Exquisite craftsmanship'}${color ? `, presented in a refined ${color} tone` : ''}${weight ? ` with a substantial ${weight} weight` : ''}. A testament to timeless beauty, designed for the discerning connoisseur.`
  };

  return descs[style] || descs.professional;
}

function getCategoryMarkup(category) {
  const markups = {
    'Necklaces': 2.2, 'Earrings': 2.5, 'Bangles': 2.0, 'Bracelets': 2.3,
    'Rings': 2.5, 'Mangalsutra': 2.0, 'Cosmetics': 1.8, 'Lipsticks': 2.0,
    'Foundations': 1.7, 'Skin Care': 1.9, 'Hair Care': 1.8
  };
  return markups[category] || 2.0;
}

function getCategoryAvgPrice(category) {
  const products = db.findAll('products', { category });
  if (!products.length) return 0;
  return Math.round(products.reduce((s, p) => s + (p.retail_price || 0), 0) / products.length);
}
