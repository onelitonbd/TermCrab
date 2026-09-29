import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults, loadConfig } from '../src/core/config.js';

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

/** First live-server test suite: web control parity (v0.5 P0 #0). */
test('web control parity API', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tapi-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1', apiKey: 'sk-secret-abcdef123456' };
  config.gateway.token = 'test-token';
  const port = await freePort();
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;

  const req = async (
    p: string,
    method = 'GET',
    body?: unknown,
  ): Promise<{ status: number; data: Record<string, unknown> }> => {
    const res = await fetch(base + p, {
      method,
      headers: {
        authorization: 'Bearer test-token',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty body */
    }
    return { status: res.status, data };
  };

  try {
    await t.test('unauthorized requests are rejected', async () => {
      const res = await fetch(`${base}/api/config`);
      assert.equal(res.status, 401);
    });

    await t.test('GET /api/config masks secrets', async () => {
      const { status, data } = await req('/api/config');
      assert.equal(status, 200);
      const raw = JSON.stringify(data);
      assert.ok(!raw.includes('sk-secret-abcdef123456'), 'raw apiKey must not leak');
      assert.ok(!raw.includes('test-token'), 'raw gateway token must not leak');
      const cfg = data.config as Record<string, unknown>;
      const provider = cfg.provider as Record<string, unknown>;
      assert.equal(provider.apiKey, 'sk•••56');
      assert.equal(typeof data.path, 'string');
    });

    await t.test('POST /api/config sets a dotted key and persists', async () => {
      const { status, data } = await req('/api/config', 'POST', {
        key: 'heartbeat.minutes',
        value: '45',
      });
      assert.equal(status, 200);
      const cfg = data.config as { heartbeat: { minutes: number } };
      assert.equal(cfg.heartbeat.minutes, 45);
      assert.equal(loadConfig().heartbeat.minutes, 45, 'must be written to disk');
    });

    await t.test('masked secret left untouched is kept', async () => {
      const masked = ((await req('/api/config')).data.config as {
        provider: { apiKey: string };
      }).provider.apiKey;
      const { data } = await req('/api/config', 'POST', { key: 'provider.apiKey', value: masked });
      assert.equal(data.unchanged, true);
      assert.equal(loadConfig().provider.apiKey, 'sk-secret-abcdef123456');
    });

    await t.test('invalid config key rejected', async () => {
      const { status } = await req('/api/config', 'POST', { key: 'bad key!', value: 'x' });
      assert.equal(status, 400);
    });

    await t.test('POST /api/doctor returns the check list', async () => {
      const { status, data } = await req('/api/doctor', 'POST');
      assert.equal(status, 200);
      const checks = data.checks as { id: string }[];
      assert.ok(Array.isArray(checks) && checks.length > 5);
      assert.ok(checks.some((c) => c.id === 'node'));
      assert.ok(checks.some((c) => c.id === 'embeddings'));
      assert.ok(checks.some((c) => c.id === 'dream'));
    });

    await t.test('GET /api/status aggregates runtime state', async () => {
      const { data } = await req('/api/status');
      assert.equal(typeof data.version, 'string');
      assert.equal(typeof data.provider, 'string');
      assert.ok(data.dream && data.memory && data.local);
      assert.ok(Array.isArray(data.agents));
      assert.ok((data.memory as { index: { enabled: boolean } }).index);
    });

    await t.test('memory remember / search / edit round-trip', async () => {
      const r1 = await req('/api/memory/remember', 'POST', { fact: 'loves shell scripting' });
      assert.equal(r1.status, 200);
      assert.equal(r1.data.ok, true);
      const r2 = await req('/api/memory/search', 'POST', { query: 'shell scripting' });
      assert.equal(r2.status, 200);
      const hits = r2.data.hits as { line: string }[];
      assert.ok(hits.length >= 1, 'remembered fact must be searchable');
      assert.match(hits[0]!.line, /shell scripting/);
      const r3 = await req('/api/memory', 'PUT', {
        content: '# Long-term memory\n\n- replaced line\n',
      });
      assert.equal(r3.status, 200);
      const g = await req('/api/memory');
      assert.match((g.data.content as string), /replaced line/);
      const bad = await req('/api/memory', 'PUT', { content: 42 });
      assert.equal(bad.status, 400);
    });

    await t.test('skills import + show + 404', async () => {
      const src = path.join(home, 'skill-src');
      fs.mkdirSync(src, { recursive: true });
      fs.writeFileSync(
        path.join(src, 'SKILL.md'),
        '---\nname: webdemo\ndescription: demo skill\n---\n\nWebdemo body here.\n',
      );
      const imp = await req('/api/skills/import', 'POST', { source: src });
      assert.equal(imp.status, 200);
      const results = imp.data.results as { name: string; action: string }[];
      assert.equal(results[0]?.name, 'webdemo');
      const show = await req('/api/skills/webdemo');
      assert.equal(show.status, 200);
      assert.match(show.data.content as string, /Webdemo body/);
      const miss = await req('/api/skills/nope');
      assert.equal(miss.status, 404);
    });

    await t.test('agents create / read / update / conflicts / chat', async () => {
      const invalid = await req('/api/agents', 'POST', { name: 'Brief!' });
      assert.equal(invalid.status, 400);
      const created = await req('/api/agents', 'POST', {
        name: 'brief',
        soul: '# SOUL\n- Be brief.\n',
      });
      assert.equal(created.status, 200);
      const list = await req('/api/agents');
      assert.ok((list.data.agents as string[]).includes('brief'));
      const read = await req('/api/agents/brief');
      assert.match(read.data.soul as string, /Be brief/);
      const upd = await req('/api/agents/brief', 'PUT', { soul: '# SOUL\n- Even shorter.\n' });
      assert.equal(upd.status, 200);
      assert.match((await req('/api/agents/brief')).data.soul as string, /Even shorter/);
      const dup = await req('/api/agents', 'POST', { name: 'brief' });
      assert.equal(dup.status, 409);
      const chat = await req('/api/chat', 'POST', {
        message: 'hello brief',
        agent: 'brief',
        sessionId: 't',
      });
      assert.equal(chat.status, 200);
      assert.equal(chat.data.sessionId, 'brief:t');
    });

    await t.test('say + boot degrade gracefully', async () => {
      const s = await req('/api/say', 'POST', { text: 'hello' });
      assert.equal(s.status, 200);
      assert.equal(typeof s.data.ok, 'boolean');
      const b = await req('/api/boot');
      assert.equal(b.status, 200);
      assert.equal(typeof b.data.installed, 'boolean');
      assert.equal(typeof b.data.termux, 'boolean');
    });

    await t.test('page routes serve the control UI (SPA fallback)', async () => {
      for (const p of ['/', '/settings', '/status', '/providers', '/memory', '/tools', '/chat']) {
        const res = await fetch(base + p);
        assert.equal(res.status, 200, p);
        const html = await res.text();
        assert.match(html, /<title>TermCrab<\/title>/, p);
      }
      // unknown API paths stay JSON 404 — never HTML
      const api404 = await fetch(base + '/api/nope', { headers: { authorization: 'Bearer test-token' } });
      assert.equal(api404.status, 404);
      assert.match(api404.headers.get('content-type') || '', /json/);
      // unknown non-GET stays plain 404
      const post404 = await fetch(base + '/settings', { method: 'POST' });
      assert.equal(post404.status, 404);
    });

    await t.test('sidebar: Chat nav removed, plus button added, chat auto-loads', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(!html.includes('data-goto="chat"'), 'sidebar must not list Chat');
      assert.ok(html.includes('id="newChatBtn"'), 'plus button beside Chat history');
      assert.ok(html.includes('<span>Chat history</span>'), 'Chat history label kept');
      // first launch after the passcode loads the current chat without selection
      assert.ok(html.includes('await loadSession(currentSession(), true)'), 'auto-load current session in bootstrap');
    });

    await t.test('auto-update endpoint requires the token', async () => {
      const res = await fetch(base + '/api/update/apply', { method: 'POST' });
      assert.equal(res.status, 401);
    });

    await t.test('v0.16: dark theme, markdown replies, full-width answers', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('content="#000000"'), 'black theme-color');
      assert.ok(html.includes('--bg: #000000'), 'black canvas token');
      assert.ok(html.includes('--primary: #238636'), 'green primary buttons');
      assert.ok(html.includes('function renderMarkdown'), 'markdown renderer shipped');
      assert.ok(html.includes('// ==== end markdown renderer ===='), 'renderer end marker');
      assert.ok(html.includes('class="mdCode"'), 'code block markup builder');
      assert.ok(html.includes("if (cls === 'bot') div.innerHTML = renderMarkdown(text)"), 'AI replies rendered as markdown');
      assert.ok(html.includes('align-self: stretch'), 'AI replies span the full width');
      assert.ok(!html.includes('#ff5c5c'), 'old coral accent removed');
    });

    await t.test('v0.17: two-layer composer + Providers page, wizard retired', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('id="composerBox"'), 'rounded two-layer composer');
      assert.ok(!html.includes('id="stopBtn"'), 'separate stop button removed');
      assert.ok(html.includes('id="attachBtn"'), 'attachment icon button');
      assert.ok(html.includes('placeholder="Type a message'), 'message placeholder');
      assert.ok(html.includes('data-goto="providers"'), 'sidebar Providers section');
      assert.ok(html.includes('id="view-providers"'), 'providers view');
      assert.ok(html.includes('id="modal"'), 'popup modal replaces the wizard');
      assert.ok(!html.includes('id="wiz"'), 'old setup wizard removed');
      assert.ok(!html.includes('wizOpen'), 'old wizard opener removed');
      assert.ok(html.includes('provStatic'), 'current-provider row for CLI/onboard setups');
      assert.ok(html.includes("p.inUse"), 'in-use flag rendered on saved providers');
    });

    await t.test('v0.19: black theme, send doubles as stop, sidebar icons', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('--bg: #000000'), 'true black canvas');
      assert.ok(html.includes('content="#000000"'), 'browser chrome matches the black theme');
      assert.ok(!html.includes('#0d1117'), 'old grey-dark canvas gone');
      assert.ok(html.includes('setSendMode'), 'send button switches into stop mode');
      assert.ok(html.includes('stopMode'), 'stop-mode class');
      assert.ok(html.includes('if (state.busy) { if (state.abort) state.abort.abort(); }'), 'clicking send while replying stops it');
      for (const v of ['status', 'providers', 'memory', 'tools', 'settings']) {
        const m = html.match(new RegExp('<button data-goto="' + v + '">([\\s\\S]*?)</button>'));
        assert.ok(m, v + ' sidebar button present');
        assert.ok(m![1]!.includes('<svg'), v + ' sidebar button has an icon');
      }
    });

    await t.test('listen (dictation) always answers with ok or a reason', async () => {
      const l = await req('/api/listen', 'POST');
      assert.equal(l.status, 200, 'must never be an HTTP error');
      assert.equal(typeof l.data.ok, 'boolean');
      if (!l.data.ok) assert.ok(typeof l.data.error === 'string' && l.data.error.length > 5);
    });
  } finally {
    await handle.stop();
  }
});
