const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// ================================
// DB PFAD (RAILWAY PERSISTENT)
// ================================
const DATA_DIR = "/data";
const DB_PATH = path.join(DATA_DIR, "lootliste.db");

// 🔒 /data sicherstellen (Railway erstellt das NICHT automatisch)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("📁 /data Verzeichnis erstellt");
}

// ================================
// DB INITIALISIEREN
// ================================
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB Verbindung fehlgeschlagen:", err);
    process.exit(1);
  }
  console.log("✅ SQLite DB verbunden:", DB_PATH);
});

// ================================
// TABELLEN + AUTO-MIGRATION
// ================================
db.serialize(() => {

  // ================================
  // ITEMS (Basis)
  // ================================
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_user_id TEXT,
      title TEXT,
      type TEXT,
      weapon_type TEXT,
      screenshot TEXT NOT NULL,
      visibility TEXT DEFAULT 'private',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // ITEM STATUS
  // ================================
  db.run(`
    CREATE TABLE IF NOT EXISTS item_status (
      item_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'submitted',
      status_since DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  // ================================
  // AUTO-MIGRATION: ITEM-MASKE (B1)
  // ================================
  db.all(`PRAGMA table_info(items)`, (err, columns) => {
    if (err) {
      console.error("❌ PRAGMA table_info fehlgeschlagen:", err);
      return;
    }

    const existing = columns.map(c => c.name);

    const addColumn = (name, type) => {
      if (!existing.includes(name)) {
        db.run(`ALTER TABLE items ADD COLUMN ${name} ${type}`);
        console.log(`➕ Spalte '${name}' (${type}) ergänzt`);
      }
    };

    // 🧱 Neue Item-Felder (optional, V3-ready)
    addColumn("name", "TEXT");        // Item-Name
    addColumn("quality", "TEXT");     // unique / set / rare / magic / rune
    addColumn("roll", "TEXT");        // Kurzwerte
    addColumn("rating", "INTEGER");   // ⭐ 1–5
  });
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

// ================================
// EXPORT
// ================================
module.exports = {
  run: db.runAsync,
  get: db.getAsync,
  all: db.allAsync
};
