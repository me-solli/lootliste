// services/ItemStatusService.js

const db = require('../db');
const ActionLogger = require('../utils/ActionLogger');

const ALLOWED_TRANSITIONS = {
  available: ['requested'],
  requested: ['reserved'],
  reserved: ['given'],
  given: ['confirmed'],
  confirmed: [],
  flagged_dupe: []
};

class ItemStatusService {
  static async getCurrentStatus(itemId) {
    const row = await db.get(
      `SELECT status FROM item_status WHERE item_id = ?`,
      [itemId]
    );
    if (!row) throw new Error('Item status not found');
    return row.status;
  }

  static async setStatus({
    itemId,
    newStatus,
    actorUserId = null,
    isAdmin = false
  }) {
    const currentStatus = await this.getCurrentStatus(itemId);

    // Admin Sonderregel: Dupe-Flag
    if (newStatus === 'flagged_dupe') {
      if (!isAdmin) {
        throw new Error('Only admin can flag dupes');
      }
    } else {
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Invalid status transition: ${currentStatus} → ${newStatus}`
        );
      }
    }

    await db.run(
      `
      UPDATE item_status
      SET status = ?, status_since = CURRENT_TIMESTAMP
      WHERE item_id = ?
      `,
      [newStatus, itemId]
    );

    await ActionLogger.log({
      actorUserId,
      targetType: 'item',
      targetId: itemId,
      action: `status_${currentStatus}_to_${newStatus}`
    });

    return true;
  }
}

module.exports = ItemStatusService;
