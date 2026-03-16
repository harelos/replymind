// Pure JavaScript database — no compilation needed on Windows
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'replymind.json');

if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], events: [] }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const db = {
  getUserByEmail(email) {
    return readDB().users.find(u => u.email === email) || null;
  },
  getUserById(id) {
    return readDB().users.find(u => u.id === id) || null;
  },
  getUserByActivationCode(code) {
    return readDB().users.find(u => u.activation_code === code) || null;
  },
  createUser({ email, password_hash, activation_code }) {
    const data = readDB();
    const id = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    const user = {
      id, email, password_hash,
      plan: 'free', use_count: 0, tone_profile: '',
      created_at: new Date().toISOString(),
      activated_at: null, activation_code
    };
    data.users.push(user);
    writeDB(data);
    return user;
  },
  updateUser(id, fields) {
    const data = readDB();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    data.users[idx] = { ...data.users[idx], ...fields };
    writeDB(data);
    return data.users[idx];
  },
  incrementUseCount(id) {
    const data = readDB();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx === -1) return 0;
    data.users[idx].use_count = (data.users[idx].use_count || 0) + 1;
    writeDB(data);
    return data.users[idx].use_count;
  },
  logEvent(userId, eventName, metadata = {}) {
    try {
      const data = readDB();
      const id = data.events.length > 0 ? Math.max(...data.events.map(e => e.id)) + 1 : 1;
      data.events.push({
        id, user_id: userId || null,
        event_name: eventName,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      });
      writeDB(data);
    } catch (e) {}
  }
};

module.exports = db;
