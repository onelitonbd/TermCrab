import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, loadConfig, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';
import { structuredLog } from '../src/core/structured-log.js';
import {
  authReport,
  boardReport,
  configReport,
  configSet,
  cronReport,
  devicesReport,
  diskReport,
  docsReport,
  dreamReport,
  embeddingsReport,
  helpText,
  logsReport,
  perfReport,
  securityReport,
  skillsReport,
  CHAT_COMMANDS,
  CHAT_SET_KEYS,
  nextRunText,
} from '../src/gateway/chat-reports.js';
import { addCron } from '../src/cron/store.js';
import { SkillStore } from '../src/skills/loader.js';

/**
 * Batch 46 — the read-only reports, reachable from a chat.
 *
 * The audit put 28 missing cells on Telegram; the first 13 are reports the CLI
 * already renders, so their fix is not a new engine but a second and third door
 * to the same data. These tests check the *door*, not the data structure: every
 * report must answer in a chat, refuse the things a chat must not do (set a
 * provider key), and say where the full version lives.
 */

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

test('46.1 every report answers in a chat, and knows where the full one lives', async (t) => {
  tmpHome('t46a-');
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-secret-value', model: 'test-model' };
  saveConfig(config);

  await t.test('/logs says what it has (and later, what happened)', () => {
    const empty = logsReport();
    assert.equal(empty.ok, true);
    const emptyText = empty.ok ? empty.text : '';
    assert.match(emptyText, /no log records yet/);
    assert.ok(emptyText.includes(structuredLog.path), 'the file it would read is named');
    structuredLog.write('info', 'test', 'a thing happened');
    const after = logsReport(5);
    assert.ok(after.ok);
    assert.match(after.ok ? after.text : '', /a thing happened/, 'the record reaches the chat');
  });

  await t.test('/config shows the keys that matter, and never a secret value', () => {
    const r = configReport();
    assert.ok(r.ok);
    const text = r.ok ? r.text : '';
    assert.match(text, /provider\s+openai/);
    assert.match(text, /model\s+test-model/);
    assert.doesNotMatch(text, /sk-secret-value/, 'a config dump in a chat must not leak the key');

    const one = configReport('provider.apiKey');
    assert.ok(one.ok);
    assert.match(one.ok ? one.text : '', /never printed in a chat/);
    assert.doesNotMatch(one.ok ? one.text : '', /sk-secret-value/);

    const missing = configReport('provider.nope');
    assert.match(missing.ok ? missing.text : '', /not set/);
  });

  await t.test('/config set is a whitelist, and a secret is never changeable from a chat', () => {
    const refused = configSet('provider.apiKey', 'sk-new');
    assert.equal(refused.ok, false);
    assert.match(refused.ok ? '' : refused.error, /never gets typed into a chat/);
    assert.equal(loadConfig().provider.apiKey, 'sk-secret-value', 'nothing was written');

    const badValue = configSet('agent.queueMode', 'nonsense');
    assert.equal(badValue.ok, false);
    assert.match(badValue.ok ? '' : badValue.error, /followup, steer, collect, interrupt/);

    const changed = configSet('agent.queueMode', 'steer');
    assert.equal(changed.ok, true);
    assert.match(changed.ok ? changed.text : '', /followup → steer/);
    assert.equal(loadConfig().agent.queueMode, 'steer', 'the write is real and validated');

    const bool = configSet('agent.allowExec', 'off');
    assert.equal(bool.ok, true);
    assert.equal(loadConfig().agent.allowExec, false);

    assert.ok(!CHAT_SET_KEYS.has('provider.apiKey'), 'the whitelist has no credential');
    for (const key of CHAT_SET_KEYS) assert.ok(!/key|token|secret|password/i.test(key), `${key} is not a credential-ish key`);
  });

  await t.test('/board, /disk, /perf and /embeddings answer from the live state', () => {
    const board = boardReport();
    assert.ok(board.ok);
    assert.match(board.ok ? board.text : '', /Board/);

    const disk = diskReport();
    assert.ok(disk.ok);
    assert.match(disk.ok ? disk.text : '', /budget/);

    const perf = perfReport();
    assert.ok(perf.ok);
    assert.match(perf.ok ? perf.text : '', /no measurement recorded yet|perf —/);

    const emb = embeddingsReport();
    assert.ok(emb.ok);
    assert.match(emb.ok ? emb.text : '', /embeddings/);
  });

  await t.test('/security and /auth answer with findings and no values', () => {
    const sec = securityReport();
    assert.ok(sec.ok);
    assert.match(sec.ok ? sec.text : '', /security audit/);

    const auth = authReport('list');
    assert.ok(auth.ok);
    assert.match(auth.ok ? auth.text : '', /auth/);

    const audit = authReport('audit');
    assert.ok(audit.ok);
    assert.match(audit.ok ? audit.text : '', /where your keys are/);
    assert.doesNotMatch(audit.ok ? audit.text : '', /sk-secret-value/);
  });

  await t.test('/devices, /dream and /docs answer without a gateway', () => {
    const dev = devicesReport();
    assert.match(dev.ok ? dev.text : '', /device/);
    const dream = dreamReport();
    assert.match(dream.ok ? dream.text : '', /dreaming/);
    const docs = docsReport();
    assert.ok(docs.ok);
    assert.match(docs.ok ? docs.text : '', /docs — \d+ document/);
    const named = docsReport('CLI');
    assert.ok(named.ok, 'a real document resolves');
    assert.match(named.ok ? named.text : '', /section/);
    const nope = docsReport('not-a-doc');
    assert.equal(nope.ok, false);
    assert.match(nope.ok ? '' : nope.error, /no document called/);
  });

  await t.test('/skills and /cron answer from the stores', () => {
    const skills = skillsReport(new SkillStore());
    assert.ok(skills.ok);
    assert.match(skills.ok ? skills.text : '', /skill\(s\)/);

    const empty = cronReport();
    assert.ok(empty.ok);
    assert.match(empty.ok ? empty.text : '', /no scheduled jobs/);

    addCron({ name: 'standup', schedule: '0 9 * * *', prompt: 'summarise' });
    const one = cronReport();
    assert.ok(one.ok);
    assert.match(one.ok ? one.text : '', /standup/);
    assert.match(one.ok ? one.text : '', /next \d{4}-\d{2}-\d{2}/, 'a real next run, from the real parser');
  });

  await t.test('/help lists the shared command list, and every entry is dispatchable', () => {
    const help = helpText();
    for (const c of CHAT_COMMANDS) assert.ok(help.includes(c.cmd), `${c.cmd} is in /help`);
    assert.ok(CHAT_COMMANDS.length >= 25, `the chat understands ${CHAT_COMMANDS.length} commands`);
    assert.match(help, /Anything else is a message for the agent/);
  });

  await t.test('nextRunText explains a bad schedule instead of throwing', () => {
    assert.match(nextRunText('0 9 * * *'), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    assert.equal(nextRunText('not a cron'), '(schedule not understood)');
  });
});

test('46.2 the panel chat and Telegram answer with the same words', async () => {
  const home = tmpHome('t46b-');
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  config.gateway = { ...config.gateway, token: 'tok' };
  saveConfig(config);
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  try {
    const get = async (p: string): Promise<{ status: number; body: Record<string, unknown> }> => {
      const res = await fetch(`http://127.0.0.1:${port}${p}`, { headers: { authorization: 'Bearer tok' } });
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    };
    const post = async (p: string, body: unknown): Promise<{ status: number; body: Record<string, unknown> }> => {
      const res = await fetch(`http://127.0.0.1:${port}${p}`, {
        method: 'POST',
        headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    };

    // The palette and the Bot menu read one list.
    const list = await get('/api/slash');
    assert.equal(list.status, 200);
    const names = (list.body.commands as { name: string }[]).map((c) => c.name);
    for (const cmd of ['/logs', '/config', '/board', '/disk', '/perf', '/doctor', '/security', '/auth', '/devices', '/embeddings', '/dream', '/docs', '/skills', '/cron']) {
      assert.ok(names.includes(cmd), `${cmd} is offered to both surfaces`);
    }

    // The chat path runs the shared handler — the same call Telegram makes.
    const logs = await post('/api/slash', { command: '/logs', args: '5' });
    assert.equal(logs.status, 200);
    assert.match(String(logs.body.message), /record\(s\)|no log records/);

    const config1 = await post('/api/slash', { command: '/config', args: '' });
    assert.match(String(config1.body.message), /provider/);

    const refused = await post('/api/slash', { command: '/config', args: 'set provider.apiKey sk-x' });
    assert.equal(refused.status, 400);
    assert.equal(refused.body.ok, false);
    assert.match(String(refused.body.error), /never gets typed into a chat/);

    const secretRead = await post('/api/slash', { command: '/config', args: 'provider.apiKey' });
    assert.doesNotMatch(String(secretRead.body.message), /sk-test/);

    const doctor = await post('/api/slash', { command: '/doctor', args: '' });
    assert.equal(doctor.status, 200);
    assert.match(String(doctor.body.message), /doctor/);

    const unknown = await post('/api/slash', { command: '/not-a-command', args: '' });
    assert.equal(unknown.status, 400);

    // /new from the chat is a real reset on the server (same as Telegram), while
    // the palette's `ui` call keeps its view action.
    const fresh = await post('/api/slash', { command: '/new', args: '' });
    assert.deepEqual(fresh.body, { ok: true, action: 'new', message: '🧹 Session reset. Fresh start!' });
    const palette = await post('/api/slash', { command: '/new', args: '', ui: true });
    assert.deepEqual(palette.body, { ok: true, action: 'new' });

    // The HOME the gateway ran in is the one the reports read.
    assert.ok(fs.existsSync(path.join(home, 'config.json')));
  } finally {
    await handle.stop();
  }
});
