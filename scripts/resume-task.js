#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { detectProjectState } = require("./lib/project-detection");
const { readProjectMeta } = require("./lib/project-state");
const {
  getLastHandoffPath,
  readContextBundle,
  selectActiveTask,
  writeLastHandoff
} = require("./lib/task-context");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project-path") {
      options.projectPath = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    projectId: positional[0] || "",
    projectPath: options.projectPath || ""
  };
}

function buildFallbackResume(workflow, intake) {
  return {
    goal: `继续任务：${workflow.pageSlug || intake?.pageSlug || workflow.taskId}`,
    done: [],
    block: [],
    next: "读取 workflow.json、01_intake.json 和 02_project_state.json 后继续当前 gate",
    refs: []
  };
}

const { projectId, projectPath } = parseArgs(process.argv.slice(2));

if (!projectId && !projectPath) {
  fail("Usage: node scripts/resume-task.js <project-id> [--project-path <path>]");
}

const projectsDir = process.env.WEB_HTML_PROJECTS_DIR
  ? path.resolve(process.env.WEB_HTML_PROJECTS_DIR)
  : undefined;

const detection = detectProjectState({ projectId, projectPath, projectsDir });

// 缺陷B：project.json 损坏或元数据不完整被 detection 判为 BROKEN_MANAGED_PROJECT，给结构化 unrecoverable。
if (detection.projectType === "BROKEN_MANAGED_PROJECT") {
  const corrupt = /损坏/.test(detection.blockReason || "");
  process.stdout.write(
    `${JSON.stringify({
      status: "unrecoverable",
      reason: corrupt ? "project-json-corrupt" : "project-meta-incomplete",
      projectRoot: detection.projectRoot,
      blockReason: detection.blockReason || "",
      hint: "project.json 损坏或元数据不完整，无法确定 currentTaskId。请人工检查。"
    }, null, 2)}\n`
  );
  process.exit(2);
}

if (detection.projectType !== "CONTINUE_MANAGED_PROJECT") {
  fail(`Only managed projects can be resumed, got ${detection.projectType}`);
}

const projectMetaPath = path.join(detection.projectRoot, ".webdesign", "project.json");
if (!fs.existsSync(projectMetaPath)) {
  fail(`project.json not found: ${projectMetaPath}`);
}

// 缺陷B：project.json 损坏时不裸崩，给结构化错误。
let projectMeta;
try {
  projectMeta = readProjectMeta(detection.projectRoot);
} catch (error) {
  process.stdout.write(
    `${JSON.stringify({
      status: "unrecoverable",
      reason: "project-json-corrupt",
      projectRoot: detection.projectRoot,
      projectMetaPath,
      hint: "project.json 损坏，无法确定 currentTaskId。请人工检查该文件。"
    }, null, 2)}\n`
  );
  process.exit(2);
}
const selection = selectActiveTask(
  detection.projectRoot,
  projectMeta.currentTaskId,
  detection.currentTaskId
);
const taskId = selection.taskId;
if (!taskId) {
  fail("currentTaskId is missing from project metadata");
}

const { workflow, intake, projectState, contextSave } = readContextBundle(detection.projectRoot, taskId);

// 缺陷B：workflow 损坏/缺失时不裸崩，输出结构化错误供上层（HEARTBEAT/插件/用户）判断。
if (!workflow) {
  process.stdout.write(
    `${JSON.stringify({
      status: "unrecoverable",
      reason: "workflow-missing-or-corrupt",
      projectId: detection.projectId,
      projectRoot: detection.projectRoot,
      taskId,
      workflowPath: path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "workflow.json"),
      hint: "workflow.json 缺失或损坏，无法确定 gate。请人工检查该任务目录或回退到其他任务。"
    }, null, 2)}\n`
  );
  process.exit(2);
}

const resume = contextSave || buildFallbackResume(workflow, intake);
const status = workflow.currentGate === "DONE"
  ? "done"
  : workflow.blocked
    ? "blocked"
    : "ready";

// 缺陷G/F 幂等：成功交付恢复指令后，若 last-handoff 处于 compacted 待恢复态，标记为 resumed，
// 防止 HEARTBEAT 路径2 重复触发恢复。只在 ready 且确有 compacted 标记时升级。
if (status === "ready" && selection.lastHandoff && selection.lastHandoff.compactState === "compacted") {
  writeLastHandoff(detection.projectRoot, {
    ...selection.lastHandoff,
    compactState: "resumed",
    resumedAt: process.env.WEB_HTML_NOW || new Date().toISOString()
  });
}

process.stdout.write(
  `${JSON.stringify({
    status,
    projectId: detection.projectId,
    projectUid: detection.projectUid,
    projectRoot: detection.projectRoot,
    taskId,
    resumeTaskId: taskId,
    taskSelector: selection.taskSelector,
    currentGate: workflow.currentGate,
    blocked: workflow.blocked,
    blockReason: workflow.blockReason || "",
    pageSlug: workflow.pageSlug || intake?.pageSlug || "",
    intent: workflow.intent || intake?.intent || "",
    goal: resume.goal,
    done: resume.done || [],
    block: resume.block || [],
    next: resume.next,
    refs: resume.refs || [],
    resumeSource: contextSave ? "context-save" : "workflow",
    lastHandoffPath: selection.lastHandoff ? getLastHandoffPath(detection.projectRoot) : "",
    contextSavePath: contextSave ? path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "context-save.json") : "",
    workflowPath: path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "workflow.json"),
    intakePath: path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "01_intake.json"),
    projectStatePath: projectState ? path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "02_project_state.json") : ""
  }, null, 2)}\n`
);
