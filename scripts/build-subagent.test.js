const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");

function createManagedProjectFixture({ withProjectJson = true, withWorkflow = true } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-build-subagent-"));
  const projectId = "PROJaabbccddeeff0011";
  const taskId = "20260716-120000-homepage";
  const projectPath = path.join(tempDir, projectId);
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  fs.mkdirSync(taskDir, { recursive: true });

  if (withProjectJson) {
    fs.writeFileSync(
      path.join(projectPath, ".webdesign", "project.json"),
      JSON.stringify(
        {
          projectUid: projectId,
          name: "demo-project",
          summary: "Demo project",
          currentTaskId: taskId
        },
        null,
        2
      )
    );
  }

  if (withWorkflow) {
    fs.writeFileSync(
      path.join(taskDir, "workflow.json"),
      JSON.stringify(
        {
          taskId,
          pageSlug: "homepage",
          intent: "create",
          currentGate: "G4_DESIGN_COMPLETED",
          blocked: false,
          blockReason: "",
          createdAt: "2026-07-16T12:00:00.000Z",
          updatedAt: "2026-07-16T12:00:00.000Z"
        },
        null,
        2
      )
    );
  }

  fs.writeFileSync(
    path.join(taskDir, "01_intake.json"),
    JSON.stringify(
      {
        projectId,
        pageSlug: "homepage",
        intent: "create",
        summary: "Demo project",
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
        hasProjectMeta: withProjectJson,
        hasManifestTemplate: true,
        hasDist: false,
        blockReason: ""
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(taskDir, "context-save.json"),
    JSON.stringify(
      {
        goal: "Build the homepage page implementation",
        done: ["Intake and project state captured"],
        block: [],
        next: "Delegate html-design implementation",
        refs: ["dist/index.html"],
        gate: "G4_DESIGN_COMPLETED",
        savedAt: "2026-07-16T12:05:00.000Z"
      },
      null,
      2
    )
  );

  return { tempDir, projectPath, taskId };
}

function runBuildSubagent(args) {
  return spawnSync(process.execPath, ["scripts/build-subagent.js", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 5000
  });
}

function assertFailedWith(result, pattern) {
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}${result.stderr}`, pattern);
}

test("build-subagent requires project path and task id arguments", () => {
  const result = runBuildSubagent([]);

  assertFailedWith(result, /Usage: node scripts\/build-subagent\.js <project-path> <task-id>/);
});

test("build-subagent rejects paths without .webdesign/project.json", (t) => {
  const { tempDir, projectPath, taskId } = createManagedProjectFixture({ withProjectJson: false });
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const result = runBuildSubagent([projectPath, taskId]);

  assertFailedWith(result, /\.webdesign\/project\.json not found/);
});

test("build-subagent rejects tasks without workflow.json", (t) => {
  const { tempDir, projectPath, taskId } = createManagedProjectFixture({ withWorkflow: false });
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const result = runBuildSubagent([projectPath, taskId]);

  assertFailedWith(result, /workflow\.json not found/);
});

test("build-subagent emits an html-design subagent payload for a managed task", (t) => {
  const { tempDir, projectPath, taskId } = createManagedProjectFixture();
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const result = runBuildSubagent([projectPath, taskId]);

  assert.equal(result.status, 0, result.stderr);

  const output = JSON.parse(result.stdout);
  assert.equal(output.label, `web-html-build-${taskId}`);
  assert.equal(output.runTimeoutSeconds, 600);
  assert.equal(typeof output.task, "string");

  for (const expectedText of [
    projectPath,
    taskId,
    "G4_DESIGN_COMPLETED",
    "skills/html-design/SKILL.md",
    "dist/index.html",
    "Do not modify workflow.json",
    "Do not publish",
    "pure HTML/CSS/JS"
  ]) {
    assert.match(output.task, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
