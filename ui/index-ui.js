// ui/index-ui.js
// =====================================
// Public Index UI – V3 (FINAL)
// - Direkte Button-Events (robust)
// - CORS-Fallback (Dummy Items)
// - Hero-Stats angebunden
// - Core = Single Source of Truth
// =====================================

import { renderItemCard } from './card-render.js';
import { addNeed } from '../core/core.js';

// --------------------------------------------------
// State
// --------------------------------------------------
let items = [];
let auth = {
  isLoggedIn: true,   // DEV
  userId: 'dev-user'
};

let cardsEl = null;

// --------------------------------------------------
// Render + Events
// --------------------------------------------------
function render() {
  if (!cardsEl) return;

  cardsEl.innerHTML = items
    .map(item => renderItemCard(item, auth))
    .join('');

  renderHeroStats(items);
  bindButtons();
}

function bindButtons() {
  // Bedarf
  cardsEl.querySelectorAll('button[data-action="need"]').forEach(btn => {
    btn.onclick = () => {
      const itemId = btn.dataset.item; // STRING
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

  // Auth Stub
  cardsEl.querySelectorAll('button[data-action="auth"]').forEach(btn => {
    btn.onclick = () => alert('Login folgt in Phase: Accounts');
  });
}

// --------------------------------------------------
// Hero Stats (sichtbares Leben im Header)
// --------------------------------------------------
function renderHeroStats(items) {
  const el = document.getElementById('heroStats');
  if (!el) return;

  const total = items.length;
  const available = items.filter(i => i.status === 'available').length;
  const needsTotal = items.reduce(
    (sum, i) => sum + (Array.isArray(i.needs) ? i.needs.length : 0),
    0
  );

  el.innerHTML = `
    <div class="hero-stat">
      <strong>${total}</strong>
      <span>Items gesamt</span>
    </div>
    <div class="hero-stat">
      <strong>${available}</strong>
      <span>Verfügbar</span>
    </div>
    <div class="hero-stat">
      <strong>${needsTotal}</strong>
      <span>Bedarfe</span>
    </div>
  `;
}

// --------------------------------------------------
// Load Items (CORS-safe mit Fallback)
// --------------------------------------------------
async function loadItems() {
  const API = 'https://content-connection-production-ea07.up.railway.app/api/items/public';

  try {
    const res = await fetch(API, { credentials: 'omit' });
    if (!res.ok) throw new Error('FETCH_FAILED');

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('INVALID_DATA');

    return data.map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      rating: Number(i.rating) || 0,
      status: i.status || 'available',
      needs: Array.isArray(i.needs) ? i.needs : []
    }));
  } catch (err) {
    console.warn('⚠ Backend/CORS blockt – Dummy-Daten aktiv', err);

    // 🔥 DEV-FALLBACK (sofort sichtbar & klickbar)
    return [
      {
        id: 'dummy-1',
        name: 'Natalyas Mal',
        type: 'waffe',
        rating: 4,
        status: 'available',
        needs: []
      },
      {
        id: 'dummy-2',
        name: 'Lidlose Wand',
        type: 'schild',
        rating: 3,
        status: 'available',
        needs: []
      }
    ];
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
  if (!cardsEl) {
    console.error('Cards container (#cards) not found');
    return;
  }

  items = await loadItems();
  render();
});
