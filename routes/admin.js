// routes/admin.js  (BACKEND – KEIN DOM!)
const express = require("express");
const router = express.Router();
const db = require("../db");

// ================================
// Admin-Auth NUR per Token
// ================================
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ================================
// GET Items nach Status
// ================================
router.get("/items", requireAdmin, (req, res) => {
  const status = req.query.status || "submitted";

  const rows = db
    .prepare(
      "SELECT * FROM items WHERE status = ? ORDER BY id DESC"
    )
    .all(status);

  res.json(rows);
});

// ================================
// APPROVE
// ================================
router.post("/items/:id/approve", requireAdmin, (req, res) => {
  db.prepare(
    "UPDATE items SET status = 'approved' WHERE id = ?"
  ).run(req.params.id);

  res.json({ ok: true });
});

// ================================
// HIDE
// ================================
router.post("/items/:id/hide", requireAdmin, (req, res) => {
  db.prepare(
    "UPDATE items SET status = 'hidden' WHERE id = ?"
  ).run(req.params.id);

  res.json({ ok: true });
});

// ================================
// REJECT
// ================================
router.post("/items/:id/reject", requireAdmin, (req, res) => {
  db.prepare(
    "UPDATE items SET status = 'rejected', admin_note = ? WHERE id = ?"
  ).run(req.body?.admin_note || null, req.params.id);

  res.json({ ok: true });
});

module.exports = router;
