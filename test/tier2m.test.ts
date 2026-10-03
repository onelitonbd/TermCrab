import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { buildPresence, formatPresence, localPresence, presenceLine, presenceState } from '../src/gateway/presence.js';
import { pairCode, redeemCode, verifyDeviceToken, listDevices } from '../src/gateway/devices.js';
import { startGateway, type GatewayHandle } from '../src/gateway/server.js';
import { defaults, saveConfig } from '../src/core/config.js';
import { bus } from '../src/gateway/events.js';
import { KNOWN_EVENTS, matchesEvent, patternMatches, planTriggers, triggerMessage, triggerSession } from '../src/gateway/triggers.js';

/**
 * Batch 24 — the gateway's last two gaps.
 *
 * 24.1 who can reach me right now: one presence picture derived from stores
 * that already exist (watchers, channels, devices, people), the freshness rule
 * stated in one place, and an event when it changes.
 */

function home(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t24-${tag}-`));
  process.env.TCRAB_HOME = dir;
  return dir;
}

function runCliAsync(args: string[], dir: string): Promise<{ stdout: string; stderr: string; status: number }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(process.cwd(), 'dist/src/bin/termcrab.js'), ...args],
      { encoding: 'utf8', env: { ...process.env, TCRAB_HOME: dir } },
      (err, stdout, stderr) => {
        const status = err ? ((err as { code?: number }).code ?? 1) : 0;
        resolve({ stdout: stdout ?? '', stderr: stderr ?? '', status });
      },
    );
  });
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
}

// ---------------------------------------------------------------------------
// 24.1 — the freshness ladder
// ---------------------------------------------------------------------------

test('24.1 the ladder is stated: 2 minutes is online, an hour is recent, older is idle', () => {
  const now = 1_700_000_000_000;
  assert.equal(presenceState(now, now), 'online');
  assert.equal(presenceState(now - 2 * 60_000, now), 'online', 'the boundary itself is online');
  assert.equal(presenceState(now - 2 * 60_000 - 1, now), 'recent');
  assert.equal(presenceState(now - 60 * 60_000, now), 'recent');
  assert.equal(presenceState(now - 60 * 60_000 - 1, now), 'idle');
  assert.equal(presenceState(null, now), 'unknown', 'paired and never used is not an error');
  assert.equal(presenceState(Number.NaN, now), 'unknown');
});

test('24.1 a device that just used its token is online; one that never did is unknown', () => {
  home('device');
  const made = pairCode({ label: 'pixel' });
  const redeemed = redeemCode(made.code, 'pixel', { ip: '192.168.1.9' });
  assert.equal(redeemed.ok, true);
  const token = redeemed.ok ? redeemed.token : '';

  const fresh = buildPresence({ watchers: 0, devices: listDevices() });
  const never = fresh.entries.find((e) => e.kind === 'device');
  assert.equal(never?.state, 'unknown');
  assert.match(never?.detail ?? '', /never seen · 0 request\(s\)/);

  verifyDeviceToken(token, { ip: '192.168.1.9' });
  const seen = buildPresence({ watchers: 0, devices: listDevices() }).entries.find((e) => e.kind === 'device');
  assert.equal(seen?.state, 'online');
  assert.ok((seen?.seenAgoMs ?? Number.POSITIVE_INFINITY) < 5000, 'the stamp is right now, not a fake zero');
  assert.match(seen?.detail ?? '', /seen 0 second\(s\) ago · 1 request\(s\) · 192\.168\.1\.9/);
});

// ---------------------------------------------------------------------------
// 24.1 — the picture, and the one line every surface shows
// ---------------------------------------------------------------------------

test('24.1 the picture names watchers, channels, devices and people with limits', () => {
  const now = 1_700_000_000_000;
  const p = buildPresence({
    now,
    watchers: 2,
    channels: [
      { name: 'telegram', configured: true, running: true },
      { name: 'whatsapp', configured: true, running: false, detail: 'configured; waiting for the WhatsApp connection (scan the QR in the terminal)' },
      { name: 'slack', configured: false, running: false },
    ],
    devices: [
      { id: 'a1', name: 'pixel', tokenHash: 'x', createdAt: now - 1000, lastSeenAt: now - 30_000, lastSeenIp: '10.0.0.2', seenCount: 4, seenAgoMs: 30_000 },
      { id: 'b2', name: 'tablet', tokenHash: 'y', createdAt: now - 2000, lastSeenAt: now - 90 * 60_000, lastSeenIp: null, seenCount: 1, seenAgoMs: 90 * 60_000 },
    ],
    conversations: [
      { channel: 'telegram', address: '42', lastSeen: now - 60_000, lastText: 'ki obostha' },
      { channel: 'whatsapp', address: '8801', lastSeen: now - 3 * 60 * 60_000, lastText: 'later' },
      { channel: 'telegram', address: '43', lastSeen: now - 2 * 60 * 60_000 },
    ],
    peopleLimit: 2,
  });

  // slack is not configured and not running: it is not presence, so no row.
  assert.deepEqual(
    p.entries.map((e) => `${e.kind}:${e.id}`),
    ['panel:panel', 'channel:telegram', 'channel:whatsapp', 'device:a1', 'device:b2', 'person:telegram:42', 'person:telegram:43'],
  );
  assert.equal(p.entries.find((e) => e.kind === 'panel')?.state, 'online');
  assert.equal(p.entries.find((e) => e.id === 'whatsapp')?.state, 'off');
  assert.equal(p.entries.find((e) => e.id === 'b2')?.state, 'idle');
  assert.equal(p.entries.find((e) => e.id === 'telegram:42')?.state, 'online');
  assert.match(p.entries.find((e) => e.id === 'telegram:42')?.detail ?? '', /"ki obostha"/);

  const line = presenceLine(p);
  assert.match(line, /^👀 here: /);
  assert.match(line, /2 watchers/);
  assert.match(line, /telegram running/);
  assert.match(line, /whatsapp not running/);
  assert.match(line, /2 device\(s\), 1 online/);
  assert.match(line, /1 person\(s\) recently/);

  const quiet = buildPresence({ watchers: 0, channels: [], devices: [], conversations: [] });
  assert.equal(presenceLine(quiet), '👀 quiet: no watchers · nobody wrote recently');
  // The panel row still exists when the count is known: zero is presence too.
  assert.match(formatPresence(quiet), /0 watchers .* nobody is attached to the gateway right now/);
});

test('24.1 with no gateway the watcher count is unknown, not faked as zero', () => {
  home('local');
  const p = localPresence();
  assert.equal(p.watchers, null);
  assert.equal(p.entries.some((e) => e.kind === 'panel'), false, 'no watcher row when it cannot be known');
  assert.match(formatPresence(p), /nothing to report/);
});

// ---------------------------------------------------------------------------
// 24.1 — over HTTP: the live picture, and an event when it changes
// ---------------------------------------------------------------------------

test('24.1 /api/presence counts attached watchers, and attaching emits a presence event', async () => {
  const dir = home('http');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = 'test-token';
  config.gateway.port = await freePort();
  saveConfig(config);

  let handle: GatewayHandle | undefined;
  try {
    handle = await startGateway({ config, host: '127.0.0.1', port: config.gateway.port });
    const base = `http://127.0.0.1:${config.gateway.port}`;
    const auth = { authorization: 'Bearer test-token' };

    const before = (await (await fetch(`${base}/api/presence`, { headers: auth })).json()) as {
      ok: boolean;
      watchers: number | null;
      summary: string;
      entries: { kind: string; state: string }[];
    };
    assert.equal(before.ok, true);
    assert.equal(before.watchers, 0);
    assert.match(before.summary, /no watchers/);

    // Watch for the bus event first, then attach a real SSE client.
    const seen = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no presence event within 3s')), 3000);
      const off = bus.subscribe((ev) => {
        if (ev.type !== 'presence') return;
        clearTimeout(timer);
        off();
        resolve(String(ev.change ?? ''));
      });
    });
    const controller = new AbortController();
    const stream = await fetch(`${base}/api/events`, { headers: auth, signal: controller.signal });
    assert.equal(stream.status, 200);
    const reader = stream.body?.getReader();
    await reader?.read(); // ": connected"
    const change = await seen;
    assert.equal(change, 'watch');

    const during = (await (await fetch(`${base}/api/presence`, { headers: auth })).json()) as {
      watchers: number | null;
      entries: { kind: string; label: string; state: string }[];
      summary: string;
    };
    assert.equal(during.watchers, 1);
    const panel = during.entries.find((e) => e.kind === 'panel');
    assert.equal(panel?.state, 'online');
    assert.equal(panel?.label, '1 watcher');
    assert.match(during.summary, /^👀 here: 1 watcher/);

    controller.abort();
    await new Promise((r) => setTimeout(r, 100));

    // /status carries the same sentence, so a chat can answer without a new command.
    const status = (await (await fetch(`${base}/api/status`, { headers: auth })).json()) as {
      presence: { watchers: number | null; summary: string; online: number };
    };
    assert.equal(status.presence.watchers, 0);
    assert.match(status.presence.summary, /no watchers/);

    // And the CLI reads the live picture rather than falling back to disk.
    const out = await runCliAsync(['presence', '--json'], dir);
    assert.equal(out.status, 0);
    const parsed = JSON.parse(out.stdout) as { data: { live: boolean; watchers: number | null; summary: string } };
    assert.equal(parsed.data.live, true);
    assert.equal(parsed.data.watchers, 0);
  } finally {
    await handle?.stop();
  }
});

