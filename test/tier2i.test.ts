import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig, type Config } from '../src/core/config.js';
import {
  CODE_TTL_MS,
  devicesPath,
  listDevices,
  liveCodes,
  normalizeCode,
  pairCode,
  redeemCode,
  revokeDevice,
  verifyDeviceToken,
} from '../src/gateway/devices.js';
import { authenticate, authKey, checkToken } from '../src/gateway/auth.js';
import {
  EVENT_FAMILIES,
  EVENT_TYPES,
  WIRE_VERSION,
  checkWireEvent,
  eventFamily,
  parseChatRequest,
  parsePairRequest,
  recallIdempotent,
  rememberIdempotent,
  safeEventType,
  wrapEvent,
} from '../src/gateway/protocol.js';
import { RateLimiter, limiterFromConfig, rateLimitHint } from '../src/gateway/ratelimit.js';
import { bus } from '../src/gateway/events.js';
import { startGateway, type GatewayHandle } from '../src/gateway/server.js';

/**
 * Batch 20 — gateway trust.
 *
 * 20.1 devices pair and can be revoked · 20.2 a typed wire with idempotency ·
 * 20.3 limits that answer · 20.4 the whole thing over a real socket.
 */

let counter = 0;
function useHome(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t20-${tag}-`));
  process.env.TCRAB_HOME = dir;
  counter += 1;
  return dir;
}

function cfgWith(over: (c: Config) => void = () => undefined): Config {
  const c = defaults();
  c.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  over(c);
  return c;
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

async function withGateway(
  configure: (c: Config) => void,
  fn: (base: string, handle: GatewayHandle) => Promise<void>,
): Promise<void> {
  useHome('gw');
  const config = cfgWith(configure);
  saveConfig(config);
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  try {
    await fn(`http://127.0.0.1:${port}`, handle);
  } finally {
    await handle.stop();
  }
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: Record<string, unknown>; headers: Headers }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body, headers: res.headers };
}

// ---------------------------------------------------------------------------
// 20.1 — devices pair, and can be revoked
// ---------------------------------------------------------------------------

test('20.1 a pairing code is short, unambiguous and short-lived', () => {
  useHome('code');
  const made = pairCode({ label: 'pixel' });
  assert.equal(made.code.length, 6);
  assert.match(made.code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/, 'no 0/O/1/I in a code typed on a phone');
  assert.equal(made.ttlMs, CODE_TTL_MS);
  assert.ok(Math.abs(made.expiresAt - (Date.now() + CODE_TTL_MS)) <= 50, 'expires in five minutes');
  assert.equal(liveCodes().length, 1, 'a fresh code is live');
});

test('20.1 a code is single use', () => {
  useHome('single');
  const { code } = pairCode();
  const first = redeemCode(code, 'pixel');
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.match(first.token, /^tc_dev_/, 'the device gets its own token, not the master one');
  assert.equal(first.device.name, 'pixel');

  const second = redeemCode(code, 'someone-else');
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, 'unknown', 'a burned code is simply unknown');
  assert.equal(listDevices().length, 1, 'the second attempt paired nothing');
});

test('20.1 an expired code is refused, and says so', () => {
  useHome('expired');
  const start = Date.now();
  const made = pairCode({ now: start, ttlMs: 60_000 });
  const late = redeemCode(made.code, 'pixel', { now: start + 61_000 });
  assert.equal(late.ok, false);
  if (!late.ok) assert.equal(late.reason, 'expired');
  assert.equal(liveCodes({ now: start + 61_000 }).length, 0, 'expired codes are pruned, not kept');
});

test('20.1 a missing or empty code is refused, never thrown', () => {
  useHome('empty-code');
  assert.equal(redeemCode('', 'pixel').ok, false);
  assert.equal(redeemCode(undefined as unknown as string, 'pixel').ok, false);
  assert.equal(normalizeCode(undefined), '');
  const res = redeemCode('', 'pixel');
  if (!res.ok) assert.equal(res.reason, 'empty');
});

