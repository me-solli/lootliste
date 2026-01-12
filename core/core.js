// core.js — V3 Core Logic (GUARDED & STABLE)
// ======================================
// Single Source of Truth for item states, transitions and guards.
// NO UI, NO DOM access. UI must only call these functions.

// --------------------------------------------------
// Status Enum (V3 – FINAL, canonical)
// --------------------------------------------------
export const ITEM_STATUS = Object.freeze({
  AVAILABLE: 'available',              // frisch gespendet
  NEED_OPEN: 'need_open',               // Bedarf offen (24h)
  ROLLING: 'rolling',                   // Würfelphase
  RESERVED: 'reserved',                 // Gewinner festgelegt
  HANDOVER_PENDING: 'handover_pending', // Übergabe läuft
  COMPLETED: 'completed',               // beidseitig bestätigt (terminal)
  EXPIRED: 'expired',                   // verfallen (terminal)
  ABORTED: 'aborted'                    // bewusst abgebrochen (terminal)
});

// --------------------------------------------------
// Action Enum (system-wide)
// --------------------------------------------------
export const ITEM_ACTIONS = Object.freeze({
  OPEN_NEED: 'openNeed',
  ADD_NEED: 'addNeed',
  START_ROLL: 'startRoll',
  START_HANDOVER: 'startHandover',
  CONFIRM: 'confirm',
  ABORT: 'abort'
});

// --------------------------------------------------
// State → Allowed Actions (Single Source of Truth)
// --------------------------------------------------
const STATE_ACTION_MAP = Object.freeze({
  [ITEM_STATUS.AVAILABLE]: [
    ITEM_ACTIONS.OPEN_NEED
  ],

  [ITEM_STATUS.NEED_OPEN]: [
    ITEM_ACTIONS.ADD_NEED,
    ITEM_ACTIONS.START_ROLL
  ],

  [ITEM_STATUS.ROLLING]: [
    // internal only – no direct UI action
  ],

  [ITEM_STATUS.RESERVED]: [
    ITEM_ACTIONS.START_HANDOVER,
    ITEM_ACTIONS.ABORT
  ],

  [ITEM_STATUS.HANDOVER_PENDING]: [
    ITEM_ACTIONS.CONFIRM,
    ITEM_ACTIONS.ABORT
  ],

  [ITEM_STATUS.COMPLETED]: [],
  [ITEM_STATUS.EXPIRED]: [],
  [ITEM_STATUS.ABORTED]: []
});

// --------------------------------------------------
// Logging (minimal, internal)
// --------------------------------------------------
const LOG_LEVELS = Object.freeze({
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
});

function logEvent(level, type, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    type,
    ...payload
  };

  if (level === LOG_LEVELS.ERROR) {
    console.error('[SYSTEM]', entry);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn('[SYSTEM]', entry);
  } else {
    console.info('[SYSTEM]', entry);
  }
}

