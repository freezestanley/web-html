# html-design Subagent Delegation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every `html-design` page implementation delegate to a subagent instead of being executed directly in the main `web-html` session.

**Architecture:** Add a small Node script that validates a managed project task and emits a JSON `sessions_spawn` payload. Update the root controller skill to require delegation for every page output change, and update `html-design` to define the subagent implementation contract while preserving workflow and publish boundaries.

**Tech Stack:** Node.js CommonJS scripts, `node:test`, existing `.webdesign` metadata files, Markdown skill docs.

---

### Task 1: Add Failing Tests for Subagent Payload Generation

**Files:**
- Create: `scripts/build-subagent.test.js`
- Later create: `scripts/build-subagent.js`

**Step 1: Write the failing test**

Create `scripts/build-subagent.test.js`:

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function makeProject({ currentGate = "G4_DESIGN_COMPLETED" } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-build-subagent-"));
  const projectPath = path.join(tempDir, "PROJaabbccddeeff0011");
  const taskId = "20260716-120000-homepage";
  const webdesignDir = path.join(projectPath, ".webdesign");
  const taskDir = path.join(webdesignDir, "tasks", taskId);

  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(
    path.join(webdesignDir, "project.json"),
    JSON.stringify({ projectUid: "PROJaabbccddeeff0011", currentTaskId: taskId, name: "demo" }, null, 2)
  );
  fs.writeFileSync(
    path.join(taskDir, "workflow.json"),
    JSON.stringify({ taskId, currentGate, history: [] }, null, 2)
  );
  fs.writeFileSync(
    path.join(taskDir, "01_intake.json"),
    JSON.stringify({ projectId: "PROJaabbccddeeff0011", pageSlug: "homepage", intent: "create" }, null, 2)
  );
  fs.writeFileSync(
    path.join(taskDir, "02_project_state.json"),
    JSON.stringify({ projectPath, projectUid: "PROJaabbccddeeff0011" }, null, 2)
  );
  fs.writeFileSync(
    path.join(taskDir, "context-save.json"),
    JSON.stringify({ summary: "Build homepage" }, null, 2)
  );

  return { projectPath, taskId };
}

function runBuildSubagent(args) {
  return spawnSync(process.execPath, ["scripts/build-subagent.js", ...args], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });
}

test("build-subagent rejects missing arguments", () => {
  const result = runBuildSubagent([]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage: node scripts\/build-subagent.js <project-path> <task-id>/);
});

test("build-subagent rejects a path without managed project metadata", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-build-subagent-missing-"));
  const result = runBuildSubagent([tempDir, "20260716-120000-homepage"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\.webdesign\/project\.json not found/);
});

test("build-subagent rejects missing task workflow", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-build-subagent-no-task-"));
  const webdesignDir = path.join(tempDir, ".webdesign");
  fs.mkdirSync(webdesignDir, { recursive: true });
  fs.writeFileSync(path.join(webdesignDir, "project.json"), JSON.stringify({ projectUid: "PROJ1" }, null, 2));

  const result = runBuildSubagent([tempDir, "20260716-120000-homepage"]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /workflow\.json not found/);
});

