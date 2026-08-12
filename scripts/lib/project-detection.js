const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");
const { getManagedProjectFiles } = require("./project-index");

const config = loadConfig();

function resolveCandidateProjectPath({ projectId, projectPath, projectsDir = config.PROJECTS_DIR }) {
  if (projectPath) {
    return path.resolve(projectPath);
  }
  if (!projectId) {
    throw new Error("projectId or projectPath is required");
  }
  return path.join(path.resolve(projectsDir), projectId);
}

function detectProjectState({ projectId, projectPath, projectsDir = config.PROJECTS_DIR } = {}) {
  const projectRoot = resolveCandidateProjectPath({ projectId, projectPath, projectsDir });

  const result = {
    projectType: "",
    projectMode: "",
    projectRoot,
    projectUid: "",
    projectId: projectId || path.basename(projectRoot),
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

  // 缺陷B：project.json 损坏时判为 BROKEN_MANAGED_PROJECT，不裸抛。
  let projectMeta;
  try {
    projectMeta = JSON.parse(fs.readFileSync(files.projectMetaPath, "utf8"));
  } catch (error) {
    return {
      ...result,
      projectType: "BROKEN_MANAGED_PROJECT",
      projectMode: "blocked",
      blockReason: "project.json 损坏，无法解析"
    };
  }
  return {
    ...result,
    projectType: "CONTINUE_MANAGED_PROJECT",
    projectMode: "continue",
    projectUid: projectMeta.projectUid || "",
    projectId: projectId || result.projectId,
    currentTaskId: projectMeta.currentTaskId || ""
  };
}

module.exports = {
  detectProjectState,
  resolveCandidateProjectPath
};
