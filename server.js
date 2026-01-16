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

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-admin-token"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
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
      screenshot TEXT,
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
   SUBMIT (Frontend)
================================ */
app.post("/api/items", upload.any(), (req, res) => {
  const count = Number(req.body.item_count || 0);
  if (!count) {
    return res.status(400).json({ error: "NO_ITEMS" });
  }

  const inserts = [];

  for (let i = 1; i <= count; i++) {
    const file = req.files.find(
      f => f.fieldname === `screenshot_${i}`
    );
    if (!file) continue;

    inserts.push({
      id: randomUUID(),
      screenshot: `/uploads/${file.filename}`,
      note: req.body[`note_${i}`] || ""
    });
  }

  if (!inserts.length) {
    return res.status(400).json({ error: "NO_SCREENSHOTS" });
  }

  const stmt = db.prepare(`
    INSERT INTO items (id, screenshot, note, status)
    VALUES (?, ?, ?, 'submitted')
  `);

  inserts.forEach(it => {
    stmt.run(it.id, it.screenshot, it.note);
  });

  stmt.finalize();
  res.json({ ok: true, count: inserts.length });
});

/* ================================
   ADMIN: LIST
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
   ADMIN: UPDATE
================================ */
app.patch("/api/items/:id", (req, res) => {
  if (req.headers["x-admin-token"] !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { id } = req.params;
  const {
    status,
    display_name,
    item_type,
    weapon_type,
    rarity,
    roll,
    rating
  } = req.body;

  const fields = [];
  const values = [];

  if (status) {
    const allowed = ["submitted", "approved", "hidden", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "INVALID_STATUS" });
    }
    fields.push("status = ?");
    values.push(status);
  }

  if (display_name !== undefined) {
    fields.push("display_name = ?");
    values.push(display_name);
  }

  if (item_type !== undefined) {
    fields.push("item_type = ?");
    values.push(item_type);
  }

  if (weapon_type !== undefined) {
    fields.push("weapon_type = ?");
    values.push(weapon_type);
  }

  if (rarity !== undefined) {
    fields.push("rarity = ?");
    values.push(rarity);
  }

  if (roll !== undefined) {
    fields.push("roll = ?");
    values.push(roll);
  }

  if (rating !== undefined) {
    fields.push("rating = ?");
    values.push(Number(rating) || 0);
  }

  if (!fields.length) {
    return res.json({ ok: true });
  }

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
   PUBLIC (approved only)
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
  console.log("Lootliste Backend läuft auf Port", PORT);
});
