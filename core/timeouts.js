// timeouts.js — V3 Time Engine (aligned to core.js)
// ================================================
// Responsible ONLY for time-based checks & triggers.
// No UI, no DOM, no state creation.

import { ITEM_STATUS, updateItemStatus, flagItem, now } from './core.js';

// --------------------------------------------------
// Time constants (single source for timers)
// --------------------------------------------------
export const TIME = Object.freeze({
  NEED_DURATION: 24 * 60 * 60 * 1000,      // 24h Bedarf
  CONFIRM_DURATION: 24 * 60 * 60 * 1000   // 24h Übergabe / Bestätigung
});

// --------------------------------------------------
// Single item timeout check
// Returns true if item changed
// --------------------------------------------------
export function checkItemTimeout(item, ts = now()) {
  let changed = false;

  // 1) Bedarf / Roll / Expired wird komplett von core.js entschieden
  const beforeStatus = item.status;
  updateItemStatus(item, ts);
  if (item.status !== beforeStatus) changed = true;

  // 2) Übergabe-Timeout (CONFIRM_PENDING)
  if (
    item.status === ITEM_STATUS.CONFIRM_PENDING &&
    item.statusChangedAt &&
    ts - item.statusChangedAt >= TIME.CONFIRM_DURATION
  ) {
    flagItem(item, 'handover_timeout');
    changed = true;
  }

  return changed;
}

// --------------------------------------------------
// Bulk helper (used by global tick)
// --------------------------------------------------
export function checkAllTimeouts(items = [], ts = now()) {
  let changed = false;

  for (const item of items) {
    if (checkItemTimeout(item, ts)) {
      changed = true;
    }
  }

  return changed;
}

// --------------------------------------------------
// Optional global tick helper
// (can be called via setInterval)
// --------------------------------------------------
export function startTimeoutTick({
  items,
  intervalMs = 30 * 1000, // 30s default
  onChange
}) {
  return setInterval(() => {
    const didChange = checkAllTimeouts(items);
    if (didChange && typeof onChange === 'function') {
      onChange(items);
    }
  }, intervalMs);
}
