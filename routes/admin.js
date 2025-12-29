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
        i.title,
        i.type,
        i.rating,
        i.screenshot,
        i.created_at,
        s.status,
        s.status_since
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
   POST /api/admin/items/:id/approve
   Freigabe eines eingereichten Items
===================================================== */
router.post("/items/:id/approve", async (req, res) => {
  const itemId = req.params.id;
  const { name, quality, type, roll, stars } = req.body;

  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Kein Admin-Zugriff" });
    }

    if (!name || !quality || !type) {
      return res.status(400).json({
        error: "Pflichtfelder fehlen (name, quality, type)"
      });
    }

    const item = await db.get(
      `
      SELECT i.id, s.status
      FROM items i
      JOIN item_status s ON s.item_id = i.id
      WHERE i.id = ?
      `,
      [itemId]
    );

    if (!item) {
      return res.status(404).json({ error: "Item nicht gefunden" });
    }

    if (item.status !== "eingereicht") {
      return res.status(400).json({
        error: "Item ist nicht im Status 'eingereicht'"
      });
    }

    await db.run("BEGIN");

    // Item-Felder setzen
    await db.run(
      `
      UPDATE items SET
        title = ?,
        type = ?,
        rating = ?
      WHERE id = ?
      `,
      [
        name,
        type,
        typeof stars === "number" ? stars : 0,
        itemId
      ]
    );

    // Status wechseln
    await db.run(
      `
      UPDATE item_status SET
        status = 'verfügbar',
        status_since = datetime('now')
      WHERE item_id = ?
      `,
      [itemId]
    );

    await db.run("COMMIT");

    res.json({
      success: true,
      id: itemId,
      status: "verfügbar"
    });

  } catch (err) {
    await db.run("ROLLBACK");
    console.error("ADMIN APPROVE FEHLER:", err);
    res.status(500).json({ error: "Item konnte nicht freigegeben werden" });
  }
});

/* =====================================================
   DEV: POST /api/admin/dev-seed
   Legt EIN Test-Item mit status=eingereicht an
   (NUR für Entwicklung)
===================================================== */
router.post("/dev-seed", async (req, res) => {
  try {
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
