---
name: html-design
description: Use when a managed `web-html` project needs pure HTML/CSS/JS page work such as new page creation, layout changes, responsive fixes, visual refinement, asset assembly, or preview-driven bugfixes. Escalate to `design-taste-frontend` only for net-new visual direction, major redesign, or when the user explicitly wants stronger design exploration.
---

# html-design

`html-design` is the implementation layer for `web-html`.
It ships pure HTML, CSS, and JS deliverables under `dist/`.
Keep the default path lean: small and medium page changes should be handled directly here without automatically loading heavier design skills.

## Default Path

Use direct HTML/CSS/JS implementation when the task is any of:

- Small or medium edits to an existing page
- Responsive fixes
- Copy, spacing, visual polish, or interaction fixes
- Asset assembly and `dist/` cleanup
- Browser-validation follow-up fixes

## Escalation Path

Call `design-taste-frontend` only when at least one is true:

- Net-new visual direction is needed
- The user explicitly asks for bolder design exploration
- The task is a major redesign rather than a bounded page edit

If the work is mostly orchestration, metadata, or release, stay in `web-html` and do not invoke this skill.

## Input Contract

Expect these fields from `web-html` before building:

- `projectMode`
- `projectRoot`
- `projectUid`
- page goal
- content modules
- visual direction
- responsive requirement
- interaction requirement
- resource limits
- output directory
- whether proxy routes are needed

If a required field is missing and it changes implementation decisions, ask `web-html` to fill the gap instead of inventing it.

## Output Contract

Minimum delivery:

- `dist/index.html`
- assets referenced by the page
- a short note of any external dependency used
- `proxy.routes` when required, otherwise an empty array
- known limitations if something is intentionally deferred

## Build Flow

1. Validate the input contract
2. Choose the lean path or escalation path
3. Build or patch the page under `dist/`
4. Check responsive behavior for H5 and PC
5. Return concise implementation notes back to `web-html`

## Reference Loading

Read references only when needed:

| Need | Read |
|------|------|
| Responsive baseline | [reference/responsive-ui.md](./reference/responsive-ui.md) |
| Design parameter calibration | [reference/design-params.md](./reference/design-params.md) |
| HTML / CSS / JS coding guardrails | [reference/code-standards.md](./reference/code-standards.md) |
| Artifact layout and packaging expectations | [reference/artifacts.md](./reference/artifacts.md) |
| External CDN lookup | [reference/cdn.md](./reference/cdn.md) |
| Proxy route shape | [reference/proxy.md](./reference/proxy.md) |
| Acceptance repair loop | [reference/acceptance.md](./reference/acceptance.md) |
| Long task handoff / context budget | [reference/context.md](./reference/context.md) |

Do not read all references up front.

## Guardrails

- Stay in pure HTML / CSS / JS
- Do not introduce React, Vue, Svelte, or build-tool assumptions
- Do not modify `.webdesign/project.json` or workflow state directly
- Do not emit a publish marker
- Do not inline large datasets into HTML when an external data file is more appropriate
- Do not assume HTTP hosting if the deliverable is expected to work from `file://`

## Completion Notes Back To `web-html`

Return only what the controller needs:

- what changed
- where the output lives
- any notable limitation
- whether proxy routes are required
- whether preview / browser validation should focus on a specific area
