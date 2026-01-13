// ui/index-ui.js
// =====================================
// Public Index UI – V3 CLEAN
// - Keine Alt-UI
// - Ruhiger Default-State
// - index.html = passive Bühne
// =====================================

import { renderItemCard } from './card-render.js';
import { addNeed } from '../core/core.js';

console.log('INDEX-UI LOADED (V3 CLEAN)');

// --------------------------------------------------
// State
// --------------------------------------------------
let items = [];

// DEV / PUBLIC DEFAULT: NICHT eingeloggt
let auth = {
  isLoggedIn: false,
  userId: null
};

let cardsEl;

// --------------------------------------------------
// Main Render
// --------------------------------------------------
function render() {
  if (!cardsEl) return;

  // Cards
  cardsEl.innerHTML = items
    .map(item => renderItemCard(item, auth))
    .join('');

  renderHeroStats();
  renderRequestFeed();
  bindCardActions();
}

// --------------------------------------------------
// Card Actions
// --------------------------------------------------
function bindCardActions() {
  if (!auth.isLoggedIn) return;

  cardsEl.querySelectorAll('[data-action="need"]').forEach(btn => {
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
}

// --------------------------------------------------
// Hero Stats
// --------------------------------------------------
function renderHeroStats() {
  const el = document.getElementById('heroStats');
  if (!el) return;

  const total = items.length;
  const available = items.filter(i => i.status === 'available').length;
  const needs = items.reduce((sum, i) => sum + (i.needs?.length || 0), 0);

  el.innerHTML = `
    <div class="hero-stat">
      <strong>${total}</strong>
      <span>Items</span>
    </div>
    <div class="hero-stat">
      <strong>${available}</strong>
      <span>Verfügbar</span>
    </div>
    <div class="hero-stat">
      <strong>${needs}</strong>
      <span>Bedarfe</span>
    </div>
  `;
}

// --------------------------------------------------
// Request Feed (letzte Bedarfe)
// --------------------------------------------------
function renderRequestFeed() {
  const feed = document.getElementById('requestFeed');
  if (!feed) return;

  const entries = items
    .flatMap(item =>
      (item.needs || []).map(n => ({
        item: item.name,
        user: n.userId,
        at: n.at || 0
      }))
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  if (entries.length === 0) {
    feed.innerHTML = '<div class="empty">Noch keine Anfragen</div>';
    return;
  }

  feed.innerHTML = entries.map(e => `
    <div class="feed-item">
      <span class="item">${e.item}</span>
      <span class="user">${e.user}</span>
    </div>
  `).join('');
}

// --------------------------------------------------
// Load Items (Backend + Fallback)
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
  } catch {
    // DEV FALLBACK
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
      alert('Zu viele offene Bedarfe.');
      break;
    case 'ALREADY_REQUESTED':
      alert('Bereits Bedarf angemeldet.');
      break;
    case 'NEED_CLOSED':
      alert('Bedarf geschlossen.');
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