test('24.1 with the panel down the CLI still answers, and says the picture is from disk', async () => {
  const dir = home('offline');
  // Point the CLI at a port nothing listens on: otherwise it would find
  // whatever gateway happens to be running on the machine's default port.
  const config = defaults();
  config.gateway.port = await freePort();
  config.gateway.token = '';
  saveConfig(config);
  const out = await runCliAsync(['presence', '--json'], dir);
  assert.equal(out.status, 0, 'presence is not an error when nothing is running');
  const parsed = JSON.parse(out.stdout) as { data: { live: boolean; watchers: number | null } };
  assert.equal(parsed.data.live, false);
  assert.equal(parsed.data.watchers, null);

  const human = await runCliAsync(['presence'], dir);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /who can reach this agent \(from disk\)/);
  assert.match(human.stdout, /online = seen in the last 2 minute\(s\)/);
  assert.match(human.stderr, /the panel is not running/);
});

// ---------------------------------------------------------------------------
// 24.2 — event triggers: a hook that wakes on its own
// ---------------------------------------------------------------------------

test('24.2 matching is exact, family-wide, everything — or nothing at all', () => {
  assert.equal(patternMatches('run.failed', 'run.failed'), true);
  assert.equal(patternMatches('run.failed', 'run.failed.later'), false);
  assert.equal(patternMatches('device.*', 'device.paired'), true);
  assert.equal(patternMatches('device.*', 'device'), false, 'the dot is part of the family');
  assert.equal(patternMatches('*', 'anything.at.all'), true);
  assert.equal(patternMatches('', 'run.failed'), false);
  assert.equal(matchesEvent(['cron.*', 'run.failed'], 'run.failed'), true);
  assert.equal(matchesEvent([], 'run.failed'), false);
  // Every catalogued event is a name a hook can actually use.
  assert.deepEqual(
    KNOWN_EVENTS.map((e) => e.name),
    ['run.failed', 'device.paired', 'file.received', 'cron.finished'],
  );
});

