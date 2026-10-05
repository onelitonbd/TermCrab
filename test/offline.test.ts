import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onboard, normalizeProvider } from '../src/onboard.js';
import { loadConfig } from '../src/core/config.js';
import { resolveProvider, providerSummary } from '../src/providers/index.js';

/**
 * The offline demo is a documented promise (README quick start, docs/LAUNCH.md,
 * the CI smoke test and the panel's "Run offline demo" button). These tests pin
 * every path that promise travels through, so a refactor can never quietly turn
 * "works with no network and no key" back into "configure a provider first".
 */
test('offline demo: a real setup with no network and no key', async (t) => {
  await t.test('provider aliases: mock/demo/offline -> mock, everything else -> openai', () => {
    for (const raw of ['mock', 'MOCK', 'demo', 'offline', ' Demo ']) {
      assert.equal(normalizeProvider(raw), 'mock', raw);
    }
    for (const raw of ['openai', 'anthropic', 'gemini', 'ollama', 'vllm', '', 'nonsense']) {
      assert.equal(normalizeProvider(raw), 'openai', raw);
    }
  });

  await t.test('resolveProvider builds the offline brain from a bare config', () => {
    const p = resolveProvider({ type: 'mock', model: 'mock-1' });
    assert.equal(p.name, 'mock');
    assert.equal(p.model, 'mock-1');
    // no key, no base url, and the label says what it is
    assert.match(providerSummary({ type: 'mock', model: 'mock-1' }), /^mock:mock-1/);
    // a model-less config still gets a model id
    assert.equal(resolveProvider({ type: 'mock', model: '' }).model, 'mock-1');
  });

  await t.test('onboard --provider mock saves a config that reloads as mock', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'toff-'));
    process.env.TCRAB_HOME = home;
    await onboard({ nonInteractive: true, provider: 'mock' });
    const cfg = loadConfig();
    assert.equal(cfg.provider.type, 'mock', 'loadConfig must not coerce mock to openai');
    assert.equal(cfg.provider.model, 'mock-1');
    assert.equal(cfg.provider.apiKey, '');
    assert.ok(fs.existsSync(path.join(home, 'config.json')));
  });

  await t.test('the panel ships a one-click offline demo', () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.ok(html.includes('id="provOffline"'), 'offline demo button on the Providers page');
    assert.ok(html.includes("value: 'mock'"), 'the button writes provider.type=mock');
  });
});