test('20.1 codes are forgiving of spaces, dashes and case', () => {
  useHome('normalize');
  const made = pairCode();
  const typed = ` ${made.code.toLowerCase().slice(0, 3)}-${made.code.toLowerCase().slice(3)} `;
  assert.equal(normalizeCode(typed), made.code);
  const res = redeemCode(typed, 'pixel');
  assert.equal(res.ok, true, 'a human typing 3-3 gets in');
});

test('20.1 a revoked device stops working while the others keep theirs', () => {
  useHome('revoke');
  const a = redeemCode(pairCode().code, 'phone');
  const b = redeemCode(pairCode().code, 'tablet');
  assert.equal(a.ok && b.ok, true);
  if (!a.ok || !b.ok) return;

  const gone = revokeDevice(a.device.id);
  assert.equal(gone?.name, 'phone');
  assert.equal(verifyDeviceToken(a.token), null, 'the revoked token is dead immediately');
  assert.ok(verifyDeviceToken(b.token), 'the other device is untouched');
  assert.equal(revokeDevice('phone'), null, 'revoking twice finds nothing');
});

test('20.1 only a hash of the token reaches the disk', () => {
  useHome('hash');
  const res = redeemCode(pairCode().code, 'pixel');
  assert.equal(res.ok, true);
  if (!res.ok) return;
  const onDisk = fs.readFileSync(devicesPath(), 'utf8');
  assert.equal(onDisk.includes(res.token), false, 'the plaintext token is never stored');
  assert.equal(onDisk.includes('tokenHash'), true, 'the hash is what is kept');
  const mode = fs.statSync(devicesPath()).mode & 0o777;
  assert.equal(mode, 0o600, 'the device file is owner-only');
});

test('20.1 authenticate() accepts a device token and the master token, and nothing else', () => {
  useHome('auth');
  const config = cfgWith((c) => {
    c.gateway.token = 'master-secret';
  });
  const paired = redeemCode(pairCode().code, 'pixel');
  assert.equal(paired.ok, true);
  if (!paired.ok) return;

  const asDevice = authenticate(config, paired.token);
  assert.equal(asDevice.ok, true);
  if (asDevice.ok) assert.equal(asDevice.kind, 'device');

  const asMaster = authenticate(config, 'Bearer master-secret');
  assert.equal(asMaster.ok, true);
  if (asMaster.ok) assert.equal(asMaster.kind, 'master');

  assert.equal(authenticate(config, 'nonsense').ok, false);
  assert.equal(authenticate(config, '').ok, false);
  assert.equal(authenticate(config, paired.token).ok, true, 'a device survives a second call');

  revokeDevice('pixel');
  assert.equal(authenticate(config, paired.token).ok, false, 'revoked means refused at the door');
  assert.equal(checkToken(config, 'master-secret'), true, 'the old check still answers for the master token');
});

test('20.1 every request stamps the device it came from', () => {
  useHome('seen');
  const paired = redeemCode(pairCode().code, 'pixel');
  assert.equal(paired.ok, true);
  if (!paired.ok) return;
  const before = listDevices()[0]!;
  assert.equal(before.lastSeenAt, null);
  assert.equal(before.seenAgoMs, null);

  verifyDeviceToken(paired.token, { ip: '100.64.0.7' });
  const after = listDevices()[0]!;
  assert.ok(after.lastSeenAt && after.seenAgoMs !== null && after.seenAgoMs >= 0);
  assert.equal(after.seenCount, 1);
  assert.equal(after.lastSeenIp, '100.64.0.7', 'so "which device is this?" has an answer');
});

// ---------------------------------------------------------------------------
// 20.2 — a typed wire protocol, and idempotency
// ---------------------------------------------------------------------------

