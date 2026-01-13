// index-ui.js — V3 UI Hook (CLEAN & ALIGNED)
// ==========================================
// Connects UI actions to V3 core logic.
// No legacy V2 calls. No hidden state transitions.

import {
  createItem,
  openNeed,
  addNeed,
  startConfirmation,
  confirm,
  ITEM_STATUS,
  hydrateItem,
  updateItemStatus
} from '../core/core.js';

import { checkAllTimeouts } from '../core/timeouts.js';
import { executeRoll } from '../core/rolls.js';

// ------------------------------
// In-memory store (UI layer only)
// ------------------------------
const store = {
  items: []
};

// ------------------------------
// Init / Hydration (V3)
// ------------------------------
export function initStore(items = []) {
  store.items = items;

  store.items.forEach(item => {
    hydrateItem(item);        // restore persisted state
    updateItemStatus(item);   // apply auto transitions once
  });

  return store.items;
}

// ------------------------------
// Helpers
// ------------------------------
function getCurrentUserId() {
  // TODO: replace with real auth
  return 'user_demo_1';
}

function getItemById(id) {
  return store.items.find(i => i.id === id);
}

// ------------------------------
// Item submission
// ------------------------------
export function submitItem({ name, type }) {
  const userId = getCurrentUserId();

  const item = createItem({
    name,
    type,
    donatedBy: userId
  });

  store.items.push(item);
  return item;
}

// ------------------------------
// Need registration (current user)
// ------------------------------
export function clickNeed(itemId, durationMs = 24 * 60 * 60 * 1000) {
  const userId = getCurrentUserId();
  const item = getItemById(itemId);

  if (!item) throw new Error('ITEM_NOT_FOUND');

  // first need opens phase
  if (item.status === ITEM_STATUS.AVAILABLE) {
    openNeed(item, durationMs);
  }

  addNeed(item, userId);
  return item;
}

// ------------------------------
// Roll trigger (manual / admin / test)
// ------------------------------
export function runRoll(itemId) {
  const item = getItemById(itemId);
  if (!item) throw new Error('ITEM_NOT_FOUND');

  return executeRoll(item);
}

// ------------------------------
// Start confirmation (after reserve)
// ------------------------------
export function startHandover(itemId) {
  const item = getItemById(itemId);
  if (!item) throw new Error('ITEM_NOT_FOUND');

  startConfirmation(item);
  return item;
}

// ------------------------------
// Confirm handover
// ------------------------------
export function confirmHandover(itemId, role) {
  const item = getItemById(itemId);
  if (!item) throw new Error('ITEM_NOT_FOUND');

  confirm(item, role);
  return item;
}

// ------------------------------
// Tick (manual or interval)
// ------------------------------
export function tick() {
  checkAllTimeouts(store.items);
}

// ------------------------------
// DEV / SIM MODE: expose helpers
// ------------------------------
window.initStore = initStore;
window.submitItem = submitItem;
window.clickNeed = clickNeed;
window.runRoll = runRoll;
window.startHandover = startHandover;
window.confirmHandover = confirmHandover;
window.tick = tick;
