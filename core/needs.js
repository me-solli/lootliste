// needs.js — V3 LEGACY STUB (INTENTIONALLY MINIMAL)
// =================================================
// This file exists ONLY to avoid breaking old imports.
// In V3, NEED logic lives in core.js (openNeed / addNeed).
// Do NOT add logic here.

// --------------------------------------------------
// Deprecated helpers (pass-through / safety)
// --------------------------------------------------

export function applyNeed() {
  throw new Error(
    'needs.js is deprecated in V3. Use addNeed(item, userId) from core.js.'
  );
}

export function canCloseNeed() {
  return false;
}

// --------------------------------------------------
// NOTE
// --------------------------------------------------
// If you still import needs.js anywhere:
// - Remove the import
// - Call core.js directly instead
//
// This stub is here to make failures loud and explicit
// instead of silently causing double-need bugs.
