// ui/index-ui.js
// =====================================
// Page wiring: Events + Render
// V3 – Core-driven (Single Source of Truth)
// UI rendert ausschließlich Core-State
// =====================================

import { renderItemCard } from './card-render.js';
import { addNeed } from '/lootliste/core/core.js';

// --------------------------------------------------
// Frontend State (nur Referenzen, keine Logik)
// --------------------------------------------------
let items = [];
let auth = {
  isLoggedIn: true,   // DEV / Fake-Login
  userId: 'dev-user'
};

let cardsEl = null;

// --------------------------------------------------
// Render
// --------------------------------------------------
function render() {
  if (!cardsEl) return;
  cardsEl.innerHTML = items
    .map(item => renderItemCard(item, auth))
    .join('');
}

// --------------------------------------------------
// Backend Load (Single Source of Data)
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
        needs: Array.isArray(i.needs) ? i.needs : []
      }))
    : [];
}

// --------------------------------------------------
// Click Handling (Event Delegation)
// --------------------------------------------------
function bindClickHandler() {
  if (!cardsEl) return;

  cardsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    // -----------------------------
    // Bedarf anmelden
    // -----------------------------
    if (action === 'need') {
      const itemId = btn.dataset.item;
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      try {
        // 🔒 EINZIGE Mutation: Core
        addNeed(item, auth.userId, items);

        // UI rendert nur Ergebnis
        render();
      } catch (err) {
        handleNeedError(err);
      }
    }
  });
}

// --------------------------------------------------
// Error Handling (User Feedback)
// --------------------------------------------------
function handleNeedError(err) {
  switch (err.message) {
    case 'USER_NEED_LIMIT':
      alert('Du hast bereits zu viele offene Bedarfe.');
      break;
    case 'ALREADY_REQUESTED':
      alert('Du hast für dieses Item bereits Bedarf angemeldet.');
      break;
    case 'NEED_CLOSED':
      alert('Der Bedarf für dieses Item ist geschlossen.');
      break;
    default:
      console.error('Need Error:', err);
  }
}

// --------------------------------------------------
// Bootstrap
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  cardsEl = document.getElementById('cards');

  bindClickHandler();

  items = await loadItemsFromBackend();
  render();
});
