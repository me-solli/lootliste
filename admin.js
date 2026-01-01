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

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

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
        <div>
          <div><b>ID:</b> ${item.id}</div>
          <div><b>Status:</b> ${item.status}</div>
          <div><b>Titel:</b> ${item.title || "-"}</div>
          <div><b>Typ:</b> ${item.type || "-"}</div>
          <div><b>Rating:</b> ${item.rating ?? "-"}</div>
          <div><b>Erstellt:</b> ${new Date(item.created_at).toLocaleString()}</div>
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

  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }
}

/* ================================
   INIT (DOM SAFE)
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

  // Actions (Event Delegation)
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

      loadItems(list);
    } catch (err) {
      console.error(err);
      alert("Aktion fehlgeschlagen");
    }
  });

  // Initial load
  loadItems(list);
});
