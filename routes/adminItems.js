const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/admin/items
 * Admin-Liste der eingereichten Items
 */
router.get("/items", async (req, res) => {
  try {
    // 🔒 Admin-Check (minimal & bewusst)
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

module.exports = router;
