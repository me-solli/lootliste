const express = require("express");
const router = express.Router();
const db = require("../db");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* ================================
   DEV AUTH (TEMP – nur für Submit)
================================ */
function devAuth(req, res, next) {
  if (req.headers["x-login-id"] === "dev-admin") {
    req.user = { id: "dev-admin", role: "admin" };
  }
  next();
}

/* ================================
   ITEM STATUS (Admin / Moderation)
================================ */
const ITEM_STATUS = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  HIDDEN: "hidden",
  REJECTED: "rejected"
};

/* =========================
   UPLOAD-ORDNER (RAILWAY SAFE)
========================= */
const UPLOAD_DIR = "/data/uploads";

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 /data/uploads (items) erstellt");
}

/* =========================
   MULTER (Screenshot Upload)
========================= */
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `item_${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

/* =====================================================
   GET /api/items/public
   PUBLIC – freigegebene Items + Interest-Count (V3)
===================================================== */
router.get("/public", async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT
        i.id,
        i.name          AS name,
        i.type          AS type,
        i.quality       AS quality,
        i.weapon_type   AS weaponType,
        i.roll,
        i.owner_user_id AS contact,
        i.screenshot,
        i.created_at,
        i.rating        AS rating,

        -- V3 Felder (read-only)
        i.published_at,
        i.earliest_assign_at,
        i.latest_assign_at,
        i.status         AS assign_status,

        s.status         AS admin_status,

        -- 🆕 Interest
        COUNT(ii.id)     AS interestCount

      FROM items i
      JOIN item_status s
        ON s.item_id = i.id
      LEFT JOIN item_interest ii
        ON ii.item_id = i.id

      WHERE s.status = ?

      GROUP BY i.id
      ORDER BY i.created_at DESC
      `,
      [ITEM_STATUS.APPROVED]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/items/public ERROR:", err);
    res.status(500).json({
      error: "Öffentliche Items konnten nicht geladen werden"
    });
  }
});

/* =====================================================
   POST /api/items
   Einreichen (Screenshot Pflicht, DEV erlaubt)
===================================================== */

router.post(
  "/",
  devAuth,
  upload.any(),
  async (req, res) => {

    if (!req.user?.id) {
      return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    try {

      const itemCount = Number(req.body.item_count || 0);

      if (!itemCount || itemCount < 1 || itemCount > 3) {
        return res.status(400).json({
          error: "Ungültige Item-Anzahl"
        });
      }

      // ⬇️ HIER kommt Schritt 3 (req.files prüfen)

      const { weaponType } = req.body;

      const result = await db.run(
        `
        INSERT INTO items (owner_user_id, screenshot, weapon_type)
        VALUES (?, ?, ?)
        `,
        [
          req.user.id,
          `/uploads/${req.file.filename}`,
          weaponType || null
        ]
      );

      await db.run(
        `
        INSERT INTO item_status (item_id, status, status_since)
        VALUES (?, ?, datetime('now'))
        `,
        [result.lastID, ITEM_STATUS.SUBMITTED]
      );

      res.status(201).json({
        success: true,
        item_id: result.lastID,
        status: ITEM_STATUS.SUBMITTED
      });
    } catch (err) {
      console.error("POST /api/items ERROR:", err);
      res.status(500).json({ error: "Item konnte nicht gespeichert werden" });
    }
  }
);

/* =====================================================
   POST /api/items/:id/interest
   PUBLIC – Interesse setzen (V3)
===================================================== */
router.post("/:id/interest", async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const userId = Number(req.body.user_id || 0);

    if (!itemId || !userId) {
      return res.status(400).json({ error: "Invalid item or user" });
    }

    // Nur freigegebene Items
    const item = await db.get(
      `
      SELECT i.id
      FROM items i
      JOIN item_status s ON s.item_id = i.id
      WHERE i.id = ?
        AND s.status = ?
      `,
      [itemId, ITEM_STATUS.APPROVED]
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found or not public" });
    }

    // Interesse setzen (idempotent)
    await db.run(
      `
      INSERT OR IGNORE INTO item_interest (item_id, user_id)
      VALUES (?, ?)
      `,
      [itemId, userId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("SET INTEREST ERROR:", err);
    res.status(500).json({ error: "Interest konnte nicht gesetzt werden" });
  }
});

module.exports = router;
