// card-render.js
// ===============================
// UI-Layer für Item-Cards
// Liest NUR aus dem Core – keine eigene Logik

import {
  NEED_LIMIT,
  ITEM_STATUS,
  isNeedOpen,
  isNeedFull
} from '/lootliste/core/core.js';

// --------------------------------------------------
// Render Entry
// --------------------------------------------------
export function renderItemCard(item, auth) {
  const needCount = item.needs.length;

  const needInfo = `Bedarf: <strong>${needCount} / ${NEED_LIMIT}</strong>`;

  const needButton = renderNeedButton(item, auth);
  const timeline = renderTimeline(item);

  return `
  <div class="card ${item.status}">

    <div class="card-header">
      <h3 class="item-name">${item.name}</h3>
      <span class="status-badge ${item.status}">${item.status}</span>
    </div>

    <div class="card-body">
      <div class="need-info">${needInfo}</div>
      ${needButton}
    </div>

    <div class="card-timeline">
      ${timeline}
    </div>

  </div>
  `;
}

// --------------------------------------------------
// Bedarf Button
// --------------------------------------------------
function renderNeedButton(item, auth) {
  if (item.status !== ITEM_STATUS.AVAILABLE) {
    return `<button class="btn disabled" disabled>Bedarf nicht möglich</button>`;
  }

  if (!isNeedOpen(item)) {
    return `<button class="btn locked" disabled>Bedarf abgeschlossen</button>`;
  }

  if (!auth?.isLoggedIn) {
    return `<button class="btn primary" data-action="auth">Login für Bedarf</button>`;
  }

  return `<button class="btn primary" data-action="need" data-item="${item.id}">Bedarf anmelden</button>`;
}

// --------------------------------------------------
// Timeline (minimal & korrekt)
// --------------------------------------------------
function renderTimeline(item) {
  let step1 = 'inactive';
  let step2 = 'inactive';
  let step3 = 'inactive';

  if (item.status === ITEM_STATUS.AVAILABLE) {
    step1 = isNeedOpen(item) ? 'active' : 'done';
  }

  if (item.status === ITEM_STATUS.RESERVED) {
    step1 = 'done';
    step2 = 'active';
  }

  if (item.status === ITEM_STATUS.COMPLETED) {
    step1 = 'done';
    step2 = 'done';
    step3 = 'active';
  }

  return `
    <div class="timeline-step ${step1}">Bedarf</div>
    <div class="timeline-step ${step2}">Reserviert</div>
    <div class="timeline-step ${step3}">Vergeben</div>
  `;
}
