#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");
const { loadGates, isAllowedTransition } = require("./lib/gates");

const config = loadConfig();
const gatesConfig = loadGates();

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--reason") {
      options.reason = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--unblock") {
      options.unblock = true;
      continue;
    }
    positional.push(arg);
  }

  return {
    taskId: positional[0],
    targetGate: positional[1],
    reason: options.reason || "",
    unblock: Boolean(options.unblock)
  };
}

function getWorkflowPath(taskId) {
  // tasks/<taskId>/workflow.json 相对于 PROJECTS_DIR 不可知；
  // advance-gate 接受绝对 workflow 路径或 taskId。
  // 优先当作绝对路径；否则在 PROJECTS_DIR 下搜索。
  if (path.isAbsolute(taskId) && taskId.endsWith("workflow.json")) {
    return taskId;
  }
  // 兼容：直接传 workflow.json 绝对路径
  if (taskId.endsWith("workflow.json")) {
    return path.resolve(taskId);
  }
  fail("taskId must be an absolute path to workflow.json (e.g. /projects/PROJ.../.webdesign/tasks/<id>/workflow.json)");
}

const { taskId, targetGate, reason, unblock } = parseArgs(process.argv.slice(2));

if (!taskId) {
  fail("Usage: node scripts/advance-gate.js <workflow.json-path> <target-gate> [--reason <text>] [--unblock]");
}

// --unblock 模式：targetGate 可选；正常流转模式：targetGate 必填
if (!unblock && !targetGate) {
  fail("Usage: node scripts/advance-gate.js <workflow.json-path> <target-gate> [--reason <text>] [--unblock]");
}

if (targetGate && !gatesConfig.gates.includes(targetGate)) {
  fail(`Unknown gate: ${targetGate}. Valid gates: ${gatesConfig.gates.join(", ")}`);
}

const workflowPath = getWorkflowPath(taskId);
if (!fs.existsSync(workflowPath)) {
  fail(`workflow.json not found: ${workflowPath}`);
}

const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
const currentGate = workflow.currentGate;

if (!currentGate) {
  fail("workflow.json missing currentGate");
}

// --unblock 仅清除 blocked 标记，不改变 currentGate
if (unblock) {
  if (!workflow.blocked) {
    fail("Task is not blocked; --unblock is unnecessary");
  }
  workflow.blocked = false;
  workflow.blockReason = "";
  workflow.updatedAt = new Date().toISOString();
  fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
  process.stdout.write(`${JSON.stringify({ action: "unblocked", currentGate, workflowPath }, null, 2)}\n`);
  process.exit(0);
}

// 正常流转校验
if (currentGate === targetGate) {
  fail(`Already at gate ${currentGate}; no transition needed`);
}

if (!isAllowedTransition(currentGate, targetGate, workflow.blocked, gatesConfig)) {
  if (workflow.blocked) {
    const allowed = gatesConfig.blockPolicy?.unblockTargets?.[currentGate] || [];
    fail(`Task is blocked at ${currentGate}. Allowed unblock targets: ${allowed.join(", ") || "(none)"}. Use --unblock first or transition to an allowed gate.`);
  }
  const allowed = gatesConfig.transitions?.[currentGate] || [];
  fail(`Illegal transition: ${currentGate} → ${targetGate}. Allowed: ${allowed.join(", ") || "(none)"}`);
}

// 执行流转
const nowIso = new Date().toISOString();
workflow.history = [...(workflow.history || []), { from: currentGate, to: targetGate, at: nowIso, reason: reason || undefined }];
workflow.currentGate = targetGate;
workflow.updatedAt = nowIso;

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));

process.stdout.write(`${JSON.stringify({ action: "advanced", from: currentGate, to: targetGate, workflowPath }, null, 2)}\n`);
