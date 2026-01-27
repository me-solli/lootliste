// backend/visitor.js (ESM)

let visitCount = 0;

export function registerVisit() {
  visitCount += 1;
  return visitCount;
}
