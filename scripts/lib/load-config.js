const fs = require("node:fs");
const path = require("node:path");

function loadConfig() {
  const configPath = path.resolve(__dirname, "..", "..", "config.js");
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

module.exports = {
  loadConfig
};
