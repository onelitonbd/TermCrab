import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { WakeSession, runWakeLoop } from '../src/mobile/wake.js';

test('WakeSession: idle without keyword', () => {
  const s = new WakeSession('crab');
  assert.deepEqual(s.feed('what time is it'), { type: 'idle' });
  assert.equal(s.isArmed, false);
});

test('WakeSession: keyword alone arms, next utterance is the command', () => {
  const s = new WakeSession('crab');
  assert.deepEqual(s.feed('crab'), { type: 'wake', keyword: 'crab' });
  assert.equal(s.isArmed, true);
  assert.deepEqual(s.feed('summarize my inbox'), { type: 'command', text: 'summarize my inbox' });
  assert.equal(s.isArmed, false);
});

test('WakeSession: keyword + command in one breath', () => {
  const s = new WakeSession('crab');
  const ev = s.feed('Crab! start the daily report');
  assert.equal(ev.type, 'command');
  assert.equal(ev.type === 'command' ? ev.text : '', 'start the daily report');
  assert.equal(s.isArmed, false);
});

test('WakeSession: disarm resets, empty lines are silence', () => {
  const s = new WakeSession('crab');
  s.feed('crab');
  assert.equal(s.isArmed, true);
  s.disarm();
  assert.equal(s.isArmed, false);
  assert.deepEqual(s.feed('   '), { type: 'silence' });
});

test('runWakeLoop: full flow with injected stream speaks the reply', async () => {
  const input = new PassThrough();
  const heard: string[] = [];
  const spoken: string[] = [];

  const done = runWakeLoop({
    keyword: 'crab',
    input,
    onCommand: async (text: string) => {
      heard.push(text);
      return `done: ${text}`;
    },
    speak: async (t: string) => {
      spoken.push(t);
    },
  });

  input.write('random chatter\n');
  input.write('crab\n');
  input.write('run the morning briefing\n');
  input.end();
  const result = await done;

  // Let fire-and-forget command handling flush.
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));

  assert.equal(result.commands, 1);
  assert.deepEqual(heard, ['run the morning briefing']);
  assert.deepEqual(spoken, ['Yes?', 'done: run the morning briefing']);
});
