const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "lootliste.db");

const db = new sqlite3.Database(DB_PATH, err => {
  if (err) {
    console.error("❌ Fehler beim Öffnen der Datenbank", err);
  } else {
    console.log("✅ SQLite DB verbunden:", DB_PATH);
  }
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
// TABELLEN + AUTO-MIGRATION
// ================================
db.serialize(() => {

  // ================================
  // ITEMS
  // ================================
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      weaponType TEXT,
      quality TEXT,
      roll TEXT,
      rating INTEGER DEFAULT 0,
      contact TEXT,
      status TEXT DEFAULT 'Verfügbar',
      screenshot TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // MIGRATION: owner_user_id (V3)
  // ================================
  db.run(
    `
    ALTER TABLE items
    ADD COLUMN owner_user_id TEXT
    `,
    err => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("❌ Migration owner_user_id fehlgeschlagen:", err.message);
      }
    }
  );

  // ================================
  // ITEM STATUS
  // ================================
  db.run(`
    CREATE TABLE IF NOT EXISTS item_status (
      item_id INTEGER PRIMARY KEY,
      status TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ================================
  // ITEM INTEREST (V3)
  // ================================
  db.run(`
    CREATE TABLE IF NOT EXISTS item_interest (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, user_id)
    )
  `);

  // ================================
  // ITEM REQUESTS (Kontakt / Bedarf)
  // ================================
  db.run(`
    CREATE TABLE IF NOT EXISTS item_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      requester_user_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME
    )
  `);

  // ================================
  // DEV TEST REQUEST (TEMP)
  // ================================
  db.run(`
    INSERT INTO item_requests (
      item_id,
      requester_user_id,
      owner_user_id,
      status
    )
    SELECT
      1,
      'dev-admin',
      'dev-admin',
      'open'
    WHERE NOT EXISTS (
      SELECT 1 FROM item_requests
      WHERE item_id = 1
        AND requester_user_id = 'dev-admin'
        AND owner_user_id = 'dev-admin'
    )
  `);

});

module.exports = db;
