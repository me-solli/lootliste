const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================================
   ITEM STATUS
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
        i.name,
        i.quality,
        i.roll,
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
    console.error("ADMIN GET ITEMS FEHLER:", err);
    res.status(500).json({ error: "Admin Items konnten nicht geladen werden" });
  }
});

/* ================================
   UPDATE ITEM DETAILS (B1.2)
================================ */
router.put("/items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, quality, roll, rating } = req.body;

  try {
    await db.run(
      `
      UPDATE items
      SET
        name = ?,
        quality = ?,
        roll = ?,
        rating = ?
      WHERE id = ?
      `,
      [
        name || null,
        quality || null,
        roll || null,
        rating || null,
        id
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN UPDATE ITEM FEHLER:", err);
    res.status(500).json({ error: "Item konnte nicht gespeichert werden" });
  }
});

/* ================================
   Helper: Status ändern
================================ */
function updateStatus(itemId, status) {
  return db.run(
    `
    UPDATE item_status
    SET status = ?, status_since = datetime('now')
    WHERE item_id = ?
    `,
    [status, itemId]
  );
}

/* ================================
   Status Actions
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

router.post("/items/:id/hide", requireAdmin, async (req, res) => {
  try {
    await updateStatus(req.params.id, ITEM_STATUS.HIDDEN);
    res.json({ ok: true });
  } catch (err) {
    console.error("HIDE FEHLER:", err);
    res.status(500).json({ error: "Hide fehlgeschlagen" });
  }
});

router.post("/items/:id/reject", requireAdmin, async (req, res) => {
  try {
    await updateStatus(req.params.id, ITEM_STATUS.REJECTED);
    res.json({ ok: true });
  } catch (err) {
    console.error("REJECT FEHLER:", err);
    res.status(500).json({ error: "Reject fehlgeschlagen" });
  }
});

/* ================================
   TEMP: MIGRATION
   Fehlende item_status nachziehen
================================ */
router.post(
  "/migrate/fix-missing-status",
  requireAdmin,
  async (req, res) => {
    try {
      const result = await db.run(`
        INSERT INTO item_status (item_id, status, status_since)
        SELECT id, 'approved', datetime('now')
        FROM items
        WHERE id NOT IN (SELECT item_id FROM item_status)
      `);

      res.json({
        ok: true,
        migrated: result.changes
      });
    } catch (err) {
      console.error("MIGRATION FEHLER:", err);
      res.status(500).json({ error: "Migration fehlgeschlagen" });
    }
  }
);

module.exports = router;
