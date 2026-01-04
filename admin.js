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
      { headers: { "x-admin-token": ADMIN_TOKEN } }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);

    // 🔥 FIX 1: Normalisieren (weaponType ⇒ type = waffe)
    const items = (await res.json()).map(item => {
      if (!item.type && item.weaponType) {
        item.type = "waffe";
      }
      return item;
    });

    if (!items.length) {
      list.innerHTML = '<div class="empty">Keine Items.</div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="item">
        <div class="thumb">
          <img src="${resolveImageSrc(item.screenshot)}" alt="">
          <div class="actions">
            ${currentStatus === "submitted" ? `
              <button data-action="approve" data-id="${item.id}">Freigeben</button>
              <button data-action="reject" data-id="${item.id}">Ablehnen</button>
            ` : ""}
            ${currentStatus === "approved"
              ? `<button data-action="hide" data-id="${item.id}">Verstecken</button>`
              : ""}
            ${currentStatus === "hidden"
              ? `<button data-action="unhide" data-id="${item.id}">♻️ Wieder freigeben</button>`
              : ""}
          </div>
        </div>

        <div class="meta">
          <div class="status-badge status-${item.status}">${item.status}</div>

          <div><b>ID:</b> ${item.id}</div>
          <div><b>Name:</b> ${item.name || "-"}</div>
          <div><b>Typ:</b> ${item.type || "-"}</div>
          <div><b>WeaponType:</b> ${item.weaponType || "-"}</div>
          <div><b>Roll:</b> ${item.roll || "-"}</div>
          <div><b>Rating:</b> ${ratingStars(item.rating)}</div>

          <div class="edit" data-item-id="${item.id}">
            <input type="text" data-field="name" value="${item.name || ""}">

            <select data-field="type">
              <option value="">– Typ –</option>
              <option value="waffe" ${item.type==="waffe"?"selected":""}>Waffe</option>
              <option value="schild" ${item.type==="schild"?"selected":""}>Schild</option>
              <option value="helm" ${item.type==="helm"?"selected":""}>Helm</option>
              <option value="ruestung" ${item.type==="ruestung"?"selected":""}>Rüstung</option>
              <option value="handschuhe" ${item.type==="handschuhe"?"selected":""}>Handschuhe</option>
              <option value="guertel" ${item.type==="guertel"?"selected":""}>Gürtel</option>
              <option value="stiefel" ${item.type==="stiefel"?"selected":""}>Stiefel</option>
              <option value="amulet" ${item.type==="amulet"?"selected":""}>Amulett</option>
              <option value="ring" ${item.type==="ring"?"selected":""}>Ring</option>
              <option value="charm" ${item.type==="charm"?"selected":""}>Charm</option>
              <option value="rune" ${item.type==="rune"?"selected":""}>Rune</option>
              <option value="sonstiges" ${item.type==="sonstiges"?"selected":""}>Sonstiges</option>
            </select>

            <select data-field="weaponType" ${item.type !== "waffe" ? "disabled" : ""}>
              <option value="">– WeaponType –</option>
              <option value="Schwert" ${item.weaponType==="Schwert"?"selected":""}>Schwert</option>
              <option value="Axt" ${item.weaponType==="Axt"?"selected":""}>Axt</option>
              <option value="Keule" ${item.weaponType==="Keule"?"selected":""}>Keule</option>
              <option value="Dolch" ${item.weaponType==="Dolch"?"selected":""}>Dolch</option>
              <option value="Klaue" ${item.weaponType==="Klaue"?"selected":""}>Klaue</option>
              <option value="Stab" ${item.weaponType==="Stab"?"selected":""}>Stab</option>
              <option value="Zauberstab" ${item.weaponType==="Zauberstab"?"selected":""}>Zauberstab</option>
              <option value="Zepter" ${item.weaponType==="Zepter"?"selected":""}>Zepter</option>
              <option value="Speer" ${item.weaponType==="Speer"?"selected":""}>Speer</option>
              <option value="Sense" ${item.weaponType==="Sense"?"selected":""}>Sense</option>
              <option value="Bogen" ${item.weaponType==="Bogen"?"selected":""}>Bogen</option>
              <option value="Armbrust" ${item.weaponType==="Armbrust"?"selected":""}>Armbrust</option>
              <option value="Wurfwaffe" ${item.weaponType==="Wurfwaffe"?"selected":""}>Wurfwaffe</option>
            </select>

            <input type="text" data-field="roll" value="${item.roll || ""}">

            <select data-field="rating">
              <option value="">– Sterne –</option>
              <option value="1" ${item.rating==1?"selected":""}>⭐</option>
              <option value="2" ${item.rating==2?"selected":""}>⭐⭐</option>
              <option value="3" ${item.rating==3?"selected":""}>⭐⭐⭐</option>
              <option value="4" ${item.rating==4?"selected":""}>⭐⭐⭐⭐</option>
              <option value="5" ${item.rating==5?"selected":""}>⭐⭐⭐⭐⭐</option>
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

/* ================================
   SAVE (FIX 2)
================================ */
async function saveItem(container) {
  const id = container.dataset.itemId;
  const data = {};

  const typeEl = container.querySelector('[data-field="type"]');
  const typeValue = typeEl ? typeEl.value : null;

  // 🔥 FIX 2: type erzwingen, wenn weaponType gesetzt
  data.type = typeValue || (container.querySelector('[data-field="weaponType"]')?.value ? "waffe" : null);

  container.querySelectorAll("[data-field]").forEach(el => {
    const field = el.dataset.field;
    if (field === "type") return;

    if (el.disabled && !(field === "weaponType" && data.type === "waffe")) return;
    data[field] = el.value || null;
  });

  const res = await fetch(API_BASE + "/api/admin/items/" + id, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error("Save failed");
}

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("list");
  const tabs = document.getElementById("tabs");

  tabs.addEventListener("click", e => {
    const btn = e.target.closest("button[data-status]");
    if (!btn) return;
    currentStatus = btn.dataset.status;
    tabs.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadItems(list);
  });

  list.addEventListener("click", async e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    try {
      if (action === "approve") await doAction("/api/admin/items/" + id + "/approve");
      if (action === "hide") await doAction("/api/admin/items/" + id + "/hide");
      if (action === "unhide") await doAction("/api/admin/items/" + id + "/unhide");
      if (action === "reject") {
        const note = prompt("Ablehnungsgrund (optional):");
        await doAction("/api/admin/items/" + id + "/reject", { admin_note: note || null });
      }
      if (action === "save") {
        await saveItem(btn.closest(".edit"));
        alert("Item gespeichert");
      }
      loadItems(list);
    } catch (err) {
      console.error(err);
      alert("Aktion fehlgeschlagen");
    }
  });

  list.addEventListener("change", e => {
    const typeSelect = e.target.closest('select[data-field="type"]');
    if (!typeSelect) return;

    const edit = typeSelect.closest(".edit");
    const weaponSelect = edit.querySelector('select[data-field="weaponType"]');
    if (!weaponSelect) return;

    if (typeSelect.value === "waffe") {
      weaponSelect.disabled = false;
    } else {
      weaponSelect.value = "";
      weaponSelect.disabled = true;
    }
  });

  loadItems(list);
});
