// core.js — V3 Core Logic (GUARDED & STABLE)
// ======================================
// Single Source of Truth for item states, transitions and guards.
// Bedarf ist eine PHASE innerhalb von AVAILABLE (kein eigener Status).

// --------------------------------------------------
// Status Enum (V3 – FINAL)
// --------------------------------------------------
export const ITEM_STATUS = Object.freeze({
  AVAILABLE: 'available',      // inkl. Bedarf-Phase
  RESERVED: 'reserved',        // Gewinner festgelegt
  COMPLETED: 'completed',      // beidseitig bestätigt (terminal)
  EXPIRED: 'expired',          // verfallen (terminal)
  ABORTED: 'aborted'           // abgebrochen (terminal)
});

// --------------------------------------------------
// Action Enum
// --------------------------------------------------
export const ITEM_ACTIONS = Object.freeze({
  ADD_NEED: 'addNeed',
  START_ROLL: 'startRoll',
  CONFIRM: 'confirm',
  ABORT: 'abort'
});

// --------------------------------------------------
// State → Allowed Actions
// --------------------------------------------------
const STATE_ACTION_MAP = Object.freeze({
  [ITEM_STATUS.AVAILABLE]: [
    ITEM_ACTIONS.ADD_NEED,
    ITEM_ACTIONS.START_ROLL
  ],

  [ITEM_STATUS.RESERVED]: [
    ITEM_ACTIONS.CONFIRM,
    ITEM_ACTIONS.ABORT
  ],

  [ITEM_STATUS.COMPLETED]: [],
  [ITEM_STATUS.EXPIRED]: [],
  [ITEM_STATUS.ABORTED]: []
});

// --------------------------------------------------
// Guards / Utils
// --------------------------------------------------
export function canPerformAction(item, action) {
  return !!STATE_ACTION_MAP[item.status]?.includes(action);
}

export function now() {
  return Date.now();
}

function uuid() {
  return crypto.randomUUID();
}

function random1to100() {
  return Math.floor(Math.random() * 100) + 1;
}

// --------------------------------------------------
// Bedarf-Konstanten
// --------------------------------------------------
export const NEED_LIMIT = 5;      // max. Bedarf pro Item
export const USER_NEED_LIMIT = 3; // max. offene Bedarfe pro User

// --------------------------------------------------
// Item Factory
// --------------------------------------------------
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
    needs: [], // [{ userId, at }]

    // Roll / Vergabe
    roll: null,
    winner: null,

    archived: false,
    visible: true
  };
}

// --------------------------------------------------
// Bedarf-Helper
// --------------------------------------------------
export function isNeedOpen(item) {
  return item.status === ITEM_STATUS.AVAILABLE
      && item.needs.length < NEED_LIMIT;
}

export function countOpenNeeds(items, userId) {
  return items.filter(item => {
    if (item.status !== ITEM_STATUS.AVAILABLE) return false;
    return item.needs.some(n => n.userId === userId);
  }).length;
}

// --------------------------------------------------
// Actions
// --------------------------------------------------
export function addNeed(item, userId, allItems = []) {
  if (!canPerformAction(item, ITEM_ACTIONS.ADD_NEED)) return item;

  if (!isNeedOpen(item)) throw new Error('NEED_CLOSED');

  const exists = item.needs.some(n => n.userId === userId);
  if (exists) throw new Error('ALREADY_REQUESTED');

  const openCount = countOpenNeeds(allItems, userId);
  if (openCount >= USER_NEED_LIMIT) throw new Error('USER_NEED_LIMIT');

  item.needs.push({ userId, at: now() });
  return item;
}

export function startRoll(item) {
  if (!canPerformAction(item, ITEM_ACTIONS.START_ROLL)) return item;
  if (item.needs.length === 0) throw new Error('NO_NEEDS');

  item.roll = item.needs.map(n => ({
    userId: n.userId,
    value: random1to100()
  }));

  const winner = item.roll.reduce((a, b) => b.value > a.value ? b : a);
  item.winner = winner.userId;

  item.status = ITEM_STATUS.RESERVED;
  item.statusChangedAt = now();
  return item;
}

export function confirm(item) {
  if (!canPerformAction(item, ITEM_ACTIONS.CONFIRM)) return item;

  item.status = ITEM_STATUS.COMPLETED;
  item.statusChangedAt = now();
  item.archived = true;
  item.visible = false;
  return item;
}

export function abort(item) {
  if (!canPerformAction(item, ITEM_ACTIONS.ABORT)) return item;

  item.status = ITEM_STATUS.ABORTED;
  item.statusChangedAt = now();
  item.archived = true;
  item.visible = false;
  return item;
}
