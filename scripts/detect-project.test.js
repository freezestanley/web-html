const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("detect-project CLI prints managed project state as JSON", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-detect-project-"));
  const projectDir = path.join(tempDir, "demo");
  fs.mkdirSync(path.join(projectDir, ".webdesign"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "project.json"),
    JSON.stringify(
      {
        projectUid: "PROJaabbccddeeff0011",
        name: "demo",
        currentTaskId: "20260708-102030-homepage"
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "manifest.json"),
    JSON.stringify({ projectId: "PROJaabbccddeeff0011", name: "Demo" }, null, 2)
  );

  const result = spawnSync(process.execPath, ["scripts/detect-project.js", "demo"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, WEB_HTML_PROJECTS_DIR: tempDir },
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    projectType: "CONTINUE_MANAGED_PROJECT",
    projectMode: "continue",
    projectRoot: projectDir,
    projectUid: "PROJaabbccddeeff0011",
    projectName: "demo",
    currentTaskId: "20260708-102030-homepage",
    hasWebdesignDir: true,
    hasProjectMeta: true,
    hasManifestTemplate: true,
    hasDist: false,
    blockReason: ""
  });
});
