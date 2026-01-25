const API = "https://lootliste-production.up.railway.app";

/* ===============================
   KONSTANTEN
=============================== */
const VALID_TYPES = [
  "waffe","helm","ruestung","schild","guertel",
  "handschuhe","schuhe","amulett","ring",
  "charm","rune","sonstiges"
];

const STATUS = {
  FREE: "free",
  RESERVED: "reserved",
  OWN: "own"
};

/* ===============================
   HELPER
=============================== */
function timeAgo(ts){
  if(!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if(diff <= 0) return "heute";
  if(diff === 1) return "vor 1 Tag";
  return `vor ${diff} Tagen`;
}

function stop(e){ e.stopPropagation(); }

/* ===============================
   RENDER
=============================== */
export function renderCards(items, container){
  container.innerHTML = "";

  items.forEach(item => {

    /* ---------- STATE ---------- */
    const type = VALID_TYPES.includes(item.type) ? item.type : "sonstiges";
    const qualityClass = item.quality ? `quality-${item.quality}` : "";
    const isOwner = item.isOwner === true;
    const isReserved = item.reserved === true;

    let status = STATUS.FREE;
    if(isOwner) status = STATUS.OWN;
    else if(isReserved) status = STATUS.RESERVED;

    /* ---------- CARD ---------- */
    const card = document.createElement("article");
    card.className = `card status-${status}`;
    card.dataset.open = "false";
    card.dataset.type = type;

    /* ---------- SPENDER ---------- */
    let donorHTML = `<span class="source-muted">Community-Drop</span>`;

    if(item.donor){
      donorHTML = `
        <a
          href="profile.html?user=${encodeURIComponent(item.donor)}"
          class="profile-link"
          title="Profil von ${item.donor} ansehen"
          onclick="event.stopPropagation()"
        >
          <span class="profile-icon">👤</span>
          <span class="profile-name">${item.donor}</span>
        </a>
      `;
    }

    /* ---------- STATUS LABEL ---------- */
    let statusLabel = `<span class="status free">🟢 Verfügbar</span>`;
    if(status === STATUS.RESERVED){
      statusLabel = `<span class="status reserved">🟡 Reserviert</span>`;
    }
    if(status === STATUS.OWN){
      statusLabel = `<span class="status own">🔒 Dein Item</span>`;
    }

    /* ---------- TEMPLATE ---------- */
    card.innerHTML = `
      <!-- HEADER -->
      <button class="card-header" type="button">
        <span class="card-chevron">▶</span>

        <img class="item-type-icon"
             src="img/icons/${type}.png"
             alt="${type}">

        <div class="card-title">
          <div class="item-name ${qualityClass}">
            ${item.name || "Unbekanntes Item"}
          </div>
          <div class="item-category">
            ${type.toUpperCase()}
          </div>
        </div>

        ${statusLabel}
      </button>

      <!-- DETAILS -->
      <div class="card-details">

        ${item.screenshot ? `
          <div class="card-image">
            <img src="${item.screenshot}"
                 alt="Screenshot von ${item.name}"
                 loading="lazy">
          </div>` : ""
        }

        <div class="card-body">

          ${item.roll ? `
            <div class="item-roll">${item.roll}</div>` : ""
          }

          <div class="meta">
            <div class="player">
              ${donorHTML}
            </div>
            <div class="time">
              ${item.createdAt ? timeAgo(item.createdAt) : ""}
            </div>
          </div>

          <div class="actions">
            <button class="claim-btn">🖐️ Nehmen</button>
          </div>

        </div>
      </div>
    `;

    /* ===============================
       OPEN / CLOSE
    =============================== */
    const header = card.querySelector(".card-header");
    header.addEventListener("click", () => {
      const open = card.dataset.open === "true";
      document.querySelectorAll(".card[data-open='true']")
        .forEach(c => c.dataset.open = "false");
      card.dataset.open = open ? "false" : "true";
    });

    /* ===============================
       CLAIM LOGIK
    =============================== */
    const btn = card.querySelector(".claim-btn");

    if(status !== STATUS.FREE){
      btn.disabled = true;
      btn.textContent = status === STATUS.OWN
        ? "🔒 Dein Item"
        : "🟡 Reserviert";
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

        card.classList.add("fade-out");
        setTimeout(()=>card.remove(),220);

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
