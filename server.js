const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ===== DB PFAD (PERSISTENT) =====
const DB_PATH = path.join(__dirname, "lootliste.db");

// ===== DB VERBINDUNG =====
console.log("SQLite DB verbunden:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB Verbindung fehlgeschlagen:", err);
  }
});

// ===== TABELLEN INITIALISIEREN (NUR EINMAL) =====
db.serialize(() => {
  // ITEMS
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      weapon_type TEXT,
      rating INTEGER DEFAULT 0,
      visibility TEXT DEFAULT 'public',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ITEM STATUS
  db.run(`
    CREATE TABLE IF NOT EXISTS item_status (
      item_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'available',
      status_since DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ITEM REQUESTS (BEDARF)
  db.run(`
    CREATE TABLE IF NOT EXISTS item_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, user_id)
    )
  `);

  // ACTION LOGS
  db.run(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id TEXT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ===== PROMISE WRAPPER (EINHEITLICH!) =====
db.runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this); // this.lastID etc.
    });
  });

db.getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

db.allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

// ===== EXPORT (EINE INSTANZ) =====
module.exports = {
  run: db.runAsync,
  get: db.getAsync,
  all: db.allAsync
};
