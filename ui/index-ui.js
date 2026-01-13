// ui/index-ui.js
// =====================================
// Page wiring: Events + Render (V3 – FINAL, backend-driven)
// DOM-sicherer Click-Handler, Fake-Login aktiv, sichtbares Bedarf-Feedback

import { renderItemCard } from './card-render.js';
import { addNeed } from '/lootliste/core/core.js';

// --------------------------------------------------
// State (Frontend-Store)
// --------------------------------------------------
let items = [];
let auth = {
  isLoggedIn: true,        // Fake-Login (DEV)
  userId: 'dev-user'
};

let cardsEl = null; // wird erst nach DOMContentLoaded gesetzt

// --------------------------------------------------
// Init & Render
// --------------------------------------------------
export function initUI(initialItems, initialAuth) {
  items = Array.isArray(initialItems) ? initialItems : [];
  auth = initialAuth || auth;
  render();
}

function render() {
  if (!cardsEl) return;
  cardsEl.innerHTML = items
    .map(item => renderItemCard(item, auth))
    .join('');
}

// --------------------------------------------------
// Backend Load (einzige Datenquelle)
// --------------------------------------------------
async function loadItemsFromBackend() {
  const res = await fetch(
    'https://content-connection-production-ea07.up.railway.app/api/items/public'
  );
  const data = await res.json();

  return Array.isArray(data)
    ? data.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        rating: Number(i.rating) || 0,
        status: i.status || 'available',
        needs: []
      }))
    : [];
}

// --------------------------------------------------
// Click Handling (Event Delegation) – DOM-sicher
// --------------------------------------------------
function bindClickHandler() {
  if (!cardsEl) return;

  cardsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    // AUTH
    if (action === 'auth') {
      openAuthModal();
      return;
    }

    // ADD NEED
    if (action === 'need') {
      const itemId = btn.dataset.item;
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      try {
        // Core-Validierung (Limits, Regeln)
        addNeed(item, auth.userId, items);

        // Sichtbares UI-Feedback (Fallback)
        if (!Array.isArray(item.needs)) item.needs = [];
        if (!item.needs.find(n => n.userId === auth.userId)) {
          item.needs.push({ userId: auth.userId, at: Date.now() });
        }

        render();
      } catch (err) {
        handleNeedError(err);
      }
    }
  });
}

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

// --------------------------------------------------
// Bootstrap (FINAL)
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  cardsEl = document.getElementById('cards');
  bindClickHandler();

  const backendItems = await loadItemsFromBackend();
  initUI(backendItems, auth);
});
