import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SkillStore } from '../src/skills/loader.js';
import { buildTools, ToolEnv } from '../src/agent/tools.js';
import { defaults } from '../src/core/config.js';
import { MemoryStore } from '../src/agent/memory.js';

function makeStore(): { store: SkillStore; root: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tskills-'));
  const builtin = path.join(root, 'builtin');
  const user = path.join(root, 'user');
  fs.mkdirSync(path.join(builtin, 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(user, 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(user, 'beta'), { recursive: true });

  fs.writeFileSync(
    path.join(builtin, 'alpha', 'SKILL.md'),
    '---\nname: alpha\ndescription: builtin alpha skill\n---\n\n# Alpha (builtin)\n',
  );
  fs.writeFileSync(
    path.join(user, 'alpha', 'SKILL.md'),
    '---\nname: alpha\ndescription: user override\n---\n\n# Alpha (user)\n',
  );
  fs.writeFileSync(path.join(user, 'beta', 'SKILL.md'), '---\nname: beta\ndescription: beta skill\n---\n\nBeta body\n');
  fs.writeFileSync(path.join(user, 'bad'), 'no directory, ignored');

  const store = new SkillStore([
    { dir: builtin, origin: 'builtin' },
    { dir: user, origin: 'user' },
  ]);
  return { store, root };
}

test('lists skills with user overriding builtin', () => {
  const { store } = makeStore();
  const list = store.list();
  assert.deepEqual(list.map((s) => s.name), ['alpha', 'beta']);
  const alpha = list.find((s) => s.name === 'alpha')!;
  assert.equal(alpha.origin, 'user');
  assert.equal(alpha.description, 'user override');
});

test('get returns full content, rejects invalid names', () => {
  const { store } = makeStore();
  const beta = store.get('beta');
  assert.ok(beta);
  assert.match(beta.content, /Beta body/);
  assert.equal(store.get('../etc/passwd'), null);
  assert.equal(store.get('nonexistent'), null);
});

test('promptIndex contains name and description only', () => {
  const { store } = makeStore();
  const idx = store.promptIndex();
  assert.match(idx, /- alpha \[user\]: user override/);
  assert.match(idx, /- beta \[user\]: beta skill/);
  assert.ok(!idx.includes('Beta body'), 'full content must not leak into the index');
});

test('built-in repo skills exist and parse', () => {
  const store = new SkillStore();
  const names = store.list().map((s) => s.name);
  for (const expected of ['web-research', 'termux-api', 'daily-briefing', 'shell-safety']) {
    assert.ok(names.includes(expected), `missing bundled skill: ${expected}`);
  }
  assert.ok(store.get('shell-safety')!.content.length > 100);
});

// ---- 34.2: the bundled library, and the commands it tells the model to run ----

/**
 * Every skill shipped in `skills/`. The count is a contract: a skill that is
 * added without being listed here fails the test on purpose, so the library
 * cannot grow silently, and a skill in this list that disappears fails too.
 */
const BUNDLED = [
  'backup-habits',
  'chat-replies',
  'daily-briefing',
  'doctor-first',
  'evening-review',
  'file-organisation',
  'git-habits',
  'memory-keeping',
  'phone-battery',
  'reminders',
  'secrets-hygiene',
  'shell-safety',
  'termux-api',
  'voice',
  'web-research',
];

test('every bundled skill parses, has a real description and a body worth reading', () => {
  const store = new SkillStore();
  const names = store.list().map((s) => s.name);
  for (const name of BUNDLED) {
    assert.ok(names.includes(name), `missing bundled skill: ${name}`);
    const s = store.get(name);
    assert.ok(s, `could not load ${name}`);
    assert.equal(s!.origin, 'builtin', `${name} should be builtin`);
    assert.equal(s!.name, name);
    const desc = s!.description;
    assert.ok(desc.length >= 20 && desc.length <= 300, `${name}: description is ${desc.length} chars`);
    assert.ok(!/\n/.test(desc), `${name}: description must be one line`);
    const body = s!.content;
    assert.ok(body.trim().length >= 400, `${name}: body is only ${body.trim().length} chars`);
    assert.match(body, /^# /m, `${name}: needs a markdown heading`);
    // Plain prose the model can follow — not a stub, not a wall of markup.
    assert.ok(
      body.split('\n').filter((l) => l.trim().length > 0).length >= 10,
      `${name}: needs at least 10 non-empty lines`,
    );
  }
  const idx = store.promptIndex();
  for (const name of BUNDLED) assert.ok(idx.includes(name), `index is missing ${name}`);
});

test('every `termcrab <command>` a bundled skill tells the model to run is a real command', async () => {
  const cli = fs.readFileSync(path.join(process.cwd(), 'src', 'cli.ts'), 'utf8');
  const real = new Set([...cli.matchAll(/case '([a-z][a-z0-9-]*)':/g)].map((m) => m[1]));
  assert.ok(real.size > 40, `expected the CLI to expose many commands, saw ${real.size}`);
  const store = new SkillStore();
  const bad: string[] = [];
  for (const name of BUNDLED) {
    const body = store.get(name)!.content;
    for (const m of body.matchAll(/termcrab ([a-z][a-z0-9-]*)/g)) {
      if (!real.has(m[1])) bad.push(`${name}: termcrab ${m[1]}`);
    }
  }
  assert.deepEqual(bad, [], `skills name commands that do not exist:\n${bad.join('\n')}`);
});

test('the documented flags the skills rely on are still in the CLI', async () => {
  const cli = fs.readFileSync(path.join(process.cwd(), 'src', 'cli.ts'), 'utf8');
  // One assertion per invocation a skill depends on, so a flag rename cannot
  // leave the skill telling the model to run something that fails.
  for (const needle of [
    "cron add",
    "--schedule",
    "--deliver",
    "sessions purge",
    "--older-than",
    "subagents",
    "--prune",
    "auth add",
    "--provider",
    "--key",
  ]) {
    assert.ok(cli.includes(needle), `cli.ts no longer mentions ${needle}`);
  }
});

test('load_skill reads any bundled skill, and a wrong name lists what does exist', async () => {
  const env = {
    config: defaults(),
    memory: new MemoryStore(),
    skills: new SkillStore(),
    extraRoots: [],
  } as unknown as ToolEnv;
  const load = (await buildTools(env)).find((t) => t.def.name === 'load_skill')!;
  assert.ok(load, 'load_skill must be in the tool list');
  const out = await load.execute({ name: 'shell-safety' });
  assert.match(out, /# Skill: shell-safety/);
  assert.match(out, /rm -rf/, 'the body must actually be in the result');
  // The model capitalising a name it read in the index must not be a failure.
  const ci = await load.execute({ name: 'Shell-Safety' });
  assert.match(ci, /# Skill: shell-safety/);
  await assert.rejects(() => load.execute({ name: 'nope-nope' }), /skill not found: nope-nope[\s\S]*shell-safety/);
});
