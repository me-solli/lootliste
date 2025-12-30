const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/admin/items
 * Admin-Liste der Items (inkl. Sichtbarkeit)
 */
router.get("/items", async (req, res) => {
  try {
    // 🔒 Admin-Check
    if (!req.user || req.user.username !== "admin") {
      return res.status(403).json({ error: "Kein Admin-Zugriff" });
    }

    const status = req.query.status || "eingereicht";

    const rows = await db.all(
      `
      SELECT
        i.id,
        i.screenshot,
        i.owner_user_id,
        i.created_at,
        i.is_public,
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
    console.error("Admin-Items Fehler:", err);
    res.status(500).json({ error: "Admin Items konnten nicht geladen werden" });
  }
});

/**
 * PATCH /api/admin/items/:id/visibility
 * Sichtbarkeit umschalten (nur bei freigegeben)
 */
router.patch("/items/:id/visibility", async (req, res) => {
  try {
    if (!req.user || req.user.username !== "admin") {
      return res.status(403).json({ error: "Kein Admin-Zugriff" });
    }

    const { id } = req.params;
    const { is_public } = req.body;

    if (is_public !== 0 && is_public !== 1) {
      return res.status(400).json({ error: "Ungültiger Sichtbarkeitswert" });
    }

    // Status prüfen
    const statusRow = await db.get(
      `SELECT status FROM item_status WHERE item_id = ?`,
      [id]
    );

    if (!statusRow) {
      return res.status(404).json({ error: "Item nicht gefunden" });
    }

    if (statusRow.status !== "freigegeben") {
      return res.status(400).json({
        error: "Sichtbarkeit nur bei freigegebenen Items erlaubt"
      });
    }

    // Sichtbarkeit setzen
    await db.run(
      `UPDATE items SET is_public = ? WHERE id = ?`,
      [is_public, id]
    );

    res.json({
      success: true,
      item_id: id,
      is_public
    });

  } catch (err) {
    console.error("Visibility-Update Fehler:", err);
    res.status(500).json({ error: "Sichtbarkeit konnte nicht geändert werden" });
  }
});

module.exports = router;
