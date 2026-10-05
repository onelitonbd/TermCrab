import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config, defaults, loadConfig, ProviderEntry } from '../src/core/config.js';
import {
  liveCatalog,
  matchActiveEntry,
  modelMenu,
  modelSelect,
  providerMenu,
  providerSelect,
} from '../src/channels/picker.js';

/** v0.29.0: pick provider + model from telegram - menus, switching, persistence. */

function makeCfg(): { cfg: Config; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tpick-'));
  process.env.TCRAB_HOME = home;
  fs.mkdirSync(home, { recursive: true });
  const cfg = defaults();
  cfg.providers = [
    {
      id: 'prov_a',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      keys: [{ id: 'k1', name: 'main', key: 'sk-live-1234567890', created: 1 }],
      models: ['gpt-4o-mini', 'gpt-4o'],
      created: 1,
    },
    {
      id: 'prov_b',
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      keys: [{ id: 'k2', name: 'or', key: 'or-key-99999999', created: 1 }],
      models: ['meta-llama/llama-3.3-70b-instruct'],
      created: 2,
    },
    {
      id: 'prov_c',
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      keys: [],
      models: [],
      created: 3,
    },
  ];
  cfg.provider = {
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-live-1234567890',
    model: 'gpt-4o',
  };
  return { cfg, home };
}

// ---- provider menu ----

test('provider menu: numbered list, current marked, reply hint', () => {
  const { cfg } = makeCfg();
  const out = providerMenu(cfg);
  assert.match(out, /\*\*Provider endpoint\*\*/);
  assert.match(out, /Using: \*\*OpenAI\*\* \(https:\/\/api\.openai\.com\/v1\)/);
  assert.match(out, /1\. \*\*OpenAI\*\* - 1 key, 2 models - current/);
  assert.match(out, /2\. \*\*OpenRouter\*\* - 1 key, 1 model/);
  assert.match(out, /3\. \*\*Groq\*\* - no key saved, no models yet/);
  assert.match(out, /`\/provider 2` or `\/provider OpenRouter`/);
});

test('provider menu: empty list and builtin mock read friendly', () => {
  const { cfg } = makeCfg();
  cfg.providers = [];
  assert.match(providerMenu(cfg), /No endpoints saved yet/);
  // The offline brain is a configured state, not a broken endpoint.
  cfg.provider = { type: 'mock', model: 'mock-1' };
  assert.match(providerMenu(cfg), /Using: \*\*Offline demo\*\*/);
});

// ---- provider switching ----

