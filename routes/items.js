const express = require("express");
const router = express.Router();

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");

/* =========================
   Upload-Ordner sicherstellen
========================= */
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   Multer (stabil, Railway-tauglich)
========================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, "test_" + Date.now() + ext);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =========================
   POST /api/items
   STEP 2A: Screenshot + DB
========================= */
router.post("/", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("❌ Kein File empfangen");
      return res.status(400).json({ error: "Kein Screenshot empfangen" });
    }

    const screenshotPath = "/uploads/" + req.file.filename;

    // 1️⃣ Item anlegen
    const itemResult = await db.run(
      `
      INSERT INTO items (screenshot)
      VALUES (?)
      `,
      [screenshotPath]
    );

    const itemId = itemResult.lastID;

    // 2️⃣ Status setzen
    await db.run(
      `
      INSERT INTO item_status (item_id, status)
      VALUES (?, 'eingereicht')
      `,
      [itemId]
    );

    console.log("✅ Item eingereicht:", itemId);

    res.json({
      success: true,
      itemId,
      status: "eingereicht",
      screenshot: screenshotPath
    });

  } catch (err) {
    console.error("❌ Fehler beim Item-Upload:", err);
    res.status(500).json({ error: "Item konnte nicht gespeichert werden" });
  }
});

module.exports = router;
