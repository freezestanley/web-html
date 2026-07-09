#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");
const { getSessionAuthor } = require("./lib/session-author");
const { buildTaskId, generateProjectUid, writeProjectMeta } = require("./lib/project-state");

const config = loadConfig();

const DEPRECATED_FLAGS = new Set(["--name", "--descript", "--description", "--project-name"]);

function parseArgs(argv) {
  const positional = [];
  const options = {};
  const deprecated = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") {
      options.summary = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (DEPRECATED_FLAGS.has(arg)) {
      deprecated.push(arg);
      index += 1; // skip its value
      continue;
    }
    positional.push(arg);
  }

  if (deprecated.length > 0) {
    process.stderr.write(
      `Error: deprecated flags detected: ${deprecated.join(", ")}\n` +
      `Usage: node scripts/init-project.js <project-id> <page-slug> <intent> [--summary <summary>]\n` +
      `<project-id> should be a PROJ... uid (auto-generated if WEB_HTML_PROJECT_UID is set), not a display name.\n`
    );
    process.exit(1);
  }

  return {
    projectId: positional[0],
    pageSlug: positional[1],
    intent: positional[2],
    summary: options.summary || ""
  };
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function buildManifestTemplate() {
  return {
    schemaVersion: "1.0",
    projectId: "<project-uid>",
    name: "<project summary or name>",
    entry: "dist/index.html",
    owner: "<project.json.author or empty>",
    proxy: {
      routes: []
    }
  };
}

function buildWorkflow(taskId, pageSlug, intent, nowIso) {
  return {
    taskId,
    pageSlug,
    intent,
    currentGate: "G1_PROJECT_IDENTIFIED",
    blocked: false,
    blockReason: "",
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function buildIntake(projectId, pageSlug, intent, summary) {
  return {
    projectId,
    pageSlug,
    intent,
    summary,
    status: "collected"
  };
}

function buildProjectState(projectPath, projectUid, projectId, taskId) {
  return {
    projectType: "NEW_PROJECT",
    projectMode: "new",
    projectRoot: projectPath,
    projectUid,
    projectId,
    currentTaskId: taskId,
    hasWebdesignDir: true,
    hasProjectMeta: true,
    hasManifestTemplate: true,
    hasDist: false,
    blockReason: ""
  };
}

const { projectId, pageSlug, intent, summary } = parseArgs(process.argv.slice(2));

if (!projectId || !pageSlug || !intent) {
  process.stderr.write("Usage: node scripts/init-project.js <project-id> <page-slug> <intent> [--summary <summary>]\n");
  process.exit(1);
}

// projectId 必须是 PROJ + 16位hex 格式；防止误传 display name
if (!/^PROJ[0-9a-f]{16}$/i.test(projectId)) {
  process.stderr.write(
    `Error: invalid project-id format: "${projectId}"\n` +
    `Expected: PROJ + 16 hex chars (e.g. PROJaabbccddeeff0011)\n` +
    `Hint: set WEB_HTML_PROJECT_UID env var or let the script auto-generate.\n` +
    `Do NOT pass a display name as project-id.\n`
  );
  process.exit(1);
}

const now = process.env.WEB_HTML_NOW ? new Date(process.env.WEB_HTML_NOW) : new Date();
const nowIso = now.toISOString();
const taskId = buildTaskId(now, pageSlug);
const projectUid = process.env.WEB_HTML_PROJECT_UID || generateProjectUid();
const projectsDir = process.env.WEB_HTML_PROJECTS_DIR
  ? path.resolve(process.env.WEB_HTML_PROJECTS_DIR)
  : config.PROJECTS_DIR;
const projectPath = path.join(projectsDir, projectId);
const webdesignDir = path.join(projectPath, config.WEBDESIGN_DIR);
const taskDir = path.join(webdesignDir, config.TASKS_DIR, taskId);

if (fs.existsSync(projectPath)) {
  process.stderr.write(`Project already exists: ${projectPath}\n`);
  process.exit(1);
}

fs.mkdirSync(projectPath, { recursive: true });

writeProjectMeta(projectPath, {
  projectUid,
  name: projectId,
  summary,
  author: getSessionAuthor(),
  createdAt: nowIso,
  updatedAt: nowIso,
  currentTaskId: taskId,
  sourceZipPath: "",
  distZipPath: ""
});

writeJsonFile(path.join(webdesignDir, "manifest.json"), buildManifestTemplate());
writeJsonFile(path.join(taskDir, "workflow.json"), buildWorkflow(taskId, pageSlug, intent, nowIso));
writeJsonFile(path.join(taskDir, "01_intake.json"), buildIntake(projectId, pageSlug, intent, summary));
writeJsonFile(path.join(taskDir, "02_project_state.json"), buildProjectState(projectPath, projectUid, projectId, taskId));

process.stdout.write(`${JSON.stringify({ projectPath, taskId, projectUid }, null, 2)}\n`);
