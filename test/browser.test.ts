import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../src/agent/tools.js';
import { defaults } from '../src/core/config.js';

function makeEnv(overrides: Record<string, unknown> = {}) {
  const config = { ...defaults(), ...overrides } as ReturnType<typeof defaults>;
  return {
    config,
    memory: {} as never,
    skills: { list: () => [], get: () => null, promptIndex: () => '' } as never,
  };
}

test('browser: tool is disabled by default', async () => {
  const tools = await buildTools(makeEnv());
  const browser = tools.find((t) => t.def.name === 'browser');
  assert.equal(browser, undefined, 'browser tool should not be present when allowBrowser=false');
});

test('browser: tool is enabled when allowBrowser=true', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowBrowser: true } }));
  const browser = tools.find((t) => t.def.name === 'browser');
  assert.ok(browser, 'browser tool should be present when allowBrowser=true');
  assert.equal(browser!.def.name, 'browser');
});

test('browser: status action works without Chrome', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowBrowser: true } }));
  const browser = tools.find((t) => t.def.name === 'browser')!;
  const result = await browser.execute({ action: 'status' });
  assert.ok(result.includes('browser:'), 'should return status message');
});

test('browser: navigate rejects non-http URLs', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowBrowser: true } }));
  const browser = tools.find((t) => t.def.name === 'browser')!;
  await assert.rejects(
    () => browser.execute({ action: 'navigate', url: 'ftp://example.com' }),
    /only http\/https/,
  );
});

test('code_exec: tool is disabled by default', async () => {
  const tools = await buildTools(makeEnv());
  const codeExec = tools.find((t) => t.def.name === 'code_exec');
  assert.equal(codeExec, undefined, 'code_exec tool should not be present when allowCodeExec=false');
});

test('code_exec: tool is enabled when allowCodeExec=true', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowCodeExec: true } }));
  const codeExec = tools.find((t) => t.def.name === 'code_exec');
  assert.ok(codeExec, 'code_exec tool should be present when allowCodeExec=true');
});

test('code_exec: basic arithmetic works', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowCodeExec: true } }));
  const codeExec = tools.find((t) => t.def.name === 'code_exec')!;
  const result = await codeExec.execute({ code: '2 + 2' });
  assert.ok(result.includes('4'), `expected result to include "4", got: ${result}`);
});

test('code_exec: console.log works', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowCodeExec: true } }));
  const codeExec = tools.find((t) => t.def.name === 'code_exec')!;
  const result = await codeExec.execute({ code: 'console.log("hello world")' });
  assert.ok(result.includes('hello world'), `expected "hello world", got: ${result}`);
});

test('code_exec: sandbox blocks require', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowCodeExec: true } }));
  const codeExec = tools.find((t) => t.def.name === 'code_exec')!;
  const result = await codeExec.execute({ code: 'require("fs")' });
  assert.ok(result.includes('Error') || result.includes('require'), `expected error, got: ${result}`);
});

test('code_exec: sandbox blocks fetch', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowCodeExec: true } }));
  const codeExec = tools.find((t) => t.def.name === 'code_exec')!;
  const result = await codeExec.execute({ code: 'fetch("https://example.com")' });
  assert.ok(result.includes('Error') || result.includes('fetch'), `expected error, got: ${result}`);
});

test('code_exec: timeout works', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowCodeExec: true } }));
  const codeExec = tools.find((t) => t.def.name === 'code_exec')!;
  const result = await codeExec.execute({ code: 'while(true){}', timeoutMs: 100 });
  assert.ok(result.includes('Error') || result.includes('timeout'), `expected timeout error, got: ${result}`);
});

test('code_exec: JSON manipulation works', async () => {
  const tools = await buildTools(makeEnv({ agent: { ...defaults().agent, allowCodeExec: true } }));
  const codeExec = tools.find((t) => t.def.name === 'code_exec')!;
  const result = await codeExec.execute({ code: 'JSON.stringify({a:1,b:2})' });
  assert.ok(result.includes('"a":1') || result.includes('"a": 1'), `expected JSON output, got: ${result}`);
});
