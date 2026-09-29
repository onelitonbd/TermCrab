import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShareReport, Check } from '../src/mobile/doctor.js';

test('share report is copy-paste safe: secrets scrubbed, checks present', () => {
  const checks: Check[] = [
    { id: 'node', label: 'Node.js >= 20.10', status: 'ok', detail: 'found v22.1.0' },
    { id: 'config', label: 'config file', status: 'warn', detail: 'provider apiKey sk-leaked-secret-12345678' },
    {
      id: 'telegram',
      label: 'telegram channel',
      status: 'fail',
      detail: 'token 1234567890:AAHsecretsecretsecretsecret',
      fix: 'set a valid token',
    },
  ];
  const report = buildShareReport(checks, {
    version: '0.4.3',
    provider: 'openai:gpt-4o-mini',
    node: 'v22.1.0',
    platform: 'Linux 6.1',
    home: '/data/data/com.termux/files/home/.termcrab',
    configPath: '/data/data/com.termux/files/home/.termcrab/config.json',
  });

  assert.ok(!report.includes('sk-leaked-secret-12345678'), 'api key must not leak');
  assert.ok(!report.includes('AAHsecretsecretsecretsecret'), 'telegram token must not leak');
  assert.ok(report.includes('[key]') || !report.includes('sk-'), 'key-shaped text replaced');
  assert.match(report, /\[ok\] node/);
  assert.match(report, /\[fail\] telegram/);
  assert.match(report, /fix: set a valid token/);
  assert.match(report, /secrets: none included/);
  assert.match(report, /v0\.4\.3/);
  assert.match(report, /result: 1 failing check/);
});
