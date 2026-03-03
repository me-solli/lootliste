const API = "https://lootliste-production.up.railway.app";

const CLASS_ICONS_MINI = {
  amazon: "img/classes/amazon.png",
  assassin: "img/classes/assassin.png",
  barbarian: "img/classes/barbarian.png",
  druid: "img/classes/druid.png",
  necromancer: "img/classes/necromancer.png",
  paladin: "img/classes/paladin.png",
  sorceress: "img/classes/sorceress.png"
};

const VALID_TYPES = [
  "waffe","helm","ruestung","schild","guertel",
  "handschuhe","schuhe","amulett","ring",
  "charm","rune","sonstiges"
];

// ===============================
// ACTIVITY (MINIMAL)
// ===============================

function relativeTime(date) {
  if (!date) return null;

  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return { text: "aktiv vor wenigen Minuten", level: "green" };
  if (hours < 24) return { text: `aktiv vor ${hours} Std.`, level: "green" };
  if (days < 7) return { text: `aktiv vor ${days} Tagen`, level: "yellow" };

  return { text: `aktiv vor ${days} Tagen`, level: "gray" };
}

/* =========================
   DIABLO STYLE MODAL
========================== */
function showClaimModal(options = {}) {
  const {
    title = "Item reservieren",
    text = `
      Möchtest du dieses Item verbindlich reservieren?<br><br>
      Dein hinterlegter BattleTag wird für die Übergabe verwendet.
    `,
    confirmText = "Verbindlich reservieren"
  } = options;

  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "claim-modal-overlay";

    overlay.innerHTML = `
      <div class="claim-modal">
        <h3>${title}</h3>
        <p>${text}</p>
        <div class="claim-modal-actions">
          <button class="modal-cancel">Abbrechen</button>
          <button class="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector(".modal-cancel").onclick = () => cleanup(false);
    overlay.querySelector(".modal-confirm").onclick = () => cleanup(true);

    overlay.addEventListener("click", e => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/* Inject minimal styles once */
(function injectModalStyles(){
  if (document.getElementById("claimModalStyles")) return;

  const style = document.createElement("style");
  style.id = "claimModalStyles";
  style.innerHTML = `
    .claim-modal-overlay{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.75);
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:9999;
    }
    .claim-modal{
      background:linear-gradient(180deg,#161616,#0e0e0e);
      border:1px solid rgba(245,196,81,.5);
      border-radius:16px;
      padding:26px 28px;
      max-width:420px;
      width:90%;
      color:#eaeaea;
      box-shadow:
        0 0 0 1px rgba(245,196,81,.25),
        0 0 25px rgba(245,196,81,.35);
      animation:modalFade .18s ease-out;
    }
    .claim-modal h3{
      margin:0 0 14px;
      font-size:18px;
      color:#f5c451;
    }
    .claim-modal p{
      font-size:14px;
      line-height:1.5;
      opacity:.9;
    }
    .claim-modal-actions{
      margin-top:20px;
      display:flex;
      justify-content:flex-end;
      gap:12px;
    }
    .claim-modal button{
      padding:8px 14px;
      border-radius:10px;
      font-size:13px;
      cursor:pointer;
      border:1px solid rgba(255,255,255,.1);
      background:#111;
      color:#eaeaea;
      transition:all .15s ease;
    }
    .claim-modal .modal-confirm{
      border-color:rgba(245,196,81,.5);
      background:rgba(245,196,81,.08);
      color:#f5c451;
    }
    .claim-modal .modal-confirm:hover{
      background:rgba(245,196,81,.18);
      box-shadow:0 0 10px rgba(245,196,81,.4);
    }
    .claim-modal .modal-cancel:hover{
      background:rgba(255,255,255,.08);
    }
    @keyframes modalFade{
      from{transform:translateY(8px);opacity:0}
      to{transform:translateY(0);opacity:1}
    }

/* === Season Badge === */

.item-meta {
  display:flex;
  align-items:center;
  gap:8px;
  font-size:12px;
  opacity:.85;
  width:100%;          /* wichtig */
}

.season-badge {
  padding:2px 6px;
  border-radius:6px;
  font-size:11px;
  letter-spacing:.4px;
  text-transform:uppercase;
}

.season-ladder {
  background:rgba(90,170,90,.15);
  border:1px solid rgba(90,170,90,.4);
  color:#6fdc6f;
}

.season-nonladder {
  background:rgba(150,150,150,.12);
  border:1px solid rgba(150,150,150,.3);
  color:#bbb;
} 

/* === Donor Trust Stars === */

.donor-stars-line {
  display:flex;
  align-items:center;
  gap:6px;
  font-size:14px;
  margin-top:4px;
}

.donor-stars {
  letter-spacing:1px;
  color:#f5c451;
  font-size:15px;
}

.donor-count {
  font-size:12px;
  opacity:.6;
}

.donor-activity.green {
  color:#6fdc6f;
  font-size:12px;
}

.donor-activity.yellow {
  color:#f0c35a;
  font-size:12px;
}

.donor-activity.gray {
  color:#888;
  font-size:12px;
}

.donor-level-line {
  margin-top: 2px;
}

.donor-level {
  font-size: 12px;
  color: #c9a441;
}

.donor-info {
  margin-left: 8px;
  font-size: 10px;
  font-weight: bold;
  color: #f5c451;
  border: 1px solid rgba(245,196,81,.6);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  transition: all .15s ease;
}

.donor-info:hover {
  background: rgba(245,196,81,.18);
  box-shadow: 0 0 8px rgba(245,196,81,.5);
}

/* ================================
   RUNE INLINE BADGE (META LEVEL)
================================ */

.card {
  position: relative;
}

.rune-inline-badge{
  margin-left:auto;
  display:flex;
  align-items:center;
  gap:6px;

  padding:5px 12px;        /* kleiner, ruhiger */

  font-size:14px;
  font-weight:600;
  letter-spacing:.4px;

  border-radius:999px;

  color:#6fa8ff;
  background:rgba(120,170,255,.05);   /* ganz leicht */

  white-space:nowrap;

  box-shadow:
    0 0 14px rgba(120,170,255,.25);   /* nur Glow */
}

.rune-inline-badge img{
  width:24px;
  height:24px;
  filter:drop-shadow(0 0 10px rgba(120,170,255,.7));
}

/* =========================
   CLAIM BUTTONS
========================= */

.claim-btn,
.help-btn {
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba(245,196,81,.35);
  background: linear-gradient(180deg,#151515,#0f0f0f);
  color: #eaeaea;
  transition: all .15s ease;
}

/* Hover (Free) */
.claim-btn:hover,
.help-btn:hover {
  background: rgba(245,196,81,.08);
  box-shadow: 0 0 10px rgba(245,196,81,.25);
}

/* Rune-Version */
.claim-btn.rune {
  border-color: rgba(120,170,255,.5);
  color: #6fa8ff;
  box-shadow: 0 0 12px rgba(120,170,255,.25);
}

.claim-btn.rune:hover {
  background: rgba(120,170,255,.08);
  box-shadow: 0 0 14px rgba(120,170,255,.4);
}

/* Disabled */
.claim-btn:disabled,
.claim-btn.is-owner {
  opacity: .5;
  cursor: not-allowed;
  box-shadow: none;
}

/* =========================
   CARD ACTION AREA UPGRADE
========================= */

.claim-row {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,.06);
  display: flex;
  justify-content: center;
}

.player {
  margin-bottom: 6px;
}

/* Compact spacing between roll and donor */

.item-roll {
  margin-bottom: 4px;
}

.player {
  margin-top: 4px;
  margin-bottom: 8px;
}

/* Screenshot spacing adjustment */

.card-image {
  margin-bottom: 6px;
}

.card-image img {
  display: block;
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.08);
  box-shadow: 0 6px 18px rgba(0,0,0,.6);
}

