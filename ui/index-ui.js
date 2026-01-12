// ui/index-ui.js
// =====================================
// Page wiring: Events + Render

import { renderItemCard } from './card-render.js';
import { addNeed } from '../core/core.js';

// --------------------------------------------------
// State (vereinfachter Frontend-Store)
// --------------------------------------------------
let items = [];
let auth = {
  isLoggedIn: false,
  userId: null
};

const cardsEl = document.getElementById('cards');

// --------------------------------------------------
// Initial Render
// --------------------------------------------------
export function initUI(initialItems, initialAuth) {
  items = initialItems;
  auth = initialAuth;
  render();
}

function render() {
  cardsEl.innerHTML = items
    .map(item => renderItemCard(item, auth))
    .join('');
}

// --------------------------------------------------
// Global Click Handling (Event Delegation)
// --------------------------------------------------
cardsEl.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  // -------------------------------
  // AUTH
  // -------------------------------
  if (action === 'auth') {
    openAuthModal();
    return;
  }

  // -------------------------------
  // ADD NEED
  // -------------------------------
  if (action === 'need') {
    const itemId = btn.dataset.item;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    try {
      addNeed(item, auth.userId, items);
      render();
    } catch (err) {
      handleNeedError(err);
    }
  }
});

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function openAuthModal() {
  document.dispatchEvent(new CustomEvent('auth:open'));
}

function handleNeedError(err) {
  switch (err.message) {
    case 'USER_NEED_LIMIT':
      alert('Du hast bereits zu viele offene Bedarfe.');
      break;
    case 'ALREADY_REQUESTED':
      alert('Du hast hier bereits Bedarf angemeldet.');
      break;
    case 'NEED_CLOSED':
      alert('Der Bedarf ist bereits abgeschlossen.');
      break;
    default:
      console.error(err);
  }
}
