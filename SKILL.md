---
name: web-html
description: Use when the user needs a pure HTML/CSS/JS deliverable with project-level orchestration such as project detection, managed-project continuation, preview acceptance, packaging, or publish-marker output. Do not use when the request explicitly requires React, Vue, Astro, Vite, Next.js, SSR, or SSG.
---

# web-html

`web-html` is the controller for managed pure-HTML projects.
It owns project detection, task state, preview/release flow, and publish protocol.
It does not own visual implementation details unless the work is strictly metadata or release related.

## Use It For

- New or existing managed pure HTML projects
- Landing pages, event pages, docs pages, prototypes, email-like static deliverables
- Flows that need `.webdesign` metadata, preview confirmation, or publish packaging

## Do Not Use It For

- React, Vue, Astro, Vite, Next.js, SSR, SSG
- Generic frontend analysis without project orchestration
- Pure visual implementation work when no project-level flow is needed

## Context Budget

Keep this skill light.
Do not preload every reference file.
Read only the file needed for the current step:

| Need | Read |
|------|------|
| Long-running handoff or context budget | `skills/html-design/reference/context.md` |
| HTML build rules and artifacts | `skills/html-design/SKILL.md` |
| Release marker protocol details | local script output only; do not re-specify from memory |

## Ownership

### `web-html` owns

- Project detection
- New vs continue vs blocked routing
- `.webdesign` metadata and workflow state
- Preview / acceptance flow
- Packaging and publish script invocation
- Final publish marker handling

### `html-design` owns

- HTML / CSS / JS implementation
- Responsive behavior
- Asset layout under `dist/`
- Fixes after preview or CDP feedback

## Fast Path

Use the shortest valid route:

1. Detect project state
2. Collect only missing required inputs
3. Delegate page implementation only if the page itself changed
4. Verify only what changed
5. Publish only after explicit user confirmation

Gate names are internal state.
Do not narrate the full gate machine to the user unless debugging the workflow itself.

## Project Detection

Always detect state before build work.

### Commands

Detect by project id or explicit path:

```bash
node scripts/detect-project.js <project-id> [--project-path <path>]
```

Resolve an existing managed project by `projectUid`:

```bash
node scripts/resolve-project.js <project-id>
```

Create a new managed project:

```bash
node scripts/init-project.js <project-id> <page-slug> <intent> --name <english-name> [--summary <summary>]
```

Notes:

- `project-id` must be `PROJ` + 16 hex chars
- `--name` is required and must be lowercase kebab-case
- Deprecated flags are `--descript`, `--description`, and `--project-name`

### Detection Outcomes

- `NEW_PROJECT`: candidate directory does not exist
- `CONTINUE_MANAGED_PROJECT`: `.webdesign/project.json` and `.webdesign/manifest.json` both exist
- `BROKEN_MANAGED_PROJECT`: managed metadata is incomplete
- `UNMANAGED_EXISTING_PROJECT`: directory exists but is not under `web-html` management

For `BROKEN_MANAGED_PROJECT` and `UNMANAGED_EXISTING_PROJECT`, stop and report the block.
Do not auto-import or auto-repair.

## When To Call `html-design`

Call `html-design` only when the page output itself must change:

- New page build
- Layout, styling, content module, or interaction change
- Fixes after preview or browser validation

Do not call `html-design` for:

- Project detection
- Workflow / metadata updates
- Manifest rendering
- Packaging or publish-only actions

## Verification Flow

If page output changed, verify in this order:

1. `dist/index.html` exists
2. Open the built page with browser tooling / CDP when available
3. Check obvious console or asset failures
4. Ask the user to confirm preview before publish

Keep the user message short:

```text
页面已生成并通过验收。预览：<url>
确认发布，还是需要调整？
```

Do not dump internal gates, module inventories, or implementation detail in that prompt.

## Release Rules

Advance workflow only through the script:

```bash
node scripts/advance-gate.js <workflow.json-path> <target-gate> [--reason <text>] [--unblock]
```

Publish only through the script:

```bash
node scripts/publish.js <project-path> <task-id>
```

Hard rules:

- Do not handcraft publish results
- Do not rewrite or "fix" a publish marker
- If the publish script returns a marker, output it alone in its own response
- Do not append explanations in the same response as the marker

## User-Facing Output

Default output should be short and operational:

- Current project state
- What changed
- Preview URL or path
- Whether user confirmation is needed
- Final publish result

## Setup

For environment setup or missing dependency skills, read [install.md](./install.md).
