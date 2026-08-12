const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");
const { writeFileAtomic } = require("./atomic-write");

const config = loadConfig();
const SESSION_FILENAME = "session.json";

function getSessionFilePath(projectPath) {
  return path.join(projectPath, config.WEBDESIGN_DIR, SESSION_FILENAME);
}

function readSessionFile(projectPath) {
  const filePath = getSessionFilePath(projectPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  // 缺陷B：session.json 损坏视同无 session（返回 null），保守不 compact，绝不裸崩。
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function writeSessionFile(projectPath, session) {
  const filePath = getSessionFilePath(projectPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileAtomic(filePath, JSON.stringify(session, null, 2));
  return filePath;
}

module.exports = {
  SESSION_FILENAME,
  getSessionFilePath,
  readSessionFile,
  writeSessionFile
};
