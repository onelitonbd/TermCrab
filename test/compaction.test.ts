import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SessionStore } from '../src/agent/sessions.js';
import { MemoryStore } from '../src/agent/memory.js';

function tmpHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-compact-'));
  process.env.TCRAB_HOME = dir;
  return dir;
}

test('compaction: past the threshold a digest is written and only the hot window shrinks', () => {
  const home = tmpHome();
  const sessions = new SessionStore();
  const sessionId = 'test:compact';

  // Append 100 entries (threshold is 60)
  for (let i = 0; i < 100; i++) {
    sessions.append(sessionId, { role: 'user', content: `message ${i}`, ts: Date.now() });
  }

  const before = sessions.list().find((s) => s.id === sessionId);
  assert.ok(before);
  assert.ok(before.messages > 60, `expected > 60 messages, got ${before.messages}`);

  // Compact to 60
  const digest = sessions.compact(sessionId, 60);
  assert.ok(digest.length > 0, 'digest should not be empty');
  assert.ok(digest.includes('User:'), 'digest should contain user messages');

  // Batch 7: compaction may not delete history. The conversation total is
  // unchanged; what shrinks is the hot window that goes to the model.
  const after = sessions.list().find((s) => s.id === sessionId);
  assert.ok(after);
  assert.equal(after.messages, 100, 'no entry may be deleted by compaction');
  assert.ok(after.hot <= 70, `expected <= 70 hot entries after compact, got ${after.hot}`);
  assert.ok(after.archived >= 30, `expected the overflow archived, got ${after.archived}`);
  assert.equal(sessions.read(sessionId).length, 100, 'read() still returns the whole conversation');

  // Digest file should exist
  const compactedDir = path.join(home, 'memory', 'compacted');
  assert.ok(fs.existsSync(compactedDir), 'compacted dir should exist');
  const digestFile = path.join(compactedDir, `${sessionId}.md`);
  assert.ok(fs.existsSync(digestFile), 'digest file should exist');

  // Cleanup
  fs.rmSync(home, { recursive: true, force: true });
});

test('compaction: session under threshold is not compacted', () => {
  const home = tmpHome();
  const sessions = new SessionStore();
  const sessionId = 'test:nocompact';

  for (let i = 0; i < 30; i++) {
    sessions.append(sessionId, { role: 'user', content: `message ${i}`, ts: Date.now() });
  }

  const digest = sessions.compact(sessionId, 60);
  assert.equal(digest, '', 'should return empty string when under threshold');

  fs.rmSync(home, { recursive: true, force: true });
});

test('compaction: compacted digests are searchable via memory search', async () => {
  const home = tmpHome();
  const sessions = new SessionStore();
  const memory = new MemoryStore();
  const sessionId = 'test:search';

  for (let i = 0; i < 100; i++) {
    sessions.append(sessionId, { role: 'user', content: `unique word ${i} here`, ts: Date.now() });
  }

  sessions.compact(sessionId, 60);

  // Search should find content from compacted digest
  const hits = await memory.search('unique word 5');
  assert.ok(hits.length > 0, 'should find hits in compacted digest');

  fs.rmSync(home, { recursive: true, force: true });
});
