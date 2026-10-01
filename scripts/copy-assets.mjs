#!/usr/bin/env node
// Post-build: make the CLI entry executable + copy test fixtures.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = path.join(root, 'dist', 'src', 'bin', 'termcrab.js');
if (fs.existsSync(bin)) {
  try {
    fs.chmodSync(bin, 0o755);
  } catch {
    /* best effort (e.g. exotic FS) */
  }
}

// Copy test fixtures to dist/ so tests can find them
const fixturesSrc = path.join(root, 'test', 'fixtures');
const fixturesDst = path.join(root, 'dist', 'test', 'fixtures');
if (fs.existsSync(fixturesSrc)) {
  fs.mkdirSync(fixturesDst, { recursive: true });
  for (const f of fs.readdirSync(fixturesSrc)) {
    fs.copyFileSync(path.join(fixturesSrc, f), path.join(fixturesDst, f));
  }
}

console.log('build ok:', bin);
