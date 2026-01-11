// core.js — V3 Core Logic (STATUS-ENGINE)
// ======================================
// Single Source of Truth for item states, transitions and guards.
// NO UI, NO DOM access. UI must only call these functions.

// ------------------------------
// Status Enum (V3 – final)
// ------------------------------
export const ITEM_STATUS = Object.freeze({
  AVAILABLE: 'available',              // frisch gespendet
  NEED_OPEN: 'need_open',               // 24h Bedarf offen
  ROLLING: 'rolling',                   // Würfelphase
  RESERVED: 'reserved',                 // Gewinner festgelegt
  CONFIRM_PENDING: 'confirm_pending',   // Übergabe läuft
  ASSIGNED: 'assigned',                 // beidseitig bestätigt
  EXPIRED: 'expired',                   // abgelaufen
  FLAGGED: 'flagged'                    // Soft-Dupe / Auffällig
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

function uuid() {
  return crypto.randomUUID();
}

function random1to100() {
  return Math.floor(Math.random() * 100) + 1;
}

// ------------------------------
// Item Factory
// ------------------------------
export function createItem({
  name,
  type,
  donatedBy
}) {
  return {
    id: uuid(),
    name,
    type,

    donatedBy,
    donatedAt: now(),

    status: ITEM_STATUS.AVAILABLE,
    statusChangedAt: now(),

    // Bedarf
    needUntil: null,
    needs: [], // [{ userId, at }]

    // Roll / Vergabe
    roll: null, // { at, results: [{ userId, value }] }
    winner: null,

    confirmations: {
      giver: false,
      receiver: false
    },

    flags: []
  };
}

// ------------------------------
// Status Engine (auto transitions)
// ------------------------------
export function updateItemStatus(item, ts = now()) {
  // Bedarf abgelaufen
  if (item.status === ITEM_STATUS.NEED_OPEN && ts > item.needUntil) {
    if (item.needs.length > 0) {
      startRoll(item);
    } else {
      setStatus(item, ITEM_STATUS.EXPIRED);
    }
  }

  // Übergabe abgeschlossen
  if (item.status === ITEM_STATUS.CONFIRM_PENDING) {
    if (item.confirmations.giver && item.confirmations.receiver) {
      setStatus(item, ITEM_STATUS.ASSIGNED);
    }
  }

  return item;
}

// ------------------------------
// Internal helper
// ------------------------------
function setStatus(item, status) {
  item.status = status;
  item.statusChangedAt = now();
}

// ------------------------------
// Actions / Events
// ------------------------------

// Bedarf öffnen (z. B. 24h)
export function openNeed(item, durationMs) {
  assert(item.status === ITEM_STATUS.AVAILABLE, 'INVALID_STATE');

  setStatus(item, ITEM_STATUS.NEED_OPEN);
  item.needUntil = now() + durationMs;
  return item;
}

// ------------------------------
// Phase 3 (LIGHT): Würfeln visuell starten
// KEIN RNG, KEIN Timer, NUR Statuswechsel
// ------------------------------
export function startRollingVisual(item) {
  assert(item.status === ITEM_STATUS.NEED_OPEN, 'INVALID_STATE');

  item.status = ITEM_STATUS.ROLLING;
  item.statusChangedAt = now();

  return item;
}

// Bedarf anmelden
export function addNeed(item, userId) {
  assert(item.status === ITEM_STATUS.NEED_OPEN, 'NEED_NOT_OPEN');

  const exists = item.needs.some(n => n.userId === userId);
  assert(!exists, 'ALREADY_REQUESTED');

  item.needs.push({ userId, at: now() });
  return item;
}

// Würfeln starten (automatisch)
export function startRoll(item) {
  assert(item.status === ITEM_STATUS.NEED_OPEN, 'INVALID_STATE');

  setStatus(item, ITEM_STATUS.ROLLING);

  item.roll = {
    at: now(),
    results: item.needs.map(n => ({
      userId: n.userId,
      value: random1to100()
    }))
  };

  const winner = item.roll.results.reduce((a, b) =>
    b.value > a.value ? b : a
  );

  item.winner = winner.userId;

  setStatus(item, ITEM_STATUS.RESERVED);
  return item;
}

// Übergabe starten
export function startConfirmation(item) {
  assert(item.status === ITEM_STATUS.RESERVED, 'INVALID_STATE');

  setStatus(item, ITEM_STATUS.CONFIRM_PENDING);
  return item;
}

// Übergabe bestätigen
export function confirm(item, role) {
  assert(item.status === ITEM_STATUS.CONFIRM_PENDING, 'INVALID_STATE');
  assert(role === 'giver' || role === 'receiver', 'INVALID_ROLE');

  item.confirmations[role] = true;
  return item;
}

// ------------------------------
// Flags / Side paths
// ------------------------------
export function flagItem(item, reason) {
  if (!item.flags.includes(reason)) {
    item.flags.push(reason);
  }

  if (item.status !== ITEM_STATUS.ASSIGNED) {
    setStatus(item, ITEM_STATUS.FLAGGED);
  }

  return item;
}
