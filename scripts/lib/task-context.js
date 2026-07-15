const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");

const config = loadConfig();
const CONTEXT_SAVE_FILENAME = "context-save.json";
const LAST_HANDOFF_FILENAME = "last-handoff.json";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readJson(filePath);
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
  fs.writeFileSync(filePath, JSON.stringify(contextSave, null, 2));
  return filePath;
}

function writeLastHandoff(projectPath, handoff) {
  const filePath = getLastHandoffPath(projectPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(handoff, null, 2));
  return filePath;
}

function readContextBundle(projectPath, taskId) {
  return {
    workflow: readJson(getWorkflowPath(projectPath, taskId)),
    intake: readJsonIfExists(getIntakePath(projectPath, taskId)),
    projectState: readJsonIfExists(getProjectStatePath(projectPath, taskId)),
    contextSave: readJsonIfExists(getContextSavePath(projectPath, taskId))
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
  writeContextSave,
  writeLastHandoff
};
