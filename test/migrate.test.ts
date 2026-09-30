import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  planOpenclaw,
  applyOpenclaw,
  parseJson5ish,
} from '../src/migrate/openclaw.js';
import { defaults, loadConfig, saveConfig } from '../src/core/config.js';

function fixture(): { ocHome: string; tcHome: string } {
  const ocHome = fs.mkdtempSync(path.join(os.tmpdir(), 'toc-'));
  const tcHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ttc-'));
  process.env.TCRAB_HOME = tcHome;

  const ws = path.join(ocHome, 'workspace');
  fs.mkdirSync(path.join(ws, 'memory', 'topics'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'skills', 'greet'), { recursive: true });
  fs.mkdirSync(path.join(ws, 'agents', 'backup'), { recursive: true });

  fs.writeFileSync(path.join(ws, 'SOUL.md'), '# SOUL\n\nI am Mover, a calm assistant.\n');
  fs.writeFileSync(path.join(ws, 'USER.md'), '## User\n\n- Owner drinks masala tea\n');
  fs.writeFileSync(path.join(ws, 'AGENTS.md'), '## Rules\n\n- Always show command before running it\n');
  fs.writeFileSync(
    path.join(ws, 'MEMORY.md'),
    '# Memory\n\n- knows the capital of france\n- loves tea at 5pm\n',
  );
  fs.writeFileSync(path.join(ws, 'memory', '2026-01-01.md'), '# 2026-01-01\n\n- did a thing\n');
  fs.writeFileSync(path.join(ws, 'memory', 'topics', 'note.md'), 'topic note\n');
  fs.writeFileSync(
    path.join(ws, 'skills', 'greet', 'SKILL.md'),
    '---\nname: greet\ndescription: says hello\n---\n\nWave and say hello.\n',
  );
  fs.writeFileSync(path.join(ws, 'agents', 'backup', 'SOUL.md'), 'You are Backup.\n');
  fs.writeFileSync(path.join(ws, 'HEARTBEAT.md'), '- check the rice\n');

  // JSON5-flavoured config: comments, unquoted keys, trailing commas, 'quotes'
  fs.writeFileSync(
    path.join(ocHome, 'openclaw.json'),
    `{
  // openclaw config
  agents: {
    defaults: {
      workspace: ${JSON.stringify(ws)},
      heartbeat: { every: '45m' },
    },
  },
  channels: {
    whatsapp: { allowFrom: ['+15551234567'] },
    telegram: { token: '7777777:AAsecrettokenAAsecrettoken', allowFrom: [42] },
  },
  gateway: { port: 18790, },
  models: { primary: { provider: 'anthropic', model: 'claude-sonnet-4-5', apiKey: 'sk-ant-imported-key-123' } },
  logging: { level: 'info' },
  session: { scope: 'per-sender' },
}`,
  );

  // existing TermCrab memory with one overlapping line
  fs.mkdirSync(path.join(tcHome, 'memory'), { recursive: true });
  fs.writeFileSync(
    path.join(tcHome, 'memory', 'MEMORY.md'),
    '# Long-term memory\n\n- knows the capital of france\n',
  );
  return { ocHome, tcHome };
}

test('parseJson5ish handles comments, unquoted keys, trailing commas, single quotes', () => {
  const v = parseJson5ish(`{ // c\n a: 1, 'b': 'x', /* block */ list: [1, 2,], }`) as Record<string, unknown>;
  assert.equal(v.a, 1);
  assert.equal(v.b, 'x');
  assert.deepEqual(v.list, [1, 2]);
});

test('plan: finds everything, maps config, writes NOTHING', () => {
  const { ocHome, tcHome } = fixture();
  saveConfig(loadConfig()); // materialize the default config in the fresh home
  const configBefore = fs.readFileSync(path.join(tcHome, 'config.json'), 'utf8');
  const soulBefore = fs.readFileSync(path.join(tcHome, 'memory', 'MEMORY.md'), 'utf8');

  const plan = planOpenclaw(ocHome);
  assert.equal(plan.sourceExists, true);
  assert.deepEqual(plan.personalityFiles.sort(), ['AGENTS.md', 'SOUL.md', 'USER.md']);
  assert.equal(plan.memory.sourceLines, 2);
  assert.equal(plan.memory.newLines, 1, 'only the non-duplicate line is new');
  assert.deepEqual(plan.memory.dailyFiles, ['2026-01-01.md']);
  assert.ok(plan.skills.some((s) => s.name === 'greet'));
  assert.deepEqual(plan.agentFolders, ['backup']);

  const row = (k: string) => plan.rows.find((r) => r.to === k);
  assert.equal(row('heartbeat.minutes')?.value, '45 min');
  assert.equal(row('heartbeat.minutes')?.status, 'will set');
  assert.equal(row('channels.whatsapp.allowedJids')?.status, 'will set');
  assert.equal(row('channels.telegram.token')?.value, '•••', 'secret must be masked in preview');
  assert.equal(row('provider.model')?.value, 'claude-sonnet-4-5');
  assert.equal(row('gateway.port')?.status, 'will set');
  assert.ok(plan.unmapped.includes('logging.level'), 'unmapped transparency');
  assert.ok(plan.unmapped.includes('session.scope'));
  assert.ok(plan.actions.some((a) => /merge .*personality/i.test(a)));

  // dry-run guarantee
  assert.equal(fs.readFileSync(path.join(tcHome, 'config.json'), 'utf8'), configBefore);
  assert.equal(fs.readFileSync(path.join(tcHome, 'memory', 'MEMORY.md'), 'utf8'), soulBefore);
  assert.ok(!fs.existsSync(path.join(tcHome, 'workspace', 'SOUL.md')));
});

