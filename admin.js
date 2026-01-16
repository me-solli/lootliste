/* ================================
   CONFIG
================================ */
const API_BASE = "https://lootliste-production.up.railway.app";
const ADMIN_TOKEN = "lootliste-admin-2025";

/* ================================
   CONSTANTS
================================ */
const ITEM_TYPES = [
  "sonstiges",
  "waffe",
  "ruestung",
  "schild",
  "helm",
  "ring",
  "amulett",
  "charm",
  "rune"
];

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

async function updateItem(id, data) {
  const res = await fetch(`${API_BASE}/api/items/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
}

async function updateItemStatus(id, status) {
  return updateItem(id, { status });
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

        <div style="font-size:12px;opacity:.7;margin-bottom:6px;">
          Status: <strong>${item.status}</strong>
        </div>

        <div style="margin-bottom:6px;">
          <select data-item-type data-id="${item.id}">
            ${ITEM_TYPES.map(t => `
              <option value="${t}" ${item.item_type === t ? "selected" : ""}>
                ${t}
              </option>
            `).join("")}
          </select>

          <button data-save-type data-id="${item.id}">
            Speichern
          </button>
        </div>

        <div class="actions" style="margin-top:8px; display:flex; gap:6px;">
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

  list.addEventListener("click", async (e) => {
    // Status-Buttons
    const statusBtn = e.target.closest("button[data-id][data-status]");
    if (statusBtn) {
      const { id, status } = statusBtn.dataset;
      await updateItemStatus(id, status);
      loadItems(list);
      return;
    }

    // Item-Type speichern
    const saveBtn = e.target.closest("button[data-save-type]");
    if (saveBtn) {
      const id = saveBtn.dataset.id;
      const select = list.querySelector(
        `select[data-item-type][data-id="${id}"]`
      );
      if (!select) return;

      await updateItem(id, { item_type: select.value });
      loadItems(list);
    }
  });
});
