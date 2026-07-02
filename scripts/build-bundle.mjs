#!/usr/bin/env node
// scripts/build-bundle.mjs
//
// Assembles the "bundle" submodule from the backend / frontend / cli submodules.
// Zero npm-deps — only Node.js built-ins.  Works on Windows / macOS / Linux
// and in CI.
//
// Usage:
//   node scripts/build-bundle.mjs           # assemble + commit (local only)
//   node scripts/build-bundle.mjs --push    # assemble + commit + push

import { spawnSync }                                            from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname }                               from 'node:path';
import { fileURLToPath }                                        from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const PUSH      = process.argv.includes('--push');
const WIN       = process.platform === 'win32';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Run a command, inheriting stdio.  Exits the process on non-zero status. */
function run(cmd, args = [], { cwd = ROOT, failOk = false } = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio  : 'inherit',
    shell  : WIN,          // needed on Windows for .cmd wrappers
    env    : process.env,
  });
  if (!failOk && r.status !== 0) {
    console.error(`\n✗  Command failed (exit ${r.status}): ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
  return r.status ?? 0;
}

/** Run a command and capture its stdout+stderr.  Never throws. */
function capture(cmd, args = [], { cwd = ROOT } = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio   : ['ignore', 'pipe', 'pipe'],
    shell   : WIN,
    encoding: 'utf8',
    env     : process.env,
  });
  return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', status: r.status ?? 1 };
}

/** Write a file and print a short confirmation line. */
function write(filePath, content) {
  writeFileSync(filePath, content, 'utf8');
  console.log(`  wrote  ${filePath.slice(ROOT.length + 1).replace(/\\/g, '/')}`);
}

// ── Step 1 — pull source submodules to their branch tips ─────────────────────

console.log('\n── 1/6  update source submodules ──────────────────────────────────────────');
run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);

// ── Step 2 — build frontend ───────────────────────────────────────────────────

const FRONTEND       = join(ROOT, 'frontend');
const FRONTEND_DIST  = join(FRONTEND, 'dist', 'snip-frontend', 'browser');
const FRONTEND_INDEX = join(FRONTEND_DIST, 'index.html');

console.log('\n── 2/6  build frontend ─────────────────────────────────────────────────────');
run('npm', ['install'], { cwd: FRONTEND });
run('npm', ['run', 'build'], { cwd: FRONTEND });

if (!existsSync(FRONTEND_INDEX)) {
  console.error(`\n✗  Build finished but ${FRONTEND_INDEX} is missing — aborting.`);
  process.exit(1);
}
console.log('  ✓  frontend/dist/snip-frontend/browser/index.html confirmed');

// ── Step 3 — assemble bundle/ ─────────────────────────────────────────────────

const BUNDLE = join(ROOT, 'bundle');
const PUBLIC = join(BUNDLE, 'public');

console.log('\n── 3/6  assemble bundle/ ───────────────────────────────────────────────────');

// Submodule checkouts are detached; switch to the tracked branch so we can commit.
run('git', ['checkout', 'bundle'], { cwd: BUNDLE });

// Wipe and recreate public/ so stale files are removed.
if (existsSync(PUBLIC)) rmSync(PUBLIC, { recursive: true, force: true });
mkdirSync(PUBLIC, { recursive: true });

// Copy source files as-is.
cpSync(join(ROOT, 'backend', 'server.js'), join(BUNDLE, 'server.js'));
console.log('  copied backend/server.js → bundle/server.js');

cpSync(join(ROOT, 'cli', 'cli.js'), join(BUNDLE, 'cli.js'));
console.log('  copied cli/cli.js → bundle/cli.js');

// Copy the entire browser build output into public/.
cpSync(FRONTEND_DIST, PUBLIC, { recursive: true });
console.log('  copied frontend dist → bundle/public/');

// .env — Bun auto-loads this; PUBLIC_DIR switches the server into UI-serve mode.
write(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n');

// package.json — NO "type" field so cli.js (CommonJS) runs under plain node.
write(join(BUNDLE, 'package.json'), JSON.stringify(
  { name: 'snip-bundle', version: '1.0.0', scripts: { start: 'bun server.js' } },
  null, 2) + '\n',
);

// Dockerfile.
write(join(BUNDLE, 'Dockerfile'), [
  'FROM oven/bun:1-alpine',
  'WORKDIR /app',
  'COPY . .',
  'ENV PORT=3000',
  'EXPOSE 3000',
  'CMD ["bun", "server.js"]',
  '',
].join('\n'));

// .dockerignore.
write(join(BUNDLE, '.dockerignore'), [
  'node_modules',
  '.git',
  '*.md',
  '',
].join('\n'));

// railway.json — tells Railway to use the Dockerfile builder.
write(join(BUNDLE, 'railway.json'), JSON.stringify({
  $schema: 'https://railway.app/railway.schema.json',
  build  : { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
  deploy : { numReplicas: 1 },
}, null, 2) + '\n');

// ── Step 4 — commit inside bundle/ (no-op when nothing changed) ──────────────

console.log('\n── 4/6  commit bundle/ ─────────────────────────────────────────────────────');
run('git', ['add', '-A'], { cwd: BUNDLE });

if (capture('git', ['diff', '--cached', '--quiet'], { cwd: BUNDLE }).status === 0) {
  console.log('  nothing to commit in bundle/ — skipping');
} else {
  // Use the backend commit sha as a build provenance tag.
  const backendSha = capture(
    'git', ['rev-parse', '--short', 'HEAD'], { cwd: join(ROOT, 'backend') },
  ).stdout.trim();
  run('git', ['commit', '-m', `build: assemble bundle (backend@${backendSha})`], { cwd: BUNDLE });
  console.log('  ✓  committed bundle/');
}

// ── Step 5 — bump superproject submodule pointer (no-op when nothing changed) ─

console.log('\n── 5/6  bump superproject pointer ──────────────────────────────────────────');
run('git', ['add', 'bundle'], { cwd: ROOT });

if (capture('git', ['diff', '--cached', '--quiet'], { cwd: ROOT }).status === 0) {
  console.log('  nothing to commit in superproject — skipping');
} else {
  run('git', ['commit', '-m', 'build: bump bundle submodule pointer'], { cwd: ROOT });
  console.log('  ✓  committed superproject');
}

// ── Step 6 — push (only with --push) ─────────────────────────────────────────

if (PUSH) {
  console.log('\n── 6/6  push ───────────────────────────────────────────────────────────────');
  // Submodule HEAD may be detached; push explicitly to the remote branch.
  run('git', ['push', 'origin', 'HEAD:bundle'], { cwd: BUNDLE });
  console.log('  ✓  pushed bundle branch');
  run('git', ['push', 'origin', 'main'], { cwd: ROOT });
  console.log('  ✓  pushed main');
} else {
  console.log('\n── 6/6  skipped — re-run with --push to publish ────────────────────────────');
}

console.log('\n✓  build-bundle complete.\n');
