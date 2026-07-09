const fs = require("node:fs");
const path = require("node:path");

function loadGates() {
  const gatesPath = path.resolve(__dirname, "..", "..", "gates.json");
  return JSON.parse(fs.readFileSync(gatesPath, "utf8"));
}

function isAllowedTransition(currentGate, targetGate, blocked, gatesConfig) {
  if (blocked) {
    const unblockTargets = gatesConfig.blockPolicy?.unblockTargets?.[currentGate] || [];
    return unblockTargets.includes(targetGate);
  }
  const allowed = gatesConfig.transitions?.[currentGate] || [];
  return allowed.includes(targetGate);
}

module.exports = {
  loadGates,
  isAllowedTransition
};
