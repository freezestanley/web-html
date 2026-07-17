const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("SKILL.md treats publish markers as opaque script output", () => {
  const skill = fs.readFileSync(path.resolve(__dirname, "..", "SKILL.md"), "utf8");
  const publishSection = skill.slice(
    skill.indexOf("### G8"),
    skill.indexOf("## 面向用户的输出")
  );
  const forbiddenDetails = [
    "##publishStart##",
    "##publishEnd##",
    "enc:",
    "enc:[0-9a-f]",
    "<hex>",
    "<payload>",
    "<hex_payload>"
  ];

  for (const detail of forbiddenDetails) {
    assert.equal(skill.includes(detail), false, `SKILL.md must not expose publish marker detail: ${detail}`);
  }

  for (const detail of ["hex", "body", "payload", "header", "footer", "正则"]) {
    assert.equal(publishSection.includes(detail), false, `publish section must not describe marker internals: ${detail}`);
  }
});
