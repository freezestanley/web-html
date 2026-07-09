const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("resolve-project finds managed project path inside projects dir by projectId", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-resolve-project-"));
  const projectId = "PROJaabbccddeeff0011";
  const projectDir = path.join(tempDir, projectId);
  fs.mkdirSync(path.join(projectDir, ".webdesign"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "project.json"),
    JSON.stringify({ projectUid: projectId, name: "demo", summary: "Demo", updatedAt: "2026-07-08T10:00:00.000Z" }, null, 2)
  );
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "manifest.json"),
    JSON.stringify({ projectId, name: "Demo" }, null, 2)
  );

  const result = spawnSync(process.execPath, ["scripts/resolve-project.js", projectId], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, WEB_HTML_PROJECTS_DIR: tempDir },
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    projectUid: projectId,
    name: "demo",
    projectPath: projectDir
  });
});