test('20.2 every frame carries a version, a sequence number and a safe type', () => {
  useHome('wire');
  const first = wrapEvent({ type: 'Tool: Start!', name: 'read_file', ts: 1234 });
  assert.equal(first.v, WIRE_VERSION);
  assert.equal(first.type, 'Tool:-Start', 'a messy type is normalised, never sent raw');
  assert.equal(safeEventType('thinkingCaps'), 'thinkingCaps', 'case is kept: the panel listens by name');
  assert.equal(first.ts, 1234, 'the event keeps its own timestamp');
  assert.equal(first.name, 'read_file', 'the payload stays flat for existing clients');
  assert.equal(checkWireEvent(first).length, 0, 'a wrapped frame is valid by construction');

  const second = wrapEvent({ type: 'delta' });
  assert.ok(second.seq > first.seq, 'seq is monotonic, so a client can see a gap');
  assert.equal(wrapEvent({ type: 'delta' }, 7).seq, 7, 'a caller may pin a seq (tests, replays)');

  assert.equal(safeEventType(''), 'unknown');
  assert.equal(safeEventType('a b\nc'), 'a-b-c');
  assert.deepEqual(checkWireEvent({ v: 2, seq: 1, ts: 1, type: 'delta' }), ['v is 2, expected 1']);
  assert.ok(checkWireEvent({ v: 1, seq: 0, ts: 1, type: 'delta' }).some((p) => p.includes('seq')));
  assert.ok(checkWireEvent({ v: 1, seq: 1, ts: Number.NaN, type: 'delta' }).some((p) => p.includes('ts')));
  assert.ok(checkWireEvent({ v: 1, seq: 1, ts: 1 }).some((p) => p.includes('type')));
  assert.ok(
    checkWireEvent({ v: 1, seq: 1, ts: 1, type: 'Bad Type' }).some((p) => p.includes('safe token')),
  );
});

test('20.2 the documented families cover every event the source emits', () => {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (p.endsWith('.ts')) files.push(p);
    }
  };
  walk('src');
  const emitted = new Set<string>();
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const re = /emit\(\s*\{[^}]{0,300}?type:\s*'([a-zA-Z][a-zA-Z0-9._:-]*)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) emitted.add(m[1]!);
  }
  assert.ok(emitted.size >= 15, `the scan found the real emitters (${emitted.size} types)`);
  const undocumented = [...emitted].filter((t) => !EVENT_TYPES.includes(t));
  assert.deepEqual(undocumented, [], 'a new event type must be added to EVENT_FAMILIES (and docs/API.md)');
  for (const type of emitted) {
    assert.ok(eventFamily(type), `${type} belongs to a family`);
  }
  assert.equal(eventFamily('nope-not-a-thing'), null);

  const doc = fs.readFileSync('docs/API.md', 'utf8');
  assert.match(doc, /v: 1|`v`: 1/, 'the doc names the wire version');
  for (const family of EVENT_FAMILIES) {
    assert.ok(doc.includes(`\`${family.family}\``), `docs/API.md documents the ${family.family} family`);
    for (const type of family.types) {
      assert.ok(doc.includes(`\`${type}\``), `docs/API.md lists ${type}`);
    }
  }
});

test('20.2 a bad chat body names the field that is wrong', () => {
  useHome('parse');
  const noBody = parseChatRequest(null);
  assert.equal(noBody.ok, false);
  if (!noBody.ok) assert.equal(noBody.field, 'body');

  const empty = parseChatRequest({ message: '   ' });
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.field, 'message');
    assert.match(empty.error, /required/);
  }
  const huge = parseChatRequest({ message: 'x'.repeat(100_001) });
  assert.equal(huge.ok, false);
  if (!huge.ok) assert.match(huge.error, /longer than/);

  const ok = parseChatRequest({ message: 'hello', agent: 'brief' }, 'key-from-header');
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.message, 'hello');
    assert.equal(ok.value.sessionId, 'web:main', 'the default session is part of the protocol');
    assert.equal(ok.value.agent, 'brief');
    assert.equal(ok.value.idempotencyKey, 'key-from-header', 'the header is accepted too');
  }
  const bodyWins = parseChatRequest({ message: 'hi', idempotencyKey: 'from-body' }, 'from-header');
  assert.equal(bodyWins.ok && bodyWins.value.idempotencyKey, 'from-body');
});

