// render.cards.js
const API = "https://lootliste-production.up.railway.app";

export function renderCards(items, container) {
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.type = item.type || "";

    card.innerHTML = `
      <div class="card-image">
        <img src="${item.icon || "img/icons/default.png"}" alt="">
      </div>

      <div class="card-body">
        <div class="item-name">${item.name}</div>
        <div class="item-sub">${item.sub || ""}</div>
        <div class="item-roll">${item.roll || ""}</div>

        <div class="stars">
          ${"★".repeat(item.rating || 0)}${"☆".repeat(5 - (item.rating || 0))}
          <span class="stars-num">${item.rating || 0}/5</span>
        </div>

        <div class="player">Spender: ${item.donor || "Community"}</div>

        <div class="claim-row">
          <button class="claim-btn">Nehmen</button>
        </div>
      </div>
    `;

    const btn = card.querySelector(".claim-btn");

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      const playerId = localStorage.getItem("playerId");
      if (!playerId) {
        alert("Spieler-ID fehlt. Seite neu laden.");
        return;
      }

      const contact = prompt("Kontakt für Übergabe (z. B. Discord):");
      if (!contact) return;

      btn.disabled = true;
      btn.textContent = "…";

      try {
        const res = await fetch(`${API}/items/${item.id}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            contact
          })
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Item konnte nicht genommen werden.");
          btn.disabled = false;
          btn.textContent = "Nehmen";
          return;
        }

        // Drop-Gefühl: Karte verschwindet
        card.style.opacity = "0";
        card.style.transform = "scale(0.96)";
        setTimeout(() => card.remove(), 200);

      } catch (err) {
        alert("Netzwerkfehler.");
        btn.disabled = false;
        btn.textContent = "Nehmen";
      }
    });

    container.appendChild(card);
  });
}
