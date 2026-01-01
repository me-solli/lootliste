// routes/admin.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================================
   ITEM STATUS (STEP A2)
================================ */
const ITEM_STATUS = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  HIDDEN: "hidden",
  REJECTED: "rejected"
};

/* ================================
   Admin Auth
================================ */
function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/* ================================
   GET Admin Items by Status
================================ */
router.get("/items", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || ITEM_STATUS.SUBMITTED;

    if (!Object.values(ITEM_STATUS).includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const rows = await db.all(
      `
      SELECT
        i.id,
        i.owner_user_id,
        i.title,
        i.type,
        i.weapon_type,
        i.rating,
        i.screenshot,
        i.visibility,
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
    console.error("ADMIN GET ITEMS FEHLER:", err);
    res.status(500).json({ error: "Admin Items konnten nicht geladen werden" });
  }
});

/* ================================
   Helper: Status ändern
================================ */
async function updateStatus(itemId, newStatus) {
  return db.run(
    `
    UPDATE item_status
    SET status = ?, status_since = datetime('now')
    WHERE item_id = ?
    `,
    [newStatus, itemId]
  );
}

/* ================================
   APPROVE
================================ */
router.post("/items/:id/approve", requireAdmin, async (req, res) => {
  try {
    await updateStatus(req.params.id, ITEM_STATUS.APPROVED);
    res.json({ ok: true });
  } catch (err) {
    console.error("APPROVE FEHLER:", err);
    res.status(500).json({ error: "Approve fehlgeschlagen" });
  }
});

/* ================================
   HIDE
================================ */
router.post("/items/:id/hide", requireAdmin, async (req, res) => {
  try {
    await updateStatus(req.params.id, ITEM_STATUS.HIDDEN);
    res.json({ ok: true });
  } catch (err) {
    console.error("HIDE FEHLER:", err);
    res.status(500).json({ error: "Hide fehlgeschlagen" });
  }
});

/* ================================
   REJECT
================================ */
router.post("/items/:id/reject", requireAdmin, async (req, res) => {
  try {
    await updateStatus(req.params.id, ITEM_STATUS.REJECTED);
    res.json({ ok: true });
  } catch (err) {
    console.error("REJECT FEHLER:", err);
    res.status(500).json({ error: "Reject fehlgeschlagen" });
  }
});

module.exports = router;
