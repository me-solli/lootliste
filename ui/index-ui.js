// index-ui.js — V3 UI Hook (STATE-STABIL)
// =====================================
// UI layer only. No state authority.
// Loads persisted items, forwards user actions to core.

import {
  createItem,
  openNeed,
  addNeed,
  startConfirmation,
  confirm,
  ITEM_STATUS,
  updateItemStatus,
  loadAllItems
} from '../core/core.js';

import { checkAllTimeouts } from '../core/timeouts.js';
import { executeRoll } from '../core/rolls.js';

// ------------------------------
// In-memory store (UI cache only)
// ------------------------------
const store = {
  items: []
};

// ------------------------------
// Init / Load from persistence
// ------------------------------
export function initStore() {
  const items = loadAllItems();

  store.items = items;

  store.items.forEach(item => {
    updateItemStatus(item); // apply auto transitions once
  });

  return store.items;
}

// ------------------------------
// Helpers
// ------------------------------
function getCurrentUserId() {
  // DEV stub – later replaced by auth
  return 'user_demo_1';
}

function getItemById(id) {
  return store.items.find(i => i.id === id);
}

// ------------------------------
// Item submission (REAL creation)
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
// DEV helpers
// ------------------------------

// ------------------------------
// APP START (ENTRY POINT)
// ------------------------------
initStore();

window.initStore = initStore;
window.submitItem = submitItem;
window.clickNeed = clickNeed;
window.runRoll = runRoll;
window.startHandover = startHandover;
window.confirmHandover = confirmHandover;
window.tick = tick;
