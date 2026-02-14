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

/* =========================
   DIABLO STYLE MODAL
========================== */
function showClaimModal() {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "claim-modal-overlay";

    overlay.innerHTML = `
      <div class="claim-modal">
        <h3>Item reservieren</h3>
        <p>
          Möchtest du dieses Item verbindlich reservieren?<br><br>
          Dein hinterlegter BattleTag wird für die Übergabe verwendet.
        </p>
        <div class="claim-modal-actions">
          <button class="modal-cancel">Abbrechen</button>
          <button class="modal-confirm">Verbindlich reservieren</button>
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
  `;

  document.head.appendChild(style);
})();

export function renderCards(items, container) {
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    card.id = `item-${item.id}`;
    card.dataset.open = "false";

    const type = VALID_TYPES.includes(item.type) ? item.type : "sonstiges";
    card.dataset.type = type;

    const qualityClass = item.quality
      ? `quality-${item.quality}`
      : "quality-normal";

    const categoryLabel = item.sub
      ? `${type} • ${item.sub}`
      : type;

    let sourceLabel = `<span class="source-muted">Quelle: Community-Drop</span>`;

    if (item.donor) {
      const donorClass =
        item.donorClass ||
        localStorage.getItem("lootliste_profile_class");

      const donorIcon =
        donorClass && CLASS_ICONS_MINI[donorClass]
          ? `<img class="donor-class-icon" src="${CLASS_ICONS_MINI[donorClass]}" alt="">`
          : "";

      sourceLabel = `
        <div class="donor-block">
          <span class="donor-label">Spender</span>
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
        </div>
      `;
    }

    card.innerHTML = `
      <button class="card-header" type="button">
        <span class="card-chevron">▶</span>
        <img class="item-type-icon" src="img/icons/${type}.png" alt="${type}" loading="lazy">
        <div class="card-title">
          <div class="item-name ${qualityClass}">${item.name || "Unbekanntes Item"}</div>
          <div class="item-category">${categoryLabel}</div>
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
            <button class="claim-btn">🖐️ Nehmen</button>
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

    if (item.isOwner) {
      btn.disabled = true;
      btn.textContent = "🔒 Dein Item";
      btn.classList.add("is-owner");
    }

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (btn.disabled) return;

      const confirmed = await showClaimModal();
      if (!confirmed) return;

      btn.disabled = true;
      btn.textContent = "…";

      try {
        const res = await fetch(`${API}/items/${item.id}/claim`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });

        if (!res.ok) {
          const err = await res.json();

          if (res.status === 400 && err.error === "Cannot claim own item") {
            showToast?.("🔒 Du kannst dein eigenes Item nicht nehmen.");
          } else if (res.status === 401) {
            showToast?.("Bitte zuerst einloggen.");
          } else if (res.status === 429) {
            showToast?.("Bitte kurz warten.");
          } else {
            showToast?.(err.error || "Item konnte nicht reserviert werden.");
          }

          btn.disabled = false;
          btn.textContent = "🖐️ Nehmen";
          return;
        }

        showToast?.("Item reserviert.");

        card.style.opacity = "0";
        card.style.transform = "scale(0.96)";
        setTimeout(() => card.remove(), 200);

      } catch {
        alert("Netzwerkfehler.");
        btn.disabled = false;
        btn.textContent = "🖐️ Nehmen";
      }
    });

    container.appendChild(card);
  });
}

window.renderCards = renderCards;
