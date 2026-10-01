import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../src/agent/tools.js';
import { defaults } from '../src/core/config.js';
import { canvasUpdate, canvasRemove, canvasList, canvasGet, canvasClear } from '../src/gateway/canvas.js';

function makeEnv() {
  const config = defaults();
  return {
    config,
    memory: {} as never,
    skills: { list: () => [], get: () => null, promptIndex: () => '' } as never,
  };
}

test('canvas: tool is registered', async () => {
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas');
  assert.ok(canvas, 'canvas tool should be registered');
});

test('canvas: update creates a widget', async () => {
  canvasClear();
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  const result = await canvas.execute({ action: 'update', id: 'test-widget', html: '<h1>Hello</h1>', title: 'Test' });
  assert.ok(result.includes('test-widget'));
  assert.ok(result.includes('updated'));
});

test('canvas: list returns widgets', async () => {
  canvasClear();
  canvasUpdate('w1', '<p>One</p>', 'Widget 1');
  canvasUpdate('w2', '<p>Two</p>', 'Widget 2');
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  const result = await canvas.execute({ action: 'list' });
  assert.ok(result.includes('w1'));
  assert.ok(result.includes('w2'));
});

test('canvas: get returns a widget', async () => {
  canvasClear();
  canvasUpdate('test-get', '<p>Content</p>', 'Test Widget');
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  const result = await canvas.execute({ action: 'get', id: 'test-get' });
  assert.ok(result.includes('test-get'));
  assert.ok(result.includes('Content'));
});

test('canvas: remove deletes a widget', async () => {
  canvasClear();
  canvasUpdate('test-remove', '<p>Bye</p>');
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  const result = await canvas.execute({ action: 'remove', id: 'test-remove' });
  assert.ok(result.includes('removed'));
  assert.equal(canvasGet('test-remove'), null);
});

test('canvas: remove non-existent throws', async () => {
  canvasClear();
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  await assert.rejects(() => canvas.execute({ action: 'remove', id: 'nope' }), /not found/);
});

test('canvas: get non-existent throws', async () => {
  canvasClear();
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  await assert.rejects(() => canvas.execute({ action: 'get', id: 'nope' }), /not found/);
});

test('canvas: update requires id and html', async () => {
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  await assert.rejects(() => canvas.execute({ action: 'update', html: '<p>x</p>' }), /missing required argument: id/);
  await assert.rejects(() => canvas.execute({ action: 'update', id: 'x' }), /missing required argument: html/);
});

test('canvas: list returns empty message when no widgets', async () => {
  canvasClear();
  const tools = await buildTools(makeEnv());
  const canvas = tools.find((t) => t.def.name === 'canvas')!;
  const result = await canvas.execute({ action: 'list' });
  assert.ok(result.includes('no canvas widgets'));
});

test('canvas: canvasUpdate broadcasts event', async () => {
  canvasClear();
  const widget = canvasUpdate('broadcast-test', '<p>Broadcast</p>', 'Broadcast Test');
  assert.equal(widget.id, 'broadcast-test');
  assert.equal(widget.html, '<p>Broadcast</p>');
  assert.equal(widget.title, 'Broadcast Test');
  assert.ok(widget.updatedAt > 0);
});
