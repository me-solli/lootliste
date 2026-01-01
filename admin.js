/* ================================
   CONFIG
================================ */
const API_BASE = "https://content-connection-production-ea07.up.railway.app";
const ADMIN_TOKEN = "lootliste-admin-2025";

/* ================================
   STATE
================================ */
let currentStatus = "submitted";

/* ================================
   LOAD ITEMS
================================ */
async function loadAdminItems() {
  const container = document.getElementById("admin-items");
  container.innerHTML = "Lade Items…";

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
    renderAdminItems(items);
  } catch (err) {
    console.error(err);
    container.innerHTML =
      "⚠️ Fehler beim Laden. Siehe Browser-Konsole.";
  }
}

/* ================================
   RENDER
================================ */
function renderAdminItems(items) {
  const container = document.getElementById("admin-items");
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = "<p>Keine Items vorhanden.</p>";
    return;
  }

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "admin-item";
    div.dataset.id = item.id;

    div.innerHTML = `
      <strong>${item.title || "Ohne Titel"}</strong><br>
      Typ: ${item.type || "-"}<br>
      Rating: ${item.rating ?? "-"}<br>
      Status: <b>${item.status}</b><br>
      <button onclick="approveItem(${item.id})">✅ Freigeben</button>
      <button onclick="hideItem(${item.id})">👁️ Verstecken</button>
      <button onclick="rejectItem(${item.id})">❌ Ablehnen</button>
      <hr>
    `;

    container.appendChild(div);
  });
}

/* ================================
   ACTIONS
================================ */
async function approveItem(id) {
  await adminAction(`/api/admin/items/${id}/approve`);
}

async function hideItem(id) {
  await adminAction(`/api/admin/items/${id}/hide`);
}

async function rejectItem(id) {
  const note = prompt("Ablehnungsgrund (optional):");
  await adminAction(`/api/admin/items/${id}/reject`, {
    admin_note: note
  });
}

async function adminAction(path, body = null) {
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

    loadAdminItems();
  } catch (err) {
    console.error(err);
    alert("Admin-Aktion fehlgeschlagen");
  }
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", loadAdminItems);
