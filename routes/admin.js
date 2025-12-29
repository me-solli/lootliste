const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/admin/items
 * Liste der eingereichten Items
 */
router.get("/items", async (req, res) => {
  try {
    // Login kommt aus server.js
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

module.exports = router;
