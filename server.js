// server.js – Drop-Feed Backend (NEU & BEREINIGT)
// Fokus: ruhiger Item-Drop-Feed ohne alte Workflow-/Würfel-Logik

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const app = express();

/* ================================
   CORS (GitHub Pages)
================================ */
const ALLOWED_ORIGINS = ["https://me-solli.github.io"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

/* ================================
   UPLOADS
================================ */
const UPLOAD_DIR = "/data/uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

/* ================================
   MULTER
================================ */
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, randomUUID() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* ================================
   DB
================================ */
const DB_PATH = process.env.DB_PATH || "/data/lootliste.db";
const db = new sqlite3.Database(DB_PATH);
console.log("Using DB:", DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      screenshot TEXT NOT NULL,
      note TEXT,
      status TEXT DEFAULT 'submitted',
      display_name TEXT,
      item_type TEXT,
      weapon_type TEXT,
      rarity TEXT,
      roll TEXT,
      rating INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

/* ================================
   SUBMIT (Frontend Drop)
================================ */
app.post("/api/items", upload.any(), (req, res) => {
  const count = Number(req.body.item_count || 0);
  if (!count) return res.status(400).json({ error: "NO_ITEMS" });

  const inserts = [];

  for (let i = 1; i <= count; i++) {
    const file = req.files.find(f => f.fieldname === `screenshot_${i}`);
    if (!file) continue;

    inserts.push({
      id: randomUUID(),
      screenshot: `/uploads/${file.filename}`,
      note: req.body[`note_${i}`] || "",
      status: "submitted"
    });
  }

  if (!inserts.length) {
    return res.status(400).json({ error: "NO_SCREENSHOTS" });
  }

  const stmt = db.prepare(`
    INSERT INTO items (id, screenshot, note, status)
    VALUES (?, ?, ?, ?)
  `);

  inserts.forEach(it => {
    stmt.run(it.id, it.screenshot, it.note, it.status);
  });

  stmt.finalize();
  res.json({ ok: true, count: inserts.length });
});

/* ================================
   ADMIN: LIST (Feed)
================================ */
app.get("/api/items/admin", (req, res) => {
  if (req.headers["x-admin-token"] !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

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
   ADMIN: UPDATE (Freigabe / Pflege)
================================ */
app.patch("/api/items/:id", (req, res) => {
  if (req.headers["x-admin-token"] !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { id } = req.params;
  const allowedStatus = ["submitted", "approved", "hidden", "rejected"];

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(req.body)) {
    if (key === "status" && !allowedStatus.includes(value)) continue;
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (!fields.length) return res.json({ ok: true });

  values.push(id);

  db.run(
    `UPDATE items SET ${fields.join(", ")} WHERE id = ?`,
    values,
    err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "DB_ERROR" });
      }
      res.json({ ok: true });
    }
  );
});

/* ================================
   PUBLIC FEED (approved)
================================ */
app.get("/api/items/public", (req, res) => {
  db.all(
    "SELECT * FROM items WHERE status = 'approved' ORDER BY created_at DESC",
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
   START
================================ */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Lootliste Drop-Feed Backend läuft auf Port", PORT);
});
