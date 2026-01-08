// core.js — V3 Core Logic (no UI, no DOM)
// ======================================
// This file contains ONLY state, rules, and transitions.
// UI layers may call these functions, but must not modify state directly.

// ------------------------------
// State Enum
// ------------------------------
export const ITEM_STATES = Object.freeze({
  SUBMITTED: 'submitted',
  ONLINE: 'online',
  NEED_OPEN: 'need_open',
  NEED_CLOSED: 'need_closed',
  ROLL_PHASE: 'roll_phase',
  RESERVED: 'reserved',
  HANDED_OVER: 'handed_over',
  CONFIRMED: 'confirmed',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn',
  DISPUTE: 'dispute'
});

// ------------------------------
// Helpers
// ------------------------------
export function now() {
  return Date.now();
}

export function assert(condition, code) {
  if (!condition) throw new Error(code);
}

// ------------------------------
// Item Factory
// ------------------------------
export function createSubmittedItem({
  name,
  type,
  submittedBy,
  agreedFairplay
}) {
  assert(agreedFairplay === true, 'FAIRPLAY_NOT_ACCEPTED');

  return {
    id: crypto.randomUUID(),
    name,
    type,

    submitted_by: submittedBy,
    submitted_at: now(),

    agreed_fairplay: true,
    agreed_at: now(),

    status: ITEM_STATES.SUBMITTED,
    status_changed_at: now(),

    // Bedarf
    need_started_at: null,
    need_ends_at: null,

    // Vergabe
    reserved_for: null,
    rolls: [],

    // Meta
    flags: []
  };
}

// ------------------------------
// State Transitions
// ------------------------------
export function toOnline(item) {
  assert(item.status === ITEM_STATES.SUBMITTED, 'INVALID_STATE_TRANSITION');
  item.status = ITEM_STATES.ONLINE;
  item.status_changed_at = now();
  return item;
}

export function openNeed(item, durationMs) {
  assert(item.status === ITEM_STATES.ONLINE, 'INVALID_STATE_TRANSITION');

  item.status = ITEM_STATES.NEED_OPEN;
  item.need_started_at = now();
  item.need_ends_at = item.need_started_at + durationMs;
  item.status_changed_at = now();
  return item;
}

export function closeNeed(item) {
  assert(item.status === ITEM_STATES.NEED_OPEN, 'INVALID_STATE_TRANSITION');
  assert(now() >= item.need_ends_at, 'NEED_STILL_OPEN');

  item.status = ITEM_STATES.NEED_CLOSED;
  item.status_changed_at = now();
  return item;
}

export function startRoll(item) {
  assert(item.status === ITEM_STATES.NEED_CLOSED, 'INVALID_STATE_TRANSITION');
  item.status = ITEM_STATES.ROLL_PHASE;
  item.status_changed_at = now();
  return item;
}

export function reserve(item, winnerUserId) {
  assert(item.status === ITEM_STATES.ROLL_PHASE, 'INVALID_STATE_TRANSITION');

  item.status = ITEM_STATES.RESERVED;
  item.reserved_for = winnerUserId;
  item.status_changed_at = now();
  return item;
}

export function markHandedOver(item, userId) {
  assert(item.status === ITEM_STATES.RESERVED, 'INVALID_STATE_TRANSITION');
  assert(item.reserved_for === userId, 'NOT_WINNER');

  item.status = ITEM_STATES.HANDED_OVER;
  item.status_changed_at = now();
  return item;
}

export function confirm(item) {
  assert(item.status === ITEM_STATES.HANDED_OVER, 'INVALID_STATE_TRANSITION');

  item.status = ITEM_STATES.CONFIRMED;
  item.status_changed_at = now();
  return item;
}

// ------------------------------
// Expiry / Side Paths
// ------------------------------
export function expire(item) {
  assert(
    item.status === ITEM_STATES.RESERVED || item.status === ITEM_STATES.HANDED_OVER,
    'INVALID_STATE_TRANSITION'
  );

  item.status = ITEM_STATES.EXPIRED;
  item.status_changed_at = now();
  item.flags.push('timeout');
  return item;
}

export function withdraw(item) {
  assert(item.status === ITEM_STATES.ONLINE, 'INVALID_STATE_TRANSITION');

  item.status = ITEM_STATES.WITHDRAWN;
  item.status_changed_at = now();
  return item;
}

export function dispute(item) {
  assert(item.status === ITEM_STATES.HANDED_OVER, 'INVALID_STATE_TRANSITION');

  item.status = ITEM_STATES.DISPUTE;
  item.status_changed_at = now();
  return item;
}
