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
   ASSIGN / FLOW STATUS (V3)
========================= */
const ASSIGN_STATUS = {
  AVAILABLE: "available",
  NEED_OPEN: "need_open",
  RESERVED: "reserved",
  ASSIGNED: "assigned"
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
   PUBLIC – freigegebene Items (STABIL, OHNE GROUP BY)
===================================================== */
router.get("/public", async (req, res) => {
  try {
    const rows = await db.all(
      `
      SELECT
        i.id,
        i.name,
        i.type,
        i.quality,
        i.weapon_type   AS weaponType,
        i.roll,
        i.owner_user_id AS contact,
        i.screenshot,
        i.created_at,
        i.rating,

        -- V3 Flow
        COALESCE(i.status, 'available') AS status,
        i.earliest_assign_at,
        i.latest_assign_at,

        -- Admin-Status
        s.status AS admin_status,

        -- Interesse sauber per Subquery
        (
          SELECT COUNT(*)
          FROM item_interest ii
          WHERE ii.item_id = i.id
        ) AS interestCount

      FROM items i
      JOIN item_status s
        ON s.item_id = i.id
       AND s.status = ?

      ORDER BY i.created_at DESC
      `,
      [ITEM_STATUS.APPROVED]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/items/public ERROR:", err);
    res.status(500).json({ error: "Öffentliche Items konnten nicht geladen werden" });
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
        return res.status(400).json({ error: "Ungültige Item-Anzahl" });
      }

      if (!req.files || req.files.length !== itemCount) {
        return res.status(400).json({ error: "Anzahl Screenshots passt nicht zur Item-Anzahl" });
      }

      const createdItems = [];

      for (let i = 0; i < itemCount; i++) {
        const file = req.files[i];

        const result = await db.run(
          `
          INSERT INTO items (owner_user_id, screenshot, created_at, status)
          VALUES (?, ?, datetime('now'), ?)
          `,
          [req.user.id, `/uploads/${file.filename}`, ASSIGN_STATUS.AVAILABLE]
        );

        await db.run(
          `
          INSERT INTO item_status (item_id, status, status_since)
          VALUES (?, ?, datetime('now'))
          `,
          [result.lastID, ITEM_STATUS.SUBMITTED]
        );

        createdItems.push(result.lastID);
      }

      res.status(201).json({
        success: true,
        created: createdItems.length,
        item_ids: createdItems,
        status: ITEM_STATUS.SUBMITTED
      });
    } catch (err) {
      console.error("POST /api/items ERROR:", err);
      res.status(500).json({ error: "Item konnte nicht gespeichert werden" });
    }
  }
);

/* =====================================================
   POST /api/items/:id/need
   PUBLIC – Bedarf anmelden (V3 CORE)
===================================================== */
router.post("/:id/need", async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!itemId) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const now = new Date();
    const needUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const item = await db.get(
      `
      SELECT i.id, COALESCE(i.status, ?) AS status
      FROM items i
      JOIN item_status s ON s.item_id = i.id
      WHERE i.id = ?
        AND s.status = ?
      `,
      [ASSIGN_STATUS.AVAILABLE, itemId, ITEM_STATUS.APPROVED]
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found or not public" });
    }

    if (item.status !== ASSIGN_STATUS.AVAILABLE) {
      return res.status(409).json({ error: "Item not available" });
    }

    await db.run(
      `
      UPDATE items
      SET
        status = ?,
        earliest_assign_at = ?,
        latest_assign_at = ?
      WHERE id = ?
      `,
      [ASSIGN_STATUS.NEED_OPEN, now.toISOString(), needUntil.toISOString(), itemId]
    );

    res.json({ ok: true, status: ASSIGN_STATUS.NEED_OPEN });
  } catch (err) {
    console.error("POST /api/items/:id/need ERROR:", err);
    res.status(500).json({ error: "Bedarf konnte nicht gesetzt werden" });
  }
});

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
