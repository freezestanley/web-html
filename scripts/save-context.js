#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { getWorkflowPath, readJson, writeContextSave } = require("./lib/task-context");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {
    done: [],
    block: [],
    refs: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--goal") {
      options.goal = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--done") {
      options.done.push(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--block") {
      options.block.push(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (arg === "--next") {
      options.next = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--ref") {
      options.refs.push(argv[index + 1] || "");
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    projectPath: positional[0] || "",
    taskId: positional[1] || "",
    ...options
  };
}

const {
  projectPath: projectPathArg,
  taskId,
  goal,
  done,
  block,
  next,
  refs
} = parseArgs(process.argv.slice(2));

if (!projectPathArg || !taskId) {
  fail("Usage: node scripts/save-context.js <project-path> <task-id> --goal <text> [--done <text>] [--block <text>] --next <text> [--ref <text>]");
}

if (!goal) {
  fail("--goal is required");
}

if (!next) {
  fail("--next is required");
}

const projectPath = path.resolve(projectPathArg);
const workflowPath = getWorkflowPath(projectPath, taskId);

if (!fs.existsSync(workflowPath)) {
  fail(`workflow.json not found: ${workflowPath}`);
}

const workflow = readJson(workflowPath);
const savedAt = process.env.WEB_HTML_NOW || new Date().toISOString();
const payload = {
  goal,
  done,
  block,
  next,
  refs,
  gate: workflow.currentGate,
  savedAt
};

const filePath = writeContextSave(projectPath, taskId, payload);

process.stdout.write(
  `${JSON.stringify({
    action: "saved",
    projectPath,
    taskId,
    currentGate: workflow.currentGate,
    filePath
  }, null, 2)}\n`
);
