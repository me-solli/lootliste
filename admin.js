const API_BASE = "https://lootliste-production.up.railway.app";
const ADMIN_TOKEN = "lootliste-admin-2025";

const ITEM_TYPES = [
  "sonstiges","waffe","ruestung","schild","helm","ring","amulett","charm","rune"
];

const RARITIES = ["","normal","magic","rare","set","unique"];

let currentStatus = "submitted";

/* ================================
   HELPERS
================================ */
function resolveImageSrc(s) {
  if (!s) return "";
  if (s.startsWith("http")) return s;
  return API_BASE + s;
}

async function api(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

/* ================================
   LOAD
================================ */
async function loadItems() {
  const list = document.getElementById("list");
  list.innerHTML = "Lade Items…";

  const items = await api("/api/items/admin");
  const filtered = items.filter(i => i.status === currentStatus);

  if (!filtered.length) {
    list.innerHTML = "<div class='empty'>Keine Items vorhanden.</div>";
    return;
  }

  list.innerHTML = filtered.map(item => `
    <div class="item">
      <div class="thumb">
        <img src="${resolveImageSrc(item.screenshot)}">
      </div>

      <div class="meta">
        <input placeholder="Anzeigename"
          data-field="display_name"
          data-id="${item.id}"
          value="${item.display_name || ""}">

        <select data-field="item_type" data-id="${item.id}">
          ${ITEM_TYPES.map(t =>
            `<option value="${t}" ${item.item_type===t?"selected":""}>${t}</option>`
          ).join("")}
        </select>

        <select data-field="rarity" data-id="${item.id}">
          ${RARITIES.map(r =>
            `<option value="${r}" ${item.rarity===r?"selected":""}>${r||"– Qualität –"}</option>`
          ).join("")}
        </select>

        <input placeholder="Roll / Notiz"
          data-field="roll"
          data-id="${item.id}"
          value="${item.roll || ""}">

        <select data-field="rating" data-id="${item.id}">
          ${[0,1,2,3,4,5].map(r =>
            `<option value="${r}" ${Number(item.rating)===r?"selected":""}>${r}/5</option>`
          ).join("")}
        </select>

        <div class="actions">
          <button data-status="approved" data-id="${item.id}">Freigeben</button>
          <button data-status="hidden" data-id="${item.id}">Verstecken</button>
          <button data-status="rejected" data-id="${item.id}">Ablehnen</button>
          <button data-save data-id="${item.id}">Speichern</button>
        </div>
      </div>
    </div>
  `).join("");
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.onclick = () => {
      currentStatus = btn.dataset.tab;
      loadItems();
    };
  });

  document.getElementById("list").addEventListener("click", async e => {
    const id = e.target.dataset.id;

    if (e.target.dataset.status) {
      await api(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: e.target.dataset.status })
      });
      loadItems();
    }

    if (e.target.dataset.save) {
      const fields = {};
      document.querySelectorAll(`[data-id="${id}"][data-field]`).forEach(el => {
        fields[el.dataset.field] = el.value;
      });
      await api(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(fields)
      });
      loadItems();
    }
  });

  loadItems();
});
