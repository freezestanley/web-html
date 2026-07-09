const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function setupWorkflow(currentGate, { blocked = false, blockReason = "" } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-advance-gate-"));
  const workflowPath = path.join(tempDir, "workflow.json");
  fs.writeFileSync(
    workflowPath,
    JSON.stringify(
      {
        taskId: "20260709-120000-test",
        pageSlug: "test",
        intent: "create",
        currentGate,
        blocked,
        blockReason,
        createdAt: "2020-01-01T00:00:00.000Z",
        updatedAt: "2020-01-01T00:00:00.000Z",
        history: []
      },
      null,
      2
    )
  );
  return { tempDir, workflowPath };
}

function runAdvance(workflowPath, targetGate, extraArgs = []) {
  return spawnSync(
    process.execPath,
    ["scripts/advance-gate.js", workflowPath, targetGate, ...extraArgs],
    { cwd: path.resolve(__dirname, ".."), encoding: "utf8" }
  );
}

test("advance-gate allows legal forward transition and appends history", () => {
  const { workflowPath } = setupWorkflow("G1_PROJECT_IDENTIFIED");
  const result = runAdvance(workflowPath, "G2_REQUIREMENTS_COLLECTED", ["--reason", "intake done"]);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.action, "advanced");
  assert.equal(output.from, "G1_PROJECT_IDENTIFIED");
  assert.equal(output.to, "G2_REQUIREMENTS_COLLECTED");

  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  assert.equal(workflow.currentGate, "G2_REQUIREMENTS_COLLECTED");
  assert.equal(workflow.history.length, 1);
  assert.equal(workflow.history[0].from, "G1_PROJECT_IDENTIFIED");
  assert.equal(workflow.history[0].to, "G2_REQUIREMENTS_COLLECTED");
  assert.equal(workflow.history[0].reason, "intake done");
  assert.ok(workflow.updatedAt > workflow.createdAt);
});

test("advance-gate rejects illegal skip transition", () => {
  const { workflowPath } = setupWorkflow("G1_PROJECT_IDENTIFIED");
  const result = runAdvance(workflowPath, "G4_DESIGN_COMPLETED");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Illegal transition/);
  assert.match(result.stderr, /G1_PROJECT_IDENTIFIED → G4_DESIGN_COMPLETED/);

  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  assert.equal(workflow.currentGate, "G1_PROJECT_IDENTIFIED");
  assert.equal(workflow.history.length, 0);
});

test("advance-gate rejects unknown gate", () => {
  const { workflowPath } = setupWorkflow("G1_PROJECT_IDENTIFIED");
  const result = runAdvance(workflowPath, "G99_NONEXISTENT");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unknown gate: G99_NONEXISTENT/);
});

test("advance-gate blocks forward transition when task is blocked", () => {
  const { workflowPath } = setupWorkflow("G6_DIST_ASSEMBLED", { blocked: true, blockReason: "CDP failed" });
  const result = runAdvance(workflowPath, "G7_CDP_PASSED");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Task is blocked at G6_DIST_ASSEMBLED/);

  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  assert.equal(workflow.currentGate, "G6_DIST_ASSEMBLED");
  assert.equal(workflow.blocked, true);
});

test("advance-gate allows unblock-target transition when blocked", () => {
  const { workflowPath } = setupWorkflow("G7_CDP_PASSED", { blocked: true, blockReason: "user rejected" });
  const result = runAdvance(workflowPath, "G6_DIST_ASSEMBLED");

  assert.equal(result.status, 0, result.stderr);
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  assert.equal(workflow.currentGate, "G6_DIST_ASSEMBLED");
  assert.equal(workflow.blocked, true); // blocked flag stays until --unblock
});

test("advance-gate --unblock clears blocked state without changing gate", () => {
  const { workflowPath } = setupWorkflow("G6_DIST_ASSEMBLED", { blocked: true, blockReason: "fix pending" });
  const result = runAdvance(workflowPath, "", ["--unblock"]);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.action, "unblocked");
  assert.equal(output.currentGate, "G6_DIST_ASSEMBLED");

  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  assert.equal(workflow.blocked, false);
  assert.equal(workflow.blockReason, "");
  assert.equal(workflow.currentGate, "G6_DIST_ASSEMBLED");
});

test("advance-gate --unblock fails when task is not blocked", () => {
  const { workflowPath } = setupWorkflow("G6_DIST_ASSEMBLED");
  const result = runAdvance(workflowPath, "", ["--unblock"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not blocked/);
});

test("advance-gate rejects no-op self-transition", () => {
  const { workflowPath } = setupWorkflow("G3_DESIGN_BRIEF_READY");
  const result = runAdvance(workflowPath, "G3_DESIGN_BRIEF_READY");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Already at gate/);
});

test("advance-gate allows G9 → DONE (publish anchor compatibility)", () => {
  const { workflowPath } = setupWorkflow("G9_PUBLISH_READY");
  const result = runAdvance(workflowPath, "DONE");

  assert.equal(result.status, 0, result.stderr);
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  assert.equal(workflow.currentGate, "DONE");
});
