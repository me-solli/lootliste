const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const { randomUUID } = require("crypto");

console.log("SERVER.JS wird geladen");

const app = express();

/* ================================
   CORS (STABIL – FIX FÜR RAILWAY)
================================ */
const ALLOWED_ORIGINS = [
  "https://me-solli.github.io"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-login-id"
  );

  // Preflight sofort beenden
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

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
   DB INIT
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
});

/* ================================
   ROOT
================================ */
app.get("/", (req, res) => {
  res.status(200).send("OK");
});

/* ================================
   PUBLIC ITEMS
================================ */
app.get("/api/items/public", (req, res) => {
  db.all(
    "SELECT * FROM items ORDER BY created_at DESC",
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB_ERROR" });
      }
      res.json(rows);
    }
  );
});

/* ================================
   CREATE ITEM (DEV)
================================ */
app.post("/api/items", (req, res) => {
  const { name, type, rating = 0, status = "verfügbar" } = req.body || {};

  if (!name || !type) {
    return res.status(400).json({ error: "NAME_AND_TYPE_REQUIRED" });
  }

  const id = randomUUID();

  db.run(
    `
    INSERT INTO items (id, name, type, rating, status)
    VALUES (?, ?, ?, ?, ?)
    `,
    [id, name, type, rating, status],
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB_ERROR" });
      }

      res.status(201).json({ id });
    }
  );
});

/* ================================
   START
================================ */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("LISTENING ON", PORT);
});
