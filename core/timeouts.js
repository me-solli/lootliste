// =====================================================
// V3 TIMEOUTS – aligned to core.js
// Scope: ONLY time-based checks & triggers
// No UI, no DOM, no state creation
// =====================================================

import { ITEM_STATES, expire, now } from './core.js';

// --------------------------------------------------
// Time constants (single source here for timers only)
// --------------------------------------------------
export const TIME = {
  NEED_DURATION: 24 * 60 * 60 * 1000,      // 24h need window
  RESERVE_DURATION: 24 * 60 * 60 * 1000    // 24h reservation
};

// --------------------------------------------------
// Expiry check (deterministic, no reset)
// Returns true if a transition happened
// --------------------------------------------------
export function checkItemExpiry(item) {
  const t = now();

  // NEED phase expiry → closeNeed is handled elsewhere
  if (
    item.status === ITEM_STATES.NEED_OPEN &&
    item.need_ends_at &&
    t >= item.need_ends_at
  ) {
    // no direct transition here; caller decides next step
    return true;
  }

  // Reservation / handover expiry → core expire()
  if (
    (item.status === ITEM_STATES.RESERVED || item.status === ITEM_STATES.HANDED_OVER) &&
    item.status_changed_at &&
    t - item.status_changed_at >= TIME.RESERVE_DURATION
  ) {
    expire(item);
    return true;
  }

  return false;
}

// --------------------------------------------------
// Bulk helper
// --------------------------------------------------
export function checkAllExpiries(items = []) {
  let changed = false;
  items.forEach(item => {
    if (checkItemExpiry(item)) changed = true;
  });
  return changed;
}
