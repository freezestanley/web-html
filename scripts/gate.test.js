const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { triggerCompact, writeMinimalHandoff } = require("./gate");

const REPO = path.resolve(__dirname, "..");

function createManagedFixture(currentGate = "G6_DIST_ASSEMBLED") {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-gate-"));
  const projectId = "PROJ00112233aabbccdd";
  const taskId = "20260811-100000-home";
  const projectPath = path.join(tempDir, projectId);
  const webdesign = path.join(projectPath, ".webdesign");
  const taskDir = path.join(webdesign, "tasks", taskId);
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(webdesign, "project.json"),
    JSON.stringify({ projectUid: projectId, currentTaskId: taskId }, null, 2));
  fs.writeFileSync(path.join(webdesign, "manifest.json"), "{}");
  fs.writeFileSync(path.join(taskDir, "workflow.json"),
    JSON.stringify({ taskId, pageSlug: "home", intent: "landing", currentGate, blocked: false }, null, 2));
  return { projectPath, taskId, taskDir, webdesign };
}

function runGate(args, extraEnv = {}) {
  return spawnSync(process.execPath, ["scripts/gate.js", ...args], {
    cwd: REPO,
    env: { ...process.env, WEB_HTML_NOW: "2026-08-11T00:00:00.000Z", ...extraEnv },
    encoding: "utf8"
  });
}

test("check-advance --save-only writes both files and keeps currentGate unchanged", () => {
  const { projectPath, taskId, taskDir, webdesign } = createManagedFixture("G6_DIST_ASSEMBLED");
  const res = runGate(["check-advance", projectPath, "--save-only"]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.action, "saved");
  assert.equal(out.mode, "save-only");

  const contextSave = JSON.parse(fs.readFileSync(path.join(taskDir, "context-save.json"), "utf8"));
  assert.equal(contextSave.gate, "G6_DIST_ASSEMBLED");
  assert.equal(contextSave.source, "auto-handoff");
  assert.ok(fs.existsSync(path.join(webdesign, "last-handoff.json")));

  // workflow.currentGate 未被改动（HANDOFF 不进业务状态机）
  const workflow = JSON.parse(fs.readFileSync(path.join(taskDir, "workflow.json"), "utf8"));
  assert.equal(workflow.currentGate, "G6_DIST_ASSEMBLED");
});

test("check-advance skips DONE tasks", () => {
  const { projectPath } = createManagedFixture("DONE");
  const res = runGate(["check-advance", projectPath, "--compact-threshold", "1"]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.action, "skip");
  assert.equal(out.reason, "done");
});

test("check-advance skips non-managed project", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-gate-nm-"));
  const res = runGate(["check-advance", tempDir, "--compact-threshold", "1"]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.action, "skip");
  assert.equal(out.reason, "not-managed");
});

test("triggerCompact builds correct argv and reports compacted", () => {
  let captured = null;
  const r = triggerCompact({
    sessionKey: "agent:main:x",
    agentId: "main",
    maxLines: 200,
    runCompact: (args) => { captured = args; return "{\"ok\":true}"; }
  });
  assert.deepEqual(captured, ["sessions", "compact", "agent:main:x", "--agent", "main", "--max-lines", "200", "--json"]);
  assert.equal(r.action, "compacted");
});

test("triggerCompact returns compact-failed (does not throw) on non-zero exit", () => {
  const r = triggerCompact({
    sessionKey: "agent:main:x",
    agentId: "main",
    runCompact: () => { throw new Error("exit 1"); }
  });
  assert.equal(r.action, "compact-failed");
  assert.match(r.error, /exit 1/);
});

test("triggerCompact skips when no session key", () => {
  const r = triggerCompact({ sessionKey: "", agentId: "" });
  assert.equal(r.action, "compact-skipped");
  assert.equal(r.reason, "no-session-key");
});

test("writeMinimalHandoff does not mutate workflow object gate", () => {
  const { projectPath, taskId } = createManagedFixture("G7_CDP_PASSED");
  const workflow = { currentGate: "G7_CDP_PASSED" };
  const res = writeMinimalHandoff(projectPath, taskId, workflow);
  assert.equal(res.gate, "G7_CDP_PASSED");
  assert.equal(workflow.currentGate, "G7_CDP_PASSED");
});

