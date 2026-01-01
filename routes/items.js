const express = require("express");
const router = express.Router();
const db = require("../db");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================================
   ITEM STATUS (STEP A2)
================================ */
const ITEM_STATUS = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  HIDDEN: "hidden",
  REJECTED: "rejected"
};

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
   GET /api/items (intern)
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
    res.status(500).json({ error: "Items konnten nicht geladen werden" });
  }
});

/* =========================
   GET /api/items/public
========================= */
router.get("/public", async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT
        i.id,
        i.owner_user_id,
        i.screenshot,
        i.created_at,
        COALESCE(i.title, '')    AS title,
        COALESCE(i.type, '')     AS type,
        COALESCE(i.category, '') AS category
      FROM items i
      JOIN item_status s ON s.item_id = i.id
      WHERE s.status = ?
      ORDER BY i.created_at DESC
      `,
      [ITEM_STATUS.APPROVED]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Öffentliche Items konnten nicht geladen werden" });
  }
});

/* =========================
   POST /api/items
========================= */
router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Kein Screenshot empfangen" });
    }

    await db.run("BEGIN");

    const result = await db.run(
      `INSERT INTO items (owner_user_id, screenshot) VALUES (?, ?)`,
      [req.user.id, `/uploads/${req.file.filename}`]
    );

    await db.run(
      `INSERT INTO item_status (item_id, status, status_since)
       VALUES (?, ?, datetime('now'))`,
      [result.lastID, ITEM_STATUS.SUBMITTED]
    );

    await db.run("COMMIT");

    res.json({
      success: true,
      itemId: result.lastID,
      status: ITEM_STATUS.SUBMITTED
    });
  } catch (err) {
    await db.run("ROLLBACK");
    res.status(500).json({ error: "Item konnte nicht eingereicht werden" });
  }
});

module.exports = router;
