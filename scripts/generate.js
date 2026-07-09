#!/usr/bin/env node

/**
 * CLI entry point for chunk-based page generation.
 *
 * Usage:
 *   node scripts/generate.js next <projectRoot> <projectId>   — print next chunk prompt
 *   node scripts/generate.js done <projectRoot> <projectId> <chunkId>  — mark chunk completed
 *   node scripts/generate.js status <projectRoot> <projectId>  — show progress
 *   node scripts/generate.js plan <projectRoot> <projectId>    — print full remaining plan
 */

const { buildPlan, markChunkDone, loadProgress, printNextChunk } = require('./lib/orchestrator');

const [command, projectRoot, projectId, chunkId] = process.argv.slice(2);

if (!command || !projectRoot || !projectId) {
  console.error('Usage: generate.js <next|done|status|plan> <projectRoot> <projectId> [chunkId]');
  process.exit(1);
}

switch (command) {
  case 'next':
    printNextChunk(projectRoot, projectId);
    break;

  case 'done':
    if (!chunkId) {
      console.error('Usage: generate.js done <projectRoot> <projectId> <chunkId>');
      process.exit(1);
    }
    markChunkDone(projectRoot, projectId, chunkId);
    console.log(`[DONE] Chunk "${chunkId}" marked complete.`);
    break;

  case 'status': {
    const progress = loadProgress(projectRoot, projectId);
    console.log(JSON.stringify(progress, null, 2));
    break;
  }

  case 'plan': {
    const { plan, pendingChunks, totalChunks } = buildPlan(projectRoot, projectId);
    console.log(`Remaining: ${pendingChunks}/${totalChunks} chunks`);
    plan.forEach((p, i) => console.log(`  ${i + 1}. [${p.chunk.id}] ${p.chunk.name} → ${p.chunk.targetFile}`));
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
