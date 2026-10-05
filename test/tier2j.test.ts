import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SessionStore, type Entry } from '../src/agent/sessions.js';
import { searchSessions, snippet, terms } from '../src/agent/session-search.js';
import { applyReset, describePolicy, parseResetPolicy, shouldReset } from '../src/agent/session-policy.js';
import { sessionView, policyLine } from '../src/agent/session-view.js';
import { MemoryStore } from '../src/agent/memory.js';

/**
 * Batch 21 — sessions you can lose a phone mid-turn with.
 *
 * 21.1 durable transcripts · 21.2 search over chats · 21.3 reset policies ·
 * 21.4 what belongs to a conversation.
 */

function home(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t21-${tag}-`));
  process.env.TCRAB_HOME = dir;
  return dir;
}

const user = (content: string, ts: number): Entry => ({ role: 'user', content, ts });
const crab = (content: string, ts: number): Entry => ({ role: 'assistant', content, ts });
const tool = (name: string, result: string, ts: number): Entry => ({
  role: 'tool',
  toolCallId: `c${ts}`,
  name,
  result,
  ts,
});

// ---------------------------------------------------------------------------
// 21.1 — durable, honest transcripts
// ---------------------------------------------------------------------------

test('21.1 an append is on disk, complete and parseable, before it returns', () => {
  home('durable');
  const store = new SessionStore();
  for (let i = 0; i < 25; i++) {
    store.append('t:durable', user(`message number ${i}`, 1_700_000_000_000 + i * 1000));
  }
  const raw = fs.readFileSync(store.transcriptFile('t:durable'), 'utf8');
  assert.equal(raw.endsWith('\n'), true, 'every line is terminated');
  assert.equal(raw.split('\n').filter(Boolean).length, 25, 'all 25 lines are immediately readable');
  assert.equal(store.readDetailed('t:durable').badLines.length, 0);
  // durable:false is the documented escape hatch for bulk writes
  store.append('t:durable', crab('bulk', 1_700_000_100_000), { durable: false });
  assert.equal(store.read('t:durable').length, 26);
});

test('21.1 a torn tail is healed by the next append, and reported as a torn tail', () => {
  home('torn');
  const store = new SessionStore();
  store.append('t:torn', user('first', 1_700_000_000_000));
  const file = store.transcriptFile('t:torn');
  // Simulate the exact damage a kill mid-write leaves: a half JSON line.
  fs.appendFileSync(file, '{"role":"user","content":"half a th', 'utf8');

  const damaged = store.readDetailed('t:torn');
  assert.equal(damaged.badLines.length, 1, 'the torn line is reported, not silently skipped');
  assert.equal(damaged.badLines[0]!.why, 'torn tail (crash mid-write)');
  assert.equal(damaged.entries.length, 1, 'the good line still loads');

  store.append('t:torn', crab('second', 1_700_000_100_000));
  const healed = store.readDetailed('t:torn');
  assert.equal(healed.badLines.length, 0, 'the next append cut the half line');
  assert.deepEqual(healed.entries.map((e) => e.role), ['user', 'assistant']);
  assert.equal(fs.readFileSync(file, 'utf8').endsWith('\n'), true);
  assert.equal(store.read('t:torn').length, 2);
});

test('21.1 a damaged middle line is reported but never rewritten', () => {
  home('middle');
  const store = new SessionStore();
  store.append('t:mid', user('alpha', 1_700_000_000_000));
  store.append('t:mid', crab('bravo', 1_700_000_001_000));
  const file = store.transcriptFile('t:mid');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines[0] = '{"role":"user","content":"al'; // damage in the middle of the file
  fs.writeFileSync(file, lines.join('\n'), 'utf8');

  const detail = store.readDetailed('t:mid');
  assert.equal(detail.badLines.length, 1);
  assert.equal(detail.badLines[0]!.line, 1);
  assert.equal(detail.badLines[0]!.why, 'unreadable line', 'only a tail is called a crash; anything else is investigated');

  const report = store.verifyAll({ repair: true });
  assert.equal(report.badLines, 1, 'repair does not silently drop a middle line');
  assert.equal(report.sessionsWithDamage, 1);
});

test('21.1 verifyAll walks every transcript and says what it found', () => {
  home('verify');
  const store = new SessionStore();
  store.append('a:one', user('hello', 1_700_000_000_000));
  store.append('b:two', user('world', 1_700_000_001_000));
  fs.appendFileSync(store.transcriptFile('b:two'), '{"role":"assist', 'utf8');

  const before = store.verifyAll();
  assert.equal(before.sessions.length, 2);
  assert.equal(before.badLines, 1, 'one torn tail across both transcripts');
  assert.ok(before.bytes > 0);
  const bRow = before.sessions.find((s) => s.id === 'b:two')!;
  assert.equal(bRow.badLines, 1);

  const after = store.verifyAll({ repair: true });
  assert.equal(after.badLines, 0, 'repair cut the torn tail');
  assert.ok(after.repaired > 0, 'and said how much it cut');
  assert.ok(before.sessions.find((s) => s.id === 'a:one')!.badLines === 0);
});

// ---------------------------------------------------------------------------
// 21.2 — search across conversations
// ---------------------------------------------------------------------------

test('21.2 search ranks by relevance, not by "did I type this string"', () => {
  home('search');
  const store = new SessionStore();
  const t0 = Date.now();
  store.append('chat:plumber', user('the plumber is Rafiq, he charges 800 taka', t0 - 90 * 86_400_000));
  store.append('chat:plumber', crab('noted, Rafiq the plumber', t0 - 90 * 86_400_000 + 1000));
  store.append('chat:weather', user('rain expected tomorrow', t0 - 1000));
  store.append('chat:shopping', user('buy rice, oil and lentils', t0 - 2000));

  const hits = searchSessions('who is the plumber', {}, store);
  assert.ok(hits.length >= 1, 'the plumber chat is found');
  assert.equal(hits[0]!.sessionId, 'chat:plumber', 'and it wins');
  assert.equal(hits[0]!.role, 'user', 'the user line ranks above the assistant echo');
  assert.match(hits[0]!.snippet, /«plumber»/, 'the matched word is marked');
  assert.equal(hits[0]!.when, t0 - 90 * 86_400_000, 'the hit carries when it was said');
  assert.equal(searchSessions('lentils', {}, store)[0]!.sessionId, 'chat:shopping');
  assert.deepEqual(searchSessions('nothing here at all', {}, store), []);
  assert.deepEqual(searchSessions('the', {}, store), [], 'stopwords alone find nothing');
});

test('21.2 search reads the archive, so old conversations stay findable', () => {
  home('archive');
  const store = new SessionStore();
  const t0 = Date.now();
  store.append('chat:old', user('the passport number is AB1234567', t0 - 400 * 86_400_000));
  // Overflow moves the live file aside, exactly as a long chat does.
  const hot = store.transcriptFile('chat:old');
  fs.appendFileSync(store.archivePath('chat:old'), fs.readFileSync(hot, 'utf8'));
  fs.writeFileSync(hot, '', 'utf8');
  store.append('chat:old', user('unrelated new line', t0));

  const hits = searchSessions('passport number', {}, store);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]!.part, 'archive', 'the hit says it came from the archive');
  assert.match(hits[0]!.snippet, /«passport»/);
  assert.ok(hits[0]!.score > 0);
});

test('21.2 search can be aimed at one session, and tool output is down-weighted', () => {
  home('search-one');
  const store = new SessionStore();
  const t0 = Date.now();
  store.append('a:x', user('the router password is hunter2', t0));
  store.append('b:y', user('the router password is hunter2', t0 - 1000));
  store.append('b:y', tool('read_file', 'file contents mentioning router password', t0 - 900));

  const one = searchSessions('router password', { sessionId: 'a:x' }, store);
  assert.equal(one.length, 1);
  assert.equal(one[0]!.sessionId, 'a:x');

  const both = searchSessions('router password', {}, store);
  const toolHit = both.find((h) => h.role === 'tool');
  const userHit = both.find((h) => h.role === 'user');
  assert.ok(toolHit && userHit);
  assert.ok(toolHit!.score < userHit!.score, 'a tool result counts for less than a message');
  assert.match(toolHit!.snippet, /^\[read_file\]/, 'and it says which tool produced it');
});

test('21.2 terms and snippets behave for humans', () => {
  assert.deepEqual(terms('The Bike, and the bike!'), ['bike']);
  assert.deepEqual(terms('রফিক কে'), ['রফিক', 'কে']);
  const snip = snippet('x'.repeat(200) + ' bicycle ' + 'y'.repeat(200), ['bicycle']);
  assert.match(snip, /«bicycle»/);
  assert.ok(snip.length <= 165, 'a snippet stays readable');
  assert.match(snippet('short line', ['short']), /«short»/);
  assert.equal(snippet('no terms here', ['zzz']), 'no terms here');
});

// ---------------------------------------------------------------------------
// 21.3 — reset policies
// ---------------------------------------------------------------------------

test('21.3 a policy string is parsed forgivingly', () => {
  assert.deepEqual(parseResetPolicy(undefined), { kind: 'never', label: 'never' });
  assert.deepEqual(parseResetPolicy('never'), { kind: 'never', label: 'never' });
  assert.deepEqual(parseResetPolicy('daily'), { kind: 'daily', label: 'daily' });
  assert.deepEqual(parseResetPolicy('idle:30'), { kind: 'idle', minutes: 30, label: 'after 30 minute(s) of silence' });
  assert.deepEqual(parseResetPolicy('idle 5'), { kind: 'idle', minutes: 5, label: 'after 5 minute(s) of silence' });
  assert.deepEqual(parseResetPolicy('nonsense'), { kind: 'never', label: 'never' }, 'junk means the safe default');
  assert.deepEqual(parseResetPolicy('idle:0'), { kind: 'idle', minutes: 1, label: 'after 1 minute(s) of silence' });
});

test('21.3 idle and daily decide, and say why', () => {
  const t0 = new Date('2026-10-03T10:00:00Z').getTime();
  const entries = [user('hello', t0)];
  const idle = parseResetPolicy('idle:30');

  const soon = shouldReset(entries, idle, t0 + 5 * 60_000);
  assert.equal(soon.reset, false);
  assert.match(soon.reason, /last heard 5 minute/);

  const later = shouldReset(entries, idle, t0 + 31 * 60_000);
  assert.equal(later.reset, true);
  assert.match(later.reason, /quiet for 31 minute/);

  const daily = parseResetPolicy('daily');
  assert.equal(shouldReset(entries, daily, t0 + 60_000).reset, false, 'same day: one thread');
  assert.equal(shouldReset(entries, daily, t0 + 30 * 60 * 60_000).reset, true, 'next calendar day: fresh');
  assert.match(shouldReset(entries, daily, t0 + 30 * 60 * 60_000).reason, /new day/);

  assert.equal(shouldReset([], idle, t0 + 999_999_999).reset, false, 'an empty transcript never resets');
  assert.equal(shouldReset(entries, parseResetPolicy('never'), t0 + 10 * 86_400_000).reset, false);
  assert.match(describePolicy(idle, entries, t0 + 60_000), /^Sessions: after 30 minute/);
});

test('21.3 applying a reset archives the thread instead of deleting it', () => {
  home('reset');
  const store = new SessionStore();
  const t0 = Date.now();
  for (let i = 0; i < 6; i++) store.append('chat:long', user(`line ${i}`, t0 - 6 * 60_000 + i * 1000));
  store.append('chat:long', user('the spare key is under the mat', t0 - 6 * 60_000 + 30_000));

  const policy = parseResetPolicy('idle:5');
  const outcome = applyReset(store, 'chat:long', policy, t0);
  assert.equal(outcome.reset, true);
  assert.equal(outcome.entries, 7);
  assert.ok(outcome.archivedTo?.endsWith('.archive.jsonl'));
  assert.equal(store.readHot('chat:long').length, 0, 'the model starts fresh');
  assert.equal(store.read('chat:long').length, 7, 'nothing was lost');
  assert.equal(searchSessions('spare key', {}, store).length, 1, 'and it is still searchable after the reset');
  assert.equal(applyReset(store, 'chat:long', policy, t0).reset, false, 'a second call has nothing to do');

  // The line for /status is honest either way.
  assert.match(policyLine(store, 'chat:long', 'daily', t0), /^Sessions: daily/);
  assert.match(policyLine(store, 'chat:long', 'daily', t0), /keeps one thread|already talking today/);
  store.append('chat:long', user('a new thread starts here', t0));
  assert.match(policyLine(store, 'chat:long', 'idle:5', t0 + 10 * 60_000), /next turn starts fresh/);
});

test('21.3 the loop runs the policy: a stale session is archived before the next turn', () => {
  home('policy-loop');
  const store = new SessionStore();
  const t0 = Date.now();
  store.append('chat:stale', user('old conversation', t0 - 3 * 60 * 60_000));
  const policy = parseResetPolicy('idle:30');

  const decision = shouldReset(store.readHot('chat:stale', 1_000_000), policy, t0);
  assert.equal(decision.reset, true);
  const outcome = applyReset(store, 'chat:stale', policy, t0);
  assert.equal(outcome.reset, true);
  assert.equal(store.readHot('chat:stale').length, 0);
  assert.equal(store.read('chat:stale').length, 1, 'the old turn remains on disk');

  // A fresh conversation keeps its thread.
  store.append('chat:fresh', user('just now', t0 - 60_000));
  assert.equal(applyReset(store, 'chat:fresh', policy, t0).reset, false);
  assert.equal(store.readHot('chat:fresh').length, 1);
});

// ---------------------------------------------------------------------------
// 21.4 — what belongs to a conversation
// ---------------------------------------------------------------------------

test('21.4 sessions show says what a chat touched, learned and is waiting on', () => {
  home('view');
  const t0 = Date.now();
  const store = new SessionStore();
  const memory = new MemoryStore();

  store.append('chat:work', user('rename my notes file', t0 - 60_000));
  store.append('chat:work', {
    role: 'assistant',
    content: 'done',
    ts: t0 - 55_000,
    toolCalls: [
      { id: 'c1', name: 'read_file', args: { path: 'notes.md' } },
      { id: 'c2', name: 'edit_file', args: { path: 'notes.md' } },
      { id: 'c3', name: 'read_file', args: { path: 'budget.csv' } },
    ],
  });
  store.append('chat:work', tool('edit_file', 'ok', t0 - 50_000));
  memory.remember('the notes file is called notes.md', { origin: 'owner', source: 'web · session: chat:work · run: r1', now: new Date(t0) });

  const view = sessionView('chat:work', { store, memory, now: t0 });
  assert.equal(view.id, 'chat:work');
  assert.equal(view.entries.total, 3);
  assert.equal(view.roles.user, 1);
  assert.ok(view.bytes > 0);
  assert.equal(view.firstAt, t0 - 60_000);
  assert.equal(view.lastAt, t0 - 50_000);

  const files = view.attachment.files.map((f) => f.path);
  assert.deepEqual(files, ['notes.md', 'budget.csv'], 'files are listed, newest touch first');
  const notes = view.attachment.files.find((f) => f.path === 'notes.md')!;
  assert.equal(notes.times, 2, 'the read and the edit are two touches of the same file');
  assert.equal(view.attachment.files.find((f) => f.path === 'budget.csv')!.times, 1);
  assert.equal(notes.wrote, true, 'and the file is marked as written, not only read');

  assert.equal(view.attachment.tools[0]!.name, 'read_file');
  assert.equal(view.attachment.tools[0]!.calls, 2);
  assert.equal(view.attachment.facts.length, 1, 'the fact learned in this session is attached to it');
  assert.match(view.attachment.facts[0]!.text, /notes\.md/);
  assert.equal(view.attachment.approvals.length, 0);
});

test('21.4 sessions show is honest about empty sessions and foreign facts', () => {
  home('view-empty');
  const store = new SessionStore();
  const memory = new MemoryStore();
  memory.remember('a fact from another chat', { origin: 'owner', source: 'web · session: chat:other · run: r9' });

  const view = sessionView('chat:never-used', { store, memory });
  assert.equal(view.entries.total, 0);
  assert.equal(view.firstAt, null);
  assert.equal(view.lastAt, null);
  assert.deepEqual(view.attachment.files, []);
  assert.deepEqual(view.attachment.facts, [], 'facts from other sessions do not leak in');
  assert.equal(view.resetDue, false);
  assert.equal(view.fence, null);
});

test('21.4 the fence holder is visible while a turn is writing', () => {
  home('view-fence');
  const store = new SessionStore();
  const claimed = store.claim('chat:busy', 'test-owner', { waitMs: 0 });
  assert.equal(claimed.ok, true);
  const view = sessionView('chat:busy', { store, memory: new MemoryStore() });
  assert.equal(view.fence?.heldBy, 'test-owner');
  assert.equal(view.fence?.pid, process.pid);
  if (claimed.ok) claimed.release();
  assert.equal(sessionView('chat:busy', { store, memory: new MemoryStore() }).fence, null);
});

test('21.4 the reset policy is part of the view', () => {
  home('view-policy');
  const store = new SessionStore();
  const t0 = Date.now();
  store.append('chat:p', user('hello', t0 - 90 * 60_000));
  const view = sessionView('chat:p', { store, memory: new MemoryStore(), now: t0, resetPolicy: 'idle:60' });
  assert.equal(view.policy, 'after 60 minute(s) of silence');
  assert.equal(view.resetDue, true);
  assert.match(view.resetReason, /quiet for 90 minute/);
});

// ---------------------------------------------------------------------------
// The same behaviour through the real binary (the surface the user types)
// ---------------------------------------------------------------------------

function runCli(args: string[], home: string): { stdout: string; status: number } {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  try {
    const stdout = execFileSync(process.execPath, [bin, ...args], {
      encoding: 'utf8',
      env: { ...process.env, TCRAB_HOME: home },
    });
    return { stdout, status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? '', status: e.status ?? 1 };
  }
}

test('21.2 the CLI search does not swallow its own flags', () => {
  const dir = home('cli-search');
  const store = new SessionStore();
  const t0 = Date.now();
  store.append('cli:chat', user('the bicycle needs a new chain', t0));
  store.append('cli:chat', user('and the plumber is Rafiq', t0 + 1000));

  const res = runCli(['sessions', 'search', 'plumber', '--json'], dir);
  assert.equal(res.status, 0, res.stdout);
  const parsed = JSON.parse(res.stdout) as { data: { query: string; count: number; hits: Array<Record<string, unknown>> } };
  assert.equal(parsed.data.query, 'plumber', 'the flag is not part of the query');
  assert.equal(parsed.data.count, 1);
  assert.equal(parsed.data.hits[0]!.sessionId, 'cli:chat');
  assert.match(String(parsed.data.hits[0]!.snippet), /«plumber»/);

  const scoped = runCli(['sessions', 'search', 'plumber', '--session', 'cli:chat', '--limit', '1', '--json'], dir);
  const scopedData = JSON.parse(scoped.stdout) as { data: { query: string; hits: unknown[] } };
  assert.equal(scopedData.data.query, 'plumber');
  assert.equal(scopedData.data.hits.length, 1);
});

test('21.1 the CLI verify finds a torn tail and repairs it', () => {
  const dir = home('cli-verify');
  const store = new SessionStore();
  store.append('cli:damaged', user('one good line', Date.now()));
  fs.appendFileSync(store.transcriptFile('cli:damaged'), '{"role":"user","content":"tor', 'utf8');

  const before = JSON.parse(runCli(['sessions', 'verify', '--json'], dir).stdout) as {
    data: { badLines: number; sessionsWithDamage: number };
  };
  assert.equal(before.data.badLines, 1);
  assert.equal(before.data.sessionsWithDamage, 1);

  const repaired = JSON.parse(runCli(['sessions', 'verify', '--repair', '--json'], dir).stdout) as {
    data: { badLines: number; repaired: number; repairedNow: boolean };
  };
  assert.equal(repaired.data.repairedNow, true);
  assert.equal(repaired.data.badLines, 0);
  assert.ok(repaired.data.repaired > 0);
  assert.equal(store.read('cli:damaged').length, 1, 'the good line survived the cut');
});

test('21.3 sessions reset archives through the CLI, and show names the policy', () => {
  const dir = home('cli-reset');
  const store = new SessionStore();
  const t0 = Date.now();
  store.append('cli:old', user('an old thread', t0 - 1000));

  const shown = JSON.parse(runCli(['sessions', 'show', 'cli:old', '--json'], dir).stdout) as {
    data: { entries: { total: number }; attachment: { tools: unknown[] }; policy: string };
  };
  assert.equal(shown.data.entries.total, 1);
  assert.equal(shown.data.policy, 'never', 'the default policy is stated, not implied');

  const reset = JSON.parse(runCli(['sessions', 'reset', 'cli:old', '--json'], dir).stdout) as {
    data: { archivedTo: string; entries: number };
  };
  assert.equal(reset.data.entries, 1);
  assert.match(reset.data.archivedTo, /\.archive\.jsonl$/);
  assert.equal(store.readHot('cli:old').length, 0);
  assert.equal(store.read('cli:old').length, 1);
});
