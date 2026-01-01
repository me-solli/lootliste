const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ================================
// DB PFAD (PERSISTENT)
// ================================
const DB_PATH = path.join("/data", "lootliste.db");
console.log("✅ SQLite DB verbunden:", DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB Verbindung fehlgeschlagen:", err);
  }
});

// ================================
// TABELLEN
// ================================
db.serialize(() => {

  // ITEMS
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id TEXT,
      title TEXT,
      type TEXT,
      weapon_type TEXT,
      rating INTEGER DEFAULT 0,
      screenshot TEXT NOT NULL,
      visibility TEXT DEFAULT 'private',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ITEM STATUS (FIXED)
  db.run(`
    CREATE TABLE IF NOT EXISTS item_status (
      item_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'submitted',
      status_since DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);
});

// ================================
// PROMISE WRAPPER
// ================================
db.runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
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

module.exports = {
  run: db.runAsync,
  get: db.getAsync,
  all: db.allAsync
};
