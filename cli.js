#!/usr/bin/env node
'use strict';

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');
const [, , cmd, arg] = process.argv;

const USAGE = `\
Usage:
  snip add <url>    shorten a URL and print the short link
  snip ls           list all short links
  snip open <code>  open a short link in your browser
  snip help         show this help

Config:
  SNIP_API  backend base URL (default: http://localhost:3000)
`;

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

// ── add ───────────────────────────────────────────────────────────────────────
async function add(url) {
  if (!url) die('Usage: snip add <url>');

  let res;
  try {
    res = await fetch(`${BASE}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch (e) {
    die(`Cannot reach backend at ${BASE}: ${e.message}`);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) die(`Error ${res.status}: ${body.error || res.statusText}`);

  console.log(body.shortUrl);
}

// ── ls ────────────────────────────────────────────────────────────────────────
async function ls() {
  let res;
  try {
    res = await fetch(`${BASE}/api/links`);
  } catch (e) {
    die(`Cannot reach backend at ${BASE}: ${e.message}`);
  }

  if (!res.ok) die(`Error ${res.status}: ${res.statusText}`);

  const links = await res.json();
  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const cW = Math.max(4, ...links.map(l => l.code.length));
  const hW = Math.max(4, ...links.map(l => String(l.hits).length));

  console.log(`${'CODE'.padEnd(cW)}  ${'HITS'.padStart(hW)}  URL`);
  console.log(`${'-'.repeat(cW)}  ${'-'.repeat(hW)}  ---`);
  for (const l of links) {
    console.log(`${l.code.padEnd(cW)}  ${String(l.hits).padStart(hW)}  ${l.url}`);
  }
}

// ── open ──────────────────────────────────────────────────────────────────────
async function openCode(code) {
  if (!code) die('Usage: snip open <code>');

  let res;
  try {
    res = await fetch(`${BASE}/${code}`, { redirect: 'manual' });
  } catch (e) {
    die(`Cannot reach backend at ${BASE}: ${e.message}`);
  }

  if (res.status === 404) die(`Unknown code: ${code}`);
  if (res.status < 300 || res.status >= 400) die(`Unexpected response: ${res.status}`);

  const location = res.headers.get('location');
  if (!location) die(`No redirect location for code: ${code}`);

  const { spawnSync } = require('child_process');
  let bin, args;
  if (process.platform === 'win32') {
    bin = 'cmd.exe';
    args = ['/c', 'start', '', location];
  } else if (process.platform === 'darwin') {
    bin = 'open';
    args = [location];
  } else {
    bin = 'xdg-open';
    args = [location];
  }

  const result = spawnSync(bin, args, { stdio: 'inherit' });
  if (result.error) die(`Could not open browser: ${result.error.message}`);

  console.log(`Opening ${location}`);
}

// ── dispatch ──────────────────────────────────────────────────────────────────
(async () => {
  switch (cmd) {
    case 'add':       return add(arg);
    case 'ls':        return ls();
    case 'open':      return openCode(arg);
    case 'help':
    case undefined:
      process.stdout.write(USAGE);
      return;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n${USAGE}`);
      process.exit(1);
  }
})().catch(e => die(e.message));
