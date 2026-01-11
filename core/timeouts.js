// timeouts.js — V3 Time Engine (FINAL)
// ================================================
// Responsible ONLY for time-based checks & triggers.
// No UI, no DOM, no state creation.

import { ITEM_STATUS, transitionItem, now } from './core.js';

// --------------------------------------------------
// Time constants (single source for timers)
// --------------------------------------------------
export const TIME = Object.freeze({
  RESERVED_DURATION: 48 * 60 * 60 * 1000,         // 48h Reservierung
  HANDOVER_DURATION: 48 * 60 * 60 * 1000          // 48h Übergabe
});

// --------------------------------------------------
// Helper: does status have timeout?
// --------------------------------------------------
function getTimeoutDuration(status) {
  switch (status) {
    case ITEM_STATUS.RESERVED:
      return TIME.RESERVED_DURATION;
    case ITEM_STATUS.HANDOVER_PENDING:
      return TIME.HANDOVER_DURATION;
    default:
      return null;
  }
}

// --------------------------------------------------
// Single item timeout check
// Returns true if item changed
// --------------------------------------------------
export function checkItemTimeout(item, ts = now()) {
  const duration = getTimeoutDuration(item.status);
  if (!duration) return false;

  if (!item.statusChangedAt) return false;

  if (ts - item.statusChangedAt >= duration) {
    transitionItem(item, 'timeout'); // → expired
    return true;
  }

  return false;
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
// Global tick helper
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
