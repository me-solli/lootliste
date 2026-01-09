// =====================================================
// V3 NEEDS – aligned to core.js
// Scope: registering needs (interest) only
// No UI, no DOM, no direct state mutations
// =====================================================

import {
  ITEM_STATES,
  openNeed,
  now,
  assert
} from './core.js';

import { TIME } from './timeouts.js';

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function hasNeed(item, userId) {
  return Array.isArray(item.needs) && item.needs.includes(userId);
}

// --------------------------------------------------
// Apply need (public API)
// --------------------------------------------------
// Rules:
// - item must be ONLINE or NEED_OPEN
// - submitter cannot need own item
// - one need per user
// - first need opens NEED_OPEN via core.js
//
// Mutates (indirectly via core):
// - item.status
// - item.need_started_at / need_ends_at
// - item.needs[]
//
// Returns:
// { item, opened }
export function applyNeed({ item, userId, submittedBy }) {
  assert(item, 'NO_ITEM');
  assert(userId, 'NO_USER');
  assert(userId !== submittedBy, 'CANNOT_NEED_OWN_ITEM');

  // init needs array if missing
  if (!Array.isArray(item.needs)) item.needs = [];

  // status guard
  assert(
    item.status === ITEM_STATES.ONLINE ||
    item.status === ITEM_STATES.NEED_OPEN,
    'INVALID_STATE'
  );

  // prevent duplicate need
  assert(!hasNeed(item, userId), 'NEED_ALREADY_EXISTS');

  let opened = false;

  // first need opens phase via core
  if (item.status === ITEM_STATES.ONLINE) {
    openNeed(item, TIME.NEED_DURATION);
    opened = true;
  }

  // register need (user id only)
  item.needs.push(userId);

  return { item, opened };
}

// --------------------------------------------------
// Pure check: can need phase be closed?
// (caller decides when to call closeNeed)
// --------------------------------------------------
export function canCloseNeed(item) {
  if (item.status !== ITEM_STATES.NEED_OPEN) return false;
  if (!item.need_ends_at) return false;

  return now() >= item.need_ends_at;
}
