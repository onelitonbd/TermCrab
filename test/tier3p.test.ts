import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, loadConfig, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';
import {
  backupCommand,
  queueCommand,
  sessionsPurgeCommand,
  sessionsRenameCommand,
  steerCommand,
  stopCommand,
  updateCommand,
  watchCommand,
  type ControlDeps,
} from '../src/gateway/chat-control.js';
import { SessionStore, SessionQueue } from '../src/agent/sessions.js';

/**
 * Batch 47 — the verbs.
 *
 * Batch 46 made the reports reachable; this is the half that *changes*
 * something. The tests check two things a chat control must get right: the
 * action really happens (a stop stops, a rename renames, a purge deletes only
 * what the number allows), and the dangerous half says so and names the door.
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

/** A control surface with real stores and a stub queue, on a temp home. */
function deps(overrides: Partial<ControlDeps> = {}): ControlDeps {
  const sessions = new SessionStore();
  const queue = new SessionQueue();
  const config = loadConfig();
  return {
    sessionId: 'telegram:main',
    channel: 'telegram',
    chatId: '-100',
    config,
    saveConfig,
    sessions,
    queue: {
      getRunning: () => null,
      steer: () => null,
      interrupt: () => false,
      getMode: () => 'followup',
      setMode: () => undefined,
    },
    currentVersion: '0.0.0-test',
    ...overrides,
  };
}

test('47.1 the control verbs act, and refuse what a chat must not do alone', async (t) => {
  tmpHome('t47a-');

  await t.test('/stop stops the turn that is running here', () => {
    let interrupted = false;
    const d = deps({
      queue: {
        getRunning: () => ({ id: 'turn-7' }),
        steer: () => null,
        interrupt: () => ((interrupted = true), true),
        getMode: () => 'followup',
        setMode: () => undefined,
      },
    });
    const r = stopCommand(d);
    assert.equal(r.ok, true);
    assert.match(r.ok ? r.text : '', /turn-7/);
    assert.equal(interrupted, true, 'the queue was really interrupted');

    const idle = stopCommand(deps());
    assert.match(idle.ok ? idle.text : '', /nothing is running here/);
  });

  await t.test('/steer joins the running turn; with nothing running it says so', () => {
    const d = deps({
      queue: {
        getRunning: () => ({ id: 'turn-9' }),
        steer: (_s, m) => (m === 'faster' ? { id: 'turn-9' } : null),
        interrupt: () => false,
        getMode: () => 'followup',
        setMode: () => undefined,
      },
    });
    const r = steerCommand(d, 'faster');
    assert.equal(r.ok, true);
    assert.match(r.ok ? r.text : '', /steered into the running turn/);
    assert.equal(steerCommand(deps(), 'hello').ok, true);
    assert.match(steerCommand(deps(), 'hello').ok ? (steerCommand(deps(), 'x') as { text: string }).text : '', /nothing is running/);
    assert.equal(steerCommand(deps(), '').ok, false, 'a steer with no words is a usage error');
  });

  await t.test('/queue shows the modes and switches one (config is saved)', () => {
    const d = deps();
    const shown = queueCommand(d);
    assert.match(shown.ok ? shown.text : '', /followup/);
    assert.match(shown.ok ? shown.text : '', /interrupt/);

    let mode = '';
    const switched = queueCommand(
      deps({ queue: { ...d.queue, setMode: (m) => ((mode = m), undefined) } }),
      'steer',
    );
    assert.equal(switched.ok, true);
    assert.equal(mode, 'steer');
    assert.equal(loadConfig().agent.queueMode, 'steer', 'the mode is written to config');

    const bad = queueCommand(d, 'sometimes');
    assert.equal(bad.ok, false);
    assert.match(bad.ok ? '' : bad.error, /must be one of/);
  });

  await t.test('/sessions rename and purge do the real thing', () => {
    const home = tmpHome('t47b-');
    const sessions = new SessionStore();
    sessions.append('old-thread', { role: 'user', content: 'hello', ts: Date.now() });
    const d = deps({ sessions });

    const renamed = sessionsRenameCommand(d, 'old-thread', 'new-thread');
    assert.equal(renamed.ok, true);
    assert.ok(fs.existsSync(path.join(home, 'sessions', 'new-thread.jsonl')), 'the file moved');
    assert.ok(!fs.existsSync(path.join(home, 'sessions', 'old-thread.jsonl')), 'and is not duplicated');

    assert.equal(sessionsRenameCommand(d, 'nope', 'x').ok, false, 'renaming nothing fails');
    assert.equal(sessionsRenameCommand(d, 'new-thread', 'bad name!').ok, false, 'a bad name fails');

    const refused = sessionsPurgeCommand(d, '');
    assert.equal(refused.ok, false);
    assert.match(refused.ok ? '' : refused.error, /purge <days>/);
    const purged = sessionsPurgeCommand(d, '0');
    assert.equal(purged.ok, false, 'zero days would mean "delete everything" — refused');
    const nothing = sessionsPurgeCommand(d, '3650');
    assert.equal(nothing.ok, true);
    assert.match(nothing.ok ? nothing.text : '', /nothing older than/);
  });

  await t.test('/watch add, list and rm write the same config the gateway loads', () => {
    const home = tmpHome('t47c-');
    const cfg = defaults();
    saveConfig(cfg);
    const d = deps({ config: loadConfig() });

    const added = watchCommand(d, 'add', '~/notes .md');
    assert.equal(added.ok, true);
    const id = /as (\w+)/.exec(added.ok ? added.text : '')?.[1];
    assert.ok(id, 'the id is printed so it can be removed');
    const saved = loadConfig().watchers ?? [];
    assert.equal(saved.length, 1);
    assert.equal(saved[0]!.path, '~/notes');
    assert.equal(saved[0]!.match, '.md');

    const listed = watchCommand(deps({ config: loadConfig() }), 'list', '');
    assert.match(listed.ok ? listed.text : '', /notes/);

    const removed = watchCommand(deps({ config: loadConfig() }), 'rm', id!);
    assert.equal(removed.ok, true);
    assert.deepEqual(loadConfig().watchers, [], 'removal is persisted too');
    assert.equal(watchCommand(deps({ config: loadConfig() }), 'rm', 'nope').ok, false);
    assert.ok(fs.existsSync(path.join(home, 'config.json')));
  });

  await t.test('/update checks, and application is refused with the door named', async () => {
    const d = deps();
    const check = await updateCommand(d, 'check');
    assert.equal(check.ok, true);
    // Either a real answer or a network failure — both are honest sentences.
    assert.match(check.ok ? check.text : '', /up to date|update available|update check failed/);
    const apply = await updateCommand(d, 'apply');
    assert.equal(apply.ok, true);
    assert.match(apply.ok ? apply.text : '', /terminal job|termcrab update apply/);
  });

  await t.test('/backup writes a real archive (and says where it went)', async () => {
    const home = tmpHome('t47d-');
    fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(defaults()));
    const d = deps({ channel: 'cli' });
    const r = await backupCommand(d);
    assert.equal(r.ok, true);
    assert.match(r.ok ? r.text : '', /backup written/);
    const files = fs.readdirSync(path.join(home, 'backups'));
    assert.equal(files.length, 1, 'one archive');
    const bytes = fs.statSync(path.join(home, 'backups', files[0]!)).size;
    assert.ok(bytes > 100, `the archive has content (${bytes} bytes)`);
    assert.match(r.ok ? r.text : '', /cannot receive files/, 'a channel without documents is named honestly');
  });
});

