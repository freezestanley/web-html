const fs = require('fs');
const path = require('path');

const DEFAULT_STATE = {
  consecutiveThrottles: 0,
  totalRetries: 0,
  currentCooldownMs: 1000,
  lastThrottleAt: null,
  degradedMode: false,
};

const MAX_RETRIES = 4;
const BASE_COOLDOWN_MS = 2000;
const MAX_COOLDOWN_MS = 60000;
const DEGRADED_COOLDOWN_MS = 3000;
const DEGRADE_THRESHOLD = 2;

function statePath(projectRoot, projectId) {
  return path.join(projectRoot, '.webdesign', 'tasks', projectId, 'throttle-state.json');
}

function loadState(projectRoot, projectId) {
  const file = statePath(projectRoot, projectId);
  if (!fs.existsSync(file)) {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...DEFAULT_STATE, ...raw };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(projectRoot, projectId, state) {
  const file = statePath(projectRoot, projectId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

function nextCooldown(consecutiveThrottles, degradedMode) {
  if (degradedMode) return DEGRADED_COOLDOWN_MS;
  const exp = BASE_COOLDOWN_MS * Math.pow(2, consecutiveThrottles - 1);
  return Math.min(exp, MAX_COOLDOWN_MS);
}

/**
 * Call when a throttle (429/529/rate-limit error) is detected.
 * Returns { shouldRetry, cooldownMs, degradedMode, retriesLeft }.
 */
function recordThrottle(projectRoot, projectId) {
  const state = loadState(projectRoot, projectId);
  state.consecutiveThrottles += 1;
  state.totalRetries += 1;
  state.lastThrottleAt = new Date().toISOString();
  state.degradedMode = state.consecutiveThrottles >= DEGRADE_THRESHOLD;
  state.currentCooldownMs = nextCooldown(state.consecutiveThrottles, state.degradedMode);
  saveState(projectRoot, projectId, state);

  const shouldRetry = state.totalRetries <= MAX_RETRIES;
  return {
    shouldRetry,
    cooldownMs: state.currentCooldownMs,
    degradedMode: state.degradedMode,
    retriesLeft: Math.max(0, MAX_RETRIES - state.totalRetries),
    state,
  };
}

/**
 * Call after a successful LLM response to reset consecutive throttle counter.
 */
function recordSuccess(projectRoot, projectId) {
  const state = loadState(projectRoot, projectId);
  state.consecutiveThrottles = 0;
  state.currentCooldownMs = BASE_COOLDOWN_MS;
  // keep totalRetries and degradedMode sticky until explicit reset
  saveState(projectRoot, projectId, state);
  return state;
}

/**
 * Reset all throttle state (e.g. user chose to simplify / switch model).
 */
function resetState(projectRoot, projectId) {
  saveState(projectRoot, projectId, { ...DEFAULT_STATE });
}

/**
 * Format progress line with optional throttle annotation.
 */
function formatProgress({ current, total, module, percent, throttleInfo }) {
  const base = `[PROGRESS] ${current}/${total} modules · ${module} · ${percent}%`;
  if (!throttleInfo || throttleInfo.retriesLeft === undefined) return base;
  const retryNote = `retry ${MAX_RETRIES - throttleInfo.retriesLeft}/${MAX_RETRIES}`;
  const cd = `cooldown ${throttleInfo.cooldownMs / 1000}s`;
  return `${base} (⚠️ throttled, ${retryNote}, ${cd})`;
}

module.exports = {
  loadState,
  saveState,
  recordThrottle,
  recordSuccess,
  resetState,
  formatProgress,
  MAX_RETRIES,
  BASE_COOLDOWN_MS,
  MAX_COOLDOWN_MS,
  DEGRADE_THRESHOLD,
};
