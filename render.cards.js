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

/* =========================
   SPENDER / PROFIL-LINK
========================== */
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
      <!-- HEADER -->
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

      <!-- DETAILS -->
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
            <button class="claim-btn">🖐️ Nehmen</button>
          </div>

        </div>
      </div>
    `;

    /* =========================
       TOGGLE OPEN / CLOSE
    ========================== */
    const header = card.querySelector(".card-header");
    header.addEventListener("click", () => {
      const isOpen = card.dataset.open === "true";
      document.querySelectorAll(".card[data-open='true']").forEach(c => {
        c.dataset.open = "false";
      });
      card.dataset.open = isOpen ? "false" : "true";
    });

    /* =========================
       CLAIM LOGIK (UNVERÄNDERT)
    ========================== */
    const btn = card.querySelector(".claim-btn");

    if (item.isOwner) {
      btn.disabled = true;
      btn.textContent = "🔒 Dein Item";
      btn.classList.add("is-owner");
    }

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (btn.disabled) return;

      const battleTag = prompt(
        "BattleTag für Übergabe (z. B. me_solli#1234):"
      );
      if (!battleTag) return;

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
  credentials: "include",   // 🔥 WICHTIG
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    contact: battleTag.trim()
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