test('24.2 a hook is never woken by its own failure, and not twice a minute', () => {
  const hook = { id: 'oncall', prompt: 'what broke?', on: ['run.failed'] };
  const noOn = { id: 'quiet', prompt: 'webhook only' };
  const now = 1_700_000_000_000;

  const plain = planTriggers([hook, noOn], { event: 'run.failed', data: {} }, { now });
  assert.deepEqual(plain.map((d) => d.hook.id), ['oncall']);
  assert.equal(planTriggers([hook], { event: 'cron.finished' }, { now }).length, 0);

  const own = planTriggers([hook], { event: 'run.failed', fromSession: triggerSession('oncall') }, { now });
  assert.deepEqual(own, [{ hook, skipped: 'self' }], 'a failing hook must not wake itself');

  const lastFired = new Map([['oncall', now - 30_000]]);
  const cooling = planTriggers([hook], { event: 'run.failed' }, { now, lastFired });
  assert.deepEqual(cooling, [{ hook, skipped: 'cooldown' }]);
  const after = planTriggers([hook], { event: 'run.failed' }, { now, lastFired: new Map([['oncall', now - 61_000]]) });
  assert.deepEqual(after.map((d) => d.skipped), [undefined]);

  const message = triggerMessage(hook, { event: 'run.failed', data: { message: 'boom' } });
  assert.match(message, /^\[event:run\.failed\] what broke\?/);
  assert.match(message, /Payload: \{"message":"boom"\}/);
});

