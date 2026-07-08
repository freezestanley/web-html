const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");

const config = loadConfig();

function getManagedProjectFiles(projectPath) {
  const webdesignDir = path.join(projectPath, config.WEBDESIGN_DIR);
  return {
    webdesignDir,
    projectMetaPath: path.join(webdesignDir, "project.json"),
    manifestTemplatePath: path.join(webdesignDir, "manifest.json")
  };
}

function listProjects({ projectsDir = config.PROJECTS_DIR } = {}) {
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  return fs.readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(projectsDir, entry.name))
    .map((projectPath) => {
      const files = getManagedProjectFiles(projectPath);
      if (!fs.existsSync(files.projectMetaPath) || !fs.existsSync(files.manifestTemplatePath)) {
        return null;
      }

      const metadata = JSON.parse(fs.readFileSync(files.projectMetaPath, "utf8"));
      return {
        name: metadata.name,
        summary: metadata.summary,
        updatedAt: metadata.updatedAt || "",
        projectPath
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

module.exports = {
  getManagedProjectFiles,
  listProjects
};
