const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");
const { getManagedProjectFiles } = require("./project-index");

const config = loadConfig();

function resolveCandidateProjectPath({ projectName, projectPath, projectsDir = config.PROJECTS_DIR }) {
  if (projectPath) {
    return path.resolve(projectPath);
  }
  if (!projectName) {
    throw new Error("projectName or projectPath is required");
  }
  return path.join(path.resolve(projectsDir), projectName);
}

function detectProjectState({ projectName, projectPath, projectsDir = config.PROJECTS_DIR } = {}) {
  const projectRoot = resolveCandidateProjectPath({ projectName, projectPath, projectsDir });

  const result = {
    projectType: "",
    projectMode: "",
    projectRoot,
    projectUid: "",
    projectName: projectName || path.basename(projectRoot),
    currentTaskId: "",
    hasWebdesignDir: false,
    hasProjectMeta: false,
    hasManifestTemplate: false,
    hasDist: fs.existsSync(path.join(projectRoot, "dist")),
    blockReason: ""
  };

  if (!fs.existsSync(projectRoot)) {
    return {
      ...result,
      projectType: "NEW_PROJECT",
      projectMode: "new"
    };
  }

  const files = getManagedProjectFiles(projectRoot);
  result.hasWebdesignDir = fs.existsSync(files.webdesignDir);
  result.hasProjectMeta = fs.existsSync(files.projectMetaPath);
  result.hasManifestTemplate = fs.existsSync(files.manifestTemplatePath);

  if (!result.hasWebdesignDir) {
    return {
      ...result,
      projectType: "UNMANAGED_EXISTING_PROJECT",
      projectMode: "blocked",
      blockReason: "已有项目目录但未纳入 web-html / web-design 管理"
    };
  }

  if (!result.hasProjectMeta || !result.hasManifestTemplate) {
    return {
      ...result,
      projectType: "BROKEN_MANAGED_PROJECT",
      projectMode: "blocked",
      blockReason: "受管项目元数据不完整"
    };
  }

  const projectMeta = JSON.parse(fs.readFileSync(files.projectMetaPath, "utf8"));
  return {
    ...result,
    projectType: "CONTINUE_MANAGED_PROJECT",
    projectMode: "continue",
    projectUid: projectMeta.projectUid || "",
    projectName: projectMeta.name || result.projectName,
    currentTaskId: projectMeta.currentTaskId || ""
  };
}

module.exports = {
  detectProjectState,
  resolveCandidateProjectPath
};
