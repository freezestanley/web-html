# Web HTML Orchestration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal script layer for `web-html` so the skill documentation maps to real project detection, project metadata, and publish-marker behavior.

**Architecture:** Mirror the proven `web-design/scripts` structure where it matters, but keep the first cut narrow: config loading, managed-project detection, project metadata helpers, and publish-marker protocol reuse. Avoid implementing full build or release orchestration until the controller contract is stable.

**Tech Stack:** Node.js, `node:test`, JSON config, filesystem-based project metadata

---

### Task 1: Scaffold the scripts workspace

**Files:**
- Create: `scripts/package.json`
- Create: `scripts/lib/load-config.js`

**Step 1: Write the failing test**

Create a test that loads `config.js` through `scripts/lib/load-config.js` and asserts `PROJECTS_DIR` and `WEBDESIGN_DIR` exist.

**Step 2: Run test to verify it fails**

Run: `node --test scripts/config.test.js`
Expected: FAIL because `load-config.js` does not exist yet.

**Step 3: Write minimal implementation**

Implement `load-config.js` by reading and parsing the root `config.js`.

**Step 4: Run test to verify it passes**

Run: `node --test scripts/config.test.js`
Expected: PASS

### Task 2: Add project metadata helpers

**Files:**
- Create: `scripts/lib/project-state.js`
- Create: `scripts/project-state.test.js`

**Step 1: Write the failing test**

Cover:
- `.webdesign/project.json` path resolution
- metadata round-trip read/write
- `projectUid` format
- `buildTaskId()` timestamp formatting

**Step 2: Run test to verify it fails**

Run: `node --test scripts/project-state.test.js`
Expected: FAIL because helper module is missing.

**Step 3: Write minimal implementation**

Add helpers for project meta path, read/write, `generateProjectUid()`, and `buildTaskId()`.

**Step 4: Run test to verify it passes**

Run: `node --test scripts/project-state.test.js`
Expected: PASS

### Task 3: Add managed-project detection

**Files:**
- Create: `scripts/lib/project-index.js`
- Create: `scripts/lib/project-detection.js`
- Create: `scripts/project-detection.test.js`
- Create: `scripts/resolve-project.js`
- Create: `scripts/resolve-project.test.js`

**Step 1: Write the failing test**

Cover:
- `NEW_PROJECT` when the candidate directory does not exist
- `CONTINUE_MANAGED_PROJECT` when `.webdesign/project.json` and `.webdesign/manifest.json` both exist
- `BROKEN_MANAGED_PROJECT` when only one managed file exists
- `UNMANAGED_EXISTING_PROJECT` when the directory exists without `.webdesign`
- `resolve-project.js` resolving a managed project by name under `PROJECTS_DIR`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/project-detection.test.js scripts/resolve-project.test.js`
Expected: FAIL because detection code does not exist yet.

**Step 3: Write minimal implementation**

Implement project listing, candidate-path resolution, and structured project mode detection.

**Step 4: Run test to verify it passes**

Run: `node --test scripts/project-detection.test.js scripts/resolve-project.test.js`
Expected: PASS

### Task 4: Reuse publish marker protocol

**Files:**
- Create: `scripts/lib/publish-marker.js`
- Create: `scripts/publish-marker.test.js`
- Create: `scripts/package.json`

**Step 1: Write the failing test**

Cover:
- marker format starts with required header and ends with footer
- marker contains immutable `]:[` delimiter
- payload can be validated

**Step 2: Run test to verify it fails**

Run: `node --test scripts/publish-marker.test.js`
Expected: FAIL because the module does not exist yet.

**Step 3: Write minimal implementation**

Reuse the existing `web-design` publish marker protocol to avoid drift.

**Step 4: Run test to verify it passes**

Run: `node --test scripts/publish-marker.test.js`
Expected: PASS

### Task 5: Verify the full first-cut script suite

**Files:**
- Verify: `scripts/*.test.js`

**Step 1: Run the full test suite**

Run: `node --test scripts/*.test.js`
Expected: PASS

**Step 2: Review outputs against the documented skill contract**

Check that:
- project modes match the documented four-way split
- `projectUid` format matches `web-design`
- managed project detection uses `config.js`
- publish marker protocol is not reimplemented differently

**Step 3: Commit**

```bash
git add docs/plans/2026-07-08-web-html-orchestration-implementation.md scripts
git commit -m "feat: add web-html orchestration scripts"
```
