/**
 * tier3w — batch 54.1: the CLI reaches the same `config.watchers` store as the
 * chat `/watch` command and the panel's Tools card.
 *
 *   54.1 the CLI `watch add|list|rm` writes the shared watchers store, so a
 *        watcher added from the terminal is seen by the chat and the panel.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import test from 'node:test';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js');

function tmpHome(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cliAsync(
  args: string[],
  env: Record<string, string>,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      { cwd: ROOT, env: { ...process.env, NO_COLOR: '1', ...env }, timeout: 30_000 },
      (err, stdout, stderr) => {
        resolve({
          code: err ? ((err as { code?: number }).code ?? 1) : 0,
          stdout: String(stdout),
          stderr: String(stderr),
        });
      },
    );
  });
}

function configOf(home: string): { watchers?: { id: string; path: string; match?: string }[] } {
  return JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8'));
}

test('54.1 the CLI watch verb writes the same config.watchers store', async () => {
  const home = tmpHome('t54w-');
  const env = { TCRAB_HOME: home };

  // Add from the CLI.
  const added = await cliAsync(['watch', 'add', path.join(home, 'notes'), '.md,.txt'], env);
  assert.equal(added.code, 0, added.stderr || added.stdout);
  const cfgAfterAdd = configOf(home);
  assert.equal(cfgAfterAdd.watchers?.length, 1, 'config.watchers must hold the new watcher');
  const w = cfgAfterAdd.watchers![0]!;
  assert.equal(w.path, path.join(home, 'notes'));
  assert.equal(w.match, '.md,.txt');
  assert.match(w.id, /^w[0-9a-z]+$/, 'the watcher gets an id');

  // List shows it.
  const listed = await cliAsync(['watch', 'list', '--json'], env);
  assert.equal(listed.code, 0, listed.stderr);
  const parsed = JSON.parse(listed.stdout.slice(listed.stdout.indexOf('{'))) as {
    data: { watchers: { id: string; path: string; match: string }[] };
  };
  assert.equal(parsed.data.watchers.length, 1);
  assert.equal(parsed.data.watchers[0]!.id, w.id);

  // Remove by id; the store is empty again.
  const removed = await cliAsync(['watch', 'rm', w.id], env);
  assert.equal(removed.code, 0, removed.stderr || removed.stdout);
  assert.equal(configOf(home).watchers?.length ?? 0, 0, 'removing clears the shared store');

  const empty = await cliAsync(['watch', 'list'], env);
  assert.equal(empty.code, 0);
  assert.match(empty.stdout, /no watchers/i);
});

test('54.1 usage errors are real, not silent', async () => {
  const home = tmpHome('t54w-');
  const env = { TCRAB_HOME: home };

  const noPath = await cliAsync(['watch', 'add'], env);
  assert.equal(noPath.code, 1, 'add without a path must fail');
  assert.match(noPath.stderr, /usage/i);

  const noId = await cliAsync(['watch', 'rm'], env);
  assert.equal(noId.code, 1, 'rm without an id must fail');

  const badId = await cliAsync(['watch', 'rm', 'nope'], env);
  assert.equal(badId.code, 1, 'rm of a missing id must fail');
  assert.match(badId.stderr, /no watcher with id nope/i);
});
