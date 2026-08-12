#!/usr/bin/env node

const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { detectProjectState } = require("./lib/project-detection");
const { readProjectMeta } = require("./lib/project-state");
const {
  getContextSavePath,
  getLastHandoffPath,
  getWorkflowPath,
  readJsonIfExists,
  selectActiveTask,
  writeContextSave,
  writeLastHandoff
} = require("./lib/task-context");
const { readSessionFile } = require("./lib/session-file");
const {
  agentIdFromKey,
  computeThreshold
} = require("./session-state");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--session-key") {
      options.sessionKey = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--agent") {
      options.agent = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--compact-threshold") {
      options.compactThreshold = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--max-lines") {
      options.maxLines = argv[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--save-only") {
      options.saveOnly = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    positional.push(arg);
  }

  return { positional, options };
}

// 写一份最小 handoff 存档：goal/next 用占位，gate 取当前业务 gate（不改 workflow）。
// 缺陷A：若已存在人工存档（source !== "auto-handoff"），绝不覆盖其 goal/done/block/next，
// 只更新 last-handoff 指针。自动占位存档只在无存档或既有自动存档时才写。
function writeMinimalHandoff(projectPath, taskId, workflow) {
  const savedAt = process.env.WEB_HTML_NOW || new Date().toISOString();
  const existing = readJsonIfExists(getContextSavePath(projectPath, taskId));
  const isManual = existing && existing.source !== "auto-handoff";

  let contextSavePath;
  if (isManual) {
    // 人工存档：保留内容不动，仅刷新 last-handoff 指向。
    contextSavePath = getContextSavePath(projectPath, taskId);
  } else {
    const payload = {
      goal: "上下文自动压缩存档",
      done: [],
      block: [],
      next: "compact 后运行 resume-task.js 读取 context-save.json 继续当前 gate",
      refs: [],
      gate: workflow.currentGate,
      savedAt,
      source: "auto-handoff"
    };
    contextSavePath = writeContextSave(projectPath, taskId, payload);
  }

  const handoffPath = writeLastHandoff(projectPath, {
    taskId,
    goal: isManual ? existing.goal : "上下文自动压缩存档",
    gate: workflow.currentGate,
    savedAt
  });
  return { contextSavePath, handoffPath, gate: workflow.currentGate, preservedManual: Boolean(isManual) };
}

// 触发 compact：openclaw sessions compact <key> [--agent <id>] [--max-lines <n>] --json
// compact 失败返回结构化错误，绝不抛出（cron/hook 调用方靠 exit 0 判断脚本本身正常）。
function triggerCompact({ sessionKey, agentId, maxLines, runCompact }) {
  if (!sessionKey) {
    return { action: "compact-skipped", reason: "no-session-key" };
  }
  const args = ["sessions", "compact", sessionKey];
  if (agentId) {
    args.push("--agent", agentId);
  }
  if (maxLines) {
    args.push("--max-lines", String(maxLines));
  }
  args.push("--json");

  const invoke = runCompact || ((cliArgs) =>
    execFileSync("openclaw", cliArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));

  try {
    const out = invoke(args);
    const tail = String(out || "").trim().split("\n").slice(-3).join("\n");
    return { action: "compacted", sessionKey, agentId, outputTail: tail };
  } catch (error) {
    return {
      action: "compact-failed",
      sessionKey,
      agentId,
      error: String((error && error.message) || error)
    };
  }
}

function resolveSession(projectPath, options) {
  const session = readSessionFile(projectPath);
  const sessionKey = options.sessionKey || session?.sessionKey || "";
  const agentId = options.agent || session?.agentId || agentIdFromKey(sessionKey);
  return { sessionKey, agentId };
}

