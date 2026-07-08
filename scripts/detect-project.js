#!/usr/bin/env node

const path = require("node:path");
const { detectProjectState } = require("./lib/project-detection");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project-path") {
      options.projectPath = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    projectName: positional[0] || "",
    projectPath: options.projectPath || ""
  };
}

const { projectName, projectPath } = parseArgs(process.argv.slice(2));

if (!projectName && !projectPath) {
  fail("Usage: node scripts/detect-project.js <project-name> [--project-path <path>]");
}

const projectsDir = process.env.WEB_HTML_PROJECTS_DIR
  ? path.resolve(process.env.WEB_HTML_PROJECTS_DIR)
  : undefined;

const result = detectProjectState({ projectName, projectPath, projectsDir });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
