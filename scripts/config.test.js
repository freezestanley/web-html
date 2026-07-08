const test = require("node:test");
const assert = require("node:assert/strict");

const { loadConfig } = require("./lib/load-config");

test("loadConfig reads the root web-html config", () => {
  const config = loadConfig();

  assert.equal(typeof config.PROJECTS_DIR, "string");
  assert.equal(typeof config.WEBDESIGN_DIR, "string");
  assert.equal(config.WEBDESIGN_DIR, ".webdesign");
});
