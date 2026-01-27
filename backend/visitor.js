// backend/visitor.js

let visitCount = 0;

function registerVisit() {
  visitCount += 1;
  return visitCount;
}

module.exports = {
  registerVisit
};
