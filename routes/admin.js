// routes/admin.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ================================
// Admin-Auth
// ================================
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ================================
// GET Admin Items (SAFE)
// ================================
router.get("/items", requireAdmin, (req, res) => {
  const status = req.query.status || "submitted";

  try {
    const rows = db
      .prepare("SELECT * FROM items WHERE status = ?")
      .all(status);

    return res.json(rows);
  } catch (err) {
    console.error("ADMIN ITEMS ERROR:", err.message);
    return res.status(500).json({
      error: "DB query failed",
      details: err.message
    });
  }
});

// ================================
// APPROVE
// ================================
router.post("/items/:id/approve", requireAdmin, (req, res) => {
  try {
    db.prepare(
      "UPDATE items SET status = 'approved' WHERE id = ?"
    ).run(req.params.id);

    res.json({ ok: true });
  } catch (err) {
    console.error("APPROVE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// HIDE
// ================================
router.post("/items/:id/hide", requireAdmin, (req, res) => {
  try {
    db.prepare(
      "UPDATE items SET status = 'hidden' WHERE id = ?"
    ).run(req.params.id);

    res.json({ ok: true });
  } catch (err) {
    console.error("HIDE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ================================
// REJECT (optional note)
// ================================
router.post("/items/:id/reject", requireAdmin, (req, res) => {
  try {
    db.prepare(
      "UPDATE items SET status = 'rejected' WHERE id = ?"
    ).run(req.params.id);

    res.json({ ok: true });
  } catch (err) {
    console.error("REJECT ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
