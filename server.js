const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const { randomUUID } = require("crypto");

console.log("SERVER.JS wird geladen");

const app = express();

/* ================================
   CORS
================================ */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* ================================
   DB
================================ */
const DB_PATH = "/data/lootliste.db";

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("❌ DB Fehler:", err.message);
    process.exit(1);
  }
  console.log("✅ SQLite DB verbunden:", DB_PATH);
});

/* ================================
   DB INIT (läuft einmal sicher)
================================ */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      rating INTEGER DEFAULT 0,
      status TEXT DEFAULT 'verfügbar',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 🔹 optionales Demo-Item (nur wenn Tabelle leer ist)
  db.get("SELECT COUNT(*) AS count FROM items", (err, row) => {
    if (err) return;

    if (row.count === 0) {
      db.run(
        `INSERT INTO items (id, name, type, rating, status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          "Shako",
          "helm",
          5,
          "verfügbar"
        ]
      );
      console.log("🧪 Demo-Item eingefügt");
    }
  });
});

/* ================================
   PORT
================================ */
const PORT = process.env.PORT || 8080;
console.log("PORT =", PORT);

/* ================================
   ROOT
================================ */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ================================
   PUBLIC ITEMS (DB)
================================ */
app.get("/api/items/public", (req, res) => {
  const sql = `SELECT * FROM items ORDER BY created_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ DB Query Fehler:", err.message);
      return res.status(500).json({ error: "DB_ERROR" });
    }

    res.json(rows);
  });
});

/* ================================
   CREATE ITEM (PUBLIC, MINIMAL)
================================ */
app.post("/api/items", (req, res) => {
  const { name, type, rating = 0, status = "verfügbar" } = req.body || {};

  if (!name || !type) {
    return res.status(400).json({ error: "NAME_AND_TYPE_REQUIRED" });
  }

  const id = randomUUID();

  const sql = `
    INSERT INTO items (id, name, type, rating, status)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [id, name, type, rating, status], function (err) {
    if (err) {
      console.error("❌ INSERT Fehler:", err.message);
      return res.status(500).json({ error: "DB_ERROR" });
    }

    res.status(201).json({ id, name, type, rating, status });
  });
});

/* ================================
   START
================================ */
app.listen(PORT, "0.0.0.0", () => {
  console.log("LISTENING ON", PORT);
});
