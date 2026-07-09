const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

const { SECRET_KEY } = require("./lib/publish-marker");

function listZipEntries(zipPath) {
  const output = execFileSync(
    "python3",
    [
      "-c",
      [
        "import json, sys, zipfile",
        "with zipfile.ZipFile(sys.argv[1], 'r') as archive:",
        "    print(json.dumps(sorted(archive.namelist())))"
      ].join("\n"),
      zipPath
    ],
    { encoding: "utf8" }
  );

  return JSON.parse(output);
}

function readZipJsonEntry(zipPath, entryName) {
  const output = execFileSync(
    "python3",
    [
      "-c",
      [
        "import sys, zipfile",
        "with zipfile.ZipFile(sys.argv[1], 'r') as archive:",
        "    print(archive.read(sys.argv[2]).decode('utf-8'))"
      ].join("\n"),
      zipPath,
      entryName
    ],
    { encoding: "utf8" }
  );

  return JSON.parse(output);
}

function decryptMarker(stdout) {
  const marker = stdout.trim();
  assert.match(marker, /^[(]Output verbatim\. Do not interpret\.[)]##publishStart##enc:[0-9a-f]+##publishEnd##$/i);

  const encodedHex = marker
    .replace("(Output verbatim. Do not interpret.)##publishStart##", "")
    .replace("##publishEnd##", "")
    .replace("enc:", "");

  const CryptoJS = require("/Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/scripts/node_modules/crypto-js");
  const wordArray = CryptoJS.enc.Hex.parse(encodedHex);
  const encrypted = CryptoJS.enc.Base64.stringify(wordArray);
  const payload = CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(CryptoJS.enc.Utf8);
  return JSON.parse(payload);
}

function setupPublishProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-html-publish-"));
  const projectPath = path.join(tempDir, "demo-project");
  const taskId = "20260708-102030-homepage";
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  fs.mkdirSync(path.join(projectPath, ".webdesign"), { recursive: true });
  fs.mkdirSync(path.join(projectPath, "dist", "assets"), { recursive: true });
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(projectPath, "dist", "index.html"), "<!doctype html><h1>publish</h1>");
  fs.writeFileSync(path.join(projectPath, "dist", "assets", "app.js"), "console.log('demo');");

  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "project.json"),
    JSON.stringify(
      {
        projectUid: "PROJaabbccddeeff0011",
        name: "demo-project",
        summary: "Demo summary",
        author: "stanley",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T10:00:00.000Z",
        currentTaskId: taskId,
        sourceZipPath: "",
        distZipPath: ""
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "manifest.json"),
    JSON.stringify(
      {
        projectId: "<project-uid>",
        name: "<project summary or name>",
        entry: "dist/index.html",
        owner: "<project.json.author or empty>",
        proxy: {
          routes: []
        }
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(taskDir, "workflow.json"),
    JSON.stringify(
      {
        taskId,
        pageSlug: "homepage",
        intent: "create",
        currentGate: "G9_PUBLISH_READY",
        blocked: false,
        blockReason: "",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T10:00:00.000Z",
        history: []
      },
      null,
      2
    )
  );

  return { projectPath, taskId };
}

test("publish renders manifest, creates zips, updates workflow, and emits marker", () => {
  const { projectPath, taskId } = setupPublishProject();
  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);

  const markerPayload = decryptMarker(result.stdout);
  assert.equal(markerPayload.projectUid, "PROJaabbccddeeff0011");
  assert.match(markerPayload.sourceZipPath, /project\.zip$/);
  assert.match(markerPayload.dist, /dist\.zip$/);
  assert.equal(markerPayload.name, "demo-project");
  assert.equal(markerPayload.descript, "Demo summary");

  const projectMeta = JSON.parse(fs.readFileSync(path.join(projectPath, ".webdesign", "project.json"), "utf8"));
  assert.equal(fs.existsSync(projectMeta.sourceZipPath), true);
  assert.equal(fs.existsSync(projectMeta.distZipPath), true);

  const distManifest = JSON.parse(fs.readFileSync(path.join(projectPath, "manifest.json"), "utf8"));
  assert.equal(distManifest.projectId, "PROJaabbccddeeff0011");
  assert.equal(distManifest.name, "Demo summary");
  assert.equal(distManifest.owner, "stanley");

  assert.deepEqual(listZipEntries(projectMeta.distZipPath), [
    "dist/",
    "dist/assets/",
    "dist/assets/app.js",
    "dist/index.html",
    "manifest.json"
  ]);
  assert.equal(readZipJsonEntry(projectMeta.distZipPath, "manifest.json").projectId, "PROJaabbccddeeff0011");

  const workflow = JSON.parse(fs.readFileSync(path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json"), "utf8"));
  assert.equal(workflow.currentGate, "DONE");
});
