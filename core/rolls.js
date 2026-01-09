// rolls.js — V3 Roll Logic (aligned to core.js)
// =============================================
// Scope: rolling / randomness ONLY
// No UI, no DOM, no timers
// No direct status authority (core.js owns state)

import {
  ITEM_STATUS,
  startRoll as coreStartRoll,
  assert
} from './core.js';

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function roll1to100() {
  return Math.floor(Math.random() * 100) + 1;
}

// --------------------------------------------------
// Execute roll (delegates state changes to core.js)
// --------------------------------------------------
// Preconditions:
// - item.status === NEED_OPEN (core will enforce)
// - item.needs.length >= 1
//
// Result (via core.js):
// - item.roll populated
// - item.winner set
// - status → RESERVED
//
// Returns:
// { winner, results }
export function executeRoll(item) {
  assert(item, 'NO_ITEM');
  assert(Array.isArray(item.needs) && item.needs.length >= 1, 'NO_NEEDS');

  // core.js handles:
  // NEED_OPEN → ROLLING → RESERVED
  coreStartRoll(item);

  return {
    winner: item.winner,
    results: item.roll?.results || []
  };
}

// --------------------------------------------------
// Pure roll helper (optional / test / simulation)
// --------------------------------------------------
// Does NOT touch item, no side effects
export function rollForUsers(userIds = []) {
  assert(Array.isArray(userIds) && userIds.length > 0, 'NO_USERS');

  const results = userIds.map(userId => ({
    userId,
    value: roll1to100()
  }));

  const winner = results.reduce((a, b) =>
    b.value > a.value ? b : a
  );

  return { winner: winner.userId, results };
}
