const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { validatePublishMarker } = require("./lib/publish-marker");

function setupPublishProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-publish-final-"));
  const projectPath = path.join(tempDir, "demo-project");
  const taskId = "20260708-102030-homepage";
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  fs.mkdirSync(path.join(projectPath, ".webdesign"), { recursive: true });
  fs.mkdirSync(path.join(projectPath, "dist", "assets"), { recursive: true });
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(projectPath, "dist", "index.html"), "<!doctype html><h1>publish</h1>");
  fs.writeFileSync(path.join(projectPath, "dist", "assets", "app.js"), "console.log('demo');");

  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "project.json"),
    JSON.stringify(
      {
        projectUid: "PROJaabbccddeeff0011",
        name: "demo-project",
        summary: "Demo summary",
        author: "stanley",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T10:00:00.000Z",
        currentTaskId: taskId,
        sourceZipPath: "",
        distZipPath: ""
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "manifest.json"),
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
  fs.writeFileSync(
    path.join(taskDir, "workflow.json"),
    JSON.stringify(
      {
        taskId,
        pageSlug: "homepage",
        intent: "create",
        currentGate: "G9_PUBLISH_READY",
        blocked: false,
        blockReason: "",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T10:00:00.000Z",
        history: []
      },
      null,
      2
    )
  );

  return { tempDir, projectPath, taskId };
}

test("publish-final emits only one validated marker line and stores the same marker", (t) => {
  const { tempDir, projectPath, taskId } = setupPublishProject();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, ["scripts/publish-final.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.endsWith("\n"), true);

  const marker = result.stdout.trimEnd();
  assert.equal(marker.includes("\n"), false);
  assert.equal(validatePublishMarker(marker), true);

  const markerPath = path.join(projectPath, ".webdesign", "tasks", taskId, "publish-marker.txt");
  assert.equal(fs.readFileSync(markerPath, "utf8"), marker);

  const workflow = JSON.parse(fs.readFileSync(path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json"), "utf8"));
  assert.equal(workflow.currentGate, "DONE");
});
