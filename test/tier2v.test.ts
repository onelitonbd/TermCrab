/**
 * Batch 32.3 — the bootstrap file set: a home that explains itself.
 *
 * The promise being tested is not "files appear". It is that a phone owner who
 * installs TermCrab can talk to it immediately, that the agent *knows* it is
 * new and walks them through the three files worth editing, and that nothing
 * written here can ever overwrite words the owner has since typed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { BOOTSTRAP_FILES, bootstrapStatus, readBootstrapNote, readIdentity, runBootstrap } from '../src/core/bootstrap.js';
import { buildSystemPrompt } from '../src/agent/prompt.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults } from '../src/core/config.js';
import { runTurn } from '../src/agent/loop.js';
import { SessionStore } from '../src/agent/sessions.js';

const CLI = fileURLToPath(new URL('../src/bin/termcrab.js', import.meta.url));
const execFileP = promisify(execFile);

function tmpHome(tag: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `tc33-${tag}-`));
}

test('32.3 a brand-new home gets the whole set, and nothing is written twice', () => {
  const home = tmpHome('fresh');
  const status0 = bootstrapStatus(home);
  assert.equal(status0.complete, false);
  assert.equal(status0.stage, 'empty', 'nothing written yet is its own stage');
  assert.equal(status0.missing.length, BOOTSTRAP_FILES.length);

  const first = runBootstrap({ root: home, name: 'Crabby' });
  assert.equal(first.created.length, BOOTSTRAP_FILES.length, 'every file of the set is written');
  for (const f of first.created) {
    const target = path.join(home, f);
    assert.ok(fs.existsSync(target), `${f} exists`);
    assert.ok(fs.readFileSync(target, 'utf8').trim().length > 40, `${f} has real content, not a stub`);
  }
  assert.ok(fs.existsSync(path.join(home, 'workspace', 'agents')), 'the named-agent folder is ready too');

  // The owner edits a file — a second bootstrap pass must not touch it.
  const soul = path.join(home, 'workspace', 'SOUL.md');
  fs.writeFileSync(soul, '# SOUL.md — mine\n\nBe brief.\n');
  const before = fs.readFileSync(soul, 'utf8');
  const second = runBootstrap({ root: home, name: 'Crabby' });
  assert.deepEqual(second.created, [], 'nothing to write the second time');
  assert.equal(second.kept.length, BOOTSTRAP_FILES.length);
  assert.equal(fs.readFileSync(soul, 'utf8'), before, 'the owner’s words survive a re-run');

  const status1 = bootstrapStatus(home);
  assert.equal(status1.complete, true);
  assert.equal(status1.stage, 'first-run', 'the first-run note is still there');
  assert.match(status1.nextStep, /talk to your agent/);

  // --force is the documented way to get the templates back.
  const forced = runBootstrap({ root: home, name: 'Crabby', force: true });
  assert.equal(forced.created.length, BOOTSTRAP_FILES.length);
  assert.notEqual(fs.readFileSync(soul, 'utf8'), before);
});

test('32.3 the agent is told it is new, and the note stops being injected once deleted', () => {
  const home = tmpHome('prompt');
  runBootstrap({ root: home, name: 'Crabby' });
  process.env.TCRAB_HOME = home;
  const config = defaults();
  const memory = new MemoryStore(path.join(home, 'memory'));
  const skills = new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]);

  assert.match(readBootstrapNote(), /BOOTSTRAP\.md/, 'the note is readable');
  assert.match(readIdentity(), /^Name: /m, 'IDENTITY.md is settings, not prose');

  const prompt = buildSystemPrompt({ config, memory, skills });
  assert.match(prompt, /# First run \(workspace\/BOOTSTRAP\.md\)/, 'the first-run section is in the prompt');
  assert.match(prompt, /delete workspace\/BOOTSTRAP\.md/, 'and it says what to do when done');
  assert.match(prompt, /The owner's settings for you \(workspace\/IDENTITY\.md\)/, 'IDENTITY.md rides with the soul');
  assert.match(prompt, /what should I call you/, 'and it names the two questions that matter');

  // Once the agent has deleted it, the section is gone — not a permanent tax.
  fs.unlinkSync(path.join(home, 'workspace', 'BOOTSTRAP.md'));
  const after = buildSystemPrompt({ config, memory, skills });
  assert.equal(after.includes('First run (workspace/BOOTSTRAP.md)'), false, 'no first-run section on a normal turn');
  assert.match(after, /Hard nos:/, 'but the owner’s settings stay');

  assert.equal(bootstrapStatus(home).stage, 'done');
  delete process.env.TCRAB_HOME;
});

test('32.3 a first turn works from an empty home with no setup command', async () => {
  const home = tmpHome('turn');
  process.env.TCRAB_HOME = home;
  try {
    // What `main()` does for any command: the layout, then the file set.
    runBootstrap({ root: home, name: 'Crabby' });
    const config = defaults();
    config.provider = { type: 'mock', model: 'mock-1' };
    const ctx = {
      config,
      memory: new MemoryStore(path.join(home, 'memory')),
      sessions: new SessionStore(path.join(home, 'sessions')),
      skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
    };
    const reply = await runTurn(ctx as never, { sessionId: 'first-run', userMessage: 'hello' });
    assert.match(reply, /mock:mock-1|hello/i, 'the agent answers on the very first turn');
    const transcript = path.join(home, 'sessions', 'first-run.jsonl');
    assert.ok(fs.existsSync(transcript), 'and the conversation is written down');
  } finally {
    delete process.env.TCRAB_HOME;
  }
});

test('32.3 the CLI: status, --write, and a real command on an untouched home', async () => {
  // A home nobody has used: `termcrab bootstrap` reports it, writes nothing.
  const empty = tmpHome('cli-empty');
  const status = await execFileP(process.execPath, [CLI, 'bootstrap', '--json'], { env: { ...process.env, TCRAB_HOME: empty } });
  const parsed = JSON.parse(status.stdout) as {
    ok: boolean;
    data: { complete: boolean; stage: string; missing: string[]; nextStep: string };
  };
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.complete, false);
  assert.equal(parsed.data.stage, 'empty');
  assert.deepEqual(parsed.data.missing.sort(), BOOTSTRAP_FILES.map((f) => f.rel).sort());
  assert.equal(fs.existsSync(path.join(empty, 'workspace', 'SOUL.md')), false, 'status writes nothing');

  // --write creates them; a second --write keeps everything.
  const wrote = await execFileP(process.execPath, [CLI, 'bootstrap', '--write'], { env: { ...process.env, TCRAB_HOME: empty } });
  assert.match(wrote.stdout, /wrote 6 file\(s\)/);
  const again = await execFileP(process.execPath, [CLI, 'bootstrap', '--write'], { env: { ...process.env, TCRAB_HOME: empty } });
  assert.match(again.stdout, /nothing to write/);

  // A normal command on an untouched home does the same thing automatically —
  // and says so on stderr, not stdout.
  const auto = tmpHome('cli-auto');
  const run = await execFileP(process.execPath, [CLI, 'config', 'get', 'agent.name'], { env: { ...process.env, TCRAB_HOME: auto } });
  assert.equal(run.stdout.trim(), 'Crabby', 'the command’s own answer is untouched');
  assert.match(run.stderr, /first run: created 6 file\(s\)/);
  assert.ok(fs.existsSync(path.join(auto, 'workspace', 'BOOTSTRAP.md')));
  assert.ok(fs.existsSync(path.join(auto, 'workspace', 'IDENTITY.md')));

  // And the memory file the set writes is a title, not prose in every prompt.
  const mem = fs.readFileSync(path.join(auto, 'memory', 'MEMORY.md'), 'utf8');
  assert.match(mem.split('\n')[0]!, /^# /, 'the first line is the memory title');
  const head = mem
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('- ['))
    .join('\n');
  assert.ok(head.length < 200, `the memory head stays small — it rides in every prompt (${head.length} bytes)`);
  const block = new MemoryStore(path.join(auto, 'memory')).readForPrompt(3000).text;
  assert.match(block, /Long-term memory/, 'and it is what the prompt gets');
});

test('32.3 the doctor reports the file set and the one-line fix', async () => {
  const home = tmpHome('doctor');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const { runDoctor } = (await import('../src/mobile/doctor.js')) as { runDoctor: () => Promise<{ id: string; status: string; detail: string; fix?: string }[]> };
    const before = await runDoctor();
    const check0 = before.find((c) => c.id === 'bootstrap');
    assert.ok(check0, 'the doctor knows about the file set');
    assert.equal(check0.status, 'warn');
    assert.match(String(check0.fix), /termcrab bootstrap --write/);

    runBootstrap({ root: home });
    const after = await runDoctor();
    const check1 = after.find((c) => c.id === 'bootstrap');
    assert.equal(check1?.status, 'ok');
    assert.match(check1?.detail ?? '', /first run not done yet/);
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

test('32.3 the file set travels in a backup like everything else', async () => {
  const home = tmpHome('backup');
  const { writeBackup, readBackup } = await import('../src/core/backup.js');
  runBootstrap({ root: home });
  const archive = path.join(home, '..', `tc-backup-${path.basename(home)}.tar`);
  const written = writeBackup(archive, { root: home });
  assert.ok(written.manifest.files >= BOOTSTRAP_FILES.length, `the archive holds the file set (${written.manifest.files} files)`);
  const read = readBackup(archive);
  assert.deepEqual(
    read.entries
      .map((e) => e.name)
      .filter((rel) => /^(workspace|memory)\/[^/]+$/.test(rel))
      .sort(),
    BOOTSTRAP_FILES.map((f) => f.rel).sort(),
    'every bootstrap file is in the archive',
  );
  fs.rmSync(archive, { force: true });
});
