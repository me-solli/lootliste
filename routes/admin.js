const express = require("express");
const router = express.Router();
const db = require("../db");

/* =====================================================
   GET /api/admin/items
   Liste der Items (standard: status=eingereicht)
===================================================== */
router.get("/items", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    const status = req.query.status || "eingereicht";

    const rows = await db.all(
      `
      SELECT
        i.id,
        i.owner_user_id,
        i.screenshot,
        i.created_at,
        s.status
      FROM items i
      JOIN item_status s ON s.item_id = i.id
      WHERE s.status = ?
      ORDER BY i.created_at DESC
      `,
      [status]
    );

    res.json(rows);
  } catch (err) {
    console.error("ADMIN ITEMS FEHLER:", err);
    res.status(500).json({ error: "Admin Items konnten nicht geladen werden" });
  }
});

/* =====================================================
   DEV: POST /api/admin/dev-seed
   Legt EIN Test-Item mit status=eingereicht an
   (NUR für Entwicklung)
===================================================== */
router.post("/dev-seed", async (req, res) => {
  try {
    // Admin-Check
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Kein Admin-Zugriff" });
    }

    const ownerUserId = req.user.id;
    const screenshotPath = "/uploads/dev-seed.png";

    await db.run("BEGIN");

    const result = await db.run(
      `
      INSERT INTO items (owner_user_id, screenshot)
      VALUES (?, ?)
      `,
      [ownerUserId, screenshotPath]
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
      message: "Dev-Test-Item angelegt",
      itemId,
      status: "eingereicht"
    });

  } catch (err) {
    await db.run("ROLLBACK");
    console.error("DEV-SEED FEHLER:", err);
    res.status(500).json({ error: "Dev-Seed fehlgeschlagen" });
  }
});

module.exports = router;
