#!/usr/bin/env node
// Post-build: make the CLI entry executable for local runs.
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
console.log('build ok:', bin);
