const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/items
 * Öffentliche Lootliste
 * + TEMP: 1 festes Test-Item, wenn DB leer ist
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
        IFNULL(s.status, 'available') AS status,
        i.screenshot
      FROM items i
      LEFT JOIN item_status s ON s.item_id = i.id
      WHERE i.visibility IS NULL OR i.visibility = 'public'
      ORDER BY i.id DESC
    `);

    // 👉 TEMP TEST-ITEM (nur wenn DB leer)
    if (rows.length === 0) {
      return res.json([
        {
          id: "test-item-1",
          title: "Test-Item (Backend)",
          type: "sonstiges",
          weapon_type: null,
          owner_user_id: "system",
          visibility: "public",
          status: "available",
          screenshot: "https://via.placeholder.com/300x300?text=TEST+ITEM"
        }
      ]);
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load items" });
  }
});

/**
 * POST /api/items
 * Neues Item anlegen (Owner = eingeloggter User)
 * (Screenshot kommt im nächsten Schritt)
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
      INSERT INTO items (owner_user_id, title, type, weapon_type, visibility)
      VALUES (?, ?, ?, ?, 'public')
      `,
      [userId, title, type, weapon_type || null]
    );

    const itemId = result.lastID;

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
 * Eigene Items des eingeloggten Users
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
        IFNULL(s.status, 'available') AS status,
        i.screenshot
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

module.exports = router;
