const API = "https://lootliste-production.up.railway.app";

const VALID_TYPES = [
  "waffe","helm","ruestung","schild","guertel",
  "handschuhe","schuhe","amulett","ring",
  "charm","rune","sonstiges"
];

function stop(e){ e.stopPropagation(); }

export function renderCards(items, container){
  container.innerHTML = "";

  items.forEach(item => {

    const type = VALID_TYPES.includes(item.type) ? item.type : "sonstiges";
    const qualityClass = item.quality ? `quality-${item.quality}` : "";
    const isOwner = item.isOwner === true;

    const card = document.createElement("article");
    card.className = `card altar ${isOwner ? "is-own" : ""}`;
    card.dataset.open = "false";

    /* =========================
       SPENDER
    ========================== */
    const donorHTML = item.donor
      ? `
        <a
          href="profile.html?user=${encodeURIComponent(item.donor)}"
          class="donor-link"
          onclick="event.stopPropagation()"
          title="Profil ansehen"
        >
          ✦ ${item.donor}
        </a>
      `
      : `<span class="donor-unknown">✦ Unbekannte Herkunft</span>`;

    /* =========================
       SIEGEL (OWN ITEM)
    ========================== */
    const seal = isOwner
      ? `<div class="own-seal">🔒 Dein Artefakt</div>`
      : ``;

    /* =========================
       TEMPLATE
    ========================== */
    card.innerHTML = `
      <!-- HEADER / ALTAR -->
      <div class="altar-header" onclick="this.closest('.card').dataset.open =
        this.closest('.card').dataset.open === 'true' ? 'false' : 'true'">

        <img class="altar-icon"
             src="img/icons/${type}.png"
             alt="${type}">

        <div class="altar-title">
          <div class="item-name ${qualityClass}">
            ${item.name || "Unbekanntes Artefakt"}
          </div>
          <div class="item-type">
            ${type.toUpperCase()}
          </div>
        </div>

        ${seal}
      </div>

      <!-- BODY -->
      <div class="altar-body">

        ${item.screenshot ? `
          <div class="altar-image">
            <img src="${item.screenshot}" loading="lazy">
          </div>
        ` : ""}

        <div class="altar-info">

          ${item.roll ? `
            <div class="altar-roll">
              ${item.roll}
            </div>
          ` : ""}

          <div class="altar-origin">
            ${donorHTML}
          </div>

          <div class="altar-action">
            <button class="claim-btn">🖐️ Nehmen</button>
          </div>

        </div>
      </div>
    `;

    /* =========================
       CLAIM LOGIK
    ========================== */
    const btn = card.querySelector(".claim-btn");

    if(isOwner){
      btn.disabled = true;
      btn.textContent = "🔒 Dein Artefakt";
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
          alert("Konnte nicht beansprucht werden.");
          return;
        }

        if(typeof showToast === "function"){
          showToast("Artefakt beansprucht");
        }

        card.classList.add("fade-out");
        setTimeout(()=>card.remove(),200);

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
