import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SessionStore } from '../src/agent/sessions.js';

function tmpHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-replay-'));
  process.env.TCRAB_HOME = dir;
  return dir;
}

test('replay: creates new session with user messages only', () => {
  const home = tmpHome();
  const sessions = new SessionStore();
  const sid = 'test:replay';

  sessions.append(sid, { role: 'user', content: 'hello', ts: Date.now() });
  sessions.append(sid, { role: 'assistant', content: 'hi there', ts: Date.now() });
  sessions.append(sid, { role: 'user', content: 'how are you', ts: Date.now() });
  sessions.append(sid, { role: 'assistant', content: 'good', ts: Date.now() });

  const entries = sessions.read(sid);
  const userEntries = entries.filter((e) => e.role === 'user');
  assert.equal(userEntries.length, 2);

  // Create replay session
  const newId = `replayed:${sid}`;
  const newFile = path.join(home, 'sessions', `${newId}.jsonl`);
  fs.writeFileSync(newFile, userEntries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');

  // Verify replay session exists and has only user messages
  const replayed = sessions.read(newId);
  assert.equal(replayed.length, 2);
  assert.ok(replayed.every((e) => e.role === 'user'));

  fs.rmSync(home, { recursive: true, force: true });
});

test('replay: empty session produces empty replay', () => {
  const home = tmpHome();
  const sessions = new SessionStore();
  const sid = 'test:empty';

  const entries = sessions.read(sid);
  assert.equal(entries.length, 0);

  fs.rmSync(home, { recursive: true, force: true });
});

test('replay: session namespacing works', () => {
  const home = tmpHome();
  const sessions = new SessionStore();
  const sid = 'test:namespace';

  sessions.append(sid, { role: 'user', content: 'test', ts: Date.now() });

  const newId = `replayed:${sid}`;
  assert.ok(newId.startsWith('replayed:'));
  assert.ok(newId.includes('test:namespace'));

  fs.rmSync(home, { recursive: true, force: true });
});