function cmdCheckAdvance(positional, options) {
  const projectPathArg = positional[0];
  if (!projectPathArg) {
    fail("Usage: node scripts/gate.js check-advance <project-path> --compact-threshold <n> [--save-only] [--dry-run]");
  }
  const projectPath = path.resolve(projectPathArg);

  const detection = detectProjectState({ projectPath });
  if (detection.projectType !== "CONTINUE_MANAGED_PROJECT") {
    return emit({ action: "skip", reason: "not-managed", projectType: detection.projectType, projectPath });
  }

  // 缺陷B：project.json 损坏时不裸崩，skip 让上层保守处理。
  let projectMeta;
  try {
    projectMeta = readProjectMeta(detection.projectRoot);
  } catch (error) {
    return emit({ action: "skip", reason: "project-json-corrupt", projectPath, error: String((error && error.message) || error) });
  }
  const selection = selectActiveTask(detection.projectRoot, projectMeta.currentTaskId, detection.currentTaskId);
  const taskId = selection.taskId;
  if (!taskId) {
    return emit({ action: "skip", reason: "no-active-task", projectPath });
  }

  const workflow = readJsonIfExists(getWorkflowPath(detection.projectRoot, taskId));
  if (!workflow) {
    return emit({ action: "skip", reason: "no-workflow", taskId, projectPath });
  }
  if (workflow.currentGate === "DONE") {
    return emit({ action: "skip", reason: "done", taskId, gate: "DONE" });
  }

  // save-only：仅落存档（用于 before_compaction hook，此刻正在 compact）
  if (options.saveOnly) {
    const written = writeMinimalHandoff(detection.projectRoot, taskId, workflow);
    return emit({ action: "saved", mode: "save-only", taskId, ...written });
  }

  // 判阈值
  const { sessionKey, agentId } = resolveSession(detection.projectRoot, options);
  const threshold = Number.isFinite(options.compactThreshold) ? options.compactThreshold : NaN;
  if (!Number.isFinite(threshold)) {
    fail("--compact-threshold <n> is required for check-advance (unless --save-only)");
  }

  const check = computeThreshold({ sessionKey, agentId, threshold });
  if (!check.needCompact) {
    return emit({ action: "skip", reason: check.reason, taskId, ...check });
  }

  if (options.dryRun) {
    return emit({ action: "would-compact", taskId, ...check });
  }

  const written = writeMinimalHandoff(detection.projectRoot, taskId, workflow);
  const compactResult = triggerCompact({ sessionKey, agentId, maxLines: options.maxLines });

  // 缺陷G：持久化 compact 成功/失败标记到 last-handoff，供 HEARTBEAT 路径2 判据（缺陷F）。
  // compacted 表示确实压缩过、待恢复；compact-failed 表示压缩失败，不应触发恢复。
  const compactState = compactResult.action === "compacted" ? "compacted" : "compact-failed";
  const savedAt = process.env.WEB_HTML_NOW || new Date().toISOString();
  writeLastHandoff(detection.projectRoot, {
    taskId,
    goal: written.preservedManual ? undefined : "上下文自动压缩存档",
    gate: workflow.currentGate,
    savedAt,
    compactState,
    compactedAt: compactState === "compacted" ? savedAt : undefined
  });

  emit({ action: "handoff", taskId, ...written, compactState, compact: compactResult });
  // 缺陷G：compact 失败以非零退出，供 cron 感知（此前静默 exit 0）。
  if (compactState === "compact-failed") {
    process.exit(3);
  }
  return;
}

function cmdTriggerCompact(options) {
  const key = options.sessionKey || "";
  if (!key) {
    fail("Usage: node scripts/gate.js trigger-compact --session-key <key> [--agent <id>] [--max-lines <n>]");
  }
  const agentId = options.agent || agentIdFromKey(key);
  emit(triggerCompact({ sessionKey: key, agentId, maxLines: options.maxLines }));
}

// 缺陷F 判据②：检测"compact 已完成但未恢复"态，供 HEARTBEAT 触发 resume。
// 与 check-advance（判据①压缩）互相独立，不被 token 阈值短路。
function cmdCheckResume(positional) {
  const projectPathArg = positional[0];
  if (!projectPathArg) {
    fail("Usage: node scripts/gate.js check-resume <project-path>");
  }
  const projectPath = path.resolve(projectPathArg);

  const detection = detectProjectState({ projectPath });
  if (detection.projectType !== "CONTINUE_MANAGED_PROJECT") {
    return emit({ action: "skip", reason: "not-managed", needResume: false });
  }

  const lastHandoff = readJsonIfExists(getLastHandoffPath(detection.projectRoot));
  if (!lastHandoff) {
    return emit({ action: "skip", reason: "no-last-handoff", needResume: false });
  }
  // 只认 compacted 待恢复态；resumed / compact-failed / 无标记都不触发（幂等，缺陷G）。
  if (lastHandoff.compactState !== "compacted") {
    return emit({ action: "skip", reason: "not-compacted-pending", compactState: lastHandoff.compactState || "none", needResume: false });
  }
  const workflow = readJsonIfExists(getWorkflowPath(detection.projectRoot, lastHandoff.taskId));
  if (!workflow) {
    return emit({ action: "skip", reason: "workflow-missing-or-corrupt", taskId: lastHandoff.taskId, needResume: false });
  }
  if (workflow.currentGate === "DONE") {
    return emit({ action: "skip", reason: "done", taskId: lastHandoff.taskId, needResume: false });
  }

  return emit({
    action: "resume-needed",
    needResume: true,
    taskId: lastHandoff.taskId,
    gate: workflow.currentGate,
    resumeCommand: `node scripts/resume-task.js --project-path ${detection.projectRoot}`
  });
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = parseArgs(rest);

  switch (command) {
    case "check-advance":
      return cmdCheckAdvance(positional, options);
    case "check-resume":
      return cmdCheckResume(positional);
    case "trigger-compact":
      return cmdTriggerCompact(options);
    default:
      fail("Usage: node scripts/gate.js <check-advance|check-resume|trigger-compact> [options]");
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  triggerCompact,
  writeMinimalHandoff
};
