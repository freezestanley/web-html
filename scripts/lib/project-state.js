const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { loadConfig } = require("./load-config");

const config = loadConfig();

function getProjectMetaPath(projectPath) {
  return path.join(projectPath, config.WEBDESIGN_DIR, "project.json");
}

function readProjectMeta(projectPath) {
  return JSON.parse(fs.readFileSync(getProjectMetaPath(projectPath), "utf8"));
}

function writeProjectMeta(projectPath, meta) {
  const webdesignDir = path.join(projectPath, config.WEBDESIGN_DIR);
  fs.mkdirSync(webdesignDir, { recursive: true });
  fs.writeFileSync(getProjectMetaPath(projectPath), JSON.stringify(meta, null, 2));
}

function generateProjectUid() {
  return `PROJ${crypto.randomBytes(8).toString("hex")}`;
}

function buildTaskId(date, slug) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${date.getUTCSeconds()}`.padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}-${slug}`;
}

module.exports = {
  buildTaskId,
  generateProjectUid,
  getProjectMetaPath,
  readProjectMeta,
  writeProjectMeta
};