test('20.2 a pairing body needs a code', () => {
  useHome('parse-pair');
  const bad = parsePairRequest({});
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.field, 'code');
  const ok = parsePairRequest({ code: 'ABC123' });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.name, 'device', 'an unnamed device still gets a name');
});

test('20.2 the same key returns the same run, and forgets after a day', () => {
  useHome('idem');
  const now = Date.now();
  assert.equal(recallIdempotent('k1', { now }), null, 'nothing remembered yet');
  rememberIdempotent('k1', { turnId: 't-1', sessionId: 'web:main' }, { now });
  assert.deepEqual(recallIdempotent('k1', { now: now + 1000 }), { turnId: 't-1', sessionId: 'web:main' });
  assert.equal(recallIdempotent('k2', { now }), null, 'a different key is a different request');
  assert.equal(
    recallIdempotent('k1', { now: now + 25 * 60 * 60_000 }),
    null,
    'a day later the key is gone, not returned stale',
  );
  assert.equal(recallIdempotent('', { now }), null, 'an empty key never matches');
});

// ---------------------------------------------------------------------------
// 20.3 — limits that answer
// ---------------------------------------------------------------------------

test('20.3 a burst is allowed, then refused with a wait time, then refilled', () => {
  const limiter = new RateLimiter({ perMinute: 60, burst: 2 });
  const t0 = 1_000_000;
  assert.equal(limiter.allow('phone', t0).ok, true);
  assert.equal(limiter.allow('phone', t0).ok, true);
  const third = limiter.allow('phone', t0);
  assert.equal(third.ok, false, 'the third message in the same instant is over the burst');
  assert.ok(third.retryAfterMs > 0 && third.retryAfterMs <= 1000, `waits about a second (${third.retryAfterMs}ms)`);
  assert.equal(limiter.allow('other', t0).ok, true, 'one noisy key does not silence another');
  assert.equal(limiter.allow('phone', t0 + 1000).ok, true, 'a second later there is room again');
  limiter.reset('phone');
  assert.equal(limiter.allow('phone', t0 + 1000).ok, true);
});

test('20.3 the limiter reads config, clamps nonsense and explains itself', () => {
  useHome('limit-cfg');
  const custom = cfgWith((c) => {
    (c.gateway as { rateLimit?: { perMinute: number; burst: number } }).rateLimit = {
      perMinute: 12,
      burst: 3,
    };
  });
  assert.deepEqual(limiterFromConfig(custom).config, { perMinute: 12, burst: 3 });

  const junk = cfgWith((c) => {
    (c.gateway as { rateLimit?: { perMinute: number; burst: number } }).rateLimit = {
      perMinute: -5,
      burst: 0,
    };
  });
  const clamped = limiterFromConfig(junk).config;
  assert.equal(clamped.perMinute, 1, 'never zero or negative: a limiter that blocks everything is a bug');
  assert.equal(clamped.burst, 1);
  assert.deepEqual(limiterFromConfig(cfgWith()).config, { perMinute: 60, burst: 10 }, 'the default is stated');

  assert.match(rateLimitHint(3600), /4s|3s|^Too many/);
  assert.match(rateLimitHint(1), /try again in 1s/);
  assert.equal(rateLimitHint(0), 'Too many messages at once — try again in 1s.');
});

