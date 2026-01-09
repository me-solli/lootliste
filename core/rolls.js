// =====================================================
// V3 ROLLS – aligned to core.js
// Scope: rolling logic only (no state authority)
// No UI, no DOM, no timers
// =====================================================

import {
  ITEM_STATES,
  startRoll as coreStartRoll,
  reserve,
  assert
} from './core.js';

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function roll1to100() {
  return Math.floor(Math.random() * 100) + 1;
}

// --------------------------------------------------
// Start roll phase (delegated to core)
// --------------------------------------------------
export function startRoll(item) {
  assert(item, 'NO_ITEM');
  assert(Array.isArray(item.needs) && item.needs.length >= 1, 'NO_NEEDS');

  // core enforces correct state (NEED_CLOSED)
  return coreStartRoll(item);
}

// --------------------------------------------------
// Execute roll & determine winner
// --------------------------------------------------
// Rules:
// - item must be in ROLL_PHASE
// - rolls 1–100 per need
// - highest roll wins
// - ties reroll among tied users only
//
// Mutates (via core):
// - item.status
// - item.reserved_for
// - item.rolls[]
//
// Returns:
// { winner, rolls }
export function executeRoll(item) {
  assert(item, 'NO_ITEM');
  assert(item.status === ITEM_STATES.ROLL_PHASE, 'INVALID_STATE');
  assert(Array.isArray(item.needs) && item.needs.length >= 1, 'NO_NEEDS');

  let contenders = [...item.needs];
  let rolls = {};

  while (true) {
    rolls = {};
    let highest = 0;

    contenders.forEach(userId => {
      const value = roll1to100();
      rolls[userId] = value;
      if (value > highest) highest = value;
    });

    const top = contenders.filter(u => rolls[u] === highest);

    // unique winner
    if (top.length === 1) {
      const winner = top[0];

      // persist roll history (optional but future-proof)
      if (!Array.isArray(item.rolls)) item.rolls = [];
      item.rolls.push({ at: Date.now(), rolls });

      // delegate reservation to core
      reserve(item, winner);

      return { winner, rolls };
    }

    // tie → reroll among tied users
    contenders = top;
  }
}