/* Even spacing inside card body */

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
  `;

  document.head.appendChild(style);
})();

export function renderCards(items, container, allItems = items) {
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    card.id = `item-${item.id}`;
    card.dataset.open = "false";

    // 🔎 Falls es eine Suche ist → spezielle Card-Klasse
// Trade-Type Badge
const badge = document.createElement("div");
badge.className = "trade-badge";

if (item.kind === "search") {
  badge.classList.add("badge-search");
  badge.textContent = "SUCHE";
  card.classList.add("card-search");
} else {
  badge.classList.add("badge-offer");
  badge.textContent = "ANGEBOT";
}

card.appendChild(badge);

    const type = VALID_TYPES.includes(item.type) ? item.type : "sonstiges";
    card.dataset.type = type;

    const qualityClass = item.quality
      ? `quality-${item.quality}`
      : "quality-normal";

    const categoryLabel = item.sub
      ? `${type} • ${item.sub}`
      : type;

    const seasonLabel = item.season === "ladder"
  ? "Ladder"
  : "Non-Ladder";

const seasonClass = item.season === "ladder"
  ? "season-ladder"
  : "season-nonladder";

    let sourceLabel = `<span class="source-muted">Quelle: Community-Drop</span>`;

if (item.donor) {
  const donorClass =
    item.donorClass ||
    localStorage.getItem("lootliste_profile_class");

  const donorIcon =
    donorClass && CLASS_ICONS_MINI[donorClass]
      ? `<img class="donor-class-icon" src="${CLASS_ICONS_MINI[donorClass]}" alt="">`
      : "";

// ⭐ Trust-Level vom Backend
const trustLevel = item.donorStars || 1;  
const activity = relativeTime(item.donorLastActive);

// ⭐ 5 feste Sterne (gefüllt + leer)
const maxStars = 5;
const filledStars = "★".repeat(trustLevel);
const emptyStars = "☆".repeat(maxStars - trustLevel);
const stars = filledStars + emptyStars;
  const donorLevel = item.donorLevel || 1;

sourceLabel = `
  <div class="donor-block">
    <span class="donor-label">
      Spender
