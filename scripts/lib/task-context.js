const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");
const { writeFileAtomic } = require("./atomic-write");

const config = loadConfig();
const CONTEXT_SAVE_FILENAME = "context-save.json";
const LAST_HANDOFF_FILENAME = "last-handoff.json";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// 损坏容错读：文件不存在或 JSON 损坏都返回 null（视同不存在），绝不抛。
// 这是恢复链路的降级基石——last-handoff/context-save 损坏时应回退，而非崩溃。
function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return readJson(filePath);
  } catch (error) {
    return null;
  }
}

function getTaskDir(projectPath, taskId) {
  return path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId);
}

function getWorkflowPath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), "workflow.json");
}

function getIntakePath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), "01_intake.json");
}

function getProjectStatePath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), "02_project_state.json");
}

function getContextSavePath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), CONTEXT_SAVE_FILENAME);
}

function getLastHandoffPath(projectPath) {
  return path.join(projectPath, config.WEBDESIGN_DIR, LAST_HANDOFF_FILENAME);
}

function writeContextSave(projectPath, taskId, contextSave) {
  const filePath = getContextSavePath(projectPath, taskId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileAtomic(filePath, JSON.stringify(contextSave, null, 2));
  return filePath;
}

function writeLastHandoff(projectPath, handoff) {
  const filePath = getLastHandoffPath(projectPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileAtomic(filePath, JSON.stringify(handoff, null, 2));
  return filePath;
}

function readContextBundle(projectPath, taskId) {
  return {
    // workflow 用容错读：损坏/缺失返回 null，由调用方降级处理（缺陷B）。
    // 恢复链路不能因单个文件损坏而整体抛异常。
    workflow: readJsonIfExists(getWorkflowPath(projectPath, taskId)),
    intake: readJsonIfExists(getIntakePath(projectPath, taskId)),
    projectState: readJsonIfExists(getProjectStatePath(projectPath, taskId)),
    contextSave: readJsonIfExists(getContextSavePath(projectPath, taskId))
  };
}

// 选出应恢复的活跃任务：优先 last-handoff.json 指向的未完成任务，
// 否则回退到 preferredTaskId（project.json.currentTaskId），再回退 fallbackTaskId。
function selectActiveTask(projectRoot, preferredTaskId, fallbackTaskId) {
  const lastHandoff = readJsonIfExists(getLastHandoffPath(projectRoot));

  if (lastHandoff && lastHandoff.taskId) {
    const workflow = readJsonIfExists(getWorkflowPath(projectRoot, lastHandoff.taskId));
    if (workflow && workflow.currentGate !== "DONE") {
      return {
        taskId: lastHandoff.taskId,
        taskSelector: "last-handoff",
        lastHandoff
      };
    }
  }

  return {
    taskId: preferredTaskId || fallbackTaskId || "",
    taskSelector: "current-task",
    lastHandoff
  };
}

module.exports = {
  CONTEXT_SAVE_FILENAME,
  LAST_HANDOFF_FILENAME,
  getContextSavePath,
  getIntakePath,
  getLastHandoffPath,
  getProjectStatePath,
  getTaskDir,
  getWorkflowPath,
  readContextBundle,
  readJson,
  readJsonIfExists,
  selectActiveTask,
  writeContextSave,
  writeLastHandoff
};
