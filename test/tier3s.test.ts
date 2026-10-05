import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';

/**
 * Batch 50 — the web panel's builder half.
 *
 * Four flows that used to be terminal-only: editing the identity files,
 * backup + restore, the service card, and transcribing an uploaded audio file.
 * Every one of them reuses the CLI's own module — these tests check the door
 * (the HTTP surface the panel actually calls), not a second implementation.
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

async function panel() {
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  config.gateway = { ...config.gateway, token: 'tok' };
  saveConfig(config);
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  const get = async (p: string): Promise<{ status: number; headers: Headers; text: string; body: Record<string, unknown> }> => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, { headers: { authorization: 'Bearer tok' } });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text) as Record<string, unknown>; } catch { /* binary */ }
    return { status: res.status, headers: res.headers, text, body };
  };
  const send = async (
    p: string,
    opts: { method: string; body?: unknown; raw?: Buffer; contentType?: string },
  ): Promise<{ status: number; body: Record<string, unknown> }> => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, {
      method: opts.method,
      headers: {
        authorization: 'Bearer tok',
        'content-type': opts.contentType ?? 'application/json',
      },
      body: opts.raw ?? JSON.stringify(opts.body ?? {}),
    });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text) as Record<string, unknown>; } catch { /* ignore */ }
    return { status: res.status, body };
  };
  return { get, send, handle };
}

test('50.1 the panel edits SOUL.md, IDENTITY.md and USER.md inside the home', async () => {
  const home = tmpHome('t50a-');
  const { get, send, handle } = await panel();
  try {
    const before = await get('/api/bootstrap');
    assert.equal(before.status, 200);
    const names = (before.body.files as { name: string }[]).map((f) => f.name);
    assert.deepEqual(names, ['SOUL.md', 'IDENTITY.md', 'USER.md']);
    for (const f of before.body.files as { rel: string; bytes: number }[]) {
      assert.ok(!f.rel.startsWith('/') && !f.rel.includes('..'), 'paths stay inside the home');
    }

    const saved = await send('/api/bootstrap', { method: 'PUT', body: { file: 'SOUL.md', text: '# Soul\nI answer in Bengali first.' } });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.bytes, Buffer.byteLength('# Soul\nI answer in Bengali first.', 'utf8'));
    assert.match(fs.readFileSync(path.join(home, 'workspace', 'SOUL.md'), 'utf8'), /Bengali first/);

    const user = await send('/api/bootstrap', { method: 'PUT', body: { file: 'USER.md', text: 'The owner is in Dhaka.' } });
    assert.equal(user.status, 200);
    assert.match(fs.readFileSync(path.join(home, 'memory', 'USER.md'), 'utf8'), /Dhaka/);

    // The name is a key, never a path: a traversal attempt cannot pass.
    const evil = await send('/api/bootstrap', { method: 'PUT', body: { file: '../../config.json', text: 'nope' } });
    assert.equal(evil.status, 400);
    assert.match(String(evil.body.error), /file must be one of/);

    const tooBig = await send('/api/bootstrap', { method: 'PUT', body: { file: 'IDENTITY.md', text: 'x'.repeat(33 * 1024) } });
    assert.equal(tooBig.status, 413);
    assert.match(String(tooBig.body.error), /limited to 32 KB/);

    // A later read shows the saved text, so the editor round-trips.
    const after = await get('/api/bootstrap');
    const soul = (after.body.files as { name: string; text: string; exists: boolean }[]).find((f) => f.name === 'SOUL.md')!;
    assert.equal(soul.exists, true);
    assert.match(soul.text, /Bengali first/);

    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /id="idFiles"/);
    assert.match(html, /api\('\/api\/bootstrap'/);
  } finally {
    await handle.stop();
  }
});

