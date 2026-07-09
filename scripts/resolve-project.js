#!/usr/bin/env node

const path = require("node:path");
const { listProjects } = require("./lib/project-index");

const projectId = process.argv[2];

if (!projectId) {
  process.stderr.write("Usage: node scripts/resolve-project.js <project-id>\n");
  process.exit(1);
}

const projectsDir = process.env.WEB_HTML_PROJECTS_DIR
  ? path.resolve(process.env.WEB_HTML_PROJECTS_DIR)
  : undefined;

const match = listProjects({ projectsDir }).find((project) => project.projectUid === projectId);

if (!match) {
  process.stderr.write(`Project not found: ${projectId}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ projectUid: match.projectUid, name: match.name, projectPath: match.projectPath }, null, 2)}\n`);
