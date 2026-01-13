// ui/index-ui.js
// =====================================
// Public Index UI – V3
// HARD FIX: direkte Button-Events
// =====================================

import { renderItemCard } from './card-render.js';
import { addNeed } from '../core/core.js';

let items = [];
let auth = {
  isLoggedIn: true,
  userId: 'dev-user'
};

let cardsEl = null;

// --------------------------------------------------
// Render + Event Bind
// --------------------------------------------------
function render() {
  if (!cardsEl) return;

  cardsEl.innerHTML = items
    .map(item => renderItemCard(item, auth))
    .join('');

  bindNeedButtons(); // 🔥 WICHTIG
}

// --------------------------------------------------
// DIREKTE BUTTON-BINDUNG (kein Delegation)
// --------------------------------------------------
function bindNeedButtons() {
  const buttons = cardsEl.querySelectorAll('button[data-action="need"]');

  buttons.forEach(btn => {
    btn.onclick = () => {
      const itemId = btn.dataset.item;
      const item = items.find(i => String(i.id) === itemId);
      if (!item) return;

      try {
        addNeed(item, auth.userId, items);
        render();
      } catch (err) {
        handleNeedError(err);
      }
    };
  });

  const authButtons = cardsEl.querySelectorAll('button[data-action="auth"]');
  authButtons.forEach(btn => {
    btn.onclick = () => {
      alert('Login folgt in Phase: Accounts');
    };
  });
}

// --------------------------------------------------
// Load Items
// --------------------------------------------------
async function loadItems() {
  try {
    const res = await fetch(
      'https://content-connection-production-ea07.up.railway.app/api/items/public'
    );
    const data = await res.json();

    if (!Array.isArray(data)) return [];

    return data.map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      rating: Number(i.rating) || 0,
      status: i.status || 'available',
      needs: Array.isArray(i.needs) ? i.needs : []
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

// --------------------------------------------------
// Errors
// --------------------------------------------------
function handleNeedError(err) {
  switch (err.message) {
    case 'USER_NEED_LIMIT':
      alert('Du hast bereits zu viele offene Bedarfe.');
      break;
    case 'ALREADY_REQUESTED':
      alert('Du hast hier bereits Bedarf angemeldet.');
      break;
    case 'NEED_CLOSED':
      alert('Der Bedarf ist geschlossen.');
      break;
    default:
      console.error(err);
  }
}

// --------------------------------------------------
// Bootstrap
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  cardsEl = document.getElementById('cards');
  if (!cardsEl) return;

  items = await loadItems();
  render();
});
