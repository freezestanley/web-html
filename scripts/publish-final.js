#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadConfig } = require("./lib/load-config");
const { validatePublishMarker } = require("./lib/publish-marker");

const config = loadConfig();

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const [rawProjectPath, taskId] = process.argv.slice(2);

if (!rawProjectPath || !taskId) {
  fail("Usage: node scripts/publish-final.js <project-path> <task-id>");
}

const projectPath = path.resolve(rawProjectPath);
const result = spawnSync(process.execPath, [path.join(__dirname, "publish.js"), projectPath, taskId], {
  cwd: path.resolve(__dirname, ".."),
  encoding: "utf8"
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || `publish.js failed with status ${result.status}\n`);
  process.exit(result.status || 1);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
  process.exit(1);
}

const marker = result.stdout.trimEnd();
try {
  validatePublishMarker(marker);
} catch (error) {
  fail(error.message);
}

const markerPath = path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId, "publish-marker.txt");
fs.writeFileSync(markerPath, marker);

process.stdout.write(`${marker}\n`);
