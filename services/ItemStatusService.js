// services/ItemStatusService.js

const db = require("../db");

/**
 * Zentrale Status-Logik (Admin-only)
 *
 * Status:
 * - submitted
 * - approved
 * - hidden
 * - rejected
 */
class ItemStatusService {
  static async getCurrentStatus(itemId) {
    const row = await db.get(
      "SELECT status FROM item_status WHERE item_id = ?",
      [itemId]
    );

    if (!row) {
      throw new Error("Item status not found");
    }

    return row.status;
  }

  static async approve(itemId, { title, type, rating }) {
    const currentStatus = await this.getCurrentStatus(itemId);

    if (!["submitted", "hidden"].includes(currentStatus)) {
      throw new Error(
        `Cannot approve item from status '${currentStatus}'`
      );
    }

    await db.run("BEGIN");
    try {
      await db.run(
        `
        UPDATE items SET
          title = COALESCE(?, title),
          type = COALESCE(?, type),
          rating = COALESCE(?, rating),
          updated_at = datetime('now')
        WHERE id = ?
        `,
        [title, type, rating, itemId]
      );

      await db.run(
        `
        UPDATE item_status SET
          status = 'approved',
          status_since = datetime('now')
        WHERE item_id = ?
        `,
        [itemId]
      );

      await db.run("COMMIT");
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }
  }

  static async hide(itemId) {
    const currentStatus = await this.getCurrentStatus(itemId);

    if (currentStatus !== "approved") {
      throw new Error(
        `Cannot hide item from status '${currentStatus}'`
      );
    }

    await db.run(
      `
      UPDATE item_status SET
        status = 'hidden',
        status_since = datetime('now')
      WHERE item_id = ?
      `,
      [itemId]
    );
  }

  static async reject(itemId, adminNote = null) {
    const currentStatus = await this.getCurrentStatus(itemId);

    if (currentStatus !== "submitted") {
      throw new Error(
        `Cannot reject item from status '${currentStatus}'`
      );
    }

    await db.run("BEGIN");
    try {
      await db.run(
        `
        UPDATE item_status SET
          status = 'rejected',
          status_since = datetime('now')
        WHERE item_id = ?
        `,
        [itemId]
      );

      if (adminNote) {
        await db.run(
          `
          UPDATE items SET
            admin_note = ?,
            updated_at = datetime('now')
          WHERE id = ?
          `,
          [adminNote, itemId]
        );
      }

      await db.run("COMMIT");
    } catch (err) {
      await db.run("ROLLBACK");
      throw err;
    }
  }
}

module.exports = ItemStatusService;
