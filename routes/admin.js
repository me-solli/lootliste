// routes/admin.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const ItemStatusService = require("../services/ItemStatusService");

/* =====================================================
   Admin Auth (minimal & stabil)
===================================================== */
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

/* =====================================================
   GET /api/admin/items
   ?status=submitted|approved|hidden|rejected
===================================================== */
router.get("/items", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || "submitted";

    const rows = await db.all(
      `
      SELECT
        i.id,
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
    console.error("ADMIN GET ITEMS ERROR:", err);
    res.status(500).json({ error: "Admin items load failed" });
  }
});

/* =====================================================
   POST /api/admin/items/:id/approve
===================================================== */
router.post("/items/:id/approve", requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const { title, type, rating } = req.body;

    await ItemStatusService.approve(itemId, {
      title,
      type,
      rating
    });

    res.json({ success: true, status: "approved" });
  } catch (err) {
    console.error("ADMIN APPROVE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   POST /api/admin/items/:id/hide
===================================================== */
router.post("/items/:id/hide", requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    await ItemStatusService.hide(itemId);
    res.json({ success: true, status: "hidden" });
  } catch (err) {
    console.error("ADMIN HIDE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   POST /api/admin/items/:id/reject
===================================================== */
router.post("/items/:id/reject", requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const { admin_note } = req.body || {};
    await ItemStatusService.reject(itemId, admin_note);
    res.json({ success: true, status: "rejected" });
  } catch (err) {
    console.error("ADMIN REJECT ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});

/* =====================================================
   PUT /api/admin/items/:id
   Admin-Override (Edit)
===================================================== */
router.put("/items/:id", requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const { title, type, rating } = req.body;

    await db.run(
      `
      UPDATE items SET
        title = ?,
        type = ?,
        rating = ?,
        updated_at = datetime('now')
      WHERE id = ?
      `,
      [title, type, rating, itemId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN UPDATE ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

module.exports = router;
