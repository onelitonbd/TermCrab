import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryStore } from '../src/agent/memory.js';

function mem(): { store: MemoryStore; root: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tmem-'));
  return { store: new MemoryStore(root), root };
}

test('remember stores fact and dedupes', () => {
  const { store } = mem();
  assert.match(store.remember('User prefers concise answers'), /Remembered/);
  assert.match(store.remember('user prefers concise answers'), /Already known/);
  assert.match(store.readHead(), /concise answers/);
});

test('daily log file is created and searchable', () => {
  const { store, root } = mem();
  store.remember('lives in Dhaka');
  store.logDaily('tested daily logging');
  const hits = store.search('daily logging');
  assert.ok(hits.length >= 1, 'daily line should be searchable');
  const dailyDir = path.join(root, 'daily');
  assert.ok(fs.existsSync(dailyDir));
  assert.ok(fs.readdirSync(dailyDir).some((f) => f.endsWith('.md')));
});

test('search ranks multi-term matches and ignores junk', () => {
  const { store } = mem();
  store.remember('project name: TermCrab, mobile first');
  store.remember('unrelated fact about cats');
  const hits = store.search('termcrab mobile');
  assert.ok(hits.length >= 1);
  assert.match(hits[0]!.line, /TermCrab/);
  assert.equal(store.search('').length, 0);
  assert.equal(store.search('zzz-not-present').length, 0);
});

test('readHead truncates long memory', () => {
  const { store } = mem();
  for (let i = 0; i < 200; i++) store.remember(`fact number ${i} with some padding text to make it longer`);
  const head = store.readHead(500);
  assert.ok(head.length <= 520, `head too long: ${head.length}`);
});

test('stats reports memory size', () => {
  const { store } = mem();
  store.remember('a fact');
  const s = store.stats();
  assert.ok(s.memoryBytes > 0);
  assert.ok(s.dailyFiles >= 1);
});
