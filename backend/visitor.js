// backend/visitor.js (ESM)

// Interner Counter (Low-Variante, Reset bei Server-Restart)
let visitCount = 0;

/**
 * Erhöht den Besucherzähler um +1
 * @returns {number} aktueller Stand
 */
export function registerVisit() {
  visitCount += 1;
  return visitCount;
}

/**
 * Gibt den aktuellen Besucherstand zurück,
 * ohne ihn zu erhöhen
 * @returns {number}
 */
export function getVisitCount() {
  return visitCount;
}
