import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SkillStore } from '../src/skills/loader.js';

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
