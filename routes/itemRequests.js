const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================================
   DEV AUTH (TEMP)
   identisch zu items.js
================================ */
function devAuth(req, res, next) {
  if (req.headers["x-login-id"] === "dev-admin") {
    req.user = { id: "dev-admin", role: "admin" };
  }
  next();
}

/* =====================================================
   GET /api/item-requests/:id
   Zugriff prüfen + Item-Info liefern
===================================================== */
router.get("/:id", devAuth, async (req, res) => {
  try {
    // 🔐 Login prüfen
    if (!req.user?.id) {
      return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    const requestId = Number(req.params.id);
    if (!requestId) {
      return res.status(400).json({ error: "Ungültige Request-ID" });
    }

    // 📦 Request + Item laden
    const row = await db.get(
      `
      SELECT
        r.id,
        r.status,
        r.requester_user_id,
        r.owner_user_id,
        i.id   AS item_id,
        i.name AS item_name
      FROM item_requests r
      JOIN items i ON i.id = r.item_id
      WHERE r.id = ?
      `,
      [requestId]
    );

    if (!row) {
      return res.status(404).json({ error: "Request nicht gefunden" });
    }

    // 🔒 Zugriff prüfen
    if (
      row.requester_user_id !== req.user.id &&
      row.owner_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Kein Zugriff" });
    }

    // ✅ Antwort
    res.json({
      id: row.id,
      status: row.status,
      item: {
        id: row.item_id,
        name: row.item_name
      },
      requester: { id: row.requester_user_id },
      owner: { id: row.owner_user_id }
    });

  } catch (err) {
    console.error("GET /api/item-requests/:id ERROR:", err);
    res.status(500).json({ error: "Serverfehler" });
  }
});

module.exports = router;