test('50.2 backup and restore run through the CLI module, and restore asks first', async () => {
  const home = tmpHome('t50b-');
  fs.mkdirSync(path.join(home, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(home, 'memory', 'USER.md'), 'original user file\n');
  const { get, send, handle } = await panel();
  try {
    const made = await send('/api/backup', { method: 'POST' });
    assert.equal(made.status, 200);
    assert.match(String(made.body.name), /^backup-.*\.tar$/);
    const manifest = made.body.manifest as { files: number; bytes: number; release: string };
    assert.ok(manifest.files >= 1);
    assert.ok(fs.existsSync(path.join(home, 'backups', String(made.body.name))));

    const list = await get('/api/backups');
    assert.equal(list.status, 200);
    const names = (list.body.backups as { name: string }[]).map((b) => b.name);
    assert.ok(names.includes(String(made.body.name)));

    const dl = await get('/api/backups/' + encodeURIComponent(String(made.body.name)));
    assert.equal(dl.status, 200);
    assert.equal(dl.headers.get('content-type'), 'application/x-tar');
    assert.ok(dl.text.length > 100, 'the archive really comes back');

    // dry-run shows the plan; a real restore without the typed name is refused.
    const dry = await send('/api/restore', { method: 'POST', body: { name: made.body.name, dryRun: true } });
    assert.equal(dry.status, 200);
    assert.ok((dry.body.plan as { files: unknown[] }).files.length >= 1);

    const noConfirm = await send('/api/restore', { method: 'POST', body: { name: made.body.name } });
    assert.equal(noConfirm.status, 400);
    assert.match(String(noConfirm.body.error), /resend with confirm/);

    // Change the file, restore, and the archive's copy is back.
    fs.writeFileSync(path.join(home, 'memory', 'USER.md'), 'CHANGED after the backup\n');
    const restored = await send('/api/restore', {
      method: 'POST',
      body: { name: made.body.name, confirm: made.body.name },
    });
    assert.equal(restored.status, 200);
    assert.ok(Number(restored.body.restored) >= 1);
    assert.match(fs.readFileSync(path.join(home, 'memory', 'USER.md'), 'utf8'), /original user file/);
    assert.ok(restored.body.movedTo === null || fs.existsSync(String(restored.body.movedTo)), 'the previous file is kept somewhere');

    // A name that is not in the backups dir is a 404, never a path.
    const sneaky = await send('/api/restore', { method: 'POST', body: { name: '../../config.json', confirm: '../../config.json' } });
    assert.equal(sneaky.status, 404);

    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /id="bkList"/);
    assert.match(html, /api\('\/api\/backup'/);
  } finally {
    await handle.stop();
  }
});

test('50.3 the service card is read-only and names the command a human runs', async () => {
  tmpHome('t50c-');
  const serviceDir = fs.mkdtempSync(path.join(os.tmpdir(), 't50c-svc-'));
  process.env.TCRAB_SERVICE_DIR = serviceDir;
  const { get, send, handle } = await panel();
  try {
    const r = await get('/api/service');
    assert.equal(r.status, 200);
    assert.ok(['systemd', 'launchd', 'termux'].includes(String(r.body.platform)));
    assert.ok(String(r.body.file).length > 0, 'the file it would write is named');
    assert.match(String(r.body.installCommand), /termcrab (service|boot) install/);
    const plan = r.body.plan as { steps: string[]; content: string };
    assert.ok(plan.steps.length >= 1, 'the steps after install are shown');
    assert.ok(plan.content.length > 0, 'the unit content is inspectable');
    assert.match(String(r.body.note), /never runs this/);

    // Read-only: there is no install verb on the endpoint — a POST is a 404,
    // exactly like any other route that does not exist.
    const posted = await send('/api/service', { method: 'POST', body: {} });
    assert.equal(posted.status, 404);

    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /id="svcInfo"/);
    assert.match(html, /api\('\/api\/service'\)/);
  } finally {
    delete process.env.TCRAB_SERVICE_DIR;
    await handle.stop();
  }
});

test('50.4 the panel transcribes an uploaded audio file through the real engine path', async () => {
  const home = tmpHome('t50d-');
  // A fake whisper-cli on PATH: the engine whisper.cpp would provide.
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 't50d-bin-'));
  const cli = path.join(bin, 'whisper-cli');
  fs.writeFileSync(cli, '#!/bin/sh\nprintf "call your mother tomorrow\\n"\nexit 0\n', { mode: 0o755 });
  fs.chmodSync(cli, 0o755);
  const oldPath = process.env.PATH;
  process.env.PATH = `${bin}${path.delimiter}${oldPath ?? ''}`;
  fs.mkdirSync(path.join(home, 'models'), { recursive: true });
  fs.writeFileSync(path.join(home, 'models', 'ggml-tiny.bin'), 'fake weights');

  const { send, handle } = await panel();
  try {
    const audio = Buffer.from('RIFF....WAVEfake audio bytes');
    const r = await send('/api/transcribe?ext=wav', { method: 'POST', raw: audio, contentType: 'audio/wav' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.ok, true);
    assert.equal(r.body.text, 'call your mother tomorrow');
    assert.ok(String(r.body.engine).includes('whisper-cli'));
    assert.equal(r.body.bytes, audio.length);

    // The bytes really landed inside the home, not in cwd.
    const uploads = fs.readdirSync(path.join(home, 'state', 'uploads'));
    assert.ok(uploads.some((f) => f.endsWith('.wav')));

    const empty = await send('/api/transcribe?ext=wav', { method: 'POST', raw: Buffer.alloc(0), contentType: 'audio/wav' });
    assert.equal(empty.status, 400);
    assert.match(String(empty.body.error), /empty upload/);

    // With no engine the door answers with the CLI's own install hint.
    fs.rmSync(cli, { force: true });
    const noEngine = await send('/api/transcribe?ext=wav', { method: 'POST', raw: audio, contentType: 'audio/wav' });
    assert.equal(noEngine.status, 422);
    assert.match(String(noEngine.body.error), /whisper engine not installed|whisper/);

    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /id="trFile"/);
    assert.match(html, /api\('\/api\/transcribe\?ext='/);
  } finally {
    process.env.PATH = oldPath;
    await handle.stop();
  }
});
