/* ================================
   CONFIG
================================ */
const API_BASE = "https://content-connection-production-ea07.up.railway.app";
const ADMIN_TOKEN = "lootliste-admin-2025"; // muss exakt dem ENV im Backend entsprechen

/* ================================
   STATE
================================ */
let currentStatusFilter = "submitted";

/* ================================
   LOAD ADMIN ITEMS
================================ */
async function loadAdminItems() {
  const container = document.getElementById("admin-items");
  container.innerHTML = "Lade Items…";

  try {
    const res = await fetch(
      `${API_BASE}/api/admin/items?status=${currentStatusFilter}`,
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
    console.error("Admin Load Error:", err);
    container.innerHTML =
      "⚠️ Fehler beim Laden. Siehe Browser-Konsole.";
  }
}

/* ================================
   RENDER ITEMS
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
    div.dataset.itemId = item.id;

    div.innerHTML = `
      <strong>${item.title || "Ohne Titel"}</strong><br>
      Typ: ${item.type || "-"}<br>
      Rating: ${item.rating ?? "-"}<br>
      Status: <b>${item.status}</b><br>
      Erstellt: ${new Date(item.created_at).toLocaleString("de-DE")}
      <div class="admin-actions">
        ${renderActions(item)}
      </div>
      <hr>
    `;

    container.appendChild(div);
  });
}

/* ================================
   ACTION BUTTONS
================================ */
function renderActions(item) {
  if (item.status === "submitted") {
    return `
      <button onclick="approveItem(${item.id})">✅ Freigeben</button>
      <button onclick="rejectItem(${item.id})">❌ Ablehnen</button>
      <button onclick="hideItem(${item.id})">👁️ Verstecken</button>
    `;
  }

  return `<em>Keine Aktionen verfügbar</em>`;
}

/* ================================
   ACTION HANDLERS
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

    await loadAdminItems(); // Refresh ohne Reload
  } catch (err) {
    console.error("Admin Action Error:", err);
    alert("Aktion fehlgeschlagen – siehe Konsole.");
  }
}

/* ================================
   FILTER (optional vorbereitet)
================================ */
function setStatusFilter(status) {
  currentStatusFilter = status;
  loadAdminItems();
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", loadAdminItems);
