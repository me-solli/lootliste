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
   LOAD + RENDER
================================ */
async function loadItems(list) {
  list.innerHTML = "Lade Items…";

  try {
    const res = await fetch(
      API_BASE + "/api/admin/items?status=" + currentStatus,
      {
        headers: {
          "x-admin-token": ADMIN_TOKEN
        }
      }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);

    const items = await res.json();

    if (!items.length) {
      list.innerHTML = '<div class="empty">Keine Items.</div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="item">
        <div class="thumb">
          <img src="${resolveImageSrc(item.screenshot)}" alt="">
          <div class="actions">
            ${
              currentStatus === "submitted"
                ? `<button data-action="approve" data-id="${item.id}">Freigeben</button>
                   <button data-action="reject" data-id="${item.id}">Ablehnen</button>`
                : ""
            }
            ${
              currentStatus === "approved"
                ? `<button data-action="hide" data-id="${item.id}">Verstecken</button>`
                : ""
            }
          </div>
        </div>

        <div class="meta">
          <div class="status-badge status-${item.status}">
            ${item.status}
          </div>

          <div><b>ID:</b> ${item.id}</div>
          <div><b>Name:</b> ${item.name || "-"}</div>
          <div><b>Qualität:</b> ${item.quality || "-"}</div>
          <div><b>Roll:</b> ${item.roll || "-"}</div>
          <div><b>Rating:</b> ${ratingStars(item.rating)}</div>

          <!-- EDIT MASKE (B1.2) -->
          <div class="edit" data-item-id="${item.id}">
            <input type="text" placeholder="Item-Name" data-field="name" value="${item.name || ""}">

            <select data-field="quality">
              <option value="">– Qualität –</option>
              <option value="unique" ${item.quality === "unique" ? "selected" : ""}>Unique</option>
              <option value="set" ${item.quality === "set" ? "selected" : ""}>Set</option>
              <option value="rare" ${item.quality === "rare" ? "selected" : ""}>Rare</option>
              <option value="magic" ${item.quality === "magic" ? "selected" : ""}>Magic</option>
              <option value="rune" ${item.quality === "rune" ? "selected" : ""}>Rune</option>
              <option value="other" ${item.quality === "other" ? "selected" : ""}>Sonstiges</option>
            </select>

            <input type="text" placeholder="Roll / Kurzwerte" data-field="roll" value="${item.roll || ""}">

            <select data-field="rating">
              <option value="">– Sterne –</option>
              <option value="1" ${item.rating == 1 ? "selected" : ""}>⭐</option>
              <option value="2" ${item.rating == 2 ? "selected" : ""}>⭐⭐</option>
              <option value="3" ${item.rating == 3 ? "selected" : ""}>⭐⭐⭐</option>
              <option value="4" ${item.rating == 4 ? "selected" : ""}>⭐⭐⭐⭐</option>
              <option value="5" ${item.rating == 5 ? "selected" : ""}>⭐⭐⭐⭐⭐</option>
            </select>

            <button data-action="save" data-id="${item.id}">💾 Speichern</button>
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
   ACTIONS
================================ */
async function doAction(path, body) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) throw new Error("HTTP " + res.status);
}

async function saveItem(container) {
  const id = container.dataset.itemId;
  const data = {};

  container.querySelectorAll("[data-field]").forEach(el => {
    data[el.dataset.field] = el.value || null;
  });

  const res = await fetch(
    API_BASE + "/api/admin/items/" + id,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN
      },
      body: JSON.stringify(data)
    }
  );

  if (!res.ok) throw new Error("Save failed");
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("list");
  const tabs = document.getElementById("tabs");

  // Tabs
  tabs.addEventListener("click", e => {
    const btn = e.target.closest("button[data-status]");
    if (!btn) return;

    currentStatus = btn.dataset.status;

    tabs.querySelectorAll("button").forEach(b =>
      b.classList.remove("active")
    );
    btn.classList.add("active");

    loadItems(list);
  });

  // Actions (Delegation)
  list.addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    try {
      if (action === "approve") {
        await doAction("/api/admin/items/" + id + "/approve");
      }
      if (action === "hide") {
        await doAction("/api/admin/items/" + id + "/hide");
      }
      if (action === "reject") {
        const note = prompt("Ablehnungsgrund (optional):");
        await doAction(
          "/api/admin/items/" + id + "/reject",
          { admin_note: note || null }
        );
      }
      if (action === "save") {
        const container = btn.closest(".edit");
        await saveItem(container);
        alert("Item gespeichert");
      }

      loadItems(list);
    } catch (err) {
      console.error(err);
      alert("Aktion fehlgeschlagen");
    }
  });

  loadItems(list);
});
