const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

const DEFAULT_DATA = {
  products: [],
  categories: [
    { id: 1, name: 'Necklaces', icon: '📿', color: '#f59e0b', count: 0 },
    { id: 2, name: 'Earrings', icon: '✨', color: '#ec4899', count: 0 },
    { id: 3, name: 'Bangles', icon: '⭕', color: '#8b5cf6', count: 0 },
    { id: 4, name: 'Bracelets', icon: '💫', color: '#06b6d4', count: 0 },
    { id: 5, name: 'Rings', icon: '💍', color: '#10b981', count: 0 },
    { id: 6, name: 'Mangalsutra', icon: '🪷', color: '#ef4444', count: 0 },
    { id: 7, name: 'Cosmetics', icon: '💄', color: '#f43f5e', count: 0 },
    { id: 8, name: 'Lipsticks', icon: '💋', color: '#e11d48', count: 0 },
    { id: 9, name: 'Foundations', icon: '🧴', color: '#d97706', count: 0 },
    { id: 10, name: 'Skin Care', icon: '🧖', color: '#14b8a6', count: 0 },
    { id: 11, name: 'Hair Care', icon: '💇', color: '#7c3aed', count: 0 }
  ],
  collections: [],
  broadcasts: [],
  customers: [],
  settings: { business_name: 'GlamStore Wholesale', phone: '', whatsapp: '', instagram: '', currency: '₹' },
  _nextId: { products: 1, categories: 12, collections: 1, broadcasts: 1, customers: 1 }
};

function load() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function insert(table, record) {
  const data = load();
  record.id = data._nextId[table]++;
  record.created_at = new Date().toISOString();
  record.updated_at = record.created_at;
  data[table].push(record);
  save(data);
  return record;
}

function findAll(table, filter = {}) {
  const data = load();
  let rows = data[table] || [];
  Object.entries(filter).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      if (key.endsWith('_like')) {
        const field = key.replace('_like', '');
        rows = rows.filter(r => (r[field] || '').toLowerCase().includes(val.toLowerCase()));
      } else if (key.endsWith('_in')) {
        const field = key.replace('_in', '');
        const arr = Array.isArray(val) ? val : [val];
        rows = rows.filter(r => arr.includes(r[field]));
      } else {
        rows = rows.filter(r => r[key] == val);
      }
    }
  });
  return rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function findById(table, id) {
  const data = load();
  return (data[table] || []).find(r => r.id == id);
}

function update(table, id, fields) {
  const data = load();
  const idx = data[table].findIndex(r => r.id == id);
  if (idx === -1) return null;
  Object.assign(data[table][idx], fields, { updated_at: new Date().toISOString() });
  save(data);
  return data[table][idx];
}

function remove(table, id) {
  const data = load();
  data[table] = data[table].filter(r => r.id != id);
  save(data);
}

function count(table, filter = {}) {
  return findAll(table, filter).length;
}

function sum(table, field, filter = {}) {
  return findAll(table, filter).reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
}

function reset() {
  save(JSON.parse(JSON.stringify(DEFAULT_DATA)));
}

function getSettings() {
  const data = load();
  return data.settings || DEFAULT_DATA.settings;
}

function updateSettings(fields) {
  const data = load();
  Object.assign(data.settings, fields);
  save(data);
  return data.settings;
}

module.exports = { insert, findAll, findById, update, remove, count, sum, reset, load, save, getSettings, updateSettings };
