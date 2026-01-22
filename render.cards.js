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
    card.dataset.open = "false";

    // Typ strikt & sicher
    const type = VALID_TYPES.includes(item.type) ? item.type : "sonstiges";
    card.dataset.type = type;

    // Qualitätsklasse
    const qualityClass = item.quality
      ? `quality-${item.quality}`
      : "quality-normal";

    // Kategorie-Label (Header)
    const categoryLabel = item.sub
      ? `${type} • ${item.sub}`
      : type;

    // Spender / Quelle
    const sourceLabel = item.donor
      ? `Spender: ${item.donor}`
      : "Quelle: Community-Drop";

    card.innerHTML = `
      <!-- HEADER (immer sichtbar) -->
      <button class="card-header" type="button">
        <span class="card-chevron">▶</span>

        <img
          class="item-type-icon"
          src="img/icons/${type}.png"
          alt="${type}"
          loading="lazy"
        >

        <div class="card-title">
          <div class="item-name ${qualityClass}">
            ${item.name || "Unbekanntes Item"}
          </div>
          <div class="item-category">
            ${categoryLabel}
          </div>
        </div>
      </button>

      <!-- DETAILS (ausklappbar) -->
      <div class="card-details">

        ${item.screenshot ? `
          <div class="card-image">
            <img
              src="${item.screenshot}"
              alt="Screenshot von ${item.name || "Item"}"
              loading="lazy"
            >
          </div>
        ` : ""}

        <div class="card-body">

          ${item.roll ? `
            <div class="item-roll">
              ${item.roll}
            </div>
          ` : ""}

          <div class="player">
            ${sourceLabel}
          </div>

          <div class="claim-row">
            <button class="claim-btn">
              🖐️ Nehmen
            </button>
          </div>

        </div>
      </div>
    `;

    /* =========================
       TOGGLE (NUR EINE CARD OFFEN)
    ========================== */
    const header = card.querySelector(".card-header");
    header.addEventListener("click", () => {
      const isOpen = card.dataset.open === "true";

      // alle anderen Cards schließen
      document.querySelectorAll(".card[data-open='true']").forEach(c => {
        c.dataset.open = "false";
      });

      // aktuelle togglen
      card.dataset.open = isOpen ? "false" : "true";
    });

    /* =========================
       CLAIM LOGIK (BattleTag)
    ========================== */
    const btn = card.querySelector(".claim-btn");

    // 🔒 Eigenes Item
    if (item.isOwner) {
      btn.disabled = true;
      btn.textContent = "🔒 Dein Item";
      btn.classList.add("is-owner");
    }

    btn.addEventListener("click", async (e) => {
      e.stopPropagation(); // verhindert Zuklappen
      if (btn.disabled) return;

      const playerId = localStorage.getItem("lootliste_user_id");
      if (!playerId) {
        alert("Bitte anmelden oder registrieren, um Items beanspruchen zu können.");
        return;
      }

      const battleTag = prompt(
        "BattleTag für Übergabe (z. B. me_solli#1234):"
      );

      if (!battleTag) return;

      // Mini-Validierung: genau ein #, links & rechts nicht leer
      const parts = battleTag.split("#");
      if (
        parts.length !== 2 ||
        parts[0].trim() === "" ||
        parts[1].trim() === ""
      ) {
        alert("Bitte einen gültigen BattleTag im Format Name#1234 eingeben.");
        return;
      }

      btn.disabled = true;
      btn.textContent = "…";

      try {
        const res = await fetch(`${API}/items/${item.id}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            battleTag: battleTag.trim()
          })
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Item konnte nicht beansprucht werden.");
          btn.disabled = false;
          btn.textContent = "🖐️ Nehmen";
          return;
        }

        if (typeof showToast === "function") {
          showToast("Item reserviert – BattleTag gespeichert");
        }

        // Card sauber entfernen (Demo-/Listen-UX)
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

/* =========================
   DEMO / DEBUG HOOK
   (nur für Konsole & Demos)
========================== */
window.renderCards = renderCards;
