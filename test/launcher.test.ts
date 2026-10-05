/**
 * A fresh checkout must be able to run TermCrab — and the docs must say how.
 *
 * This exists because of a real report: "I copied the branch, ran npm install,
 * and typing `termcrab` says command not found." Two true facts caused it —
 * `npm install` never builds (`dist/` is not tracked, and nothing links the
 * root package's `bin` into your PATH), and the quick start only showed
 * `node dist/src/bin/termcrab.js …`. So the fix is pinned here: the launcher
 * builds on first run, and both quick starts name it and `npm link`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = process.cwd();

test('the checkout ships a launcher that builds on first run', async () => {
  const launcher = path.join(root, 'termcrab');
  assert.ok(fs.existsSync(launcher), './termcrab is committed');
  assert.ok(fs.statSync(launcher).mode & 0o111, 'and it is executable');

  const text = fs.readFileSync(launcher, 'utf8');
  assert.match(text, /dist\/src\/bin\/termcrab\.js/, 'it runs the real CLI');
  assert.match(text, /npm run build/, 'and knows how to produce dist/ when it is missing');
  assert.match(text, /npm install/, 'and fetches the dev packages if node_modules is absent too');

  const { stdout } = await run(launcher, ['--version'], { cwd: root, encoding: 'utf8', timeout: 60_000 });
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { version: string };
  assert.match(stdout, new RegExp(`termcrab ${pkg.version.replace(/\./g, '\\.')}`), 'the launcher runs this checkout');
});

test('the docs answer "termcrab: command not found" before it is asked', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /\.\/termcrab/, 'the quick start uses the launcher');
  assert.match(readme, /npm link/, 'and names the way to get a bare command');
  assert.match(readme, /command not found/i, 'and calls out the trap explicitly');

  const termux = fs.readFileSync(path.join(root, 'docs/TERMUX.md'), 'utf8');
  assert.match(termux, /npm link/, 'the Termux guide names npm link');
  assert.match(termux, /\.\/termcrab/, 'and the launcher');

  const install = fs.readFileSync(path.join(root, 'install.sh'), 'utf8');
  assert.match(install, /TCRAB_BRANCH/, 'the installer still documents the branch override');
  assert.doesNotMatch(install, /v0\.34\.0/, 'with no stale version in its usage example');
});
