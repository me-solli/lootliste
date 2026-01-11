// core.js — V3 Core Logic (FINAL)
// ======================================
// Single Source of Truth for item states, transitions and guards.
// NO UI, NO DOM access. UI must only call these functions.

// ------------------------------
// Status Enum (V3 – FINAL)
// ------------------------------
export const ITEM_STATUS = Object.freeze({
  AVAILABLE: 'available',          // frisch gespendet
  NEED_OPEN: 'need_open',           // Bedarf offen (24h)
  ROLLING: 'rolling',               // Würfelphase
  RESERVED: 'reserved',             // Gewinner festgelegt
  HANDOVER_PENDING: 'handover_pending', // Übergabe läuft
  COMPLETED: 'completed',           // beidseitig bestätigt
  EXPIRED: 'expired',               // verfallen (terminal)
  ABORTED: 'aborted'                // bewusst abgebrochen (terminal)
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
// Optional completion hook (XP / Stats später)
// ------------------------------
let onItemCompleted = null;

export function registerOnItemCompleted(fn) {
  onItemCompleted = fn;
}

// ------------------------------
// Item Factory
// ------------------------------
export function createItem({ name, type, donatedBy }) {
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
    roll: null, // { at, results }
    winner: null,

    // Übergabe
    confirmations: {
      giver: false,
      receiver: false
    },

    // Sichtbarkeit / Archiv
    archived: false,
    visible: true
  };
}

// ------------------------------
// Internal status setter
// ------------------------------
function setStatus(item, status) {
  item.status = status;
  item.statusChangedAt = now();
}

// ------------------------------
// Central transition handler (Phase 5–7)
// ------------------------------
export function transitionItem(item, event) {
  const status = item.status;

  if (status === ITEM_STATUS.RESERVED) {
    if (event === 'select_handover') {
      setStatus(item, ITEM_STATUS.HANDOVER_PENDING);
      return item;
    }
    if (event === 'timeout') {
      expireItem(item);
      return item;
    }
    if (event === 'abort') {
      abortItem(item);
      return item;
    }
  }

  if (status === ITEM_STATUS.HANDOVER_PENDING) {
    if (event === 'confirm') {
      if (item.confirmations.giver && item.confirmations.receiver) {
        completeItem(item);
      }
      return item;
    }
    if (event === 'timeout') {
      expireItem(item);
      return item;
    }
    if (event === 'abort') {
      abortItem(item);
      return item;
    }
  }

  return item; // no-op
}

// ------------------------------
// Lifecycle helpers
// ------------------------------
function expireItem(item) {
  setStatus(item, ITEM_STATUS.EXPIRED);

  // Cleanup – keine Datenleichen
  item.winner = null;
  item.roll = null;
  item.confirmations.giver = false;
  item.confirmations.receiver = false;

  item.archived = true;
  item.visible = false;
}

function completeItem(item) {
  setStatus(item, ITEM_STATUS.COMPLETED);

  item.archived = true;
  item.visible = false;

  if (typeof onItemCompleted === 'function') {
    onItemCompleted(item);
  }
}

function abortItem(item) {
  setStatus(item, ITEM_STATUS.ABORTED);
  item.archived = true;
  item.visible = false;
}

// ------------------------------
// Phase 1–4 Logic (auto)
// ------------------------------
export function updateItemStatus(item, ts = now()) {
  if (item.status === ITEM_STATUS.NEED_OPEN && ts > item.needUntil) {
    if (item.needs.length > 0) {
      startRoll(item);
    } else {
      expireItem(item);
    }
  }

  return item;
}

// ------------------------------
// Actions / Events (UI calls only these)
// ------------------------------

export function openNeed(item, durationMs) {
  assert(item.status === ITEM_STATUS.AVAILABLE, 'INVALID_STATE');

  setStatus(item, ITEM_STATUS.NEED_OPEN);
  item.needUntil = now() + durationMs;
  return item;
}

export function addNeed(item, userId) {
  assert(item.status === ITEM_STATUS.NEED_OPEN, 'NEED_NOT_OPEN');

  const exists = item.needs.some(n => n.userId === userId);
  assert(!exists, 'ALREADY_REQUESTED');

  item.needs.push({ userId, at: now() });
  return item;
}

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

export function startHandover(item) {
  assert(item.status === ITEM_STATUS.RESERVED, 'INVALID_STATE');
  transitionItem(item, 'select_handover');
  return item;
}

export function confirm(item, role) {
  assert(item.status === ITEM_STATUS.HANDOVER_PENDING, 'INVALID_STATE');
  assert(role === 'giver' || role === 'receiver', 'INVALID_ROLE');

  item.confirmations[role] = true;
  transitionItem(item, 'confirm');
  return item;
}

export function abort(item) {
  transitionItem(item, 'abort');
  return item;
}
