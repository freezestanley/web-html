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
  blockReason = "",
  currentTaskId = "20260712-100000-homepage",
  tasks = null,
  lastHandoffTaskId = ""
} = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-resume-task-"));
  const projectId = "PROJaabbccddeeff0011";
  const taskId = "20260712-100000-homepage";
  const projectPath = path.join(tempDir, projectId);
  const webdesignDir = path.join(projectPath, ".webdesign");
  const defaultTasks = [
    {
      taskId,
      pageSlug: "homepage",
      intent: "create",
      currentGate,
      blocked,
      blockReason,
      withContextSave
    }
  ];
  const taskList = tasks || defaultTasks;

  fs.mkdirSync(path.join(webdesignDir, "tasks"), { recursive: true });
  fs.writeFileSync(
    path.join(webdesignDir, "project.json"),
    JSON.stringify(
      {
        projectUid: projectId,
        name: "demo-project",
        summary: "演示项目",
        currentTaskId
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

  for (const task of taskList) {
    const taskDir = path.join(webdesignDir, "tasks", task.taskId);
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(
      path.join(taskDir, "workflow.json"),
      JSON.stringify(
        {
          taskId: task.taskId,
          pageSlug: task.pageSlug,
          intent: task.intent,
          currentGate: task.currentGate,
          blocked: task.blocked,
          blockReason: task.blockReason,
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
          pageSlug: task.pageSlug,
          intent: task.intent,
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
          currentTaskId: task.taskId,
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

    if (!task.withContextSave) {
      continue;
    }

    fs.writeFileSync(
      path.join(taskDir, "context-save.json"),
      JSON.stringify(
        {
          goal: `完成${task.pageSlug}的预览确认并准备发布`,
          done: ["dist/index.html 已生成", "CDP 已检查控制台错误"],
          block: ["等待用户确认"],
          next: "向用户发送预览确认消息",
          refs: ["previewUrl=http://127.0.0.1:4173"],
          gate: task.currentGate,
          savedAt: "2026-07-12T10:30:00.000Z"
        },
        null,
        2
      )
    );
  }

  if (lastHandoffTaskId) {
    fs.writeFileSync(
      path.join(webdesignDir, "last-handoff.json"),
      JSON.stringify(
        {
          taskId: lastHandoffTaskId,
          gate: "G7_CDP_PASSED",
          goal: "恢复 handoff 前的任务",
          savedAt: "2026-07-12T10:30:00.000Z"
        },
        null,
        2
      )
    );
  }

  return {
    tempDir,
    projectId,
    projectPath,
    taskId,
    taskDir: path.join(webdesignDir, "tasks", taskId)
  };
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
  assert.equal(output.goal, "完成homepage的预览确认并准备发布");
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

test("resume-task prefers the last handoff task over project currentTaskId", () => {
  const handoffTaskId = "20260712-100000-homepage";
  const currentTaskId = "20260712-100500-pricing";
  const { tempDir, projectId } = createManagedProjectFixture({
    currentTaskId,
    tasks: [
      {
        taskId: handoffTaskId,
        pageSlug: "homepage",
        intent: "create",
        currentGate: "G7_CDP_PASSED",
        blocked: false,
        blockReason: "",
        withContextSave: true
      },
      {
        taskId: currentTaskId,
        pageSlug: "pricing",
        intent: "update",
        currentGate: "G1_PROJECT_IDENTIFIED",
        blocked: false,
        blockReason: "",
        withContextSave: true
      }
    ],
    lastHandoffTaskId: handoffTaskId
  });
  const result = runResume(projectId, tempDir);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.taskId, handoffTaskId);
  assert.equal(output.pageSlug, "homepage");
  assert.equal(output.currentGate, "G7_CDP_PASSED");
  assert.equal(output.resumeTaskId, handoffTaskId);
  assert.equal(output.resumeSource, "context-save");
  assert.equal(output.taskSelector, "last-handoff");
});

test("resume-task falls back to currentTaskId when the last handoff task is done", () => {
  const handoffTaskId = "20260712-100000-homepage";
  const currentTaskId = "20260712-100500-pricing";
  const { tempDir, projectId } = createManagedProjectFixture({
    currentTaskId,
    tasks: [
      {
        taskId: handoffTaskId,
        pageSlug: "homepage",
        intent: "create",
        currentGate: "DONE",
        blocked: false,
        blockReason: "",
        withContextSave: true
      },
      {
        taskId: currentTaskId,
        pageSlug: "pricing",
        intent: "update",
        currentGate: "G2_REQUIREMENTS_CAPTURED",
        blocked: false,
        blockReason: "",
        withContextSave: true
      }
    ],
    lastHandoffTaskId: handoffTaskId
  });
  const result = runResume(projectId, tempDir);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.taskId, currentTaskId);
  assert.equal(output.pageSlug, "pricing");
  assert.equal(output.currentGate, "G2_REQUIREMENTS_CAPTURED");
  assert.equal(output.resumeTaskId, currentTaskId);
  assert.equal(output.taskSelector, "current-task");
});