test('24.2 pairing a device wakes the hook that listens for it', async () => {
  const dir = home('trigger');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = 'test-token';
  config.gateway.port = await freePort();
  config.hooks = [
    { id: 'welcome', token: 's3cret', prompt: 'say hello to the new device', on: ['device.paired'] },
    { id: 'quiet', token: 'other', prompt: 'webhook only' },
  ];
  saveConfig(config);

  let handle: GatewayHandle | undefined;
  try {
    handle = await startGateway({ config, host: '127.0.0.1', port: config.gateway.port });
    const base = `http://127.0.0.1:${config.gateway.port}`;
    const auth = { authorization: 'Bearer test-token' };

    const fired = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no trigger event within 4s')), 4000);
      const off = bus.subscribe((ev) => {
        if (ev.type !== 'trigger') return;
        clearTimeout(timer);
        off();
        resolve(ev);
      });
    });

    const code = pairCode({ label: 'pixel' });
    const res = await fetch(`${base}/api/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: code.code, name: 'pixel' }),
    });
    assert.equal(res.status, 200);

    const ev = await fired;
    assert.equal(ev.event, 'device.paired');
    assert.deepEqual(ev.hooks, ['welcome'], 'the webhook-only hook stays quiet');

    // The turn really was queued in the hook's own session, and it ran (the
    // mock provider answers instantly), so the transcript is on disk.
    let sessions: { id: string }[] = [];
    for (let i = 0; i < 40; i++) {
      const body = (await (await fetch(`${base}/api/sessions`, { headers: auth })).json()) as { sessions?: { id: string }[] };
      sessions = body.sessions ?? [];
      if (sessions.some((s) => s.id.includes('hook:welcome'))) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(
      sessions.some((s) => s.id.includes('hook:welcome')),
      `expected a hook:welcome session, saw: ${sessions.map((s) => s.id).join(', ')}`,
    );
  } finally {
    await handle?.stop();
  }
});

test('24.2 termcrab events lists what can wake a hook, and who listens', async () => {
  const dir = home('events');
  const config = defaults();
  config.gateway.port = await freePort(); // nothing there: the command is local
  config.hooks = [{ id: 'oncall', token: 's', prompt: 'what broke?', on: ['run.failed'] }];
  saveConfig(config);

  const out = await runCliAsync(['events', '--json'], dir);
  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout) as { data: { count: number; events: { name: string; hooks: string[] }[] } };
  assert.equal(parsed.data.count, 4);
  assert.deepEqual(parsed.data.events.find((e) => e.name === 'run.failed')?.hooks, ['oncall']);
  assert.deepEqual(parsed.data.events.find((e) => e.name === 'device.paired')?.hooks, []);

  const human = await runCliAsync(['events'], dir);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /run\.failed.*→ hook:oncall/s);
  assert.match(human.stdout, /device\.paired[\s\S]*\(no hook listens\)/);
  assert.match(human.stdout, /never woken by its own session/);
});
