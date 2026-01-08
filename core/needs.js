// needs.js — V3 Need System (no UI, no DOM)
// =====================================
// Handles need registration, validation, and the trigger to open the need phase.

import { ITEM_STATES, openNeed } from './core.js';

// ------------------------------
// Need Factory
// ------------------------------
export function createNeed({ itemId, userId }) {
  return {
    id: crypto.randomUUID(),
    item_id: itemId,
    user_id: userId,
    created_at: Date.now()
  };
}

// ------------------------------
// Guards
// ------------------------------
function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function hasNeed(needs, itemId, userId) {
  return needs.some(n => n.item_id === itemId && n.user_id === userId);
}

// ------------------------------
// Register Need
// ------------------------------
// Params:
// - item: item object (mutated via core transitions)
// - needs: array of existing needs (for all items or scoped by item)
// - userId: current user
// - durationMs: need window duration (e.g. 12h / 24h)
// - submittedBy: item owner (to block self-need)
//
// Returns:
// { item, need }
export function registerNeed({ item, needs, userId, durationMs, submittedBy }) {
  // --- State guards ---
  assert(item.status === ITEM_STATES.ONLINE || item.status === ITEM_STATES.NEED_OPEN, 'INVALID_STATE');
  assert(userId !== submittedBy, 'CANNOT_NEED_OWN_ITEM');
  assert(!hasNeed(needs, item.id, userId), 'NEED_ALREADY_EXISTS');

  // --- Create need ---
  const need = createNeed({ itemId: item.id, userId });

  // --- First need opens the window ---
  if (item.status === ITEM_STATES.ONLINE) {
    openNeed(item, durationMs);
  }

  return { item, need };
}

// ------------------------------
// Close Need (time-based helper)
// ------------------------------
export function canCloseNeed(item) {
  return item.status === ITEM_STATES.NEED_OPEN && Date.now() >= item.need_ends_at;
}
