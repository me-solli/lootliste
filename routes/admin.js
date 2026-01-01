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
  if (req.headers["x-admin-token"] !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/* ================================
   GET Admin Items
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
  } catch {
    res.status(500).json({ error: "Admin Items konnten nicht geladen werden" });
  }
});

/* ================================
   Helper
================================ */
function updateStatus(itemId, status) {
  return db.run(
    `UPDATE item_status
     SET status = ?, status_since = datetime('now')
     WHERE item_id = ?`,
    [status, itemId]
  );
}

/* ================================
   Status Actions
================================ */
router.post("/items/:id/approve", requireAdmin, (req, res) =>
  updateStatus(req.params.id, ITEM_STATUS.APPROVED).then(() => res.json({ ok: true }))
);

router.post("/items/:id/hide", requireAdmin, (req, res) =>
  updateStatus(req.params.id, ITEM_STATUS.HIDDEN).then(() => res.json({ ok: true }))
);

router.post("/items/:id/reject", requireAdmin, (req, res) =>
  updateStatus(req.params.id, ITEM_STATUS.REJECTED).then(() => res.json({ ok: true }))
);

module.exports = router;