test('47.2 the panel chat runs the verbs too, over the real HTTP surface', async () => {
  const home = tmpHome('t47e-');
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  config.gateway = { ...config.gateway, token: 'tok' };
  saveConfig(config);
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  try {
    const post = async (body: unknown): Promise<{ status: number; body: Record<string, unknown> }> => {
      const res = await fetch(`http://127.0.0.1:${port}/api/slash`, {
        method: 'POST',
        headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    };

    const queue = await post({ command: '/queue', args: '' });
    assert.equal(queue.status, 200);
    assert.match(String(queue.body.message), /queue mode/);

    const setMode = await post({ command: '/queue', args: 'collect' });
    assert.equal(setMode.status, 200);
    assert.match(String(setMode.body.message), /collect/);
    assert.equal(loadConfig().agent.queueMode, 'collect');

    const stop = await post({ command: '/stop', args: '' });
    assert.equal(stop.status, 200);
    assert.match(String(stop.body.message), /nothing is running here/);

    const watch = await post({ command: '/watch', args: 'list' });
    assert.equal(watch.status, 200);
    assert.match(String(watch.body.message), /no watchers|watcher/);

    const update = await post({ command: '/update', args: 'apply' });
    assert.equal(update.status, 200);
    assert.match(String(update.body.message), /terminal/);

    const backup = await post({ command: '/backup', args: '' });
    assert.equal(backup.status, 200);
    assert.match(String(backup.body.message), /backup written/);
    assert.equal(fs.readdirSync(path.join(home, 'backups')).length, 1);
  } finally {
    await handle.stop();
  }
});