test('provider select by number switches endpoint, key and model; persists', () => {
  const { cfg, home } = makeCfg();
  const out = providerSelect(cfg, '2');
  assert.match(out, /Switched to \*\*OpenRouter\*\*/);
  assert.equal(cfg.provider.type, 'openai');
  assert.equal(cfg.provider.baseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(cfg.provider.apiKey, 'or-key-99999999');
  assert.equal(cfg.provider.model, 'meta-llama/llama-3.3-70b-instruct', 'falls to first saved model');
  process.env.TCRAB_HOME = home;
  const reloaded = loadConfig();
  assert.equal(reloaded.provider.baseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(reloaded.provider.model, 'meta-llama/llama-3.3-70b-instruct');
});

test('provider select keeps the current model when the target saved it', () => {
  const { cfg } = makeCfg();
  providerSelect(cfg, '2');
  cfg.provider.model = 'gpt-4o';
  const out = providerSelect(cfg, 'openai'); // by name, case-insensitive
  assert.match(out, /Switched to \*\*OpenAI\*\*/);
  assert.equal(cfg.provider.model, 'gpt-4o', 'model kept because it is saved on OpenAI');
  assert.equal(cfg.provider.apiKey, 'sk-live-1234567890');
});

test('provider select by exact id works', () => {
  const { cfg } = makeCfg();
  providerSelect(cfg, 'prov_b');
  assert.equal(cfg.provider.baseUrl, 'https://openrouter.ai/api/v1');
});

test('provider without a key refuses and explains', () => {
  const { cfg } = makeCfg();
  const before = { ...cfg.provider };
  const out = providerSelect(cfg, 'Groq');
  assert.match(out, /has no API key saved/);
  assert.equal(cfg.provider.baseUrl, before.baseUrl, 'nothing changed');
  assert.equal(cfg.provider.model, before.model);
});

test('provider select: unknown name and out-of-range number fall back to the menu', () => {
  const { cfg } = makeCfg();
  const bad = providerSelect(cfg, 'Nope');
  assert.match(bad, /No endpoint matches "Nope"/);
  assert.match(bad, /1\. \*\*OpenAI\*\*/, 'menu is reprinted');
  const range = providerSelect(cfg, '42');
  assert.match(range, /no endpoint #42/);
  const ambiguous = providerSelect(cfg, 'o'); // matches OpenAI + OpenRouter
  assert.match(ambiguous, /Several endpoints match "o"/);
});

// ---- model menu ----

test('model menu: saved models numbered, current marked', () => {
  const { cfg } = makeCfg();
  const out = modelMenu(cfg, null);
  assert.match(out, /\*\*Model\*\*/);
  assert.match(out, /Using: `gpt-4o`/);
  assert.match(out, /1\. `gpt-4o-mini`/);
  assert.match(out, /2\. `gpt-4o` - current/);
  assert.match(out, /`\/model 2` or `\/model <model-id>`/);
  cfg.providers[0]!.models = ['gpt-4o-mini'];
  assert.match(modelMenu(cfg, null), /`\/model <model-id>` to switch/, 'single choice does not suggest a number');
});

test('model menu: live catalog extras are marked new', () => {
  const { cfg } = makeCfg();
  const out = modelMenu(cfg, ['gpt-4o-mini', 'o3-mini', 'gpt-4.1']);
  assert.match(out, /3\. `o3-mini` - new/);
  assert.match(out, /4\. `gpt-4.1` - new/);
  assert.match(out, /saved when you pick them/);
});

test('model menu: empty everything says what to do; mock says add a provider', () => {
  const { cfg } = makeCfg();
  cfg.providers[0]!.models = [];
  cfg.provider.apiKey = '';
  const out = modelMenu(cfg, null);
  assert.match(out, /could not be fetched/);
  assert.match(out, /`\/model <model-id>`/);
  // The offline brain is a real setup: it says so instead of asking for a key.
  cfg.provider = { type: 'mock', model: 'mock-1' };
  assert.match(modelMenu(cfg, null), /Offline demo runs on `mock-1`/);
  assert.match(providerMenu(cfg), /Offline demo runs on `mock-1`/);
  assert.match(providerMenu(cfg), /1\. \*\*OpenAI\*\*/, 'real endpoints stay listed');
});

// ---- model switching ----

test('model select by number on a fresh catalog saves it and switches', () => {
  const { cfg, home } = makeCfg();
  cfg.provider = { type: 'openai', baseUrl: 'https://openrouter.ai/api/v1', apiKey: 'or-key-99999999', model: 'x' };
  // choices = saved(meta-llama) then fresh: 1=anthropic, 2=openai
  const out = modelSelect(cfg, '3', ['anthropic/claude-sonnet-4', 'openai/gpt-4o-mini']);
  assert.match(out, /Now chatting with \*\*OpenRouter\*\* on `openai\/gpt-4o-mini`/);
  const entry = cfg.providers.find((p) => p.id === 'prov_b')!;
  assert.deepEqual(entry.models!.sort(), ['meta-llama/llama-3.3-70b-instruct', 'openai/gpt-4o-mini']);
  assert.equal(cfg.provider.model, 'openai/gpt-4o-mini');
  assert.equal(cfg.provider.type, 'openai');
  process.env.TCRAB_HOME = home;
  assert.equal(loadConfig().provider.model, 'openai/gpt-4o-mini');
});

test('model select by exact id and by unique substring; duplicates not re-saved', () => {
  const { cfg } = makeCfg();
  modelSelect(cfg, 'gpt-4o-mini', null);
  assert.equal(cfg.provider.model, 'gpt-4o-mini');
  const len = cfg.providers[0]!.models!.length;
  modelSelect(cfg, 'gpt-4o-mini', null);
  assert.equal(cfg.providers[0]!.models!.length, len, 'no duplicate save');

  const out = modelSelect(cfg, 'mini', null);
  assert.match(out, /gpt-4o-mini/);
});

test('model select: ambiguous and unknown picks explain instead of guessing', () => {
  const { cfg } = makeCfg();
  const amb = modelSelect(cfg, 'gpt', null);
  assert.match(amb, /Several models match "gpt"/);
  const miss = modelSelect(cfg, 'totally-unknown', null);
  assert.match(miss, /No model matches/);
  const num = modelSelect(cfg, '42', null);
  assert.match(num, /No model #42 - the list has 2/);
});

test('model select on builtin provider sets the model id directly', () => {
  const { cfg, home } = makeCfg();
  cfg.providers = [];
  cfg.provider = { type: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-key-123456' };
  const out = modelSelect(cfg, 'gpt-4o', null);
  assert.match(out, /Model set to `gpt-4o` on \*\*OpenAI\*\*/);
  assert.equal(cfg.provider.type, 'openai', 'builtin type preserved');
  assert.equal(cfg.provider.apiKey, 'sk-key-123456', 'key preserved');
  process.env.TCRAB_HOME = home;
  assert.equal(loadConfig().provider.model, 'gpt-4o');
});

test('model select accepts arbitrary model id on builtin provider (no saved entry)', () => {
  const { cfg } = makeCfg();
  cfg.providers = [];
  cfg.provider = { type: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-4o-mini' };
  const out = modelSelect(cfg, 'some-custom-model', null);
  assert.match(out, /Model set to `some-custom-model`/);
  assert.equal(cfg.provider.model, 'some-custom-model');
});

// ---- live catalog ----

test('liveCatalog: saved models short-circuit (no remote call)', async () => {
  const { cfg } = makeCfg();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return { ok: true, json: async () => ({ data: [] }) } as Response;
  }) as unknown as typeof globalThis.fetch;
  try {
    const out = await liveCatalog(cfg);
    assert.deepEqual(out, []);
    assert.equal(calls, 0, 'no fetch when models are already saved');
  } finally {
    globalThis.fetch = original;
  }
});

test('liveCatalog: fetches the catalog when nothing is saved; null on failure/mock', async () => {
  const { cfg } = makeCfg();
  const original = globalThis.fetch;
  try {
    // nothing saved -> fetch
    cfg.providers[0]!.models = [];
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }] }),
    })) as unknown as typeof globalThis.fetch;
    assert.deepEqual(await liveCatalog(cfg), ['gpt-4o', 'gpt-4o-mini'], 'sorted catalog');

    // offline -> null
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof globalThis.fetch;
    assert.equal(await liveCatalog(cfg), null);

    // builtin mock -> null, no network call needed
    cfg.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
    assert.equal(await liveCatalog(cfg), null);
  } finally {
    globalThis.fetch = original;
  }
});

test('matchActiveEntry tracks the wired-in provider by url and key', () => {
  const { cfg } = makeCfg();
  assert.equal(matchActiveEntry(cfg)!.id, 'prov_a');
  providerSelect(cfg, '2');
  assert.equal(matchActiveEntry(cfg)!.id, 'prov_b');
  cfg.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  assert.equal(matchActiveEntry(cfg), null);
});
