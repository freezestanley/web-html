const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { renderManifest } = require("./lib/manifest");

test("renderManifest writes the root manifest from .webdesign template placeholders", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-manifest-"));
  fs.mkdirSync(path.join(tempDir, ".webdesign"), { recursive: true });
  fs.writeFileSync(
    path.join(tempDir, ".webdesign", "manifest.json"),
    JSON.stringify(
      {
        projectId: "<project-uid>",
        name: "<project summary or name>",
        entry: "dist/index.html",
        owner: "<project.json.author or empty>",
        proxy: {
          routes: []
        }
      },
      null,
      2
    )
  );

  const { manifest, manifestPath } = renderManifest(tempDir, {
    projectUid: "PROJaabbccddeeff0011",
    name: "demo-project",
    summary: "Demo summary",
    author: "stanley"
  });

  assert.equal(manifest.projectId, "PROJaabbccddeeff0011");
  assert.equal(manifest.name, "Demo summary");
  assert.equal(manifest.entry, "dist/index.html");
  assert.equal(manifest.owner, "stanley");
  assert.equal(manifest.proxy.routes.length, 0);
  assert.equal(fs.existsSync(manifestPath), true);
});
