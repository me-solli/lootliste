const API = "https://lootliste-production.up.railway.app";

export function renderCards(items, container) {
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.type = item.category || "";

    card.innerHTML = `
      ${item.screenshot ? `
        <div class="card-image">
          <img src="${item.screenshot}" alt="Screenshot von ${item.name}">
        </div>
      ` : ""}

      <div class="card-body">

        <div class="item-name">${item.name}</div>

        ${(item.quality || item.category) ? `
          <div class="item-meta">
            ${item.quality ? `<span class="quality">${item.quality}</span>` : ""}
            ${item.category ? `<span class="category">${item.category}</span>` : ""}
          </div>
        ` : ""}

        ${item.sub ? `<div class="item-sub">${item.sub}</div>` : ""}
        ${item.roll ? `<div class="item-roll">${item.roll}</div>` : ""}

        ${typeof item.rating === "number" ? `
          <div class="stars">
            ${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}
            <span class="stars-num">${item.rating}/5</span>
          </div>
        ` : ""}

        <div class="player">
          Spender: ${item.donor || "Community"}
        </div>

        <div class="claim-row">
          <button class="claim-btn">🖐️ Nehmen</button>
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
          body: JSON.stringify({ playerId, contact })
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Item konnte nicht genommen werden.");
          btn.disabled = false;
          btn.textContent = "🖐️ Nehmen";
          return;
        }

        // ✅ UX-Feedback (Toast)
        if (typeof showToast === "function") {
          showToast("Item reserviert – Kontakt gespeichert");
        }

        // ✅ Card sauber entfernen
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
