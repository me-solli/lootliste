// routes/admin.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// ================================
// Admin Auth
// ================================
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ================================
// STATUS-MAPPING (Frontend → DB)
// ================================
const STATUS_MAP = {
  submitted: "abgeschickt",
  approved: "freigegeben",
  hidden: "versteckt",
  rejected: "abgelehnt"
};

// ================================
// GET Admin Items
// ================================
router.get("/items", requireAdmin, (req, res) => {
  const uiStatus = req.query.status || "submitted";
  const dbStatus = STATUS_MAP[uiStatus];

  if (!dbStatus) {
    return res.status(400).json({ error: "Invalid status" });
  }

  db.all(
    "SELECT * FROM elemente WHERE wo_status = ? ORDER BY id DESC",
    [dbStatus],
    (err, rows) => {
      if (err) {
        console.error("ADMIN ITEMS FEHLER:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// ================================
// APPROVE
// ================================
router.post("/items/:id/approve", requireAdmin, (req, res) => {
  db.run(
    "UPDATE elemente SET wo_status = 'freigegeben' WHERE id = ?",
    [req.params.id],
    err => {
      if (err) {
        console.error("APPROVE FEHLER:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ ok: true });
    }
  );
});

// ================================
// HIDE
// ================================
router.post("/items/:id/hide", requireAdmin, (req, res) => {
  db.run(
    "UPDATE elemente SET wo_status = 'versteckt' WHERE id = ?",
    [req.params.id],
    err => {
      if (err) {
        console.error("HIDE FEHLER:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ ok: true });
    }
  );
});

// ================================
// REJECT
// ================================
router.post("/items/:id/reject", requireAdmin, (req, res) => {
  db.run(
    "UPDATE elemente SET wo_status = 'abgelehnt' WHERE id = ?",
    [req.params.id],
    err => {
      if (err) {
        console.error("REJECT FEHLER:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ ok: true });
    }
  );
});

module.exports = router;
