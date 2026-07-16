# html-design Subagent Delegation Design

## Goal

Route every `html-design` page implementation through a subagent. The main `web-html` session remains the workflow controller, while the subagent performs the actual pure HTML/CSS/JS build work in `dist/`.

## Current State

`web-html` owns project detection, task recovery, workflow gates, preview confirmation, packaging, and publish-marker output. `html-design` owns page implementation, responsive behavior, assets under `dist/`, and preview-driven fixes.

The current docs describe subagent delegation as a complex-task option. The desired behavior is stricter: any page output change that would invoke `html-design` must instead delegate the build to a subagent.

## Responsibilities

### Main Session

The main session remains responsible for:

- detecting or resuming managed projects
- reading task context and workflow state
- deciding whether page output must change
- generating the subagent task payload
- spawning and supervising the subagent
- checking that `dist/index.html` exists after build
- advancing workflow gates in the legal order
- opening the preview through browser/CDP
- asking the user for preview confirmation
- invoking publish and outputting the publish marker

The main session must not rely on the subagent to advance workflow state or publish.

### Subagent

The subagent is responsible for:

- reading `skills/html-design/SKILL.md`
- reading only the required reference files
- reading task context files supplied in the prompt
- creating or modifying `dist/index.html` and related assets
- checking desktop and mobile responsive behavior where tooling is available
- returning a concise build summary to the main session

The subagent must not:

- modify `workflow.json`
- modify `.webdesign/project.json`
- ask the user for confirmation
- invoke publish
- output the publish marker
- introduce React, Vue, Svelte, SSR, SSG, or build-tool assumptions

## Script

Add `scripts/build-subagent.js`.

Usage:

```bash
node scripts/build-subagent.js <project-path> <task-id>
```

The script validates:

- `<project-path>/.webdesign/project.json`
- `<project-path>/.webdesign/tasks/<task-id>/workflow.json`
- `<project-path>/.webdesign/tasks/<task-id>/01_intake.json`
- optional context files such as `02_project_state.json` and `context-save.json`

The script emits a JSON payload suitable for `sessions_spawn`:

```json
{
  "label": "web-html-build-<task-id>",
  "runTimeoutSeconds": 180,
  "task": "..."
}
```

The payload task text includes:

- project path
- task id
- current gate
- relevant context file paths
- required skill path
- output expectations
- explicit subagent prohibitions

The script only creates the delegation payload. It does not invoke subagent tooling itself.

## Workflow

For any page output change:

1. Main session detects or resumes the managed project.
2. Main session restores task context.
3. Main session runs `node scripts/build-subagent.js <project-path> <task-id>`.
4. Main session spawns a subagent with the generated payload.
5. Subagent builds `dist/index.html` and assets.
6. Main session verifies `dist/index.html` exists.
7. Main session advances workflow gates in legal order.
8. Main session opens the page through browser/CDP and performs acceptance checks.
9. Main session asks the user whether to publish or adjust.
10. User confirmation triggers publish-marker output through the existing publish script.

If the current gate is `G4_DESIGN_COMPLETED`, the main session must still advance through `G5_CDN_VALIDATED` before `G6_DIST_ASSEMBLED`. It must not jump directly from `G4` to `G6`.

## Documentation Changes

Update root `SKILL.md` so references to invoking `html-design` become subagent delegation. The policy should say that all page implementation work is delegated, not only complex work.

Update `skills/html-design/SKILL.md` so it describes the skill as the implementation contract for a subagent. Keep the existing build rules and guardrails, and add explicit subagent input/output expectations.

## Test Plan

Add tests for `scripts/build-subagent.js` covering:

- missing arguments fail with usage
- missing project metadata fails
- missing task directory fails
- valid managed task emits parseable JSON
- emitted payload includes project path, task id, current gate, `html-design` skill path, `dist/index.html`, and workflow prohibitions

Run the existing Node test suite after implementation.
