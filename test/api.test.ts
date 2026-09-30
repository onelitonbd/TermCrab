import { test } from 'node:test';
import http from 'node:http';
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
      for (const p of ['/', '/settings', '/status', '/providers', '/models', '/memory', '/tools', '/chat']) {
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
      assert.ok(html.includes("if (cls === 'bot') {") && html.includes('div.innerHTML = renderMarkdown(text);'), 'AI replies rendered as markdown');
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

    await t.test('v0.20: Models sidebar page + composer model picker', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('data-goto="models"'), 'sidebar Models entry');
      assert.ok(html.includes('id="view-models"'), 'models view section');
      assert.ok(html.includes('id="mdlFetch"'), 'fetch button for the provider catalog');
      assert.ok(html.includes('id="mdlSearch"'), 'search bar above the list');
      assert.ok(html.includes("cb.className = 'mdlTick'"), 'rounded tick box per model');
      assert.ok(html.includes("await api('/api/providers/' + state.mdlProvId + '/models', 'POST', { model: m })"), 'save button posts ticked models to the backend');
      assert.ok(html.includes('id="mdlSave"'), 'save button on the models page');
      assert.ok(html.includes("$('mdlSave').onclick = saveMdl"), 'save button wired to instant save');
      assert.ok(html.includes('let mdlMarked = new Set()'), 'ticks are staged until Save');
      assert.ok(html.includes('ready to use right now (no restart needed)'), 'save confirms instant availability');
      assert.ok(html.includes("typeof opts === 'string'"), 'api() supports the (path, method, body) shorthand');
      assert.ok(html.includes('Could not save automatically'), 'failed auto-save tells the user to press Save');
      assert.ok(html.includes('Read back from the backend'), 'save verifies against the backend source of truth');
      assert.ok(html.includes('id="modelBtn"') && html.includes('id="modelBtnLabel"'), 'rounded model button in the composer');
      assert.ok(html.includes('d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9'), 'modern sparkle icon on the model button');
      assert.ok(html.includes('.iconBtn.modelBtn {'), 'model pill beats the base .iconBtn sizing (icon stays visible)');
      assert.ok(html.includes('class="mpTitleIcon"'), 'sparkle icon in the model selection popup title');
      assert.ok(html.includes('class="mpRowIcon"'), 'sparkle icon on every model row in the popup');
      assert.ok(!html.includes('M13.5 4.5 8 1.5'), 'old cube icon gone');
      assert.ok(html.includes('id="modelPick"'), 'model picker popup');
      assert.ok(html.includes("api('/api/models/use', 'POST'"), 'picking a model switches the live brain');
      assert.ok(html.includes('refreshModelBtn()'), 'composer button follows the live model');
      assert.ok(html.includes('showModelsRoot()'), 'models page loads only when opened');
    });

    await t.test('v0.22: memory page redesign — hero, tabs, schedule, dreams scene, settings', async () => {
      const html = await (await fetch(base + '/')).text();
      for (const tab of ['overview', 'memories', 'dreams', 'msettings']) {
        assert.ok(html.includes('data-memtab="' + tab + '"'), 'tab ' + tab);
        assert.ok(html.includes('id="memPane-' + tab + '"'), 'pane ' + tab);
      }
      assert.ok(html.includes('class="memHero"'), 'hero status card');
      assert.ok(html.includes('id="memAwake"') && html.includes('id="memEngine"'), 'hero title + engine line');
      assert.ok(html.includes('SLEEP SCHEDULE'), 'sleep schedule section');
      assert.ok(html.includes('class="phaseCard"') && html.includes('id="phMeta"'), 'phase card with real schedule');
      assert.ok(html.includes('class="dreamScene"') && html.includes('id="sceneStatus"'), 'dreams scene');
      for (const d of ['scene', 'diary', 'adv']) {
        assert.ok(html.includes('data-dtab="' + d + '"'), 'dream sub-tab ' + d);
      }
      assert.ok(html.includes('id="segEngine"') && html.includes('id="segDream"'), 'engine + dreaming segmented controls');
      assert.ok(html.includes('id="memQ"') && html.includes('id="memHits"'), 'search kept');
      assert.ok(html.includes('id="memEdit"') && html.includes('id="memSave"'), 'memory file editor kept');
      assert.ok(html.includes('id="dreamList"'), 'dream diary kept');
      assert.ok(!html.includes('id="memPanel"'), 'old collapsed panel removed');
      assert.ok(html.includes('dream.enabled') && html.includes('memory.embeddings'), 'settings write to the backend live');
      assert.ok(html.includes('id="memRefresh"') && html.includes('id="dreamRefresh"'), 'refresh buttons');
    });

    await t.test('v0.23: agent-home redesign — hero, thinking, identity, depth', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('id="hero"'), 'agent hero empty state');
      assert.ok(html.includes('id="heroStatus"') && html.includes('refreshHero'), 'live status pill in the hero');
      assert.ok(html.includes('data-ask="What can you do?"'), 'ask chip');
      assert.ok(html.includes('data-go="providers"') && html.includes('data-go="status"'), 'navigation chips');
      assert.ok(html.includes('class="chipBtn"'), 'suggestion chips');
      assert.ok(html.includes('class="sideBrand"'), 'brand block in the sidebar');
      assert.ok(html.includes("who.className = 'msgWho'"), 'AI replies get an identity line');
      assert.ok(html.includes('Crabby is thinking'), 'thinking indicator');
      assert.ok(html.includes("document.body.classList.add('busy')"), 'busy state drives the pulse');
      assert.ok(html.includes('syncHero'), 'hero hides when the conversation starts');
      assert.ok(html.includes('#composerBox:focus-within'), 'composer focus glow');
      assert.ok(html.includes('#health::before'), 'status pill dot');
      assert.ok(html.includes('nothing phones home'), 'privacy line in the hero');
      assert.ok(!html.includes('connected - your agent runs'), 'old auto sys noise removed');
      assert.ok(html.includes('<span>Chat history</span>'), 'history label kept');
    });

    await t.test('v0.23.1: empty replies fail loud — no bare placeholder', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(!html.includes("'(empty reply)'"), 'raw placeholder removed');
      assert.ok(html.includes('got no text back from the model'), 'UI fallback explains itself');
      assert.ok(html.includes('(empty reply|agent error)'), 'error replies styled as errors');
    });

    await t.test('v0.24: Tools page redesign — hero, tabs, live chips', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('data-ttab="jobs"') && html.includes('data-ttab="skills"'), 'tools tabs');
      assert.ok(html.includes('id="tlPane-jobs"') && html.includes('id="tlPane-skills"'), 'tool panes');
      assert.ok(html.includes('id="tlRefresh"'), 'hero refresh button');
      for (const id of ['chipTJobs', 'chipTChats', 'chipTSkills', 'chipTWake']) assert.ok(html.includes('id="' + id + '"'), 'chip ' + id);
      assert.ok(html.includes('showToolTab') && html.includes('refreshTools'), 'tab switcher wired');
      assert.ok(!html.includes('cronPanel') && !html.includes('voicePanel') && !html.includes('skPanel') && !html.includes('chatPanel'), 'collapsed details removed');
      // every control from the old layout must survive the redesign
      for (const id of ['cronForm', 'cronList', 'sessList', 'sessExport', 'sessRename', 'purgeDays', 'sessPurge',
        'sayTxt', 'sayGo', 'listenGo', 'bootInfo', 'bootInstall', 'wakeStart', 'wakeStop', 'wakeInfo', 'wakeTxt', 'wakeGo',
        'skList', 'skSrc', 'skForce', 'skImport', 'skView']) {
        assert.ok(html.includes('id="' + id + '"'), 'keeps ' + id);
      }
      assert.ok(html.includes('id="skView" class="hidden"'), 'skill viewer starts hidden');
    });

    await t.test('v0.25: Tools catalog tab — live tools + planned roadmap', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('data-ttab="tools"'), 'Tools tab present');
      assert.ok(html.includes('id="tlPane-tools"') && html.includes('id="toolCat"'), 'catalog pane');
      assert.ok(html.includes('id="chipTTools"'), 'live tools chip');
      assert.ok(html.includes('TOOL_CATALOG') && html.includes('refreshToolCatalog'), 'catalog logic');
      assert.ok(html.includes("['tools', 'jobs', 'chats', 'voice', 'skills']"), 'tools pane toggles with its siblings');
      for (const t of ['skill_workshop', 'progress_card', 'sessions_spawn', 'ask_user', 'conversations_send', 'create_goal', 'apply_patch', 'web_search']) {
        assert.ok(html.includes(t), 'catalog lists ' + t);
      }
      const r = await req('/api/tools', 'GET');
      assert.equal(r.status, 200, '/api/tools answers');
      const tools = (r.data.tools ?? []) as { name: string; description: string }[];
      const names = tools.map((t) => t.name);
      for (const n of ['read_file', 'write_file', 'exec', 'web_fetch', 'remember', 'search_memory', 'load_skill', 'get_time', 'list_dir']) {
        assert.ok(names.includes(n), 'live tool ' + n);
      }
      assert.ok(tools.every((t) => typeof t.name === 'string' && typeof t.description === 'string' && t.description.length > 5),
        'every tool carries a description');
    });

    await t.test('v0.26: operator endpoints — tasks, ask, progress, tools registry', async () => {
      const tools = await req('/api/tools', 'GET');
      assert.equal(tools.status, 200);
      const names = ((tools.data.tools ?? []) as { name: string }[]).map((t) => t.name);
      assert.ok(names.length >= 40, 'registry grew with the toolbox, got ' + names.length);
      for (const n of ['edit', 'apply_patch', 'web_search', 'automations', 'ask_user', 'sessions_spawn', 'secrets', 'progress_card', 'portal']) {
        assert.ok(names.includes(n), 'live tool ' + n);
      }

      const tasks = await req('/api/tasks', 'GET');
      assert.equal(tasks.status, 200);
      assert.ok(Array.isArray(tasks.data.suggestions), 'pending suggestions list');
      const miss = await req('/api/tasks/tzzz', 'DELETE');
      assert.equal(miss.status, 404, 'unknown suggestion is a 404');

      const askList = await req('/api/ask', 'GET');
      assert.equal(askList.status, 200);
      assert.ok(Array.isArray(askList.data.pending), 'pending asks');
      const askMiss = await req('/api/ask/tzzz/answer', 'POST', { answer: 'hi' });
      assert.equal(askMiss.status, 404, 'unknown ask is a 404');

      const prog = await req('/api/progress?session=nope', 'GET');
      assert.equal(prog.status, 200);
      assert.equal(prog.data.card, null, 'no card yet');
    });

    await t.test('v0.26: portal proxies a local server through the gateway', async () => {
      const upstream = http.createServer((_req, res) => {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('portal-upstream-ok');
      });
      await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
      const upPort = (upstream.address() as { port: number }).port;
      const { addPortal, removePortal } = await import('../src/gateway/portal.js');
      addPortal('tbtest', upPort);
      try {
        const noAuth = await fetch(base + '/portal/tbtest/');
        assert.equal(noAuth.status, 401, 'portal requires the gateway token');
        const ok = await fetch(base + '/portal/tbtest/?token=test-token');
        assert.equal(ok.status, 200);
        assert.equal(await ok.text(), 'portal-upstream-ok');
        const gone = await fetch(base + '/portal/nope/?token=test-token');
        assert.equal(gone.status, 404);
      } finally {
        removePortal('tbtest');
        upstream.close();
      }
    });

    await t.test('v0.26: operator UI — progress card, task cards, ask modal, dashboard', async () => {
      const html = await (await fetch(base + '/')).text();
      for (const pin of ['id="progCard"', 'id="taskCards"', 'refreshTaskCards', 'refreshProgressCard', 'applyDashboard',
        "es.addEventListener('ask'", "es.addEventListener('tasks'", 'mf_answer', 'dashWidgets', '.heroChips']) {
        assert.ok(html.includes(pin), 'UI pin ' + pin);
      }
      // catalog entries that were planned are now mapped to real tools
      assert.ok(html.includes("real: 'create_goal'"), 'composite goal entry maps to a live tool');
      assert.ok(!html.includes('Drive operator web UI'), 'screen description updated to what it does');
    });

    await t.test('v0.27: session & tool icons derive from stored ids + JSONL', async () => {
      const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
      assert.ok(html.includes('SESSION_SOURCES'), 'session source icon map');
      assert.ok(html.includes('TOOL_ICONS'), 'per-tool icon map');
      assert.ok(html.includes('function sessionLabel'), 'sessionLabel helper');
      assert.ok(html.includes('function sessionIconHtml'), 'sessionIconHtml helper');
      assert.ok(html.includes('function toolIconHtml'), 'toolIconHtml helper');
      assert.ok(html.includes('function addToolLine'), 'shared tool line builder');
      assert.ok(html.includes('toolIc'), 'tool line icon span');
      assert.ok(html.includes('toolSt'), 'tool status appended as span (no innerHTML wipe)');
      assert.ok(html.includes('health.append(ic, label)'), 'chat header: icon + friendly label');
      assert.ok(html.includes("id.innerHTML = sessionIconSpan(sess.id)"), 'sidebar history rows');
      assert.ok(html.includes("id.innerHTML = sessionIconSpan(s.id)"), 'session panel rows');
      assert.ok(html.includes('sessionLabel(s.id)'), 'hidden session picker option text');
      assert.ok(/addToolLine\(c\.name/.test(html), 'history reload re-renders m.toolCalls');
      assert.ok(html.includes('doneIds'), 'done status rebuilt from role:tool entries');
      // no raw web:/telegram: prefix is ever put back into visible labels as-is
      assert.ok(!html.includes("textContent = id.length > 26 ? id.slice(0, 25)"), 'old raw-id chat label gone');
    });

    await t.test('v0.29: telegram can pick provider and model from the chat', async () => {
      const src = fs.readFileSync(path.join(process.cwd(), 'src/gateway/server.ts'), 'utf8');
      assert.ok(/providers\?\|models\?/.test(src), 'command pattern wired before the AI sees the text');
      assert.ok(src.includes('providerMenu(config)'), 'provider menu command');
      assert.ok(src.includes('modelSelect(config'), 'model select command');
      assert.ok(src.includes('await liveCatalog(config)'), 'catalog fetched for /model');
      const pk = fs.readFileSync(path.join(process.cwd(), 'src/channels/picker.ts'), 'utf8');
      for (const pin of [
        'export function providerMenu',
        'export function providerSelect',
        'export function modelMenu',
        'export function modelSelect',
        'export async function liveCatalog',
        'saveConfig(cfg)',
      ]) {
        assert.ok(pk.includes(pin), 'picker pin ' + pin);
      }
    });

    await t.test('v0.30: settings page is grouped, plain-language, right controls', async () => {
      const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
      // old flat wall of config keys is gone
      assert.ok(!html.includes('CFG_KEYS'), 'no raw key list');
      assert.ok(!html.includes('cfgRows'), 'no ungrouped rows');
      assert.ok(!html.includes('cfgPanel'), 'no collapsed details panel');
      // grouped sections with personality
      assert.ok(html.includes('SET_SECTIONS'), 'section schema exists');
      assert.ok(html.includes('Control room'), 'hero header');
      for (const label of ['YOUR CRAB', 'AI BRAIN', 'DOORS & KEYS', 'DAILY RHYTHM', 'HOUSEKEEPING', 'ON-DEVICE']) {
        assert.ok(html.includes(label), 'section ' + label);
      }
      // right control per value
      assert.ok(html.includes("type: 'toggle'"), 'booleans get switches');
      assert.ok(html.includes('setTglTrack'), 'switch track styles');
      assert.ok(html.includes("type: 'number'"), 'minutes/hours get number inputs');
      assert.ok(html.includes("'secret' ? 'password' : 'text'"), 'secrets are password fields');
      assert.ok(html.includes("type: 'select'"), 'service is a dropdown');
      // feedback happens on the settings page itself, not in the chat
      assert.ok(html.includes('setSaved'), 'inline saved badge');
      assert.ok(!html.includes("addMsg('sys', r.unchanged"), 'no chat-message save feedback');
      // loads when the page opens
      assert.ok(html.includes("if (name === 'settings') { refreshSettings(); refreshAgents(); }"), 'loads on open');
      // agents card keeps its ids (create/edit flow untouched)
      for (const id of ['agList', 'agNew', 'agTemplate', 'agCreate', 'agSoul', 'agSave', 'cfgPath']) {
        assert.ok(html.includes('id="' + id + '"'), 'id ' + id);
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