test('apply: round-trip moves personality, memory, skills, agents, config — secrets stay hidden', async () => {
  const { ocHome, tcHome } = fixture();
  const plan = planOpenclaw(ocHome);
  const results = await applyOpenclaw(plan);

  // personality merged
  const soul = fs.readFileSync(path.join(tcHome, 'workspace', 'SOUL.md'), 'utf8');
  assert.match(soul, /I am Mover/);
  assert.match(soul, /from OpenClaw USER\.md/);
  assert.match(soul, /from OpenClaw AGENTS\.md/);
  // named agent
  assert.match(fs.readFileSync(path.join(tcHome, 'workspace', 'agents', 'backup', 'SOUL.md'), 'utf8'), /Backup/);
  // memory merged (only the new line + section header)
  const mem = fs.readFileSync(path.join(tcHome, 'memory', 'MEMORY.md'), 'utf8');
  assert.match(mem, /loves tea at 5pm/);
  assert.match(mem, /Imported from OpenClaw/);
  assert.equal(mem.toLowerCase().split('knows the capital of france').length - 1, 1, 'no duplicate');
  // daily log + topic folder
  assert.ok(fs.existsSync(path.join(tcHome, 'memory', 'daily', '2026-01-01.md')));
  assert.ok(fs.existsSync(path.join(tcHome, 'memory', 'imported-openclaw', 'topics', 'note.md')));
  // workspace extras
  assert.ok(fs.existsSync(path.join(tcHome, 'workspace', 'imported-openclaw', 'HEARTBEAT.md')));
  // skill imported
  assert.ok(fs.existsSync(path.join(tcHome, 'skills', 'greet', 'SKILL.md')));
  // config applied
  const cfg = loadConfig();
  assert.equal(cfg.heartbeat.minutes, 45);
  assert.equal(cfg.channels.whatsapp?.enabled, true);
  assert.deepEqual(cfg.channels.whatsapp?.allowedJids, ['+15551234567']);
  assert.deepEqual(cfg.channels.telegram?.allowedUserIds, [42]);
  assert.equal(cfg.provider.model, 'claude-sonnet-4-5');
  assert.equal(cfg.provider.type, 'anthropic');
  assert.equal(cfg.provider.apiKey, 'sk-ant-imported-key-123');
  assert.equal(cfg.gateway.port, 18790);

  // secrets never printed
  const out = results.join('\n');
  assert.ok(!out.includes('AAsecrettoken'), 'telegram token leaked');
  assert.ok(!out.includes('sk-ant-imported-key-123'), 'api key leaked');

  // idempotent second pass
  const plan2 = planOpenclaw(ocHome);
  assert.equal(plan2.memory.newLines, 0);
  const results2 = await applyOpenclaw(plan2);
  assert.ok(results2.some((l) => /nothing new to merge/.test(l)));
});

test('apply keeps an existing soul unless --force', async () => {
  const { ocHome, tcHome } = fixture();
  fs.mkdirSync(path.join(tcHome, 'workspace'), { recursive: true });
  fs.writeFileSync(path.join(tcHome, 'workspace', 'SOUL.md'), 'My existing termcrab soul\n');

  const plan = planOpenclaw(ocHome);
  assert.equal(plan.hasExistingSoul, true);
  assert.ok(plan.actions.some((a) => /SKIP \(you already have one/.test(a)));
  await applyOpenclaw(plan);
  assert.equal(
    fs.readFileSync(path.join(tcHome, 'workspace', 'SOUL.md'), 'utf8'),
    'My existing termcrab soul\n',
  );

  const planF = planOpenclaw(ocHome);
  await applyOpenclaw(planF, { force: true });
  assert.match(fs.readFileSync(path.join(tcHome, 'workspace', 'SOUL.md'), 'utf8'), /I am Mover/);
});

test('customized TermCrab values are kept (openclaw does not overwrite)', () => {
  const { ocHome, tcHome } = fixture();
  const cfg = defaults();
  cfg.provider.apiKey = 'pre-owned-key-do-not-touch';
  saveConfig(cfg);
  void tcHome;

  const plan = planOpenclaw(ocHome);
  const apiKeyRow = plan.rows.find((r) => r.to === 'provider.apiKey');
  assert.equal(apiKeyRow?.status, 'keep yours');
});

test('missing source produces an honest plan', () => {
  const plan = planOpenclaw('/nonexistent/openclaw-home');
  assert.equal(plan.sourceExists, false);
  assert.ok(plan.actions[0]?.includes('not found'));
});