<span class="donor-info"
      title="⭐ Sterne = aktuelle Aktivität | Lvl = langfristige Beteiligung">
  i
</span>
    </span>

    <div class="donor-line">
      <a
        href="profile.html?user=${encodeURIComponent(item.donor)}"
        class="donor-name"
        title="Öffentliches Profil ansehen"
        onclick="event.stopPropagation()"
      >
        ${item.donor}
      </a>
      ${donorIcon}
    </div>

<div class="donor-trust">

  <div class="donor-level-line">
    <span class="donor-level">Lvl ${donorLevel}</span>
  </div>

  <div class="donor-stars-line">
    <span class="donor-stars">${stars}</span>
  </div>

  ${
    activity
      ? `<div class="donor-activity ${activity.level}">
          ${activity.text}
        </div>`
      : ""
  }
</div>
    </div>
  `;
}

    card.innerHTML = `
      <button class="card-header" type="button">
        <span class="card-chevron">▶</span>
        <img class="item-type-icon" src="img/icons/${type}.png" alt="${type}" loading="lazy">
        
<div class="card-title">
  <div class="item-name ${qualityClass}">
    ${item.name || "Unbekanntes Item"}
  </div>

  ${item.details ? `
    <div class="item-details-preview">
      ${item.details}
    </div>
  ` : ""}

<div class="item-meta">
  <span class="item-category">${categoryLabel}</span>

  <span class="season-badge ${seasonClass}">
    ${seasonLabel}
  </span>

${
  item.kind === "offer" &&
  item.tradeType === "rune" &&
  item.wantedRune
    ? `
      <span class="rune-inline-badge">
        <img src="img/rune.png" alt="Rune">
        ${item.wantedRune}
      </span>
    `
    : ""
}
</div>
</div>
      </button>

      <div class="card-details">
        ${item.screenshot ? `
          <div class="card-image">
            <img src="${item.screenshot}" alt="Screenshot" loading="lazy">
          </div>` : ""}

        <div class="card-body">
          ${item.roll ? `<div class="item-roll">${item.roll}</div>` : ""}
          <div class="player">${sourceLabel}</div>
          <div class="claim-row">