test('20.3 the snapshot reports without spending', () => {
  const limiter = new RateLimiter({ perMinute: 60, burst: 2 });
  const t0 = 5_000_000;
  limiter.allow('a', t0);
  limiter.allow('a', t0);
  assert.equal(limiter.allow('a', t0).ok, false);
  const snap = limiter.snapshot(t0);
  assert.deepEqual(snap.map((s) => [s.key, s.limited]), [['a', true]], 'a fresh snapshot shows who is limited');
  assert.equal(limiter.allow('a', t0 + 60_000).ok, true, 'taking a snapshot does not consume tokens');
});

// ---------------------------------------------------------------------------
// 20.4 — the same rules over a real socket
// ---------------------------------------------------------------------------

test('20.4 pair over HTTP, then use the device token', async () => {
  await withGateway(
    (c) => {
      c.gateway.token = 'master-secret';
    },
    async (base) => {
      const noAuth = await fetchJson(`${base}/api/devices`);
      assert.equal(noAuth.status, 401, 'devices are behind the door');

      const badCode = await fetchJson(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'ZZZZZZ' }),
      });
      assert.equal(badCode.status, 401);
      assert.equal(badCode.body.reason, 'unknown');
      assert.match(String(badCode.body.error), /termcrab pair/, 'the refusal says how to get a code');

      const made = pairCode({ label: 'pixel' });
      const paired = await fetchJson(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: made.code, name: 'pixel' }),
      });
      assert.equal(paired.status, 200);
      assert.equal(paired.body.v, WIRE_VERSION);
      const token = String(paired.body.token);
      assert.match(token, /^tc_dev_/);
      assert.match(String(paired.body.note), /shown once/);

      const again = await fetchJson(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: made.code }),
      });
      assert.equal(again.status, 401, 'the code is burned');

      const listed = await fetchJson(`${base}/api/devices`, {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(listed.status, 200, 'the device token opens the API');
      const devices = listed.body.devices as Array<Record<string, unknown>>;
      assert.equal(devices.length, 1);
      assert.equal(devices[0]!.name, 'pixel');
      assert.equal(devices[0]!.current, true, 'the caller is marked as this device');
      assert.equal(devices[0]!.tokenHash, undefined, 'hashes never leave the server');

      const revoked = await fetchJson(`${base}/api/devices/revoke`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'pixel' }),
      });
      assert.equal(revoked.status, 200, 'a device may revoke itself (its own token authorized this)');
      const after = await fetchJson(`${base}/api/devices`, { headers: { authorization: `Bearer ${token}` } });
      assert.equal(after.status, 401, 'and then its token is dead');
      const master = await fetchJson(`${base}/api/devices`, {
        headers: { authorization: 'Bearer master-secret' },
      });
      assert.equal(master.status, 200, 'the owner is not locked out by revoking a device');
      assert.equal((master.body.devices as unknown[]).length, 0);
    },
  );
});

test('20.4 bad bodies and bursts answer with a reason, not silence', async () => {
  await withGateway(
    (c) => {
      c.gateway.token = 'master-secret';
      (c.gateway as { rateLimit?: { perMinute: number; burst: number } }).rateLimit = {
        perMinute: 60,
        burst: 2,
      };
    },
    async (base) => {
      const headers = { authorization: 'Bearer master-secret', 'content-type': 'application/json' };

      const notJson = await fetchJson(`${base}/api/chat`, { method: 'POST', headers, body: 'not json' });
      assert.equal(notJson.status, 400);
      assert.equal(notJson.body.field, 'body');

      const noMessage = await fetchJson(`${base}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: '  ' }),
      });
      assert.equal(noMessage.status, 400);
      assert.equal(noMessage.body.field, 'message');

      // A submitted turn whose provider is unreachable still shows idempotency
      // working: the first call enqueues, the replay returns the same turn id.
      const first = await fetchJson(`${base}/api/chat`, {
        method: 'POST',
        headers: { ...headers, 'idempotency-key': 'retry-me' },
        body: JSON.stringify({ message: 'hello there' }),
      });
      assert.equal(first.status, 202);
      const replay = await fetchJson(`${base}/api/chat`, {
        method: 'POST',
        headers: { ...headers, 'idempotency-key': 'retry-me' },
        body: JSON.stringify({ message: 'hello there' }),
      });
      assert.equal(replay.status, 200);
      assert.equal(replay.body.replayed, true, 'the retry is labelled, not hidden');
      assert.equal(replay.body.turnId, first.body.turnId, 'and it is the same run');

      const burst1 = await fetchJson(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'AAAAAA' }),
      });
      const burst2 = await fetchJson(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'AAAAAA' }),
      });
      const burst3 = await fetchJson(`${base}/api/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'AAAAAA' }),
      });
      assert.equal(burst1.status, 401, 'first try: wrong code');
      assert.equal(burst2.status, 401, 'second try: wrong code, still inside the burst');
      assert.equal(burst3.status, 429, 'third try in the same instant: refused, not answered');
      assert.ok(Number(burst3.body.retryAfterMs) > 0);
      assert.match(String(burst3.body.error), /Too many messages/);
      assert.ok(Number(burst3.headers.get('retry-after')) >= 1, 'the header is set for proxies too');
    },
  );
});

