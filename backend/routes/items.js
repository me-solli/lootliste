const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/items
 * Öffentliche Lootliste (ALLE Items, V2-kompatibel)
 * ⚠️ Bewusst NICHT eingeschränkt, um bestehendes Frontend nicht zu brechen
 */
router.get("/", async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        i.id,
        i.title,
        i.type,
        i.weapon_type,
        i.owner_user_id,
        i.visibility,
        IFNULL(s.status, 'available') AS status
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
      ORDER BY i.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load items" });
  }
});

/**
 * POST /api/items
 * Neues Item anlegen (Owner = eingeloggter User)
 */
router.post("/", async (req, res) => {
  const userId = req.user.id;
  const { title, type, weapon_type } = req.body;

  if (!title || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await db.run("BEGIN");

    const result = await db.run(
      `
      INSERT INTO items (owner_user_id, title, type, weapon_type)
      VALUES (?, ?, ?, ?)
      `,
      [userId, title, type, weapon_type || null]
    );

    const itemId = result.lastID;

    // Status immer erzwingen
    await db.run(
      `
      INSERT OR IGNORE INTO item_status (item_id, status)
      VALUES (?, 'available')
      `,
      [itemId]
    );

    await db.run("COMMIT");

    res.json({
      success: true,
      item_id: itemId
    });
  } catch (err) {
    await db.run("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Item creation failed" });
  }
});

/**
 * GET /api/items/mine
 * Eigene Items des eingeloggten Users (inkl. hidden)
 * 👉 Grundlage für "Mein Bereich"
 */
router.get("/mine", async (req, res) => {
  const userId = req.user.id;

  try {
    const rows = await db.all(
      `
      SELECT
        i.id,
        i.title,
        i.type,
        i.weapon_type,
        i.visibility,
        IFNULL(s.status, 'available') AS status
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
      WHERE i.owner_user_id = ?
      ORDER BY i.id DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load own items" });
  }
});

/**
 * PATCH /api/items/:id/visibility
 * Sichtbarkeit ändern (NUR Owner erlaubt)
 */
router.patch("/:id/visibility", async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.id;
  const { visibility } = req.body;

  if (!["public", "hidden"].includes(visibility)) {
    return res.status(400).json({ error: "Invalid visibility" });
  }

  try {
    const result = await db.run(
      `
      UPDATE items
      SET visibility = ?
      WHERE id = ? AND owner_user_id = ?
      `,
      [visibility, itemId, userId]
    );

    if (result.changes === 0) {
      return res
        .status(403)
        .json({ error: "Not allowed or item not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update visibility" });
  }
});

module.exports = router;
