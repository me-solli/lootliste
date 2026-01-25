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
    const isOwner = item.isOwner === true;

    const card = document.createElement("article");
    card.className = `card altar ${isOwner ? "is-own" : ""}`;
    card.dataset.open = "false";

    card.innerHTML = `
      <!-- HEADER -->
      <div class="altar-header"
           onclick="this.closest('.card').dataset.open =
           this.closest('.card').dataset.open === 'true' ? 'false' : 'true'">

        <img class="altar-icon" src="img/icons/${type}.png">

        <div class="altar-title">
          <div class="item-name">${item.name}</div>
          <div class="item-type">${type.toUpperCase()}</div>
        </div>

        ${isOwner ? `<div class="own-seal">🔒 Dein Item</div>` : ``}
        <div class="toggle-indicator">▾</div>
      </div>

      <!-- BODY -->
      <div class="altar-body">

        ${item.screenshot ? `
          <div class="altar-image">
            <img src="${item.screenshot}" loading="lazy">
          </div>
        ` : ``}

        <div class="altar-info">

          ${item.roll ? `<div class="altar-roll">${item.roll}</div>` : ``}

          <div class="altar-origin">
            ✦ <a href="profile.html?user=${encodeURIComponent(item.donor)}"
                 onclick="event.stopPropagation()">${item.donor}</a>
          </div>

          <div class="altar-action">
            <button class="claim-btn">${isOwner ? "🔒 Dein Item" : "🖐️ Nehmen"}</button>
          </div>

        </div>
      </div>
    `;

    const btn = card.querySelector(".claim-btn");
    if(isOwner) btn.disabled = true;

    btn.addEventListener("click", async e => {
      stop(e);
      if(btn.disabled) return;

      const accountId = localStorage.getItem("lootliste_account_id");
      if(!accountId) return alert("Bitte einloggen.");

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

        if(!res.ok) throw new Error();
        card.remove();
      }catch{
        btn.disabled = false;
        btn.textContent = "🖐️ Nehmen";
        alert("Fehler beim Nehmen");
      }
    });

    container.appendChild(card);
  });
}

window.renderCards = renderCards;