test('20.4 SSE frames carry the version and a rising sequence number', async () => {
  await withGateway(
    (c) => {
      c.gateway.token = 'master-secret';
    },
    async (base) => {
      const res = await fetch(`${base}/api/events?token=master-secret`);
      assert.equal(res.status, 200);
      const reader = res.body!.getReader();
      const seen: Array<Record<string, unknown>> = [];
      const decode = (chunk: string): void => {
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          seen.push(JSON.parse(line.slice(6)) as Record<string, unknown>);
        }
      };
      try {
        const first = await reader.read();
        decode(new TextDecoder().decode(first.value));
        bus.emit({ type: 'tool:start', name: 'read_file' });
        bus.emit({ type: 'tool:end', name: 'read_file', ok: true });
        const deadline = Date.now() + 3000;
        while (seen.length < 2 && Date.now() < deadline) {
          const next = await Promise.race([
            reader.read(),
            new Promise<{ value?: Uint8Array }>((r) => setTimeout(() => r({}), 200)),
          ]);
          if (next.value) decode(new TextDecoder().decode(next.value));
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
      assert.ok(seen.length >= 2, `two frames arrived (${seen.length})`);
      // Attaching is itself presence news (24.1), so the newly connected
      // client may see its own `presence` frame first; that frame is still a
      // valid wire frame, and the real events behind it keep their shape.
      for (const frame of seen) assert.equal(checkWireEvent(frame).length, 0, `every frame is valid: ${JSON.stringify(frame)}`);
      const events = seen.filter((f) => f.type !== 'presence');
      assert.equal(events[0]!.v, WIRE_VERSION);
      assert.equal(events[0]!.type, 'tool:start', 'the type is unchanged, so existing clients keep working');
      assert.equal(events[1]!.seq, (events[0]!.seq as number) + 1, 'sequence numbers rise by one');
    },
  );
});

test('20.4 the auth key separates devices, tokens and peers', () => {
  useHome('authkey');
  const config = cfgWith((c) => {
    c.gateway.token = 'master-secret';
  });
  const paired = redeemCode(pairCode().code, 'pixel');
  assert.equal(paired.ok, true);
  if (!paired.ok) return;
  const deviceAuth = authenticate(config, paired.token);
  assert.equal(authKey(deviceAuth, paired.token, '127.0.0.1'), `device:${paired.device.id}`);
  assert.equal(authKey(authenticate(config, 'master-secret'), 'master-secret', null), 'master');
  assert.match(authKey({ ok: false, kind: 'none' }, 'someone', '127.0.0.1'), /^token:/);
  assert.equal(authKey({ ok: false, kind: 'none' }, null, '10.0.0.9'), 'ip:10.0.0.9');
});
