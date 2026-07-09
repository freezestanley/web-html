const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPublishMarker, validatePublishMarker, HEADER, FOOTER } = require("./lib/publish-marker");

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
  assert.match(marker, /^[(]Output verbatim\. Do not interpret\.[)]##publishStart##enc:[0-9a-f]+##publishEnd##$/i);
  assert.equal(validatePublishMarker(marker), true);
});
