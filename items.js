// Zentrale Item-Liste
// Wird von index.html (Anzeige) und admin.html (Pflege) genutzt

let items = JSON.parse(localStorage.getItem("lootItems")) || [
  {
    name: "Trang-Ouls Schuppen",
    category: "Set",
    rating: 4,
    quality: "—",
    contact: "me_solli",
    status: "Verfügbar"
  },
  {
    name: "Der Erlöser",
    category: "Unique",
    rating: 3,
    quality: "281% ED / 75 DMG",
    contact: "me_solli",
    status: "Verfügbar"
  },
  {
    name: "Ali Baba",
    category: "Unique",
    rating: 3,
    quality: "108% / 11 Dex",
    contact: "me_solli",
    status: "Verfügbar"
  }
];

// ⭐ Sterne erzeugen (ohne Zahl)
function renderStars(value) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += i <= value ? "⭐" : "☆";
  }
  return stars;
}

// Tabelle rendern
function renderTable() {
  const tbody = document.querySelector("#lootTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  items.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td class="stars">${renderStars(item.rating)}</td>
      <td>${item.quality || "—"}</td>
      <td>${item.contact}</td>
      <td class="status ${item.status === "Verfügbar" ? "ok" : "gone"}">
        ${item.status}
      </td>
    `;

    tbody.appendChild(row);
  });
}

// Item hinzufügen (Admin)
function addItem(item) {
  items.push(item);
  localStorage.setItem("lootItems", JSON.stringify(items));
  renderTable();
}

// Initial laden
document.addEventListener("DOMContentLoaded", renderTable);
