// ui/index-ui.js
// =====================================
// Page wiring: Events + Render (V3 – FINAL, backend-driven)
// Fake-Login aktiv (dev-user). Keine Test-Items. Ein Einstiegspunkt.

import { renderItemCard } from './card-render.js';
import { addNeed } from '/lootliste/core/core.js';

// --------------------------------------------------
// State (Frontend-Store)
// --------------------------------------------------
let items = [];
let auth = {
  isLoggedIn: true,
  userId: 'dev-user'
};

const cardsEl = document.getElementById('cards');

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

  // V3-minimales Mapping (UI/Core-kompatibel)
  return Array.isArray(data)
    ? data.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        rating: Number(i.rating) || 0,
        status: i.status || 'available',
        needs: [] // Bedarf startet leer (V3)
      }))
    : [];
}

// --------------------------------------------------
// Global Click Handling (Event Delegation)
// --------------------------------------------------
if (cardsEl) {
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
        addNeed(item, auth.userId, items);
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
  const backendItems = await loadItemsFromBackend();
  initUI(backendItems, auth);
});