test("build-subagent emits sessions_spawn payload for a managed task", () => {
  const { projectPath, taskId } = makeProject();
  const result = runBuildSubagent([projectPath, taskId]);

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.label, `web-html-build-${taskId}`);
  assert.equal(payload.runTimeoutSeconds, 180);
  assert.match(payload.task, new RegExp(projectPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(payload.task, new RegExp(taskId));
  assert.match(payload.task, /G4_DESIGN_COMPLETED/);
  assert.match(payload.task, /skills\/html-design\/SKILL\.md/);
  assert.match(payload.task, /dist\/index\.html/);
  assert.match(payload.task, /Do not modify workflow\.json/);
  assert.match(payload.task, /Do not publish/);
  assert.match(payload.task, /pure HTML\/CSS\/JS/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- --test-name-pattern=build-subagent
```

Expected: FAIL because `scripts/build-subagent.js` does not exist.

**Step 3: Commit failing test only**

```bash
git add scripts/build-subagent.test.js
git commit -m "test: cover html-design subagent payload"
```

---

### Task 2: Implement `build-subagent.js`

**Files:**
- Create: `scripts/build-subagent.js`
- Test: `scripts/build-subagent.test.js`

**Step 1: Write minimal implementation**

Create `scripts/build-subagent.js`:

```javascript
#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");
const {
  getContextSavePath,
  getIntakePath,
  getProjectStatePath,
  getTaskDir,
  getWorkflowPath,
  readJson
} = require("./lib/task-context");

const config = loadConfig();

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} not found: ${filePath}`);
  }
  return filePath;
}

function optionalFile(filePath) {
  return fs.existsSync(filePath) ? filePath : null;
}

function buildTask({ projectPath, taskId, projectJsonPath, workflowPath, intakePath, projectStatePath, contextSavePath, workflow }) {
  const htmlDesignSkillPath = path.resolve(__dirname, "..", "skills", "html-design", "SKILL.md");
  const referenceRoot = path.resolve(__dirname, "..", "reference");
  const distIndexPath = path.join(projectPath, "dist", "index.html");

  return `# Task: Build pure HTML/CSS/JS page output as html-design subagent

## Project
- Project path: ${projectPath}
- Task ID: ${taskId}
- Current gate: ${workflow.currentGate}

## Required reading
1. Read ${htmlDesignSkillPath}
2. Read only the needed files under ${referenceRoot}

## Context files
- Project metadata: ${projectJsonPath}
- Workflow: ${workflowPath}
- Intake: ${intakePath}
- Project state: ${projectStatePath || "(missing)"}
- Saved context: ${contextSavePath || "(missing)"}

## Deliverable
- Create or update ${distIndexPath}
- Keep the deliverable pure HTML/CSS/JS
- Place related static assets under ${path.join(projectPath, "dist")}
- Return a concise summary of changed files, external dependencies, responsive checks, known limitations, and proxy route needs

## Boundaries
- Do not modify workflow.json
- Do not modify .webdesign/project.json
- Do not publish
- Do not output a publish marker
- Do not ask the user for confirmation
- Do not introduce React, Vue, Svelte, SSR, SSG, or build-tool assumptions
`;
}

function main() {
  const [rawProjectPath, taskId] = process.argv.slice(2);

  if (!rawProjectPath || !taskId) {
    fail("Usage: node scripts/build-subagent.js <project-path> <task-id>");
  }

  const projectPath = path.resolve(rawProjectPath);
  const projectJsonPath = requireFile(
    path.join(projectPath, config.WEBDESIGN_DIR, "project.json"),
    ".webdesign/project.json"
  );
  const taskDir = getTaskDir(projectPath, taskId);
  const workflowPath = requireFile(getWorkflowPath(projectPath, taskId), "workflow.json");
  const intakePath = requireFile(getIntakePath(projectPath, taskId), "01_intake.json");
  const projectStatePath = optionalFile(getProjectStatePath(projectPath, taskId));
  const contextSavePath = optionalFile(getContextSavePath(projectPath, taskId));
  const workflow = readJson(workflowPath);

  if (!workflow.currentGate) {
    fail(`workflow.json missing currentGate: ${workflowPath}`);
  }

  const payload = {
    label: `web-html-build-${taskId}`,
    runTimeoutSeconds: 180,
    task: buildTask({
      projectPath,
      taskId,
      taskDir,
      projectJsonPath,
      workflowPath,
      intakePath,
      projectStatePath,
      contextSavePath,
      workflow
    })
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
```

**Step 2: Run focused test**

Run:

```bash
npm test -- --test-name-pattern=build-subagent
```

Expected: PASS for all `build-subagent` tests.

**Step 3: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

**Step 4: Commit implementation**

```bash
git add scripts/build-subagent.js scripts/build-subagent.test.js
git commit -m "feat: generate html-design subagent payload"
```

---

### Task 3: Update Root `web-html` Skill Delegation Rules

**Files:**
- Modify: `SKILL.md`

**Step 1: Update wording**

In `SKILL.md`, replace the `html-design` invocation policy with mandatory subagent delegation.

Key text to introduce:

```markdown
## html-design Subagent 委派（强制）

只要页面产物本身需要变更，主会话必须通过 subagent 委派 `html-design`。
主会话禁止直接执行 HTML/CSS/JS 构建。

触发场景:

- 新页面构建
- 布局、样式、内容模块或交互变更
- 预览或浏览器校验后的修复
- 响应式修复
- `dist/` 资源调整

委派命令:

```bash
node scripts/build-subagent.js <project-path> <task-id>
```

主会话使用脚本输出的 JSON payload 调用 `sessions_spawn`。
Subagent 完成后，主会话检查 `dist/index.html`，然后按合法 gate 顺序继续验收。
```

Also update the responsibility split:

```markdown
### `web-html` 负责

- 生成 subagent payload 并监督构建
- 检查 subagent 产物
- workflow gate 推进

### `html-design` subagent 负责

- HTML / CSS / JS 实现
- 响应式行为
- `dist/` 下的资源布局
- 预览或 CDP 反馈后的修复
```

**Step 2: Ensure no complex-only wording remains**

Run:

```bash
rg -n "复杂任务|复杂|subagent|调用 `html-design`|何时调用" SKILL.md
```

Expected: Any remaining text should clearly say all page implementation delegates to subagent, not only complex tasks.

**Step 3: Commit docs update**

```bash
git add SKILL.md
git commit -m "docs: require html-design subagent delegation"
```

---

### Task 4: Update `html-design` Skill as Subagent Contract

**Files:**
- Modify: `skills/html-design/SKILL.md`

**Step 1: Update role description**

Revise the opening to state:

```markdown
`html-design` 是 `web-html` 的 subagent 实现层。
它默认在 subagent 中运行，在 `dist/` 下交付纯 HTML、CSS 与 JS 产物。
主会话只负责编排、状态机、验收、用户确认与发布。
```

**Step 2: Add subagent execution contract**

Add:

```markdown
## Subagent 执行契约

当作为 subagent 执行时，必须:

1. 读取主会话提供的任务描述
2. 读取本文件
3. 按需读取 reference 文件
4. 读取任务上下文文件
5. 创建或修改 `dist/index.html`
6. 返回构建摘要

禁止:

- 修改 `workflow.json`
- 修改 `.webdesign/project.json`
- 调用 `advance-gate.js`
- 调用 `publish.js`
- 输出发布标记
- 向用户请求预览确认
```

**Step 3: Keep existing build guardrails**

Preserve the current pure HTML/CSS/JS guardrails and reference loading table. Update “回传给 `web-html`” so it says the subagent returns to the main session.

**Step 4: Check for conflicting direct-execution wording**

Run:

```bash
rg -n "直接|默认路径|升级路径|workflow|发布标记|主会话|subagent" skills/html-design/SKILL.md
```

Expected: No text should suggest the main session can directly perform page construction.

**Step 5: Commit docs update**

```bash
git add skills/html-design/SKILL.md
git commit -m "docs: define html-design subagent contract"
```

---

### Task 5: Final Verification

**Files:**
- Verify: `scripts/build-subagent.js`
- Verify: `scripts/build-subagent.test.js`
- Verify: `SKILL.md`
- Verify: `skills/html-design/SKILL.md`

**Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

**Step 2: Verify script output manually**

Create a temp managed project through the existing initializer:

```bash
WEB_HTML_PROJECTS_DIR="$(mktemp -d)" WEB_HTML_NOW="2026-07-16T12:00:00.000Z" WEB_HTML_PROJECT_UID="PROJaabbccddeeff0011" SESSION_KEY="agent:agent-1:web:902:dm:session-1" node scripts/init-project.js PROJaabbccddeeff0011 homepage create --name demo-project --summary "Demo project"
```

Then run:

```bash
node scripts/build-subagent.js "$WEB_HTML_PROJECTS_DIR/PROJaabbccddeeff0011" 20260716-120000-homepage
```

Expected: Valid JSON payload with `label`, `runTimeoutSeconds`, and a `task` containing `dist/index.html`, `skills/html-design/SKILL.md`, and workflow prohibitions.

**Step 3: Inspect git status**

Run:

```bash
git status --short
```

Expected: clean working tree after commits.
