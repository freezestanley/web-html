#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");
const {
  getContextSavePath,
  getIntakePath,
  getProjectStatePath,
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

function buildTask({
  projectPath,
  taskId,
  projectJsonPath,
  workflowPath,
  intakePath,
  projectStatePath,
  contextSavePath,
  workflow
}) {
  const htmlDesignSkillPath = path.resolve(__dirname, "..", "skills", "html-design", "SKILL.md");
  const referenceRoot = path.resolve(__dirname, "..", "reference");
  const distDir = path.join(projectPath, "dist");
  const distIndexPath = path.join(distDir, "index.html");

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
- Place related static assets under ${distDir}
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
    runTimeoutSeconds: 600,
    model: process.env.SUBAGENT_MODEL || "za/deepseek-v4-pro",
    task: buildTask({
      projectPath,
      taskId,
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
