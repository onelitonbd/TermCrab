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
import { recordArrival } from '../src/channels/inbox.js';
import { subagentsCommand, identityCommand } from '../src/gateway/chat-control.js';

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

test('54.2 + 54.3 the CLI inbox / extract / embeddings reach the same stores', async () => {
  const home = tmpHome('t54cli-');
  const env = { TCRAB_HOME: home };
  process.env.TCRAB_HOME = home; // recordArrival runs in this process — point it at the temp home

  // inbox: seed one arrival through the real module, read it back via the CLI.
  recordArrival({ name: 'note.txt', kind: 'document', bytes: 10, text: 'hello from the inbox' });
  const listed = await cliAsync(['inbox', '--json'], env);
  assert.equal(listed.code, 0, listed.stderr);
  const inboxJson = JSON.parse(listed.stdout.slice(listed.stdout.indexOf('{'))) as { data: { entries: { name: string }[] } };
  assert.ok(inboxJson.data.entries.some((e) => e.name === 'note.txt'), 'inbox lists the seeded arrival');
  const one = await cliAsync(['inbox', 'note.txt'], env);
  assert.equal(one.code, 0, one.stderr);
  assert.match(one.stdout, /hello from the inbox/);

  // extract: a plain text file reads back its text.
  const file = path.join(home, 'plain.txt');
  fs.writeFileSync(file, 'the crab likes rice');
  const ext = await cliAsync(['extract', file], env);
  assert.equal(ext.code, 0, ext.stderr || ext.stdout);
  assert.match(ext.stdout, /the crab likes rice/);

  // embeddings: `use` writes the same memory.embedProvider the panel picker writes.
  const use = await cliAsync(['embeddings', 'use', 'local'], env);
  assert.equal(use.code, 0, use.stderr || use.stdout);
  const cfg = JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8'));
  assert.equal(cfg.memory.embedProvider, 'local', 'the provider switch lands in config');
  const status = await cliAsync(['embeddings'], env);
  assert.equal(status.code, 0);
  assert.match(status.stdout, /local/);
});

test('54.4 the chat /subagents and /identity answer from the same data as the panel', async () => {
  const subs = subagentsCommand();
  assert.equal(subs.ok, true);
  assert.match(subs.text, /subagent/i);

  const id = identityCommand();
  assert.equal(id.ok, true);
  assert.match(id.text, /SOUL\.md/);
  assert.match(id.text, /IDENTITY\.md/);
  assert.match(id.text, /USER\.md/);
});

