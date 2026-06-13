const db = require('../db');

function generateFollowUp(target, context) {
  const templates = {
    new: {
      subject: `Welcome ${target.name} - Let's Find Your Perfect Property`,
      body: `Hi ${target.name},\n\nThank you for your interest in our real estate services. I'd love to understand your property goals better.\n\n${target.budget ? `Based on your budget of $${Number(target.budget).toLocaleString()}, we have several exciting options.` : 'Could you share your budget range so I can curate the best options?'}\n\n${target.property_interest ? `I see you're interested in ${target.property_interest} properties — great choice!` : ''}\n\nWould you be available for a quick 15-minute call this week?\n\nBest regards,\nYour Real Estate Advisor`
    },
    contacted: {
      subject: `Following Up - ${target.name}`,
      body: `Hi ${target.name},\n\nI wanted to follow up on our previous conversation. The market is moving quickly and I have some updates that might interest you.\n\n${context || 'I have new listings that match your criteria. Would you like me to send over the details?'}\n\nLet me know the best time to connect.\n\nBest regards,\nYour Real Estate Advisor`
    },
    qualified: {
      subject: `Exclusive Opportunity for ${target.name}`,
      body: `Hi ${target.name},\n\nBased on our discussions, I've identified some premium opportunities that align perfectly with your investment criteria.\n\n${target.deal_value ? `For your target range of $${Number(target.deal_value).toLocaleString()}, these properties offer excellent ROI potential.` : ''}\n\nI'd recommend we schedule a viewing this week. What works for your schedule?\n\nBest regards,\nYour Real Estate Advisor`
    }
  };
  const status = target.status || target.stage || 'new';
  return templates[status] || templates.new;
}

function daysSince(dateStr) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getSuggestedAction(lead) {
  if (lead.score > 70) return 'Call immediately - hot lead';
  if (lead.score > 40) return 'Send personalized email with listings';
  return 'Add to nurture campaign';
}

module.exports = function(path, ctx) {
  const { method, body, sendJson } = ctx;

  if (path === '/generate' && method === 'POST') {
    const { lead_id, contact_id, context } = body;
    let target = null;
    if (contact_id) target = db.findById('contacts', contact_id);
    if (!target && lead_id) target = db.findById('leads', lead_id);
    if (!target) return sendJson({ error: 'Lead/Contact not found' }, 404);

    const message = generateFollowUp(target, context);
    db.insert('activities', {
      contact_id, lead_id, type: 'ai_followup',
      subject: message.subject, description: message.body, ai_generated: 1
    });
    return sendJson(message);
  }

  if (path === '/suggestions' && method === 'GET') {
    const leads = db.findAll('leads').filter(l =>
      ['new', 'contacted'].includes(l.status) && daysSince(l.updated_at) >= 0
    ).slice(0, 10);

    const contacts = db.findAll('contacts').filter(c =>
      !c.next_followup || new Date(c.next_followup) <= new Date()
    ).slice(0, 10);

    const suggestions = [
      ...leads.map(l => ({
        type: 'lead', id: l.id, name: l.name,
        reason: `Lead score: ${l.score} | Status: ${l.status}`,
        priority: l.score > 50 ? 'high' : 'medium',
        suggested_action: getSuggestedAction(l)
      })),
      ...contacts.map(c => ({
        type: 'contact', id: c.id, name: c.name,
        reason: c.next_followup ? 'Follow-up due' : 'No follow-up scheduled',
        priority: c.deal_value > 500000 ? 'high' : 'medium',
        suggested_action: 'Schedule call or send update'
      }))
    ];
    return sendJson(suggestions);
  }

  if (path === '/auto-schedule' && method === 'POST') {
    const leads = db.findAll('leads', { status: 'new' });
    let scheduled = 0;
    leads.forEach(lead => {
      db.update('leads', lead.id, { status: 'contacted' });
      db.insert('activities', {
        lead_id: lead.id, type: 'scheduled_followup',
        subject: `Auto follow-up for ${lead.name}`,
        description: `Scheduled follow-up based on score ${lead.score}`,
        ai_generated: 1
      });
      scheduled++;
    });
    return sendJson({ scheduled, message: `Auto-scheduled ${scheduled} follow-ups` });
  }

  sendJson({ error: 'Not found' }, 404);
};
