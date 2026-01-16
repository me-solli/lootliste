const API_BASE = "https://lootliste-production.up.railway.app";
const ADMIN_TOKEN = "lootliste-admin-2025";

const ITEM_TYPES = [
  "sonstiges","waffe","ruestung","schild","helm","ring","amulett","charm","rune"
];

const RARITIES = ["","normal","magic","rare","set","unique"];

let currentStatus = "submitted";

/* =========================
   API HELPER
========================= */
async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    console.error("API ERROR", res.status);
    throw new Error(res.status);
  }

  return res.json();
}

/* =========================
   LOAD & RENDER
========================= */
async function loadItems() {
  const list = document.getElementById("list");
  list.innerHTML = "Lade Items…";

  const items = await api("/api/items/admin");
  const visible = items.filter(i => i.status === currentStatus);

  if (!visible.length) {
    list.innerHTML = "<div class='empty'>Keine Items vorhanden.</div>";
    return;
  }

  list.innerHTML = visible.map(item => `
    <div class="item">
      <div class="thumb">
        <img src="${API_BASE + item.screenshot}">
      </div>

      <div class="meta">
        <input data-field="display_name" data-id="${item.id}"
          placeholder="Anzeigename"
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

        <input data-field="roll" data-id="${item.id}"
          placeholder="Roll / Notiz"
          value="${item.roll || ""}">

        <select data-field="rating" data-id="${item.id}">
          ${[0,1,2,3,4,5].map(r =>
            `<option value="${r}" ${Number(item.rating)===r?"selected":""}>${r}/5</option>`
          ).join("")}
        </select>

        <div class="actions">
          <button data-action="status" data-value="approved" data-id="${item.id}">Freigeben</button>
          <button data-action="status" data-value="hidden" data-id="${item.id}">Verstecken</button>
          <button data-action="status" data-value="rejected" data-id="${item.id}">Ablehnen</button>
          <button data-action="save" data-id="${item.id}">Speichern</button>
        </div>
      </div>
    </div>
  `).join("");
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

  // Tabs
  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#tabs button")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentStatus = btn.dataset.tab;
      loadItems();
    });
  });

  // Item-Actions
  document.getElementById("list").addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    // Status ändern
    if (e.target.dataset.action === "status") {
      await api(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: e.target.dataset.value })
      });
      loadItems();
    }

    // Speichern
    if (e.target.dataset.action === "save") {
      const data = {};
      document
        .querySelectorAll(`[data-id="${id}"][data-field]`)
        .forEach(el => data[el.dataset.field] = el.value);

      await api(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      loadItems();
    }
  });

  loadItems();
});
