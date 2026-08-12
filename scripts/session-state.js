#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const {
  getSessionKey
} = require("./lib/session-author");
const {
  readSessionFile,
  writeSessionFile
} = require("./lib/session-file");

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
    positional.push(arg);
  }

  return { positional, options };
}

// 从 session key 推断 agentId：agent:<agentId>:...
function agentIdFromKey(sessionKey) {
  const parts = String(sessionKey || "").split(":");
  if (parts.length >= 2 && parts[0] === "agent") {
    return parts[1] || "";
  }
  return "";
}

// 纯函数：从 sessions list --json 的一行里取 token 数。
// 字段名在不同版本间可能是 totalTokens / currentTokenCount / tokens 之一。
function extractTokens(row) {
  if (!row || typeof row !== "object") {
    return undefined;
  }
  const candidates = [row.totalTokens, row.currentTokenCount, row.tokens];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

// 纯函数：在 sessions list --json 结果中找到匹配 sessionKey 的行。
function findSessionRow(listResult, sessionKey) {
  const sessions = Array.isArray(listResult?.sessions) ? listResult.sessions : [];
  return sessions.find((row) => row && (row.key === sessionKey || row.sessionKey === sessionKey)) || null;
}

// 可注入：默认调用 openclaw CLI 拉 sessions list --json。
function defaultListSessions(agent) {
  const args = ["sessions", "list", "--json", "--limit", "all"];
  if (agent) {
    args.push("--agent", agent);
  }
  const out = execFileSync("openclaw", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(out);
}

// 判阈值核心：token 拿不到时保守返回 needCompact:false。
// listSessions 可注入以便测试。
function computeThreshold({ sessionKey, agentId, threshold, listSessions = defaultListSessions }) {
  if (!sessionKey) {
    return { needCompact: false, reason: "no-session", threshold };
  }
  let listResult;
  try {
    listResult = listSessions(agentId);
  } catch (error) {
    return { needCompact: false, reason: "list-failed", threshold, error: String(error && error.message || error) };
  }
  const row = findSessionRow(listResult, sessionKey);
  if (!row) {
    return { needCompact: false, reason: "session-not-found", threshold, sessionKey };
  }
  const tokens = extractTokens(row);
  if (tokens === undefined) {
    return { needCompact: false, reason: "usage-unavailable", threshold, sessionKey, agentId };
  }
  return {
    needCompact: tokens >= threshold,
    reason: tokens >= threshold ? "over-threshold" : "under-threshold",
    tokens,
    threshold,
    sessionKey,
    agentId
  };
}

function cmdSet(positional, options) {
  const projectPath = positional[0];
  if (!projectPath) {
    fail("Usage: node scripts/session-state.js set <project-path> [--session-key <key>] [--agent <id>]");
  }
  const sessionKey = options.sessionKey || getSessionKey(process.env);
  if (!sessionKey) {
    fail("session key not resolved: pass --session-key or run inside an agent session (SESSION_KEY/SESSION env)");
  }
  const agentId = options.agent || agentIdFromKey(sessionKey);
  const session = {
    sessionKey,
    agentId,
    projectPath,
    projectId: require("node:path").basename(projectPath),
    updatedAt: process.env.WEB_HTML_NOW || new Date().toISOString()
  };
  const filePath = writeSessionFile(projectPath, session);
  emit({ action: "set", filePath, ...session });
}

function cmdCurrent(positional) {
  const projectPath = positional[0];
  if (!projectPath) {
    fail("Usage: node scripts/session-state.js current <project-path>");
  }
  const session = readSessionFile(projectPath);
  if (!session) {
    emit({ sessionKey: "", reason: "no-session-file", projectPath });
    return;
  }
  emit(session);
}

function cmdCheckThreshold(positional, options) {
  const projectPath = positional[0];
  if (!projectPath) {
    fail("Usage: node scripts/session-state.js check-threshold <project-path> --compact-threshold <n>");
  }
  if (!Number.isFinite(options.compactThreshold)) {
    fail("--compact-threshold <n> is required and must be a number");
  }
  const session = readSessionFile(projectPath);
  const sessionKey = options.sessionKey || session?.sessionKey || "";
  const agentId = options.agent || session?.agentId || agentIdFromKey(sessionKey);
  emit(computeThreshold({ sessionKey, agentId, threshold: options.compactThreshold }));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = parseArgs(rest);

  switch (command) {
    case "set":
      return cmdSet(positional, options);
    case "current":
      return cmdCurrent(positional);
    case "check-threshold":
      return cmdCheckThreshold(positional, options);
    default:
      fail("Usage: node scripts/session-state.js <set|current|check-threshold> <project-path> [options]");
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  agentIdFromKey,
  computeThreshold,
  extractTokens,
  findSessionRow
};
