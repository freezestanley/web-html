const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { detectProjectState } = require("./lib/project-detection");

function writeManagedProject(projectPath, { projectMeta = true, manifestTemplate = true } = {}) {
  const metadataDir = path.join(projectPath, ".webdesign");
  fs.mkdirSync(metadataDir, { recursive: true });

  if (projectMeta) {
    fs.writeFileSync(
      path.join(metadataDir, "project.json"),
      JSON.stringify(
        {
          projectUid: "PROJaabbccddeeff0011",
          name: path.basename(projectPath),
          summary: "Demo summary",
          currentTaskId: "20260708-102030-homepage"
        },
        null,
        2
      )
    );
  }

  if (manifestTemplate) {
    fs.writeFileSync(
      path.join(metadataDir, "manifest.json"),
      JSON.stringify(
        {
          projectId: "<project-uid>",
          name: "<project summary or name>"
        },
        null,
        2
      )
    );
  }
}

test("detectProjectState returns NEW_PROJECT when candidate dir does not exist", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-project-detect-"));
  const result = detectProjectState({ projectName: "demo", projectsDir: tempDir });

  assert.equal(result.projectType, "NEW_PROJECT");
  assert.equal(result.projectMode, "new");
  assert.equal(result.hasWebdesignDir, false);
  assert.equal(result.projectRoot, path.join(tempDir, "demo"));
});

test("detectProjectState returns CONTINUE_MANAGED_PROJECT for a complete managed project", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-project-detect-"));
  const projectPath = path.join(tempDir, "demo");
  writeManagedProject(projectPath);

  const result = detectProjectState({ projectName: "demo", projectsDir: tempDir });

  assert.equal(result.projectType, "CONTINUE_MANAGED_PROJECT");
  assert.equal(result.projectMode, "continue");
  assert.equal(result.hasWebdesignDir, true);
  assert.equal(result.hasProjectMeta, true);
  assert.equal(result.hasManifestTemplate, true);
  assert.equal(result.projectUid, "PROJaabbccddeeff0011");
  assert.equal(result.currentTaskId, "20260708-102030-homepage");
});

test("detectProjectState returns BROKEN_MANAGED_PROJECT when managed metadata is incomplete", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-project-detect-"));
  const projectPath = path.join(tempDir, "broken");
  writeManagedProject(projectPath, { projectMeta: true, manifestTemplate: false });

  const result = detectProjectState({ projectName: "broken", projectsDir: tempDir });

  assert.equal(result.projectType, "BROKEN_MANAGED_PROJECT");
  assert.equal(result.projectMode, "blocked");
  assert.equal(result.hasWebdesignDir, true);
  assert.equal(result.hasProjectMeta, true);
  assert.equal(result.hasManifestTemplate, false);
  assert.match(result.blockReason, /元数据不完整/);
});

test("detectProjectState returns UNMANAGED_EXISTING_PROJECT for an existing unmanaged directory", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-project-detect-"));
  const projectPath = path.join(tempDir, "legacy");
  fs.mkdirSync(projectPath, { recursive: true });

  const result = detectProjectState({ projectName: "legacy", projectsDir: tempDir });

  assert.equal(result.projectType, "UNMANAGED_EXISTING_PROJECT");
  assert.equal(result.projectMode, "blocked");
  assert.equal(result.hasWebdesignDir, false);
  assert.match(result.blockReason, /未纳入 web-html \/ web-design 管理/);
});

test("detectProjectState allows explicit project paths outside PROJECTS_DIR", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-project-detect-"));
  const externalProjectPath = path.join(tempDir, "external", "agent-dev-system");
  writeManagedProject(externalProjectPath);

  const result = detectProjectState({ projectPath: externalProjectPath, projectsDir: path.join(tempDir, "projects") });

  assert.equal(result.projectType, "CONTINUE_MANAGED_PROJECT");
  assert.equal(result.projectRoot, externalProjectPath);
});
