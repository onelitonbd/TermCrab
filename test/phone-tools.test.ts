import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTools } from '../src/agent/tools.js';
import { defaults } from '../src/core/config.js';

function makeEnv() {
  const config = defaults();
  return {
    config,
    memory: {} as never,
    skills: { list: () => [], get: () => null, promptIndex: () => '' } as never,
  };
}

test('phone tools: sms_send is registered', async () => {
  const tools = await buildTools(makeEnv());
  const sms = tools.find((t) => t.def.name === 'sms_send');
  assert.ok(sms, 'sms_send tool should be registered');
});

test('phone tools: camera is registered', async () => {
  const tools = await buildTools(makeEnv());
  const camera = tools.find((t) => t.def.name === 'camera');
  assert.ok(camera, 'camera tool should be registered');
});

test('phone tools: location is registered', async () => {
  const tools = await buildTools(makeEnv());
  const location = tools.find((t) => t.def.name === 'location');
  assert.ok(location, 'location tool should be registered');
});

test('phone tools: clipboard is registered', async () => {
  const tools = await buildTools(makeEnv());
  const clipboard = tools.find((t) => t.def.name === 'clipboard');
  assert.ok(clipboard, 'clipboard tool should be registered');
});

test('phone tools: battery is registered', async () => {
  const tools = await buildTools(makeEnv());
  const battery = tools.find((t) => t.def.name === 'battery');
  assert.ok(battery, 'battery tool should be registered');
});

test('phone tools: contacts is registered', async () => {
  const tools = await buildTools(makeEnv());
  const contacts = tools.find((t) => t.def.name === 'contacts');
  assert.ok(contacts, 'contacts tool should be registered');
});

test('phone tools: wifi_info is registered', async () => {
  const tools = await buildTools(makeEnv());
  const wifi = tools.find((t) => t.def.name === 'wifi_info');
  assert.ok(wifi, 'wifi_info tool should be registered');
});

test('phone tools: notification is registered', async () => {
  const tools = await buildTools(makeEnv());
  const notification = tools.find((t) => t.def.name === 'notification');
  assert.ok(notification, 'notification tool should be registered');
});

test('phone tools: sms_send requires to and text', async () => {
  const tools = await buildTools(makeEnv());
  const sms = tools.find((t) => t.def.name === 'sms_send')!;
  // 22.2: the schema is checked at the boundary, so a bad call comes back as a
  // sentence naming the field instead of a thrown error (and never sends).
  const noTo = await sms.execute({ text: 'hello' });
  assert.match(noTo, /\[bad arguments for sms_send\]/);
  assert.match(noTo, /missing required `to`/);
  const noText = await sms.execute({ to: '+123' });
  assert.match(noText, /missing required `text`/);
});

test('phone tools: clipboard requires action', async () => {
  const tools = await buildTools(makeEnv());
  const clipboard = tools.find((t) => t.def.name === 'clipboard')!;
  const out = await clipboard.execute({});
  assert.match(out, /\[bad arguments for clipboard\]/);
  assert.match(out, /missing required `action`/);
});

test('phone tools: notification requires title and text', async () => {
  const tools = await buildTools(makeEnv());
  const notification = tools.find((t) => t.def.name === 'notification')!;
  const noTitle = await notification.execute({ text: 'hello' });
  assert.match(noTitle, /missing required `title`/);
  const noText = await notification.execute({ title: 'hi' });
  assert.match(noText, /missing required `text`/);
});

test('phone tools: all have descriptions', async () => {
  const tools = await buildTools(makeEnv());
  const phoneToolNames = ['sms_send', 'camera', 'location', 'clipboard', 'battery', 'contacts', 'wifi_info', 'notification'];
  for (const name of phoneToolNames) {
    const tool = tools.find((t) => t.def.name === name);
    assert.ok(tool, `${name} should be registered`);
    assert.ok(tool!.def.description.length > 10, `${name} should have a real description`);
  }
});
