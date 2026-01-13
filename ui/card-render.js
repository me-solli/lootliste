// ui/card-render.js
// =====================================
// UI-Layer für Item-Cards (V3 – FINAL)
// Core = Single Source of Truth
// UI übersetzt & visualisiert NUR
// =====================================

import {
  NEED_LIMIT,
  ITEM_STATUS,
  isNeedOpen
} from '../core/core.js';

// --------------------------------------------------
// UI Mappings (Core → Anzeige)
// --------------------------------------------------
const STATUS_LABELS = {
  [ITEM_STATUS.AVAILABLE]: 'Verfügbar',
  [ITEM_STATUS.RESERVED]: 'Reserviert',
  [ITEM_STATUS.COMPLETED]: 'Vergeben',
  [ITEM_STATUS.ABORTED]: 'Abgebrochen'
};

const STATUS_CLASSES = {
  [ITEM_STATUS.AVAILABLE]: 'verfuegbar',
  [ITEM_STATUS.RESERVED]: 'reserviert',
  [ITEM_STATUS.COMPLETED]: 'vergeben',
  [ITEM_STATUS.ABORTED]: 'vergeben' // neutral/dunkel
};

// --------------------------------------------------
// Render Entry
// --------------------------------------------------
export function renderItemCard(item, auth) {
  const needCount = Array.isArray(item.needs) ? item.needs.length : 0;

  const statusLabel = STATUS_LABELS[item.status] || item.status;
  const statusClass = STATUS_CLASSES[item.status] || '';

  return `
  <div class="card ${statusClass}">

    <div class="card-header">
      <h3 class="item-name">${item.name}</h3>
      <span class="status-badge ${statusClass}">${statusLabel}</span>
    </div>

    <div class="card-body">
      <div class="need-info">
        Bedarf: <strong>${needCount} / ${NEED_LIMIT}</strong>
      </div>
      ${renderNeedButton(item, auth)}
    </div>

    <div class="card-timeline">
      ${renderTimeline(item)}
    </div>

  </div>
  `;
}

// --------------------------------------------------
// Bedarf Button (Status → Auth → Core)
// --------------------------------------------------
function renderNeedButton(item, auth) {
  if (item.status !== ITEM_STATUS.AVAILABLE) {
    return `<button class="btn disabled" disabled>Bedarf nicht möglich</button>`;
  }

  if (!isNeedOpen(item)) {
    return `<button class="btn locked" disabled>Bedarf abgeschlossen</button>`;
  }

  if (!auth || auth.isLoggedIn !== true) {
    return `<button class="btn primary" data-action="auth">
      Login für Bedarf
    </button>`;
  }

  return `<button
    class="btn primary"
    data-action="need"
    data-item="${item.id}">
    Bedarf anmelden
  </button>`;
}

// --------------------------------------------------
// Timeline (UI-States sauber)
// --------------------------------------------------
function renderTimeline(item) {
  let step1 = 'future';
  let step2 = 'future';
  let step3 = 'future';

  if (item.status === ITEM_STATUS.AVAILABLE) {
    step1 = isNeedOpen(item) ? 'active' : 'done';
  }

  if (item.status === ITEM_STATUS.RESERVED) {
    step1 = 'done';
    step2 = 'active';
  }

  if (
    item.status === ITEM_STATUS.COMPLETED ||
    item.status === ITEM_STATUS.ABORTED
  ) {
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