// 缺陷A：已有人工存档时，writeMinimalHandoff 不得覆盖其 goal/done/block/next。
test("writeMinimalHandoff preserves existing manual context-save (缺陷A)", () => {
  const { projectPath, taskId, taskDir } = createManagedFixture("G6_DIST_ASSEMBLED");
  const manual = {
    goal: "人工目标：完成轮播图",
    done: ["HTML结构", "CSS样式"],
    block: ["CDN不稳定"],
    next: "接入 Swiper.js",
    refs: ["https://swiperjs.com"],
    gate: "G6_DIST_ASSEMBLED",
    savedAt: "2026-08-10T00:00:00.000Z"
    // 注意：无 source 字段 → 人工存档
  };
  fs.writeFileSync(path.join(taskDir, "context-save.json"), JSON.stringify(manual, null, 2));

  const res = writeMinimalHandoff(projectPath, taskId, { currentGate: "G6_DIST_ASSEMBLED" });
  assert.equal(res.preservedManual, true);

  const after = JSON.parse(fs.readFileSync(path.join(taskDir, "context-save.json"), "utf8"));
  assert.equal(after.goal, "人工目标：完成轮播图");
  assert.deepEqual(after.done, ["HTML结构", "CSS样式"]);
  assert.equal(after.next, "接入 Swiper.js");
});

// 缺陷A 对照：既有自动存档（source=auto-handoff）可被覆盖。
test("writeMinimalHandoff overwrites existing auto-handoff save (缺陷A 对照)", () => {
  const { projectPath, taskId, taskDir } = createManagedFixture("G6_DIST_ASSEMBLED");
  const auto = { goal: "旧自动", done: [], block: [], next: "x", refs: [], gate: "G6_DIST_ASSEMBLED", savedAt: "2026-08-10T00:00:00.000Z", source: "auto-handoff" };
  fs.writeFileSync(path.join(taskDir, "context-save.json"), JSON.stringify(auto, null, 2));

  const res = writeMinimalHandoff(projectPath, taskId, { currentGate: "G6_DIST_ASSEMBLED" });
  assert.equal(res.preservedManual, false);

  const after = JSON.parse(fs.readFileSync(path.join(taskDir, "context-save.json"), "utf8"));
  assert.equal(after.goal, "上下文自动压缩存档");
  assert.equal(after.source, "auto-handoff");
});

// 缺陷F 判据②：check-resume 在 compacted 待恢复态输出 needResume:true。
test("check-resume reports needResume when compactState is compacted (缺陷F)", () => {
  const { projectPath, taskId, webdesign } = createManagedFixture("G6_DIST_ASSEMBLED");
  fs.writeFileSync(path.join(webdesign, "last-handoff.json"),
    JSON.stringify({ taskId, gate: "G6_DIST_ASSEMBLED", compactState: "compacted", compactedAt: "2026-08-11T00:00:00.000Z" }, null, 2));

  const res = runGate(["check-resume", projectPath]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.needResume, true);
  assert.equal(out.taskId, taskId);
  assert.match(out.resumeCommand, /resume-task\.js/);
});

// 缺陷F/G 幂等：resumed 态不再触发恢复。
test("check-resume skips when already resumed (缺陷G 幂等)", () => {
  const { projectPath, taskId, webdesign } = createManagedFixture("G6_DIST_ASSEMBLED");
  fs.writeFileSync(path.join(webdesign, "last-handoff.json"),
    JSON.stringify({ taskId, gate: "G6_DIST_ASSEMBLED", compactState: "resumed" }, null, 2));

  const res = runGate(["check-resume", projectPath]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.needResume, false);
  assert.equal(out.reason, "not-compacted-pending");
});

// 缺陷F：compact-failed 态不触发恢复。
test("check-resume skips when compact failed (缺陷F)", () => {
  const { projectPath, taskId, webdesign } = createManagedFixture("G6_DIST_ASSEMBLED");
  fs.writeFileSync(path.join(webdesign, "last-handoff.json"),
    JSON.stringify({ taskId, gate: "G6_DIST_ASSEMBLED", compactState: "compact-failed" }, null, 2));

  const res = runGate(["check-resume", projectPath]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.needResume, false);
});

// 缺陷B：check-resume 遇损坏 last-handoff 不崩，视同无（needResume:false）。
test("check-resume degrades on corrupt last-handoff (缺陷B)", () => {
  const { projectPath, webdesign } = createManagedFixture("G6_DIST_ASSEMBLED");
  fs.writeFileSync(path.join(webdesign, "last-handoff.json"), "{ 损坏 ]");

  const res = runGate(["check-resume", projectPath]);
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.needResume, false);
  assert.equal(out.reason, "no-last-handoff");
});
