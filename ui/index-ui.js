// ui/index-ui.js
// =====================================
// Public Index UI – V3
// Core = Single Source of Truth
// FINAL: ID-Typ-Bug gefixt
// =====================================

import { renderItemCard } from './card-render.js';
import { addNeed } from '../core/core.js';

// --------------------------------------------------
// State (Frontend)
// --------------------------------------------------
let items = [];
let auth = {
  isLoggedIn: true,     // DEV / Fake-Login
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
// Load Items (Backend = einzige Datenquelle)
// --------------------------------------------------
async function loadItems() {
  try {
    const res = await fetch(
      'https://content-connection-production-ea07.up.railway.app/api/items/public'
    );

    if (!res.ok) throw new Error('ITEM_FETCH_FAILED');

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(i => ({
      id: i.id, // ⚠️ Typ egal (string | number)
      name: i.name,
      type: i.type,
      rating: Number(i.rating) || 0,
      status: i.status || 'available',
      needs: Array.isArray(i.needs) ? i.needs : []
    }));
  } catch (err) {
    console.error('Load Items Error:', err);
    return [];
  }
}

// --------------------------------------------------
// Click Handling (Event Delegation)
// --------------------------------------------------
function bindEvents() {
  if (!cardsEl) return;

  cardsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;

    // -----------------------------
    // Login (Stub)
    // -----------------------------
    if (action === 'auth') {
      alert('Login folgt in Phase: Accounts');
      return;
    }

    // -----------------------------
    // Bedarf anmelden
    // -----------------------------
    if (action === 'need') {
      const itemId = btn.dataset.item; // STRING
      const item = items.find(i => String(i.id) === itemId); // ✅ FIX
      if (!item) return;

      try {
        // 🔒 EINZIGE Mutation: Core
        addNeed(item, auth.userId, items);

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
      alert('Der Bedarf für dieses Item ist bereits geschlossen.');
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
  if (!cardsEl) {
    console.error('Cards container (#cards) not found');
    return;
  }

  bindEvents();

  items = await loadItems();
  render();
});
