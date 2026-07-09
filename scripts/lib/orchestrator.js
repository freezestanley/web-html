const fs = require('fs');
const path = require('path');
const { loadState: loadThrottleState, formatProgress } = require('./throttle-guard');

/**
 * Standard chunk plan for a single-page HTML project.
 * Each chunk is self-contained: prompt carries context summary, not full history.
 * Estimated output ≤100 lines per chunk to keep single LLM call <15s.
 */
const DEFAULT_CHUNKS = [
  {
    id: 'skeleton',
    name: 'HTML skeleton + head',
    targetFile: 'dist/index.html',
    mode: 'write',
    maxLines: 80,
    promptHint: 'Generate only <!DOCTYPE>, <head> (meta, title, CDN links), and empty <body> with semantic section placeholders. No content yet.',
  },
  {
    id: 'base-css',
    name: 'CSS tokens + base styles',
    targetFile: 'dist/assets/css/base.css',
    mode: 'write',
    maxLines: 120,
    promptHint: 'Generate CSS custom properties (colors, spacing, typography), reset, and base element styles only. No component styles.',
  },
  {
    id: 'hero',
    name: 'Hero / header section',
    targetFile: 'dist/index.html',
    mode: 'append',
    maxLines: 80,
    promptHint: 'Fill the hero/header placeholder with content. Reference base.css tokens. Do not touch other sections.',
  },
  {
    id: 'content',
    name: 'Core content area',
    targetFile: 'dist/index.html',
    mode: 'append',
    maxLines: 100,
    promptHint: 'Fill the main content placeholder (data table, cards, or primary module). Reference base.css tokens.',
  },
  {
    id: 'chart',
    name: 'Chart / visualization',
    targetFile: 'dist/index.html',
    mode: 'append',
    maxLines: 80,
    promptHint: 'Add chart container + Chart.js init script. Data should be inline or fetched from assets/data/. Skip if no chart needed.',
  },
  {
    id: 'footer',
    name: 'Footer + closing tags',
    targetFile: 'dist/index.html',
    mode: 'append',
    maxLines: 40,
    promptHint: 'Fill footer placeholder and close </body></html>. Minimal, no new styles.',
  },
  {
    id: 'finalize',
    name: 'App JS + resource wiring',
    targetFile: 'dist/assets/js/app.js',
    mode: 'write',
    maxLines: 100,
    promptHint: 'Generate interaction logic (sort, filter, animations). Wire into existing DOM. Add <script> tag to index.html if missing.',
  },
];

function progressPath(projectRoot, projectId) {
  return path.join(projectRoot, '.webdesign', 'tasks', projectId, 'progress.json');
}

function loadProgress(projectRoot, projectId) {
  const file = progressPath(projectRoot, projectId);
  if (!fs.existsSync(file)) return { completedChunks: [], startedAt: null };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { completedChunks: [], startedAt: null };
  }
}

function saveProgress(projectRoot, projectId, progress) {
  const file = progressPath(projectRoot, projectId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(progress, null, 2));
}

/**
 * Build an executable chunk plan for the given project.
 * Skips already-completed chunks (resume support).
 * Returns array of { chunk, prompt, progressLine }.
 */
function buildPlan(projectRoot, projectId, options = {}) {
  const chunks = options.chunks || DEFAULT_CHUNKS;
  const progress = loadProgress(projectRoot, projectId);
  const throttleState = loadThrottleState(projectRoot, projectId);
  const completed = new Set(progress.completedChunks);

  const plan = [];
  let pendingIndex = 0;
  const pendingTotal = chunks.filter(c => !completed.has(c.id)).length;

  for (const chunk of chunks) {
    if (completed.has(chunk.id)) continue;
    pendingIndex += 1;
    const percent = Math.round((pendingIndex / pendingTotal) * 100);
    const progressLine = formatProgress({
      current: pendingIndex,
      total: pendingTotal,
      module: chunk.name,
      percent,
      throttleInfo: throttleState.degradedMode ? { retriesLeft: 3, cooldownMs: throttleState.currentCooldownMs } : undefined,
    });

    const prompt = [
      `## Chunk: ${chunk.name} (${chunk.id})`,
      `Target: ${chunk.targetFile} (${chunk.mode})`,
      `Max output: ${chunk.maxLines} lines`,
      '',
      chunk.promptHint,
      '',
      '### Constraints',
      '- Output ONLY the code for this chunk, no explanations',
      `- This is chunk ${pendingIndex}/${pendingTotal}; previous chunks are already on disk`,
      '- Reference existing files by path, do not regenerate them',
      `- After outputting code, print exactly: ${progressLine}`,
      '- If blocked, print [BLOCKED] <reason> instead of code',
    ].join('\n');

    plan.push({ chunk, prompt, progressLine });
  }

  return { plan, progress, totalChunks: chunks.length, pendingChunks: pendingTotal };
}

/**
 * Mark a chunk as completed. Call after LLM output has been written to disk.
 */
function markChunkDone(projectRoot, projectId, chunkId) {
  const progress = loadProgress(projectRoot, projectId);
  if (!progress.startedAt) progress.startedAt = new Date().toISOString();
  if (!progress.completedChunks.includes(chunkId)) {
    progress.completedChunks.push(chunkId);
  }
  progress.lastChunkCompletedAt = new Date().toISOString();
  saveProgress(projectRoot, projectId, progress);
  return progress;
}

/**
 * Print the next chunk prompt to stdout for Claude Code to execute.
 * Usage: node orchestrator.js next <projectRoot> <projectId>
 */
function printNextChunk(projectRoot, projectId) {
  const { plan } = buildPlan(projectRoot, projectId);
  if (plan.length === 0) {
    console.log('[DONE] All chunks completed.');
    return null;
  }
  const next = plan[0];
  console.log(next.prompt);
  return next;
}

module.exports = {
  DEFAULT_CHUNKS,
  buildPlan,
  markChunkDone,
  loadProgress,
  saveProgress,
  printNextChunk,
};
