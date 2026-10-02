import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startRun, endRun, addSpan, endSpan, addToolCall, getRun, listRuns, clearRuns } from '../src/core/tracing.js';

test('tracing: startRun creates a trace', () => {
  clearRuns();
  const trace = startRun('run1', 's1', 'openai', 'test-model');
  assert.equal(trace.runId, 'run1');
  assert.equal(trace.sessionId, 's1');
  assert.equal(trace.provider, 'openai');
  assert.ok(trace.start > 0);
});

test('tracing: endRun sets duration', () => {
  clearRuns();
  const trace = startRun('run2', 's2');
  endRun('run2', 100, 50);
  const got = getRun('run2');
  assert.ok(got);
  assert.ok(got!.durationMs !== undefined);
  assert.ok(got!.durationMs! >= 0);
  assert.equal(got!.tokensIn, 100);
  assert.equal(got!.tokensOut, 50);
});

test('tracing: addSpan and endSpan work', () => {
  clearRuns();
  startRun('run3', 's3');
  const span = addSpan('run3', 'tool:exec', { command: 'ls' });
  assert.ok(span);
  endSpan('run3', span!.id);
  const got = getRun('run3');
  assert.ok(got!.spans.length > 0);
  assert.ok(got!.spans[0]!.durationMs !== undefined);
});

test('tracing: addToolCall records tool calls', () => {
  clearRuns();
  startRun('run4', 's4');
  addToolCall('run4', 'exec', 150, true);
  addToolCall('run4', 'read_file', 50, false);
  const got = getRun('run4');
  assert.equal(got!.toolCalls!.length, 2);
  assert.equal(got!.toolCalls![0]!.name, 'exec');
  assert.equal(got!.toolCalls![0]!.durationMs, 150);
  assert.equal(got!.toolCalls![0]!.ok, true);
  assert.equal(got!.toolCalls![1]!.ok, false);
});

test('tracing: listRuns returns runs sorted by start time', () => {
  clearRuns();
  startRun('run5', 's5');
  startRun('run6', 's6');
  const runs = listRuns();
  assert.equal(runs.length, 2);
  assert.ok(runs[0]!.start >= runs[1]!.start);
});

test('tracing: clearRuns removes all', () => {
  startRun('run7', 's7');
  clearRuns();
  assert.equal(listRuns().length, 0);
});

test('tracing: getRun returns null for unknown', () => {
  clearRuns();
  assert.equal(getRun('nope'), null);
});
