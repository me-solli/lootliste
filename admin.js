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
   LOAD + RENDER (ADMIN)
================================ */
async function loadItems(list) {
  list.innerHTML = "Lade Items…";

  try {
    const res = await fetch(API_BASE + "/api/items/admin", {
      headers: {
        "x-admin-token": ADMIN_TOKEN
      }
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const items = await res.json();

    if (!items.length) {
      list.innerHTML = '<div class="empty">Keine Items vorhanden.</div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="item">
        <div class="thumb">
          <img src="${resolveImageSrc(item.screenshot)}">
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
        </div>
      </div>
    `).join("");

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
});
