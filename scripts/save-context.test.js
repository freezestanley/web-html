const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function createTaskFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-save-context-"));
  const projectId = "PROJaabbccddeeff0011";
  const taskId = "20260712-100000-homepage";
  const projectPath = path.join(tempDir, projectId);
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "project.json"),
    JSON.stringify(
      {
        projectUid: projectId,
        currentTaskId: taskId
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
        currentGate: "G6_DIST_ASSEMBLED",
        blocked: false,
        blockReason: "",
        createdAt: "2026-07-12T10:00:00.000Z",
        updatedAt: "2026-07-12T10:00:00.000Z"
      },
      null,
      2
    )
  );

  return { projectPath, taskId, taskDir };
}

test("save-context writes context-save.json with arrays, gate, and timestamp", () => {
  const { projectPath, taskId, taskDir } = createTaskFixture();
  const result = spawnSync(
    process.execPath,
    [
      "scripts/save-context.js",
      projectPath,
      taskId,
      "--goal",
      "完成预览确认并准备发布",
      "--done",
      "dist/index.html 已生成",
      "--done",
      "CDP 已检查控制台错误",
      "--block",
      "等待用户确认",
      "--next",
      "向用户发送预览确认消息",
      "--ref",
      "previewUrl=http://127.0.0.1:4173",
      "--ref",
      "taskId=20260712-100000-homepage"
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        WEB_HTML_NOW: "2026-07-12T10:30:00.000Z"
      },
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const saved = JSON.parse(fs.readFileSync(path.join(taskDir, "context-save.json"), "utf8"));
  assert.equal(saved.goal, "完成预览确认并准备发布");
  assert.deepEqual(saved.done, ["dist/index.html 已生成", "CDP 已检查控制台错误"]);
  assert.deepEqual(saved.block, ["等待用户确认"]);
  assert.equal(saved.next, "向用户发送预览确认消息");
  assert.deepEqual(saved.refs, ["previewUrl=http://127.0.0.1:4173", "taskId=20260712-100000-homepage"]);
  assert.equal(saved.gate, "G6_DIST_ASSEMBLED");
  assert.equal(saved.savedAt, "2026-07-12T10:30:00.000Z");

  const output = JSON.parse(result.stdout);
  assert.equal(output.taskId, taskId);
  assert.equal(output.currentGate, "G6_DIST_ASSEMBLED");
});
