const API = "https://lootliste-production.up.railway.app";

/* ===============================
   KONSTANTEN
=============================== */
const VALID_TYPES = [
  "waffe","helm","ruestung","schild","guertel",
  "handschuhe","schuhe","amulett","ring",
  "charm","rune","sonstiges"
];

/* ===============================
   HELPER
=============================== */
function stop(e){ e.stopPropagation(); }

/* ===============================
   RENDER
=============================== */
export function renderCards(items, container){
  container.innerHTML = "";

  items.forEach(item => {

    const type = VALID_TYPES.includes(item.type) ? item.type : "sonstiges";
    const qualityClass = item.quality ? `quality-${item.quality}` : "";
    const isOwner = item.isOwner === true;

    const card = document.createElement("article");
    card.className = "card";
    card.dataset.open = "false";
    card.dataset.type = type;

    /* =========================
       SPENDER / PROFIL
    ========================== */
    const donorHTML = item.donor
      ? `
        <a
          href="profile.html?user=${encodeURIComponent(item.donor)}"
          class="profile-link"
          title="Profil ansehen"
          onclick="event.stopPropagation()"
        >
          ${item.donor}
        </a>
      `
      : `<span class="source-muted">Community</span>`;

    /* =========================
       STATUS (NUR WENN RELEVANT)
    ========================== */
    const ownerBadge = isOwner
      ? `<span class="badge-own">🔒 Dein Item</span>`
      : ``;

    /* =========================
       TEMPLATE
    ========================== */
    card.innerHTML = `
      <!-- HEADER -->
      <button class="card-header" type="button">
        <span class="card-chevron">▶</span>

        <img
          class="item-type-icon"
          src="img/icons/${type}.png"
          alt="${type}"
        >

        <div class="card-title">
          <div class="item-name ${qualityClass}">
            ${item.name || "Unbekanntes Item"}
          </div>
          <div class="item-category">
            ${type.toUpperCase()}
          </div>
        </div>

        ${ownerBadge}
      </button>

      <!-- DETAILS -->
      <div class="card-details">

        ${item.screenshot ? `
          <div class="card-image">
            <img
              src="${item.screenshot}"
              alt="Screenshot von ${item.name}"
              loading="lazy"
            >
          </div>
        ` : ""}

        <div class="card-body">

          ${item.roll ? `
            <div class="item-roll">${item.roll}</div>
          ` : ""}

          <div class="player">
            Spender: ${donorHTML}
          </div>

          <div class="actions">
            <button class="claim-btn">🖐️ Nehmen</button>
          </div>

        </div>
      </div>
    `;

    /* =========================
       OPEN / CLOSE
    ========================== */
    const header = card.querySelector(".card-header");
    header.addEventListener("click", () => {
      const open = card.dataset.open === "true";
      document.querySelectorAll(".card[data-open='true']")
        .forEach(c => c.dataset.open = "false");
      card.dataset.open = open ? "false" : "true";
    });

    /* =========================
       CLAIM LOGIK
    ========================== */
    const btn = card.querySelector(".claim-btn");

    if(isOwner){
      btn.disabled = true;
      btn.textContent = "🔒 Dein Item";
    }

    btn.addEventListener("click", async e => {
      stop(e);
      if(btn.disabled) return;

      const accountId = localStorage.getItem("lootliste_account_id");
      if(!accountId){
        alert("Bitte einloggen oder registrieren.");
        return;
      }

      const battleTag = prompt("BattleTag (Name#1234):");
      if(!battleTag) return;

      btn.disabled = true;
      btn.textContent = "…";

      try{
        const res = await fetch(`${API}/items/${item.id}/claim`,{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "X-Account-Id":accountId
          },
          body:JSON.stringify({ contact:battleTag })
        });

        if(!res.ok){
          btn.disabled = false;
          btn.textContent = "🖐️ Nehmen";
          alert("Konnte nicht reserviert werden.");
          return;
        }

        if(typeof showToast === "function"){
          showToast("Item reserviert");
        }

        card.remove();

      }catch{
        btn.disabled = false;
        btn.textContent = "🖐️ Nehmen";
        alert("Netzwerkfehler");
      }
    });

    container.appendChild(card);
  });
}

window.renderCards = renderCards;
