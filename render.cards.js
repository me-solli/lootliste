const API = "https://lootliste-production.up.railway.app";

// erlaubte Item-Typen laut Icon-Bar
const VALID_TYPES = [
  "waffe",
  "helm",
  "ruestung",
  "schild",
  "guertel",
  "handschuhe",
  "schuhe",
  "amulett",
  "ring",
  "charm",
  "rune",
  "sonstiges"
];

export function renderCards(items, container) {
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";

    // ✅ type strikt & sicher
    const type = VALID_TYPES.includes(item.type) ? item.type : "default";
    card.dataset.type = type;

    card.innerHTML = `
      ${item.screenshot ? `
        <div class="card-image">
          <img src="${item.screenshot}" alt="Screenshot von ${item.name || "Item"}">
        </div>
      ` : ""}

      <div class="card-body">

        <div class="item-name">${item.name || "Unbekanntes Item"}</div>

        ${item.quality ? `
          <div class="item-meta">
            <span class="quality">${item.quality}</span>
          </div>
        ` : ""}

        ${item.sub ? `<div class="item-sub">${item.sub}</div>` : ""}
        ${item.roll ? `<div class="item-roll">${item.roll}</div>` : ""}

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

        if (typeof showToast === "function") {
          showToast("Item reserviert – Kontakt gespeichert");
        }

        // Card sauber entfernen
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
