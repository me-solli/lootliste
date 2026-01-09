/* =====================================================
   V3 CORE – TIMEOUTS / VERFALL
   Scope: NUR Zeit- & Status-Übergänge
   Freeze: V3-Systemregeln
   Keine UI, kein DOM, keine Nebenwirkungen
===================================================== */

// --------------------------------------------------
// Status (einzige erlaubte Zustände)
// --------------------------------------------------
export const ITEM_STATUS = Object.freeze({
  AVAILABLE: "verfügbar",
  NEED_OPEN: "bedarf_offen",
  ROLL_PHASE: "würfel_phase",
  RESERVED: "reserviert",
  ASSIGNED: "vergeben_bestätigt"
});

// --------------------------------------------------
// Zeitkonstanten (Single Source of Truth)
// --------------------------------------------------
export const TIME = {
  NEED_DURATION: 24 * 60 * 60 * 1000,      // 24h Bedarf
  RESERVE_DURATION: 24 * 60 * 60 * 1000    // 24h Reservierung
};

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function now() {
  return Date.now();
}

// --------------------------------------------------
// Reset → verfügbar (zentral, deterministisch)
// --------------------------------------------------
export function resetToAvailable(item) {
  item.status = ITEM_STATUS.AVAILABLE;

  item.needStartedAt = null;
  item.rollStartedAt = null;
  item.reservedAt = null;

  item.needs = [];
  item.winner = null;
}

// --------------------------------------------------
// Verfall-Prüfung (ohne Timer, ohne Cron)
// Rückgabe: true, wenn Status gewechselt wurde
// --------------------------------------------------
export function checkItemExpiry(item) {
  const t = now();

  // Bedarf abgelaufen → zurück zu verfügbar
  if (
    item.status === ITEM_STATUS.NEED_OPEN &&
    item.needStartedAt &&
    t - item.needStartedAt > TIME.NEED_DURATION
  ) {
    resetToAvailable(item);
    return true;
  }

  // Reservierung abgelaufen → zurück zu verfügbar
  if (
    item.status === ITEM_STATUS.RESERVED &&
    item.reservedAt &&
    t - item.reservedAt > TIME.RESERVE_DURATION
  ) {
    resetToAvailable(item);
    return true;
  }

  return false;
}

// --------------------------------------------------
// Bulk-Check (komfortabel, optional)
// --------------------------------------------------
export function checkAllExpiries(items = []) {
  let changed = false;
  items.forEach(item => {
    if (checkItemExpiry(item)) changed = true;
  });
  return changed;
}
