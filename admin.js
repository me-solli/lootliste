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
   HELPERS
================================ */
function resolveImageSrc(screenshot) {
  if (!screenshot) return "";
  if (screenshot.startsWith("http")) return screenshot;
  return API_BASE + screenshot;
}

function ratingStars(value) {
  if (!value) return "-";
  return "⭐".repeat(value);
}

/* ================================
   DEFAULT TEXTS
================================ */
const DEFAULTS = {
  name: "Name",
  roll: "Roll"
};

/* ================================
   LOAD + RENDER
================================ */
async function loadItems(list) {
  list.innerHTML = "Lade Items…";

  try {
    const res = await fetch(
      API_BASE + "/api/admin/items?status=" + currentStatus,
      { headers: { "x-admin-token": ADMIN_TOKEN } }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);

    const items = (await res.json()).map(item => {
      if (!item.type && item.weaponType) item.type = "waffe";
      return item;
    });

    if (!items.length) {
      list.innerHTML = '<div class="empty">Keine Items.</div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="item">
        <div class="thumb">
          <img src="${resolveImageSrc(item.screenshot)}">
        </div>

        <div class="meta">
          <div class="status-badge status-${item.status}">
            ${item.status}
          </div>

          <div><b>ID:</b> ${item.id}</div>
          <div><b>Name:</b> ${item.name || "-"}</div>
          <div><b>Typ:</b> ${item.type || "-"}</div>
          <div><b>WeaponType:</b> ${item.weaponType || "-"}</div>
          <div><b>Roll:</b> ${item.roll || "-"}</div>
          <div><b>Rating:</b> ${ratingStars(item.rating)}</div>

          <div class="edit" data-item-id="${item.id}">

            <input type="text" data-field="name"
              data-default="${DEFAULTS.name}"
              value="${item.name || DEFAULTS.name}">

            <select data-field="type">
              <option value="">– Typ –</option>
              ${["waffe","schild","helm","ruestung","handschuhe","guertel","stiefel","amulet","ring","charm","rune","sonstiges"]
                .map(t => `<option value="${t}" ${item.type===t?"selected":""}>${t}</option>`).join("")}
            </select>

            <select data-field="weaponType" ${item.type!=="waffe"?"disabled":""}>
              <option value="">– WeaponType –</option>
              ${["Schwert","Axt","Keule","Dolch","Klaue","Stab","Zauberstab","Zepter","Speer","Sense","Bogen","Armbrust","Wurfwaffe"]
                .map(w => `<option ${item.weaponType===w?"selected":""}>${w}</option>`).join("")}
            </select>

            <input type="text" data-field="roll"
              data-default="${DEFAULTS.roll}"
              value="${item.roll || DEFAULTS.roll}">

            <select data-field="rating">
              <option value="">– Sterne –</option>
              ${[1,2,3,4,5].map(n =>
                `<option value="${n}" ${item.rating==n?"selected":""}>${"⭐".repeat(n)}</option>`
              ).join("")}
            </select>

            <div class="actions">
              <button data-action="save" data-id="${item.id}">💾 Speichern</button>
              <button data-action="status" data-status="approved" data-id="${item.id}">✅ Freigeben</button>
              <button data-action="status" data-status="hidden" data-id="${item.id}">👁 Verstecken</button>
              <button data-action="status" data-status="rejected" data-id="${item.id}">❌ Ablehnen</button>
            </div>

          </div>
        </div>
      </div>
    `).join("");

  } catch (err) {
    console.error(err);
    list.innerHTML = '<div class="error">Fehler beim Laden</div>';
  }
}

/* ================================
   SAVE ITEM
================================ */
async function saveItem(container) {
  const id = container.dataset.itemId;
  const data = {};

  const typeValue = container.querySelector('[data-field="type"]')?.value || null;
  data.type = typeValue;
  data.weaponType =
    data.type === "waffe"
      ? container.querySelector('[data-field="weaponType"]')?.value || null
      : null;

  container.querySelectorAll("[data-field]").forEach(el => {
    const field = el.dataset.field;
    if (["type","weaponType"].includes(field)) return;
    if (el.disabled) return;

    const def = el.dataset.default;
    data[field] = (def && el.value === def) ? null : el.value || null;
  });

  await fetch(API_BASE + "/api/admin/items/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN
    },
    body: JSON.stringify(data)
  });
}

/* ================================
   UPDATE STATUS
================================ */
async function updateStatus(id, status) {
  await fetch(API_BASE + "/api/admin/items/" + id + "/status", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN
    },
    body: JSON.stringify({ status })
  });
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("list");
  const tabs = document.getElementById("tabs");

  tabs.onclick = e => {
    const btn = e.target.closest("button[data-status]");
    if (!btn) return;
    currentStatus = btn.dataset.status;
    tabs.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadItems(list);
  };

  list.onclick = async e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    try {
      if (btn.dataset.action === "save") {
        await saveItem(btn.closest(".edit"));
      }

      if (btn.dataset.action === "status") {
        await updateStatus(btn.dataset.id, btn.dataset.status);
      }

      loadItems(list);
    } catch {
      alert("Aktion fehlgeschlagen");
    }
  };

  list.onchange = e => {
    const type = e.target.closest('[data-field="type"]');
    if (!type) return;
    const weapon = type.closest(".edit")
      .querySelector('[data-field="weaponType"]');
    weapon.disabled = type.value !== "waffe";
    if (weapon.disabled) weapon.value = "";
  };

  loadItems(list);
});
