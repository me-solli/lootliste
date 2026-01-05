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
   GET Admin Items (ROBUST)
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
        i.type,
        i.quality,
        i.roll,
        i.rating,
        i.weapon_type AS weaponType,
        i.screenshot,
        i.created_at,
        COALESCE(s.status, ?) AS status,
        s.status_since
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
      WHERE COALESCE(s.status, ?) = ?
      ORDER BY i.created_at DESC
      `,
      [ITEM_STATUS.SUBMITTED, status, status]
    );

    res.json(rows);
  } catch (err) {
    console.error("ADMIN GET ITEMS FEHLER:", err);
    res.status(500).json({ error: "Admin Items konnten nicht geladen werden" });
  }
});

/* ================================
   UPDATE ITEM DETAILS (FIX)
================================ */
router.put("/items/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, type, quality, roll, rating, weaponType } = req.body;

  try {
    await db.run(
      `
      UPDATE items
      SET
        name = ?,
        type = ?,
        quality = ?,
        roll = ?,
        rating = ?,
        weapon_type = ?
      WHERE id = ?
      `,
      [
        name || null,
        type || null,
        quality || null,
        roll || null,
        rating || null,
        type === "waffe" ? weaponType || null : null,
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
    const item = await db.get(
      `SELECT id, name FROM items WHERE id = ?`,
      [req.params.id]
    );

    if (!item || !item.name || item.name.trim() === "") {
      return res.status(400).json({
        error: "Item kann nicht freigegeben werden: Name fehlt"
      });
    }

    // Admin-Status setzen
    await updateStatus(item.id, ITEM_STATUS.APPROVED);

    // ===== V3.0 Publish-Logik =====
    const now = new Date();
    const earliest = new Date(now.getTime() + 60 * 60 * 1000); // +60 min
    const latest = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6h

    await db.run(
      `
      UPDATE items
      SET
        published_at = ?,
        earliest_assign_at = ?,
        latest_assign_at = ?,
        status = 'open'
      WHERE id = ?
      `,
      [
        now.toISOString(),
        earliest.toISOString(),
        latest.toISOString(),
        item.id
      ]
    );
    // ==============================

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

router.post("/items/:id/unhide", requireAdmin, async (req, res) => {
  try {
    await updateStatus(req.params.id, ITEM_STATUS.APPROVED);
    res.json({ ok: true });
  } catch (err) {
    console.error("UNHIDE FEHLER:", err);
    res.status(500).json({ error: "Unhide fehlgeschlagen" });
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
   REPAIR: fehlende item_status
================================ */
router.post("/migrate/fix-missing-status", requireAdmin, async (req, res) => {
  try {
    const result = await db.run(
      `
      INSERT INTO item_status (item_id, status, status_since)
      SELECT id, ?, datetime('now')
      FROM items
      WHERE id NOT IN (SELECT item_id FROM item_status)
      `,
      [ITEM_STATUS.SUBMITTED]
    );

    res.json({ ok: true, migrated: result.changes });
  } catch (err) {
    console.error("MIGRATION FEHLER:", err);
    res.status(500).json({ error: "Migration fehlgeschlagen" });
  }
});

/* ================================
   TEMP: V3 MIGRATION (EINMALIG)
   - fügt fehlende Spalten hinzu
   - idempotent (mehrfach aufrufbar)
================================ */
router.post("/migrate/v3-items", requireAdmin, async (req, res) => {
  try { await db.run(`ALTER TABLE items ADD COLUMN published_at TEXT`); } catch (_) {}
  try { await db.run(`ALTER TABLE items ADD COLUMN earliest_assign_at TEXT`); } catch (_) {}
  try { await db.run(`ALTER TABLE items ADD COLUMN latest_assign_at TEXT`); } catch (_) {}
  try { await db.run(`ALTER TABLE items ADD COLUMN status TEXT`); } catch (_) {}

  res.json({ ok: true, migrated: "v3 items columns ensured" });
});

/* ================================
   DEBUG: DB ROHANSICHT (TEMP!)
================================ */
router.get("/debug/items-raw", requireAdmin, async (req, res) => {
  try {
    const items = await db.all(`SELECT * FROM items`);
    const status = await db.all(`SELECT * FROM item_status`);

    res.json({
      items_count: items.length,
      status_count: status.length,
      items,
      status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
