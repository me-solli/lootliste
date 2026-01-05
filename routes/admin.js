const express = require("express");
const router = express.Router();
const db = require("../db");

/* ================================
   KONSTANTEN
================================ */

/**
 * Admin-Moderationsstatus
 * (Sichtbarkeit / Freigabe)
 */
const ITEM_STATUS = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  HIDDEN: "hidden",
  REJECTED: "rejected"
};

/**
 * Vergabe-/Systemstatus (V3)
 * (noch ohne aktive Vergabe-Logik)
 *
 * open     → sichtbar, Bedarf möglich
 * assigned → vergeben
 * closed   → abgeschlossen
 */
const ASSIGN_STATUS = {
  OPEN: "open",
  ASSIGNED: "assigned",
  CLOSED: "closed"
};

/* ================================
   ADMIN AUTH
================================ */
function requireAdmin(req, res, next) {
  if (req.headers["x-admin-token"] !== "lootliste-admin-2025") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/* ================================
   HELPER: Status setzen
================================ */
function updateAdminStatus(itemId, status) {
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
   GET: Admin-Items (nach Status)
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

        -- V3 Felder
        i.published_at,
        i.earliest_assign_at,
        i.latest_assign_at,
        i.status AS assign_status,

        COALESCE(s.status, ?) AS admin_status,
        s.status_since

      FROM items i
      LEFT JOIN item_status s
        ON s.item_id = i.id

      WHERE COALESCE(s.status, ?) = ?
      ORDER BY i.created_at DESC
      `,
      [ITEM_STATUS.SUBMITTED, status, status]
    );

    res.json(rows);
  } catch (err) {
    console.error("ADMIN GET ITEMS ERROR:", err);
    res.status(500).json({ error: "Admin items konnten nicht geladen werden" });
  }
});

/* ================================
   PUT: Item bearbeiten
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
    console.error("ADMIN UPDATE ITEM ERROR:", err);
    res.status(500).json({ error: "Item konnte nicht gespeichert werden" });
  }
});

/* ================================
   POST: Item freigeben (APPROVE)
   → setzt V3-Zeitfenster
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

    // Admin-Status
    await updateAdminStatus(item.id, ITEM_STATUS.APPROVED);

    // V3 Zeitlogik (minimal, fair, nachvollziehbar)
    const now = new Date();
    const earliest = new Date(now.getTime() + 60 * 60 * 1000); // +60 Min
    const latest = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 Std

    await db.run(
      `
      UPDATE items
      SET
        published_at = ?,
        earliest_assign_at = ?,
        latest_assign_at = ?,
        status = ?
      WHERE id = ?
      `,
      [
        now.toISOString(),
        earliest.toISOString(),
        latest.toISOString(),
        ASSIGN_STATUS.OPEN,
        item.id
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    res.status(500).json({ error: "Approve fehlgeschlagen" });
  }
});

/* ================================
   POST: Item verstecken
================================ */
router.post("/items/:id/hide", requireAdmin, async (req, res) => {
  try {
    await updateAdminStatus(req.params.id, ITEM_STATUS.HIDDEN);
    res.json({ ok: true });
  } catch (err) {
    console.error("HIDE ERROR:", err);
    res.status(500).json({ error: "Hide fehlgeschlagen" });
  }
});

/* ================================
   POST: Item wieder sichtbar
================================ */
router.post("/items/:id/unhide", requireAdmin, async (req, res) => {
  try {
    await updateAdminStatus(req.params.id, ITEM_STATUS.APPROVED);
    res.json({ ok: true });
  } catch (err) {
    console.error("UNHIDE ERROR:", err);
    res.status(500).json({ error: "Unhide fehlgeschlagen" });
  }
});

/* ================================
   POST: Item ablehnen
================================ */
router.post("/items/:id/reject", requireAdmin, async (req, res) => {
  try {
    await updateAdminStatus(req.params.id, ITEM_STATUS.REJECTED);
    res.json({ ok: true });
  } catch (err) {
    console.error("REJECT ERROR:", err);
    res.status(500).json({ error: "Reject fehlgeschlagen" });
  }
});

/* ================================
   REPAIR: fehlende item_status
================================ */
router.post("/repair/missing-status", requireAdmin, async (req, res) => {
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

    res.json({ ok: true, repaired: result.changes });
  } catch (err) {
    console.error("REPAIR ERROR:", err);
    res.status(500).json({ error: "Repair fehlgeschlagen" });
  }
});

module.exports = router;
