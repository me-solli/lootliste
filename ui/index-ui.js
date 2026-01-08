// index-ui.js — V3 UI Hook (minimal, no polish)
// ============================================
// Connects DOM actions to V3 core logic.

import { createSubmittedItem, toOnline } from '../core/core.js';
import { registerNeed } from '../core/needs.js';
import { executeRoll } from '../core/rolls.js';
import { autoCloseNeed } from '../core/timeouts.js';

// ------------------------------
// TEMP: In-memory store (SIM MODE)
// ------------------------------
const store = {
  items: [],
  needs: []
};

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
// Submission (example hook)
// ------------------------------
export function submitItem({ name, type, agreedFairplay }) {
  const userId = getCurrentUserId();

  const item = createSubmittedItem({
    name,
    type,
    submittedBy: userId,
    agreedFairplay
  });

  toOnline(item);
  store.items.push(item);

  return item;
}

// ------------------------------
// Need registration (example hook)
// ------------------------------
export function clickNeed(itemId, durationMs) {
  const userId = getCurrentUserId();
  const item = getItemById(itemId);

  const { item: updatedItem, need } = registerNeed({
    item,
    needs: store.needs,
    userId,
    durationMs,
    submittedBy: item.submitted_by
  });

  store.needs.push(need);
  return { item: updatedItem, need };
}

// ------------------------------
// Tick (manual or interval)
// ------------------------------
export function tick() {
  store.items.forEach(item => {
    autoCloseNeed(item);
  });
}

// ------------------------------
// Roll trigger (example)
// ------------------------------
export function runRoll(itemId) {
  const item = getItemById(itemId);
  const needsForItem = store.needs.filter(n => n.item_id === itemId);

  return executeRoll({ item, needs: needsForItem });
}
