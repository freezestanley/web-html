#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");
const { getSessionAuthor } = require("./lib/session-author");
const { buildTaskId, generateProjectUid, writeProjectMeta } = require("./lib/project-state");

const config = loadConfig();

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") {
      options.summary = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    projectName: positional[0],
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

function buildIntake(projectName, pageSlug, intent, summary) {
  return {
    projectName,
    pageSlug,
    intent,
    summary,
    status: "collected"
  };
}

function buildProjectState(projectPath, projectUid, projectName, taskId) {
  return {
    projectType: "NEW_PROJECT",
    projectMode: "new",
    projectRoot: projectPath,
    projectUid,
    projectName,
    currentTaskId: taskId,
    hasWebdesignDir: true,
    hasProjectMeta: true,
    hasManifestTemplate: true,
    hasDist: false,
    blockReason: ""
  };
}

const { projectName, pageSlug, intent, summary } = parseArgs(process.argv.slice(2));

if (!projectName || !pageSlug || !intent) {
  process.stderr.write("Usage: node scripts/init-project.js <project-name> <page-slug> <intent> [--summary <summary>]\n");
  process.exit(1);
}

const now = process.env.WEB_HTML_NOW ? new Date(process.env.WEB_HTML_NOW) : new Date();
const nowIso = now.toISOString();
const taskId = buildTaskId(now, pageSlug);
const projectUid = process.env.WEB_HTML_PROJECT_UID || generateProjectUid();
const projectsDir = process.env.WEB_HTML_PROJECTS_DIR
  ? path.resolve(process.env.WEB_HTML_PROJECTS_DIR)
  : config.PROJECTS_DIR;
const projectPath = path.join(projectsDir, projectName);
const webdesignDir = path.join(projectPath, config.WEBDESIGN_DIR);
const taskDir = path.join(webdesignDir, config.TASKS_DIR, taskId);

if (fs.existsSync(projectPath)) {
  process.stderr.write(`Project already exists: ${projectPath}\n`);
  process.exit(1);
}

fs.mkdirSync(projectPath, { recursive: true });

writeProjectMeta(projectPath, {
  projectUid,
  name: projectName,
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
writeJsonFile(path.join(taskDir, "01_intake.json"), buildIntake(projectName, pageSlug, intent, summary));
writeJsonFile(path.join(taskDir, "02_project_state.json"), buildProjectState(projectPath, projectUid, projectName, taskId));

process.stdout.write(`${JSON.stringify({ projectPath, taskId, projectUid }, null, 2)}\n`);
