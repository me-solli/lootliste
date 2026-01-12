// simulation.js — V3 Mini-Simulation (NO UI)
// =====================================
// Purpose: deterministic sanity-check of V3 kernel
// Run manually in browser console or via bundler

import {
  createItem,
  openNeed,
  addNeed,
  confirm,
  ITEM_STATUS
} from './core.js';

import { checkItemTimeout, TIME } from './timeouts.js';

// ------------------------------
// Helpers
// ------------------------------
function log(step, item) {
  console.log(`\n[${step}]`, {
    status: item.status,
    needs: item.needs?.map(n => n.userId),
    winner: item.winner,
    confirmations: item.confirmations,
    flags: item.flags
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ------------------------------
// Simulation
// ------------------------------
export async function runSimulation() {
  console.clear();
  console.log('V3 Simulation start');

  // 1) Create item
  const item = createItem({
    name: 'Test Item',
    type: 'weapon',
    donatedBy: 'giver1'
  });
  log('created', item);

  // 2) Open need window (shortened)
  openNeed(item, 3000); // 3 seconds
  log('need_open', item);

  // 3) Users apply needs
  addNeed(item, 'userA');
  addNeed(item, 'userB');
  addNeed(item, 'userC');
  log('needs_added', item);

  // 4) Wait until need expires → roll auto
  await sleep(3500);
  checkItemTimeout(item);
  log('after_need_timeout', item);

  // 5) Start confirmation
  if (item.status === ITEM_STATUS.RESERVED) {
    startConfirmation(item);
    log('confirm_pending', item);
  }

  // 6) Both sides confirm
  confirm(item, 'giver');
  confirm(item, 'receiver');
  checkItemTimeout(item);
  log('final', item);

  console.log('V3 Simulation end');
}

// Auto-run if desired
// runSimulation();
