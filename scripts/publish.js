#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { readProjectMeta, writeProjectMeta } = require("./lib/project-state");
const { loadConfig } = require("./lib/load-config");
const { renderManifest } = require("./lib/manifest");
const { createSourceZip, createDistZip } = require("./lib/zip");
const { buildPublishMarker } = require("./lib/publish-marker");

const config = loadConfig();

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getWorkflowPath(projectPath, taskId) {
  return path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId, "workflow.json");
}

function ensurePublishableBundle(projectPath) {
  const distDir = path.join(projectPath, "dist");
  if (!fs.existsSync(distDir)) {
    throw new Error("dist/ directory is required");
  }
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error("dist/index.html is required");
  }
}

const projectPathArg = process.argv[2];
const taskId = process.argv[3];

if (!projectPathArg || !taskId) {
  fail("Usage: node scripts/publish.js <project-path> <task-id>");
}

const projectPath = path.resolve(projectPathArg);
const workflowPath = getWorkflowPath(projectPath, taskId);

if (!fs.existsSync(workflowPath)) {
  fail(`workflow.json not found: ${workflowPath}`);
}

const workflow = readJson(workflowPath);
if (workflow.currentGate !== "G9_PUBLISH_READY") {
  fail(`Current gate must be G9_PUBLISH_READY, got ${workflow.currentGate}`);
}
if (workflow.blocked) {
  fail(`Task is blocked: ${workflow.blockReason}`);
}

ensurePublishableBundle(projectPath);

const projectMeta = readProjectMeta(projectPath);
renderManifest(projectPath, projectMeta);

const sourceZipPath = createSourceZip(projectPath);
const distZipPath = createDistZip(projectPath);

writeProjectMeta(projectPath, {
  ...projectMeta,
  sourceZipPath,
  distZipPath,
  updatedAt: new Date().toISOString()
});

workflow.history = [...(workflow.history || []), { from: workflow.currentGate, to: "DONE", at: new Date().toISOString() }];
workflow.currentGate = "DONE";
workflow.updatedAt = new Date().toISOString();
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));

process.stdout.write(
  `${buildPublishMarker({
    projectUid: projectMeta.projectUid || "",
    sourceZipPath,
    distZipPath,
    projectName: projectMeta.name,
    descript: projectMeta.summary
  })}\n`
);
