#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { detectProjectState } = require("./lib/project-detection");
const { readProjectMeta } = require("./lib/project-state");
const { readContextBundle } = require("./lib/task-context");

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

if (detection.projectType !== "CONTINUE_MANAGED_PROJECT") {
  fail(`Only managed projects can be resumed, got ${detection.projectType}`);
}

const projectMetaPath = path.join(detection.projectRoot, ".webdesign", "project.json");
if (!fs.existsSync(projectMetaPath)) {
  fail(`project.json not found: ${projectMetaPath}`);
}

const projectMeta = readProjectMeta(detection.projectRoot);
const taskId = projectMeta.currentTaskId || detection.currentTaskId;
if (!taskId) {
  fail("currentTaskId is missing from project metadata");
}

const { workflow, intake, projectState, contextSave } = readContextBundle(detection.projectRoot, taskId);
const resume = contextSave || buildFallbackResume(workflow, intake);
const status = workflow.currentGate === "DONE"
  ? "done"
  : workflow.blocked
    ? "blocked"
    : "ready";

process.stdout.write(
  `${JSON.stringify({
    status,
    projectId: detection.projectId,
    projectUid: detection.projectUid,
    projectRoot: detection.projectRoot,
    taskId,
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
    contextSavePath: contextSave ? path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "context-save.json") : "",
    workflowPath: path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "workflow.json"),
    intakePath: path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "01_intake.json"),
    projectStatePath: projectState ? path.join(detection.projectRoot, ".webdesign", "tasks", taskId, "02_project_state.json") : ""
  }, null, 2)}\n`
);
