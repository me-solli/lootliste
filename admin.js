/* ================================
   CONFIG
================================ */
const API_BASE = "https://lootliste-production.up.railway.app";
const ADMIN_TOKEN = "lootliste-admin-2025";

/* ================================
   HELPERS
================================ */
function resolveImageSrc(screenshot) {
  if (!screenshot) return "";
  if (screenshot.startsWith("http")) return screenshot;
  return API_BASE + screenshot;
}

/* ================================
   API
================================ */
async function fetchAdminItems() {
  const res = await fetch(API_BASE + "/api/items/admin", {
    headers: { "x-admin-token": ADMIN_TOKEN }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function updateItemStatus(id, status) {
  const res = await fetch(`${API_BASE}/api/items/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

/* ================================
   RENDER
================================ */
function renderItems(list, items) {
  if (!items.length) {
    list.innerHTML = '<div class="empty">Keine Items vorhanden.</div>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="item">
      <div class="thumb">
        <img src="${resolveImageSrc(item.screenshot)}" alt="">
      </div>

      <div class="meta">
        <div style="font-weight:600;margin-bottom:6px;">
          ${item.note || "Item ohne Notiz"}
        </div>

        <div style="font-size:12px;opacity:.7;">
          Status: <strong>${item.status}</strong>
        </div>

        <div style="font-size:12px;opacity:.7;">
          ID: ${item.id}
        </div>

        <div style="font-size:12px;opacity:.7;">
          Erstellt: ${item.created_at || "-"}
        </div>

        <div class="actions" style="margin-top:10px; display:flex; gap:6px;">
          <button data-id="${item.id}" data-status="approved">Freigeben</button>
          <button data-id="${item.id}" data-status="hidden">Verstecken</button>
          <button data-id="${item.id}" data-status="rejected">Ablehnen</button>
        </div>
      </div>
    </div>
  `).join("");
}

/* ================================
   LOAD
================================ */
async function loadItems(list) {
  list.innerHTML = "Lade Items…";
  try {
    const items = await fetchAdminItems();
    renderItems(list, items);
  } catch (err) {
    console.error(err);
    list.innerHTML =
      '<div class="error">Fehler beim Laden der Admin-Items</div>';
  }
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("list");
  loadItems(list);

  // Button-Handling (Event Delegation)
  list.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-id][data-status]");
    if (!btn) return;

    const { id, status } = btn.dataset;

    try {
      await updateItemStatus(id, status);
      loadItems(list); // neu laden nach Status-Update
    } catch (err) {
      console.error(err);
      alert("Status konnte nicht geändert werden.");
    }
  });
});
