// timeouts.js — V3 Timeout / Expiry Logic (no UI, no DOM)
// ================================================
// Centralized helpers to evaluate time-based transitions.

import { ITEM_STATES, closeNeed, expire, startRoll } from './core.js';
import { canCloseNeed } from './needs.js';
import { executeRoll } from './rolls.js';

// ------------------------------
// Helpers
// ------------------------------
function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function now() {
  return Date.now();
}

// ------------------------------
// Need Phase Auto-Close
// ------------------------------
// If the need window elapsed, close it.
// Returns true if a transition happened.
export function autoCloseNeed(item) {
  if (canCloseNeed(item)) {
    closeNeed(item);
    return true;
  }
  return false;
}

// ------------------------------
// Reserved Phase Expiry
// ------------------------------
// If winner does not react in time, expire and signal re-roll.
// Params:
// - item
// - reservedTimeoutMs
//
// Returns:
// { expired: boolean }
export function checkReservedExpiry(item, reservedTimeoutMs) {
  if (item.status !== ITEM_STATES.RESERVED) return { expired: false };

  const elapsed = now() - item.status_changed_at;

  if (elapsed >= reservedTimeoutMs) {
    expire(item);
    return { expired: true };
  }

  return { expired: false };
}

// ------------------------------
// Handed-Over Dispute Trigger
// ------------------------------
// If confirmation does not complete in time.
export function checkHandedOverTimeout(item, handedOverTimeoutMs) {
  if (item.status !== ITEM_STATES.HANDED_OVER) return false;

  const elapsed = now() - item.status_changed_at;

  if (elapsed >= handedOverTimeoutMs) {
    item.status = ITEM_STATES.DISPUTE;
    item.status_changed_at = now();
    return true;
  }

  return false;
}

// ------------------------------
// Expired → Re-Roll Helper
// ------------------------------
// Re-rolls among existing needs, excluding the last winner.
// Params:
// - item
// - needs
// - lastWinnerUserId
//
// Returns:
// { item, rolls, winnerUserId }
export function rerollExpired({ item, needs, lastWinnerUserId }) {
  assert(item.status === ITEM_STATES.EXPIRED, 'INVALID_STATE');

  const filteredNeeds = needs.filter(n => n.user_id !== lastWinnerUserId);
  assert(filteredNeeds.length >= 1, 'NO_NEEDS_FOR_REROLL');

  // Move directly to roll phase
  item.status = ITEM_STATES.NEED_CLOSED;
  item.status_changed_at = now();

  return executeRoll({ item, needs: filteredNeeds });
}
