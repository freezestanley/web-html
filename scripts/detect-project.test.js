const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("detect-project CLI accepts absolute path as positional projectPath", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-detect-abs-"));
  const projectId = "PROJabspos00112233";
  const projectDir = path.join(tempDir, projectId);
  fs.mkdirSync(path.join(projectDir, ".webdesign"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "project.json"),
    JSON.stringify({ projectUid: projectId, name: "abs-pos" }, null, 2)
  );
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "manifest.json"),
    JSON.stringify({ projectId, name: "Abs Pos" }, null, 2)
  );

  // Pass absolute path as positional arg — must NOT be treated as projectId
  const result = spawnSync(process.execPath, ["scripts/detect-project.js", projectDir], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, WEB_HTML_PROJECTS_DIR: tempDir },
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.projectRoot, projectDir);
  assert.equal(parsed.projectId, projectId);
});

test("detect-project CLI --project-path flag resolves correctly", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-detect-flag-"));
  const projectId = "PROJflagpath001122";
  const projectDir = path.join(tempDir, projectId);
  fs.mkdirSync(path.join(projectDir, ".webdesign"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "project.json"),
    JSON.stringify({ projectUid: projectId, name: "flag" }, null, 2)
  );
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "manifest.json"),
    JSON.stringify({ projectId, name: "Flag" }, null, 2)
  );

  const result = spawnSync(
    process.execPath,
    ["scripts/detect-project.js", "--project-path", projectDir],
    {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, WEB_HTML_PROJECTS_DIR: tempDir },
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.projectRoot, projectDir);
  assert.equal(parsed.projectId, projectId);
});

test("detect-project CLI prints managed project state as JSON", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-detect-project-"));
  const projectId = "PROJaabbccddeeff0011";
  const projectDir = path.join(tempDir, projectId);
  fs.mkdirSync(path.join(projectDir, ".webdesign"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "project.json"),
    JSON.stringify(
      {
        projectUid: projectId,
        name: "demo",
        currentTaskId: "20260708-102030-homepage"
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "manifest.json"),
    JSON.stringify({ projectId, name: "Demo" }, null, 2)
  );

  const result = spawnSync(process.execPath, ["scripts/detect-project.js", projectId], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, WEB_HTML_PROJECTS_DIR: tempDir },
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    projectType: "CONTINUE_MANAGED_PROJECT",
    projectMode: "continue",
    projectRoot: projectDir,
    projectUid: projectId,
    projectId,
    currentTaskId: "20260708-102030-homepage",
    hasWebdesignDir: true,
    hasProjectMeta: true,
    hasManifestTemplate: true,
    hasDist: false,
    blockReason: ""
  });
});