<button class="claim-btn ${item.tradeType === "rune" ? "rune" : ""}">
  ${
item.tradeType === "rune"
  ? `💎 ${item.wantedRune} anbieten`
  : "🖐️ Nehmen"
  }
</button>
          </div>
        </div>
      </div>
    `;

    const header = card.querySelector(".card-header");
    header.addEventListener("click", () => {
      const isOpen = card.dataset.open === "true";
      document.querySelectorAll(".card[data-open='true']").forEach(c => {
        c.dataset.open = "false";
      });
      card.dataset.open = isOpen ? "false" : "true";
    });

const btn = card.querySelector(".claim-btn");

// 🔎 SUCHE → Helfen-Button statt Claim
if (item.kind === "search") {

  if (btn) btn.remove();

  const row = card.querySelector(".claim-row");

  // 🔒 Eigene Suche → kein Helfen
  if (item.isOwner) {
    if (row) {
      const ownBtn = document.createElement("button");
      ownBtn.className = "claim-btn is-owner";
      ownBtn.textContent = "🔒 Deine Suche";
      ownBtn.disabled = true;
      row.appendChild(ownBtn);
    }
   
    container.appendChild(card);
    return;
  }

  const helpBtn = document.createElement("button");
  helpBtn.className = "help-btn";
  helpBtn.textContent = "🤝 Helfen";

  if (row) row.appendChild(helpBtn);

  helpBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    const confirmed = await showClaimModal({
      title: "Hilfe anbieten",
      text: `
        Möchtest du dem Suchenden helfen?<br><br>
        Dein hinterlegter BattleTag wird übermittelt,
        damit er dich ingame kontaktieren kann.
      `,
      confirmText: "Hilfe senden"
    });

    if (!confirmed) return;

    helpBtn.disabled = true;
    helpBtn.textContent = "Gesendet";

    await fetch(`${API}/items/${item.id}/help`, {
      method: "POST",
      credentials: "include"
    });
  });

} 
// ===============================
// OFFER LOGIK (FREE / RUNE)
// ===============================
else {

  // 🔒 Eigenes Item
  if (item.isOwner) {
    btn.disabled = true;
    btn.textContent = "🔒 Dein Item";
    btn.classList.add("is-owner");
  }

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (btn.disabled) return;

    const isRuneTrade = item.tradeType === "rune";

    const confirmed = await showClaimModal({
      title: isRuneTrade
        ? "Rune-Trade anbieten"
        : "Item reservieren",
      text: isRuneTrade
        ? `
          Du möchtest dieses Item gegen deine Rune tauschen?<br><br>
          Dein BattleTag wird für die Übergabe verwendet.
        `
        : `
          Möchtest du dieses Item verbindlich reservieren?<br><br>
          Dein hinterlegter BattleTag wird für die Übergabe verwendet.
        `,
      confirmText: isRuneTrade
        ? "Trade senden"
        : "Verbindlich reservieren"
    });

    if (!confirmed) return;

    btn.disabled = true;
    btn.textContent = "…";

    try {

      const endpoint = isRuneTrade
        ? "rune-request"
        : "claim";

      const res = await fetch(`${API}/items/${item.id}/${endpoint}`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) {
        showToast?.("Aktion fehlgeschlagen.");
        btn.disabled = false;
btn.textContent = isRuneTrade
  ? `💎 ${item.wantedRune} anbieten`
  : "🖐️ Nehmen";
        return;
      }

      if (isRuneTrade) {
        showToast?.("Trade-Anfrage gesendet.");
        btn.textContent = "Gesendet";
      } else {
        showToast?.("Item reserviert.");
        if (typeof window.loadItems === "function") {
          await window.loadItems();
        }
      }

    } catch {
  btn.disabled = false;
  btn.textContent = isRuneTrade
    ? `💎 ${item.wantedRune} anbieten`
    : "🖐️ Nehmen";
}
  });

} // Ende OFFER-Block

// 👇 Card am Ende einfügen
container.appendChild(card);

}); // forEach
}
