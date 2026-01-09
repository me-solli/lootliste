/* =====================================================
   V3 CORE – NEEDS / BEDARF
   Scope: Bedarf anmelden & Bedarf-Phase öffnen
   Freeze: V3-Systemregeln
   Keine UI, kein DOM, keine Timer
===================================================== */

import { ITEM_STATUS, TIME } from './timeouts.js';

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function now() {
  return Date.now();
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

function hasNeed(item, userId) {
  return Array.isArray(item.needs) && item.needs.includes(userId);
}

// --------------------------------------------------
// Bedarf anmelden (Public API)
// --------------------------------------------------
// Regeln:
// - nur aus "verfügbar" oder bestehendem "bedarf_offen"
// - Einreicher darf kein Bedarf anmelden
// - ein Bedarf pro User
// - erster Bedarf startet die 24h-Phase
//
// Mutiert:
// - item.status
// - item.needStartedAt
// - item.needs
//
// Rückgabe:
// { item, opened: boolean }
export function applyNeed({ item, userId, submittedBy }) {
  assert(item, 'NO_ITEM');
  assert(userId, 'NO_USER');
  assert(userId !== submittedBy, 'CANNOT_NEED_OWN_ITEM');

  // Initialisieren
  if (!Array.isArray(item.needs)) item.needs = [];

  // Status-Guard
  assert(
    item.status === ITEM_STATUS.AVAILABLE ||
    item.status === ITEM_STATUS.NEED_OPEN,
    'INVALID_STATE'
  );

  // Duplikat verhindern
  assert(!hasNeed(item, userId), 'NEED_ALREADY_EXISTS');

  let opened = false;

  // Erster Bedarf öffnet die Phase
  if (item.status === ITEM_STATUS.AVAILABLE) {
    item.status = ITEM_STATUS.NEED_OPEN;
    item.needStartedAt = now();
    opened = true;
  }

  // Bedarf speichern (nur User-ID, minimal & backend-ready)
  item.needs.push(userId);

  return { item, opened };
}

// --------------------------------------------------
// Bedarf schließen – reine Zustandsprüfung
// (wird von timeouts.js genutzt)
// --------------------------------------------------
export function canCloseNeed(item) {
  if (item.status !== ITEM_STATUS.NEED_OPEN) return false;
  if (!item.needStartedAt) return false;

  return now() - item.needStartedAt >= TIME.NEED_DURATION;
}
