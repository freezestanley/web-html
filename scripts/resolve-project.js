#!/usr/bin/env node

const path = require("node:path");
const { listProjects } = require("./lib/project-index");

const projectName = process.argv[2];

if (!projectName) {
  process.stderr.write("Usage: node scripts/resolve-project.js <project-name>\n");
  process.exit(1);
}

const projectsDir = process.env.WEB_HTML_PROJECTS_DIR
  ? path.resolve(process.env.WEB_HTML_PROJECTS_DIR)
  : undefined;

const match = listProjects({ projectsDir }).find((project) => project.name === projectName);

if (!match) {
  process.stderr.write(`Project not found: ${projectName}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ name: match.name, projectPath: match.projectPath }, null, 2)}\n`);
