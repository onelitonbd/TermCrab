import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTts, TTS_CANDIDATES } from '../src/mobile/tts.js';

test('resolveTts prefers termux-tts-speak when available', () => {
  const pick = resolveTts((cmd) => cmd === 'termux-tts-speak');
  assert.equal(pick?.cmd, 'termux-tts-speak');
  assert.deepEqual(pick?.args('hello world'), ['hello world']);
});

test('resolveTts falls back through the chain', () => {
  assert.equal(resolveTts((cmd) => cmd === 'espeak')?.cmd, 'espeak');
  assert.equal(resolveTts((cmd) => cmd === 'say')?.cmd, 'say');
});

test('resolveTts returns null when nothing exists', () => {
  assert.equal(resolveTts(() => false), null);
});

test('candidate chain is ordered termux-first and stays small', () => {
  assert.equal(TTS_CANDIDATES[0]!.cmd, 'termux-tts-speak');
  assert.ok(TTS_CANDIDATES.length <= 6);
});
