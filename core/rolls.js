/* =====================================================
   V3 CORE – ROLLS / WÜRFELPHASE
   Scope: Würfeln & Gewinnerermittlung
   Freeze: V3-Systemregeln
   Keine UI, kein DOM, keine Timer
===================================================== */

import { ITEM_STATUS } from './timeouts.js';

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function now() {
  return Date.now();
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function roll1to100() {
  return Math.floor(Math.random() * 100) + 1;
}

// --------------------------------------------------
// Start Roll-Phase
// --------------------------------------------------
// Regeln:
// - nur aus bedarf_offen
// - mindestens 1 Bedarf
//
// Mutiert:
// - item.status
// - item.rollStartedAt
export function startRoll(item) {
  assert(item, 'NO_ITEM');
  assert(item.status === ITEM_STATUS.NEED_OPEN, 'INVALID_STATE');
  assert(Array.isArray(item.needs) && item.needs.length >= 1, 'NO_NEEDS');

  item.status = ITEM_STATUS.ROLL_PHASE;
  item.rollStartedAt = now();

  return item;
}

// --------------------------------------------------
// Execute Roll & Pick Winner
// --------------------------------------------------
// Regeln:
// - nur aus würfel_phase
// - würfelt 1–100 pro Bedarf
// - höchster Wurf gewinnt
// - Gleichstand → erneut würfeln (nur zwischen Tied-Usern)
//
// Mutiert:
// - item.status
// - item.reservedAt
// - item.winner
//
// Rückgabe:
// { winner, rolls }
export function executeRoll(item) {
  assert(item, 'NO_ITEM');
  assert(item.status === ITEM_STATUS.ROLL_PHASE, 'INVALID_STATE');
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

    // eindeutiger Gewinner
    if (top.length === 1) {
      const winner = top[0];

      item.winner = winner;
      item.status = ITEM_STATUS.RESERVED;
      item.reservedAt = now();

      return { winner, rolls };
    }

    // Gleichstand → nur mit den Tied-Usern neu würfeln
    contenders = top;
  }
}
