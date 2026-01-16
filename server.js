const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

const app = express();

/* ================================
   CORS – stabil (GitHub Pages)
================================ */
const ALLOWED_ORIGINS = ["https://me-solli.github.io"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-login-id, x-admin-token"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

/* ================================
   UPLOAD DIR
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
    const ext = path.extname(file.originalname);
    cb(null, randomUUID() + ext);
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
      screenshot TEXT,
      note TEXT,
      status TEXT DEFAULT 'submitted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

/* ================================
   SUBMIT
================================ */
app.post("/api/items", upload.any(), (req, res) => {
  const count = Number(req.body.item_count || 0);
  if (!count || count < 1) {
    return res.status(400).json({ error: "NO_ITEMS" });
  }

  const files = req.files || [];
  const inserts = [];

  for (let i = 1; i <= count; i++) {
    const file = files.find(f => f.fieldname === `screenshot_${i}`);
    if (!file) continue;

    const note = req.body[`note_${i}`] || "";

    inserts.push({
      id: randomUUID(),
      screenshot: `/uploads/${file.filename}`,
      note
    });
  }

  if (!inserts.length) {
    return res.status(400).json({ error: "NO_SCREENSHOTS" });
  }

  const stmt = db.prepare(
    "INSERT INTO items (id, screenshot, note, status) VALUES (?, ?, ?, 'submitted')"
  );

  inserts.forEach(it => {
    stmt.run(it.id, it.screenshot, it.note);
  });

  stmt.finalize();
  res.status(201).json({ ok: true, count: inserts.length });
});

/* ================================
   ADMIN: STATUS UPDATE (geschützt)
================================ */
app.patch("/api/items/:id/status", (req, res) => {
  const adminToken = req.headers["x-admin-token"];
  if (adminToken !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["submitted", "approved", "rejected", "hidden"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "INVALID_STATUS" });
  }

  db.run(
    "UPDATE items SET status = ? WHERE id = ?",
    [status, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "DB_ERROR" });
      }
      res.json({ ok: true });
    }
  );
});

/* ================================
   PUBLIC ITEMS (nur freigegeben)
================================ */
app.get("/api/items/public", (req, res) => {
  db.all(
    "SELECT * FROM items WHERE status = 'approved' ORDER BY created_at DESC",
    [],
    (err, rows) => {
      if (err) {
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
  console.log("Lootliste Backend läuft auf Port", PORT);
});