// --------------------------------------------------
// Guards
// --------------------------------------------------
export function canPerformAction(item, action) {
  if (!item || !item.status) {
    logEvent(LOG_LEVELS.WARN, 'invalid_item', { action, item });
    return false;
  }

  const allowed = STATE_ACTION_MAP[item.status];

  if (!allowed) {
    logEvent(LOG_LEVELS.ERROR, 'unknown_status', {
      itemId: item.id,
      status: item.status
    });
    return false;
  }

  const ok = allowed.includes(action);

  if (!ok) {
    logEvent(LOG_LEVELS.INFO, 'action_blocked', {
      itemId: item.id,
      status: item.status,
      action
    });
  }

  return ok;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------
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

// --------------------------------------------------
// Optional completion hook (XP / Stats später)
// --------------------------------------------------
let onItemCompleted = null;

export function registerOnItemCompleted(fn) {
  onItemCompleted = fn;
}

// --------------------------------------------------
// Item Factory
// --------------------------------------------------
export function createItem({ name, type, donatedBy }) {
  return normalizeItem({
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
  });
}

// --------------------------------------------------
// Status setter (logging enforced)
// --------------------------------------------------
function setStatus(item, status) {
  const from = item.status;
  item.status = status;
  item.statusChangedAt = now();

  logEvent(LOG_LEVELS.INFO, 'status_changed', {
    itemId: item.id,
    from,
    to: status
  });
}

// --------------------------------------------------
// Self-Healing / Normalization
// --------------------------------------------------
const DEFAULT_STATUS = ITEM_STATUS.AVAILABLE;

export function normalizeItem(item) {
  if (!item) return null;

  if (!item.status || !STATE_ACTION_MAP[item.status]) {
    logEvent(LOG_LEVELS.WARN, 'status_normalized', {
      itemId: item.id,
      from: item.status,
      to: DEFAULT_STATUS
    });
    item.status = DEFAULT_STATUS;
    item.statusChangedAt = now();
  }

  return item;
}

export function reconcileItem(item) {
  if (!item) return item;

  if (item.status === ITEM_STATUS.ROLLING && (!item.needs || item.needs.length === 0)) {
    logEvent(LOG_LEVELS.WARN, 'state_reconciled', {
      itemId: item.id,
      from: ITEM_STATUS.ROLLING,
      to: ITEM_STATUS.EXPIRED,
      reason: 'no_needs'
    });
    expireItem(item);
  }

  if (item.status === ITEM_STATUS.HANDOVER_PENDING && !item.winner) {
    logEvent(LOG_LEVELS.WARN, 'state_reconciled', {
      itemId: item.id,
      from: ITEM_STATUS.HANDOVER_PENDING,
      to: ITEM_STATUS.EXPIRED,
      reason: 'missing_winner'
    });
    expireItem(item);
  }

  return item;
}

// --------------------------------------------------
// Central transition handler (Phase 5–7)
// --------------------------------------------------
export function transitionItem(item, event) {
  normalizeItem(item);

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

// --------------------------------------------------
// Lifecycle helpers
// --------------------------------------------------
function expireItem(item) {
  setStatus(item, ITEM_STATUS.EXPIRED);

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

// --------------------------------------------------
// Phase 1–4 Logic (auto)
// --------------------------------------------------
export function updateItemStatus(item, ts = now()) {
  normalizeItem(item);

  if (item.status === ITEM_STATUS.NEED_OPEN && ts > item.needUntil) {
    if (item.needs.length > 0) {
      startRoll(item);
    } else {
      expireItem(item);
    }
  }

  return item;
}

// --------------------------------------------------
// Actions / Events (UI must call only these)
// --------------------------------------------------
export function openNeed(item, durationMs) {
  if (!canPerformAction(item, ITEM_ACTIONS.OPEN_NEED)) return item;

  setStatus(item, ITEM_STATUS.NEED_OPEN);
  item.needUntil = now() + durationMs;
  return item;
}

export function addNeed(item, userId) {
  if (!canPerformAction(item, ITEM_ACTIONS.ADD_NEED)) return item;

  const exists = item.needs.some(n => n.userId === userId);
  assert(!exists, 'ALREADY_REQUESTED');

  item.needs.push({ userId, at: now() });
  return item;
}

export function startRoll(item) {
  if (!canPerformAction(item, ITEM_ACTIONS.START_ROLL)) return item;

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
  if (!canPerformAction(item, ITEM_ACTIONS.START_HANDOVER)) return item;

  transitionItem(item, 'select_handover');
  return item;
}

export function confirm(item, role) {
  if (!canPerformAction(item, ITEM_ACTIONS.CONFIRM)) return item;
  assert(role === 'giver' || role === 'receiver', 'INVALID_ROLE');

  item.confirmations[role] = true;
  transitionItem(item, 'confirm');
  return item;
}

export function abort(item) {
  if (!canPerformAction(item, ITEM_ACTIONS.ABORT)) return item;

  transitionItem(item, 'abort');
  return item;
}
