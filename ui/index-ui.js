// index-ui.js — V3 UI (BACKEND SOURCE OF TRUTH)
// ==================================================
// 1:1 replacement – full file
// - Items are loaded from backend API
// - Bedarf (need_open) is handled via backend, not localStorage
// - UI never sets item.status directly
// - Reload-safe

const API_BASE = "https://content-connection-production-ea07.up.railway.app";

// --------------------------------------------------
// In-memory store (UI cache ONLY)
// --------------------------------------------------
const store = {
  items: []
};

// --------------------------------------------------
// INIT / LOAD (Backend is source of truth)
// --------------------------------------------------
export async function initStore() {
  try {
    const res = await fetch(`${API_BASE}/api/items/public`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const items = await res.json();
    store.items = Array.isArray(items) ? items : [];

    render();
    return store.items;
  } catch (err) {
    console.error("initStore failed", err);
    store.items = [];
    render();
    return store.items;
  }
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function getItemById(id) {
  return store.items.find(i => String(i.id) === String(id));
}

function getCurrentUserId() {
  // DEV stub – später Auth
  return "user_demo_1";
}

// --------------------------------------------------
// ACTIONS
// --------------------------------------------------

// Bedarf anmelden (BACKEND)
export async function clickNeed(itemId) {
  const item = getItemById(itemId);
  if (!item) throw new Error("ITEM_NOT_FOUND");

  try {
    const res = await fetch(`${API_BASE}/api/items/${itemId}/need`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId: getCurrentUserId() })
    });

    if (!res.ok) {
      console.error("Need request failed", res.status);
      return;
    }

    // reload from backend (single source of truth)
    await initStore();
  } catch (err) {
    console.error("clickNeed error", err);
  }
}

// --------------------------------------------------
// RENDER
// --------------------------------------------------
function render() {
  const container = document.getElementById("cards");
  if (!container) return;

  if (!store.items.length) {
    container.innerHTML = '<div class="empty">Keine Items verfügbar</div>';
    return;
  }

  container.innerHTML = store.items.map(item => renderItem(item)).join("");
}

function renderItem(item) {
  const status = item.status;
  const isAvailable = status === "available";
  const isNeed = status === "need_open";

  return `
    <div class="card status-${status}">
      <div class="card-header">
        <h3>${item.name || "Unbenanntes Item"}</h3>
        <span class="status">${uiStatusLabel(status)}</span>
      </div>

      <div class="card-body">
        ${renderAction(item, isAvailable, isNeed)}
      </div>
    </div>
  `;
}

function renderAction(item, isAvailable, isNeed) {
  if (isAvailable) {
    return `<button onclick="clickNeed('${item.id}')">Bedarf anmelden</button>`;
  }

  if (isNeed) {
    return `<div class="need-info">Bedarf läuft</div>`;
  }

  return `<div class="info">Status: ${item.status}</div>`;
}

function uiStatusLabel(status) {
  switch (status) {
    case "available": return "Verfügbar";
    case "need_open": return "Bedarf";
    case "reserved": return "Reserviert";
    case "assigned": return "Vergeben";
    default: return status || "–";
  }
}

// --------------------------------------------------
// APP START
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initStore();
});

// --------------------------------------------------
// DEV EXPORTS
// --------------------------------------------------
window.initStore = initStore;
window.clickNeed = clickNeed;
