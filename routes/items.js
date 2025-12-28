const express = require("express");
const router = express.Router();
const db = require("../db");

const path = require("path");
const fs = require("fs");
const multer = require("multer");

/* =========================
   Upload-Ordner sicherstellen
========================= */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* =========================
   Multer Config
========================= */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name =
      Date.now() + "-" + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Nur Bilddateien erlaubt"));
    }
    cb(null, true);
  }
});

/* =========================
   GET /api/items
   Öffentliche Lootliste
========================= */
router.get("/", async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        i.id,
        i.title,
        i.type,
        i.weapon_type,
        i.owner_user_id,
        i.visibility,
        IFNULL(s.status, 'available') AS status,
        i.screenshot
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
      WHERE (i.visibility IS NULL OR i.visibility = 'public')
        AND IFNULL(s.status, 'available') = 'available'
      ORDER BY i.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load items" });
  }
});

/* =========================
   POST /api/items
   Item + Screenshot einreichen
========================= */
router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Screenshot fehlt" });
    }

    const userId = req.user?.id || "admin-1"; // DEV-Fallback
    const { title, type, weapon_type } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: "Pflichtfelder fehlen" });
    }

    const screenshotPath = "/uploads/" + req.file.filename;

    await db.run("BEGIN");

    const result = await db.run(
      `
      INSERT INTO items (
        owner_user_id,
        title,
        type,
        weapon_type,
        screenshot,
        visibility
      )
      VALUES (?, ?, ?, ?, ?, 'public')
      `,
      [
        userId,
        title,
        type,
        weapon_type || null,
        screenshotPath
      ]
    );

    const itemId = result.lastID;

    await db.run(
      `
      INSERT INTO item_status (item_id, status)
      VALUES (?, 'eingereicht')
      `,
      [itemId]
    );

    await db.run("COMMIT");

    res.json({
      success: true,
      item_id: itemId
    });
  } catch (err) {
    await db.run("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Item submit failed" });
  }
});

/* =========================
   GET /api/items/mine
   Eigene Items
========================= */
router.get("/mine", async (req, res) => {
  const userId = req.user?.id || "admin-1";

  try {
    const rows = await db.all(
      `
      SELECT
        i.id,
        i.title,
        i.type,
        i.weapon_type,
        i.visibility,
        IFNULL(s.status, 'available') AS status,
        i.screenshot
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
      WHERE i.owner_user_id = ?
      ORDER BY i.id DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load own items" });
  }
});

module.exports = router;
