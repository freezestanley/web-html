const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");

const config = loadConfig();

function getManifestTemplatePath(projectPath) {
  return path.join(projectPath, config.WEBDESIGN_DIR, "manifest.json");
}

function getRootManifestPath(projectPath) {
  return path.join(projectPath, "manifest.json");
}

function replaceManifestPlaceholders(value, projectMeta) {
  if (typeof value === "string") {
    return value
      .replaceAll("<project-uid>", projectMeta.projectUid || "")
      .replaceAll("<project-name>", projectMeta.name || "")
      .replaceAll("<project summary or name>", projectMeta.summary || projectMeta.name || "")
      .replaceAll("<project.json.author or empty>", projectMeta.author || "");
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceManifestPlaceholders(item, projectMeta));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceManifestPlaceholders(child, projectMeta)])
    );
  }

  return value;
}

function validateManifest(manifest) {
  if (!manifest.projectId && !manifest.name) {
    throw new Error("manifest requires projectId or name");
  }

  if (manifest.proxy && !Array.isArray(manifest.proxy.routes)) {
    throw new Error("manifest proxy.routes must be an array");
  }
}

function renderManifest(projectPath, projectMeta) {
  const templatePath = getManifestTemplatePath(projectPath);
  const rootManifestPath = getRootManifestPath(projectPath);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing manifest template: ${templatePath}`);
  }

  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  const manifest = replaceManifestPlaceholders(template, projectMeta);
  validateManifest(manifest);
  fs.writeFileSync(rootManifestPath, JSON.stringify(manifest, null, 2));

  return {
    manifest,
    manifestPath: rootManifestPath
  };
}

module.exports = {
  getManifestTemplatePath,
  getRootManifestPath,
  renderManifest,
  replaceManifestPlaceholders,
  validateManifest
};
