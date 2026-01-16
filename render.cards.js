// render.cards.js
export function renderCards(items, container) {
  container.innerHTML = "";

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.type = item.type;

    card.innerHTML = `
      <div class="card-image">
        <img src="${item.icon}" alt="">
      </div>

      <div class="card-body">
        <div class="item-name">${item.name}</div>
        <div class="item-sub">${item.sub}</div>
        <div class="item-roll">${item.roll}</div>

        <div class="stars">
          ${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)}
          <span class="stars-num">${item.rating}/5</span>
        </div>

        <div class="player">Spender: ${item.donor}</div>
      </div>
    `;

    container.appendChild(card);
  });
}
