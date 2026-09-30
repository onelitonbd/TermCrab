import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importSkills } from '../src/skills/importer.js';
import { SkillStore } from '../src/skills/loader.js';

function tempHome(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'timp-'));
  process.env.TCRAB_HOME = dir;
  return dir;
}

function writeSkill(root: string, dirName: string, name: string, description: string, body = 'Body text'): void {
  const d = path.join(root, dirName);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`);
}

test('imports a single skill folder', async () => {
  tempHome();
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrc-'));
  writeSkill(src, 'standalone', 'my-skill', 'Does my thing');
  const results = await importSkills(path.join(src, 'standalone'));
  assert.equal(results.length, 1);
  assert.equal(results[0]!.action, 'imported');
  assert.equal(results[0]!.name, 'my-skill');

  const store = new SkillStore();
  const skill = store.get('my-skill');
  assert.ok(skill, 'imported skill must be discoverable');
  assert.match(skill.content, /Body text/);
});

test('imports all skills from a directory of skill folders (OpenClaw-style layout)', async () => {
  tempHome();
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrc-'));
  writeSkill(src, 'skill-a', 'skill-a', 'first');
  writeSkill(src, 'skill-b', 'skill-b', 'second');
  fs.writeFileSync(path.join(src, 'README.md'), 'not a skill');
  const results = await importSkills(src);
  assert.equal(results.length, 2);
  const names = results.map((r) => r.name).sort();
  assert.deepEqual(names, ['skill-a', 'skill-b']);
});

test('skips existing skills unless --force', async () => {
  tempHome();
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrc-'));
  writeSkill(src, 's', 'dup', 'v1', 'original body');
  await importSkills(src);

  writeSkill(src, 's', 'dup', 'v2', 'updated body');
  const second = await importSkills(src);
  assert.equal(second[0]!.action, 'skipped');
  let store = new SkillStore();
  assert.match(store.get('dup')!.content, /original body/);

  const third = await importSkills(src, { force: true });
  assert.equal(third[0]!.action, 'updated');
  store = new SkillStore();
  assert.match(store.get('dup')!.content, /updated body/);
});

test('rejects sources with no SKILL.md and bad frontmatter', async () => {
  tempHome();
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'tempty-'));
  fs.writeFileSync(path.join(empty, 'notes.txt'), 'nope');
  await assert.rejects(() => importSkills(empty), /no SKILL.md/);

  const bad = fs.mkdtempSync(path.join(os.tmpdir(), 'tbad-'));
  fs.mkdirSync(path.join(bad, 'x'));
  fs.writeFileSync(path.join(bad, 'x', 'SKILL.md'), 'plain text with no frontmatter at all');
  await assert.rejects(() => importSkills(bad), /frontmatter|failed/);
});

test('name sanitization for hostile names', async () => {
  tempHome();
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'tsan-'));
  writeSkill(src, 'evil', '../../etc/passwd', 'sneaky', 'x');
  const results = await importSkills(src);
  const name = results[0]!.name;
  assert.ok(/^[a-z0-9][a-z0-9-_]*$/.test(name), `unsafe name: ${name}`);
  // landed inside user skills dir, nowhere else
  const dest = path.join(process.env.TCRAB_HOME!, 'skills', name, 'SKILL.md');
  assert.ok(fs.existsSync(dest));
});
