/* ================================
   CONFIG
================================ */
const API_BASE = "https://content-connection-production-ea07.up.railway.app";
const ADMIN_TOKEN = "lootliste-admin-2025";

/* ================================
   STATE
================================ */
let currentStatus = "submitted";
const list = document.getElementById("list");

/* ================================
   LOAD ITEMS
================================ */
async function loadItems() {
  list.innerHTML = "Lade Items…";

  try {
    const res = await fetch(
      `${API_BASE}/api/admin/items?status=${currentStatus}`,
      {
        headers: {
          "x-admin-token": ADMIN_TOKEN
        }
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const items = await res.json();
    renderItems(items);
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="error">⚠️ Fehler beim Laden</div>`;
  }
}

/* ================================
   RENDER
================================ */
function renderItems(items) {
  if (!items.length) {
    list.innerHTML = `<div class="empty">Keine Items.</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="item">
      <div class="thumb">
        <img src="${API_BASE}${item.screenshot || ""}" alt="">
        <div class="actions">
          ${currentStatus === "submitted" ? `
            <button class="approve" onclick="approveItem(${item.id})">Freigeben</button>
            <button class="reject" onclick="rejectItem(${item.id})">Ablehnen</button>
          ` : ""}
          ${currentStatus === "approved" ? `
            <button class="hide" onclick="hideItem(${item.id})">Verstecken</button>
          ` : ""}
        </div>
      </div>
      <div class="meta">
        <div><b>ID:</b> ${item.id}</div>
        <div><b>Status:</b> ${item.status}</div>
        <div><b>Titel:</b> ${item.title || "-"}</div>
        <div><b>Typ:</b> ${item.type || "-"}</div>
        <div><b>Rating:</b> ${item.rating ?? "-"}</div>
        <div><b>Erstellt:</b> ${new Date(item.created_at).toLocaleString()}</div>
      </div>
    </div>
  `).join("");
}

/* ================================
   ACTIONS
================================ */
async function action(path, body = null) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN
      },
      body: body ? JSON.stringify(body) : null
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    loadItems();
  } catch (err) {
    console.error(err);
    alert("Aktion fehlgeschlagen");
  }
}

function approveItem(id) {
  action(`/api/admin/items/${id}/approve`);
}

function hideItem(id) {
  action(`/api/admin/items/${id}/hide`);
}

function rejectItem(id) {
  const note = prompt("Ablehnungsgrund (optional):");
  action(`/api/admin/items/${id}/reject`, { admin_note: note });
}

/* ================================
   TABS
================================ */
document.getElementById("tabs").addEventListener("click", e => {
  if (!e.target.dataset.status) return;

  currentStatus = e.target.dataset.status;

  document
    .querySelectorAll("#tabs button")
    .forEach(btn => btn.classList.remove("active"));

  e.target.classList.add("active");
  loadItems();
});

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", loadItems);
