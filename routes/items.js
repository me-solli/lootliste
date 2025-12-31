const express = require("express");
const router = express.Router();
const db = require("../db");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================
   UPLOAD-ORDNER
========================= */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   MULTER
========================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `item_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =========================
   GET /api/items
   (intern / debug)
========================= */
router.get("/", async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT
        i.id,
        i.owner_user_id,
        i.screenshot,
        i.created_at,
        s.status
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
      ORDER BY i.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/items Fehler:", err);
    res.status(500).json({ error: "Items konnten nicht geladen werden" });
  }
});

/* =========================
   GET /api/items/public
   (nur freigegebene Items)
========================= */
router.get("/public", async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT
        i.id,
        i.owner_user_id,
        i.screenshot,
        i.created_at
      FROM items i
      JOIN item_status s ON s.item_id = i.id
      WHERE s.status = 'approved'
      ORDER BY i.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/items/public Fehler:", err);
    res.status(500).json({ error: "Öffentliche Items konnten nicht geladen werden" });
  }
});

/* =========================
   POST /api/items
   Item einreichen (Submit)
========================= */
router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Kein Screenshot empfangen" });
    }

    const ownerUserId = req.user.id;
    const screenshotPath = `/uploads/${req.file.filename}`;

    await db.run("BEGIN");

    // Item anlegen
    const result = await db.run(
      `
      INSERT INTO items (owner_user_id, screenshot)
      VALUES (?, ?)
      `,
      [ownerUserId, screenshotPath]
    );

    const itemId = result.lastID;

    // ⭐ WICHTIG: Status anlegen
    await db.run(
      `
      INSERT INTO item_status (item_id, status, status_since)
      VALUES (?, 'submitted', datetime('now'))
      `,
      [itemId]
    );

    await db.run("COMMIT");

    res.json({
      success: true,
      itemId,
      status: "submitted",
      screenshot: screenshotPath
    });
  } catch (err) {
    await db.run("ROLLBACK");
    console.error("POST /api/items Fehler:", err);
    res.status(500).json({ error: "Item konnte nicht eingereicht werden" });
  }
});

module.exports = router;
