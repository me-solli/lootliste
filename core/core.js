// core.js — V3 Core Logic (STATUS-ENGINE)
// ======================================
// Single Source of Truth for item states, transitions and guards.
// NO UI, NO DOM access (except localStorage for persistence).
// UI must only call these functions.

// ------------------------------
// Storage (V3)
// ------------------------------
const STORAGE_KEY = 'lootliste_v3_items';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function persistItem(item) {
  const store = loadStore();

  store[item.id] = {
    status: item.status,
    statusChangedAt: item.statusChangedAt,

    // Bedarf
    needUntil: item.needUntil,
    needs: item.needs,

    // Roll / Vergabe
    roll: item.roll,
    winner: item.winner,

    confirmations: item.confirmations,
    flags: item.flags
  };

  saveStore(store);
}

export function hydrateItem(item) {
  const store = loadStore();
  const saved = store[item.id];
  if (!saved) return item;

  Object.assign(item, saved);
  return item;
}

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
  const item = {
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

  persistItem(item);
  return item;
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

  persistItem(item);
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

  persistItem(item);
  return item;
}

// Bedarf anmelden
export function addNeed(item, userId) {
  assert(item.status === ITEM_STATUS.NEED_OPEN, 'NEED_NOT_OPEN');

  const exists = item.needs.some(n => n.userId === userId);
  assert(!exists, 'ALREADY_REQUESTED');

  item.needs.push({ userId, at: now() });

  persistItem(item);
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

  persistItem(item);
  return item;
}

// Übergabe starten
export function startConfirmation(item) {
  assert(item.status === ITEM_STATUS.RESERVED, 'INVALID_STATE');

  setStatus(item, ITEM_STATUS.CONFIRM_PENDING);

  persistItem(item);
  return item;
}

// Übergabe bestätigen
export function confirm(item, role) {
  assert(item.status === ITEM_STATUS.CONFIRM_PENDING, 'INVALID_STATE');
  assert(role === 'giver' || role === 'receiver', 'INVALID_ROLE');

  item.confirmations[role] = true;

  persistItem(item);
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

  persistItem(item);
  return item;
}
