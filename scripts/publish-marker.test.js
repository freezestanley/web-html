const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPublishMarker, validatePublishMarker, HEADER, FOOTER, DELIMITER } = require("./lib/publish-marker");

test("buildPublishMarker produces the immutable publish protocol marker", () => {
  const marker = buildPublishMarker({
    projectUid: "PROJaabbccddeeff0011",
    sourceZipPath: "/tmp/project.zip",
    distZipPath: "/tmp/dist.zip",
    projectName: "demo-project",
    descript: "Demo summary"
  });

  assert.equal(marker.startsWith(HEADER), true);
  assert.equal(marker.endsWith(FOOTER), true);
  assert.equal(marker.includes(DELIMITER), true);
  assert.equal(validatePublishMarker(marker), true);
});
