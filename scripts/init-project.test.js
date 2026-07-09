const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("init-project creates a managed web-html project with .webdesign metadata", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-init-project-"));
  const projectId = "PROJaabbccddeeff0011";
  const result = spawnSync(
    process.execPath,
    ["scripts/init-project.js", projectId, "homepage", "create", "--name", "demo-project", "--summary", "Demo project"],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        WEB_HTML_PROJECTS_DIR: tempDir,
        WEB_HTML_NOW: "2026-07-08T10:20:30.000Z",
        WEB_HTML_PROJECT_UID: projectId,
        SESSION_KEY: "agent:agent-1:web:902:dm:session-1"
      },
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const projectPath = path.join(tempDir, projectId);
  const taskId = "20260708-102030-homepage";

  assert.equal(fs.existsSync(path.join(projectPath, ".webdesign", "project.json")), true);
  assert.equal(fs.existsSync(path.join(projectPath, ".webdesign", "manifest.json")), true);

  const projectMeta = JSON.parse(
    fs.readFileSync(path.join(projectPath, ".webdesign", "project.json"), "utf8")
  );
  assert.equal(projectMeta.projectUid, projectId);
  assert.equal(projectMeta.name, "demo-project");
  assert.equal(projectMeta.summary, "Demo project");
  assert.equal(projectMeta.author, "902");
  assert.equal(projectMeta.currentTaskId, taskId);

  const manifestTemplate = JSON.parse(
    fs.readFileSync(path.join(projectPath, ".webdesign", "manifest.json"), "utf8")
  );
  assert.equal(manifestTemplate.projectId, "<project-uid>");
  assert.equal(manifestTemplate.name, "<project summary or name>");
  assert.equal(manifestTemplate.entry, "dist/index.html");
  assert.equal(manifestTemplate.owner, "<project.json.author or empty>");

  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);
  const workflow = JSON.parse(fs.readFileSync(path.join(taskDir, "workflow.json"), "utf8"));
  assert.equal(workflow.taskId, taskId);
  assert.equal(workflow.pageSlug, "homepage");
  assert.equal(workflow.intent, "create");
  assert.equal(workflow.currentGate, "G1_PROJECT_IDENTIFIED");

  assert.equal(fs.existsSync(path.join(taskDir, "01_intake.json")), true);
  assert.equal(fs.existsSync(path.join(taskDir, "02_project_state.json")), true);

  const intake = JSON.parse(fs.readFileSync(path.join(taskDir, "01_intake.json"), "utf8"));
  assert.equal(intake.projectId, projectId);

  const projectState = JSON.parse(fs.readFileSync(path.join(taskDir, "02_project_state.json"), "utf8"));
  assert.equal(projectState.projectId, projectId);
  assert.equal(projectState.projectUid, projectId);
});
