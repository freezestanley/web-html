const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function createManagedProjectFixture({
  withContextSave = true,
  currentGate = "G6_DIST_ASSEMBLED",
  blocked = false,
  blockReason = ""
} = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-resume-task-"));
  const projectId = "PROJaabbccddeeff0011";
  const taskId = "20260712-100000-homepage";
  const projectPath = path.join(tempDir, projectId);
  const webdesignDir = path.join(projectPath, ".webdesign");
  const taskDir = path.join(webdesignDir, "tasks", taskId);

  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(
    path.join(webdesignDir, "project.json"),
    JSON.stringify(
      {
        projectUid: projectId,
        name: "demo-project",
        summary: "演示项目",
        currentTaskId: taskId
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(webdesignDir, "manifest.json"),
    JSON.stringify(
      {
        schemaVersion: "1.0",
        projectId: "<project-uid>"
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
        currentGate,
        blocked,
        blockReason,
        createdAt: "2026-07-12T10:00:00.000Z",
        updatedAt: "2026-07-12T10:00:00.000Z"
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(taskDir, "01_intake.json"),
    JSON.stringify(
      {
        projectId,
        pageSlug: "homepage",
        intent: "create",
        summary: "演示项目",
        status: "collected"
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(taskDir, "02_project_state.json"),
    JSON.stringify(
      {
        projectType: "CONTINUE_MANAGED_PROJECT",
        projectMode: "continue",
        projectRoot: projectPath,
        projectUid: projectId,
        projectId,
        currentTaskId: taskId,
        hasWebdesignDir: true,
        hasProjectMeta: true,
        hasManifestTemplate: true,
        hasDist: true,
        blockReason: ""
      },
      null,
      2
    )
  );

  if (withContextSave) {
    fs.writeFileSync(
      path.join(taskDir, "context-save.json"),
      JSON.stringify(
        {
          goal: "完成预览确认并准备发布",
          done: ["dist/index.html 已生成", "CDP 已检查控制台错误"],
          block: ["等待用户确认"],
          next: "向用户发送预览确认消息",
          refs: ["previewUrl=http://127.0.0.1:4173"],
          gate: currentGate,
          savedAt: "2026-07-12T10:30:00.000Z"
        },
        null,
        2
      )
    );
  }

  return { tempDir, projectId, projectPath, taskId, taskDir };
}

function runResume(projectId, tempDir) {
  return spawnSync(process.execPath, ["scripts/resume-task.js", projectId], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      WEB_HTML_PROJECTS_DIR: tempDir
    },
    encoding: "utf8"
  });
}

test("resume-task prefers context-save.json when available", () => {
  const { tempDir, projectId, projectPath, taskId } = createManagedProjectFixture();
  const result = runResume(projectId, tempDir);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "ready");
  assert.equal(output.projectRoot, projectPath);
  assert.equal(output.taskId, taskId);
  assert.equal(output.currentGate, "G6_DIST_ASSEMBLED");
  assert.equal(output.goal, "完成预览确认并准备发布");
  assert.deepEqual(output.done, ["dist/index.html 已生成", "CDP 已检查控制台错误"]);
  assert.deepEqual(output.block, ["等待用户确认"]);
  assert.equal(output.next, "向用户发送预览确认消息");
  assert.deepEqual(output.refs, ["previewUrl=http://127.0.0.1:4173"]);
  assert.equal(output.resumeSource, "context-save");
});

test("resume-task falls back to workflow and intake when no context-save exists", () => {
  const { tempDir, projectId } = createManagedProjectFixture({ withContextSave: false });
  const result = runResume(projectId, tempDir);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "ready");
  assert.equal(output.goal, "继续任务：homepage");
  assert.deepEqual(output.done, []);
  assert.deepEqual(output.block, []);
  assert.equal(output.next, "读取 workflow.json、01_intake.json 和 02_project_state.json 后继续当前 gate");
  assert.equal(output.resumeSource, "workflow");
});

test("resume-task reports blocked tasks without losing saved context", () => {
  const { tempDir, projectId } = createManagedProjectFixture({
    blocked: true,
    blockReason: "等待用户反馈"
  });
  const result = runResume(projectId, tempDir);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, "blocked");
  assert.equal(output.blocked, true);
  assert.equal(output.blockReason, "等待用户反馈");
  assert.equal(output.next, "向用户发送预览确认消息");
});
