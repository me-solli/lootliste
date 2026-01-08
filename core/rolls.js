// rolls.js — V3 Roll / Dice Logic (no UI, no DOM)
// ==========================================
// Handles rolling, tie-breaks, and winner selection.

import { ITEM_STATES, startRoll, reserve } from './core.js';

// ------------------------------
// Helpers
// ------------------------------
function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function rollOnce() {
  // Inclusive 1–100
  return Math.floor(Math.random() * 100) + 1;
}

// ------------------------------
// Roll Factory
// ------------------------------
export function createRoll({ itemId, userId, value }) {
  return {
    id: crypto.randomUUID(),
    item_id: itemId,
    user_id: userId,
    value,
    created_at: Date.now()
  };
}

// ------------------------------
// Execute Roll Phase
// ------------------------------
// Params:
// - item: item object (mutated via core transitions)
// - needs: array of needs for THIS item
//
// Returns:
// { item, rolls, winnerUserId }
export function executeRoll({ item, needs }) {
  // --- Guards ---
  assert(item.status === ITEM_STATES.NEED_CLOSED, 'INVALID_STATE');
  assert(needs.length >= 1, 'NO_NEEDS');

  // --- Enter roll phase ---
  startRoll(item);

  // --- Initial rolls ---
  let rolls = needs.map(n =>
    createRoll({
      itemId: item.id,
      userId: n.user_id,
      value: rollOnce()
    })
  );

  // --- Determine highest ---
  let max = Math.max(...rolls.map(r => r.value));
  let top = rolls.filter(r => r.value === max);

  // --- Tie-break loop (immediate) ---
  while (top.length > 1) {
    const tieRolls = top.map(r =>
      createRoll({
        itemId: item.id,
        userId: r.user_id,
        value: rollOnce()
      })
    );

    rolls = rolls.concat(tieRolls);

    max = Math.max(...tieRolls.map(r => r.value));
    top = tieRolls.filter(r => r.value === max);
  }

  const winnerUserId = top[0].user_id;

  // --- Reserve item for winner ---
  reserve(item, winnerUserId);

  return { item, rolls, winnerUserId };
}
