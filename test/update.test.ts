import { test } from 'node:test';
import assert from 'node:assert/strict';
import { semverGt, checkForUpdate, renderUpdate } from '../src/core/update.js';

test('semverGt compares versions correctly', () => {
  assert.equal(semverGt('0.5.0', '0.4.2'), true);
  assert.equal(semverGt('0.4.2', '0.4.2'), false);
  assert.equal(semverGt('0.4.2', '0.5.0'), false);
  assert.equal(semverGt('0.10.0', '0.9.9'), true);
  assert.equal(semverGt('v1.0.0', '0.9.9'), true);
});

function stubFetch(ok: boolean, payload: unknown, status = 200) {
  return async () => ({ ok, status, json: async () => payload });
}

test('checkForUpdate detects a newer release', async () => {
  const r = await checkForUpdate('0.4.2', {
    fetchImpl: stubFetch(true, { tag_name: 'v0.9.0', html_url: 'https://example/x' }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.latest, '0.9.0');
  assert.equal(r.updateAvailable, true);
  assert.equal(r.url, 'https://example/x');
});

test('checkForUpdate reports up-to-date', async () => {
  const r = await checkForUpdate('0.9.0', { fetchImpl: stubFetch(true, { tag_name: 'v0.9.0' }) });
  assert.equal(r.ok, true);
  assert.equal(r.updateAvailable, false);
});

test('checkForUpdate never throws when offline', async () => {
  const r = await checkForUpdate('0.4.2', {
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /network down/);
});

test('renderUpdate is plain English in all three states', () => {
  const upToDate = renderUpdate({ ok: true, current: '0.4.2', latest: '0.4.2', updateAvailable: false });
  assert.match(upToDate, /latest version \(v0\.4\.2\)/);

  const available = renderUpdate({ ok: true, current: '0.4.2', latest: '0.5.0', updateAvailable: true, url: 'u' });
  assert.match(available, /0\.5\.0 is available/);
  assert.match(available, /git pull && npm install -g \./);

  const offline = renderUpdate({ ok: false, current: '0.4.2', error: 'offline' });
  assert.match(offline, /Couldn't check/);
  assert.match(offline, /you're fine running v0\.4\.2/);
});
