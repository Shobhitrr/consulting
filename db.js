const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

const DEFAULT_DATA = {
  leads: [],
  contacts: [],
  activities: [],
  properties: [],
  deals: [],
  _nextId: { leads: 1, contacts: 1, activities: 1, properties: 1, deals: 1 }
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
      } else {
        rows = rows.filter(r => r[key] == val);
      }
    }
  });
  return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

module.exports = { insert, findAll, findById, update, remove, count, sum, reset, load, save };
