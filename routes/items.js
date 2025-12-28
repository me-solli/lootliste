const express = require("express");
const router = express.Router();
const db = require("../db");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================
   Upload-Ordner
========================= */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   Multer
========================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, "item_" + Date.now() + ext);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =========================
   GET /api/items
   Öffentliche Liste
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
        i.screenshot,
        IFNULL(s.status, 'available') AS status
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
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
   Screenshot einreichen
   (LOGIN ERFORDERLICH)
========================= */
router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Kein Screenshot empfangen" });
    }

    const userId = req.user.id;
    const screenshotPath = "/uploads/" + req.file.filename;

    await db.run("BEGIN");

    const result = await db.run(
      `
      INSERT INTO items (owner_user_id, screenshot)
      VALUES (?, ?)
      `,
      [userId, screenshotPath]
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
      itemId,
      status: "eingereicht"
    });

  } catch (err) {
    await db.run("ROLLBACK");
    console.error("❌ Screenshot-Upload Fehler:", err);
    res.status(500).json({ error: "Upload fehlgeschlagen" });
  }
});

module.exports = router;
