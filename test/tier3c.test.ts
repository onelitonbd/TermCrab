/**
 * Batch 34.5 — the audits: what this install allows, and where the keys are.
 *
 * The security story used to be prose. These are the mechanisms that make it
 * checkable, and the assertions that keep the check honest:
 *
 *   - `securityAudit(config)` derives findings from the *live* config: exec
 *     policy and sandbox, the approval gate, the bind address and token
 *     strength, webhook tokens, the browser, file modes
 *   - `auditSecrets()` finds key-shaped strings where they should not be
 *     (config.json, memory/, state/), masks them, and knows the two files that
 *     are supposed to hold credentials
 *   - `termcrab security`, `termcrab auth audit` and the doctor line
 *   - the docs and the census rows that claim it
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  auditSecrets,
  findSecretIn,
  formatFindings,
  maskValue,
  securityAudit,
  DANGEROUS_TOOLS,
} from '../src/agent/security.js';
import { defaults, saveConfig } from '../src/core/config.js';

const ROOT = process.cwd();

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

const cli = (args: string[], tolerateFailure = false): string => {
  try {
    return execFileSync('node', [path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js'), ...args], {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
    });
  } catch (err) {
    // `security` exits 1 when a finding is a fail — that is the contract, not
    // a test failure, so the output is still what we want to read.
    if (tolerateFailure) return String((err as { stdout?: string }).stdout ?? '');
    throw err;
  }
};

function levels(findings: { id: string; level: string }[]): Record<string, string> {
  return Object.fromEntries(findings.map((f) => [f.id, f.level]));
}

const OPENAI_KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz012345';

// --------------------------------------------------------------------- 34.5

test('34.5 the audit follows the config, not a table somebody typed once', { concurrency: false }, async (t) => {
  await t.test('exec policy: off is ok, on-and-unsandboxed is a fail, require-without-a-sandbox is a fail', () => {
    tmpHome('t34sa-');

    const off = defaults();
    off.agent.allowExec = false;
    assert.equal(levels(securityAudit({ config: off }))['exec-off'], 'ok');
    assert.ok(!securityAudit({ config: off }).some((f) => f.id === 'exec-policy'));

    const open = defaults();
    open.agent.allowExec = true;
    open.agent.sandbox = 'off';
    const opened = securityAudit({ config: open });
    assert.equal(levels(opened)['exec-unsandboxed'], 'fail');
    assert.match(opened.find((f) => f.id === 'exec-unsandboxed')!.fix!, /agent\.sandbox auto/);

    const strict = defaults();
    strict.agent.allowExec = true;
    strict.agent.sandbox = 'require';
    assert.equal(levels(securityAudit({ config: strict, sandboxAvailable: false }))['exec-nosandbox'], 'fail');
    assert.equal(levels(securityAudit({ config: strict, sandboxAvailable: true }))['exec-policy'], 'info');
  });

  await t.test('the approval gate: empty is a warning, exec uncovered while exec is on is a warning', () => {
    tmpHome('t34sb-');
    const bare = defaults() as ReturnType<typeof defaults> & { security?: { approvals?: { tools?: string[] } } };
    bare.security = { approvals: { tools: [] } } as unknown as typeof bare.security;
    const empty = securityAudit({ config: bare });
    assert.equal(levels(empty)['approvals-empty'], 'warn');
    assert.match(empty.find((f) => f.id === 'approvals-empty')!.fix!, /security\.approvals\.tools/);

    const armed = defaults() as typeof bare;
    armed.agent.allowExec = true;
    armed.security = { approvals: { tools: ['exec', 'write_file'] } } as unknown as typeof armed.security;
    const gated = securityAudit({ config: armed });
    assert.equal(levels(gated)['approvals'], 'info');
    assert.match(gated.find((f) => f.id === 'approvals')!.detail, /^gated: exec, write_file/);

    // exec left out of the list while the door is open: warn, and say so.
    armed.security = { approvals: { tools: ['write_file', 'send_file', 'kill_process'] } } as unknown as typeof armed.security;
    assert.equal(levels(securityAudit({ config: armed }))['approvals'], 'warn');
    assert.ok(DANGEROUS_TOOLS.includes('exec'));
  });

  await t.test('the door: off-loopback is a warning, a weak token beside it is a fail', () => {
    tmpHome('t34sc-');
    const loop = defaults();
    assert.equal(levels(securityAudit({ config: loop }))['gateway-loopback'], 'ok');

    const exposed = defaults();
    exposed.gateway.host = '0.0.0.0';
    exposed.gateway.token = 'k7Q2m9Xb4Tn1Wz8Rf6Hd3Ls5';
    const warned = securityAudit({ config: exposed });
    assert.equal(levels(warned)['gateway-exposed'], 'warn');
    assert.match(warned.find((f) => f.id === 'gateway-exposed')!.fix!, /REMOTE|127\.0\.0\.1/);

    exposed.gateway.token = 'short';
    const failed = securityAudit({ config: exposed });
    assert.equal(levels(failed)['gateway-exposed'], 'fail');
    assert.equal(levels(failed)['gateway-token-weak'], 'fail');
    assert.match(failed.find((f) => f.id === 'gateway-token-weak')!.detail, /only 5 characters/);

    exposed.gateway.token = 'password12345678901234567890';
    assert.equal(levels(securityAudit({ config: exposed }))['gateway-token-weak'], 'fail', 'a guessable word is weak however long');
  });

  await t.test('webhooks and the browser are reported, and a world-readable config is a warning', () => {
    tmpHome('t34sd-');
    const cfg = defaults() as ReturnType<typeof defaults> & {
      hooks?: { id: string; token?: string; prompt: string }[];
    };
    cfg.hooks = [
      { id: 'ci', prompt: 'say ok', token: 'x-hook-token-value-123456' },
      { id: 'open-door', prompt: 'say hi' },
    ] as unknown as typeof cfg.hooks;
    const hooks = securityAudit({ config: cfg });
    assert.equal(levels(hooks)['hooks'], 'warn');
    assert.match(hooks.find((f) => f.id === 'hooks')!.detail, /open-door/);

    (cfg as unknown as { agent: { allowBrowser: boolean } }).agent.allowBrowser = true;
    assert.equal(levels(securityAudit({ config: cfg }))['browser'], 'warn');

    // The permission check reads the real file.
    process.env.TCRAB_HOME = os.tmpdir() + '/t34sd-perm';
    fs.rmSync(process.env.TCRAB_HOME, { recursive: true, force: true });
    fs.mkdirSync(process.env.TCRAB_HOME, { recursive: true });
    saveConfig(defaults());
    fs.chmodSync(path.join(process.env.TCRAB_HOME, 'config.json'), 0o644);
    const loose = securityAudit({ config: defaults() });
    assert.equal(levels(loose)['config-perms'], 'warn');
    assert.match(loose.find((f) => f.id === 'config-perms')!.fix!, /chmod 600/);

    fs.chmodSync(path.join(process.env.TCRAB_HOME, 'config.json'), 0o600);
    assert.equal(levels(securityAudit({ config: defaults() }))['config-perms'], 'ok');
  });
});

test('34.5 the key audit finds keys where they should not be, and never prints them', { concurrency: false }, async (t) => {
  await t.test('a key in memory is a fail, and the preview is masked', () => {
    const home = tmpHome('t34se-');
    fs.mkdirSync(path.join(home, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(home, 'state'), { recursive: true });
    fs.writeFileSync(path.join(home, 'memory', 'MEMORY.md'), `- the api key is ${OPENAI_KEY}\n`, 'utf8');
    const findings = auditSecrets();
    const leak = findings.find((f) => f.id === 'secrets-misplaced');
    assert.ok(leak, 'a key in MEMORY.md must be reported');
    assert.equal(leak!.level, 'fail');
    assert.match(leak!.detail, /sk-p…2345/, 'four characters at each end, nothing more');
    assert.ok(!JSON.stringify(findings).includes(OPENAI_KEY), 'the full key must never appear in the audit output');
  });

  await t.test('the credential stores are checked for mode, not content', () => {
    const home = tmpHome('t34sf-');
    fs.mkdirSync(path.join(home, 'state'), { recursive: true });
    const secrets = path.join(home, 'state', 'secrets.json');
    fs.writeFileSync(secrets, JSON.stringify([{ name: 'api', value: OPENAI_KEY, createdAt: 1, updatedAt: 1 }]), 'utf8');
    fs.chmodSync(secrets, 0o644);
    const loose = auditSecrets();
    const perm = loose.find((f) => f.id === 'secret-file-perms:secrets.json');
    assert.ok(perm, 'a world-readable credential store must be reported');
    assert.equal(perm!.level, 'fail');
    assert.match(perm!.fix!, /chmod 600/);
    assert.ok(!loose.some((f) => f.title.includes('outside the credential stores')), 'the store itself is not a misplaced key');

    fs.chmodSync(secrets, 0o600);
    const tight = auditSecrets();
    assert.ok(!tight.some((f) => f.id === 'secret-file-perms:secrets.json'));
    assert.ok(tight.some((f) => f.id === 'credential-stores'), 'the audit says the stores are in use');
  });

  await t.test('a provider key in config.json is a warning with the command that moves it', () => {
    tmpHome('t34sg-');
    const cfg = defaults();
    cfg.provider.apiKey = OPENAI_KEY;
    const findings = auditSecrets({ config: cfg });
    const plain = findings.find((f) => f.id === 'provider-key-plain');
    assert.ok(plain);
    assert.equal(plain!.level, 'warn');
    assert.match(plain!.fix!, /termcrab auth add work/);

    cfg.provider.authProfile = 'work';
    assert.ok(!auditSecrets({ config: cfg }).some((f) => f.id === 'provider-key-plain'), 'a profile in use clears it');
  });

  await t.test('the pattern table and the mask', () => {
    assert.equal(findSecretIn('nothing here'), null);
    assert.equal(findSecretIn(`key ${OPENAI_KEY}`)!.name, 'OpenAI-style key');
    assert.equal(findSecretIn('ghp_abcdefghijklmnopqrstuvwx')!.name, 'GitHub token');
    assert.equal(findSecretIn('xoxb-1234567890-abcdefghij')!.name, 'Slack token');
    assert.equal(findSecretIn('AIzaSyA1234567890abcdefghijklmnopqrstu')!.name, 'Google API key');
    assert.equal(findSecretIn('AKIAIOSFODNN7EXAMPLE')!.name, 'AWS access key');
    assert.equal(findSecretIn('-----BEGIN RSA PRIVATE KEY-----')!.name, 'private key block');
    assert.equal(maskValue('short'), '••••');
    assert.equal(maskValue(OPENAI_KEY), 'sk-p…2345 (40 chars)');
    assert.equal(findSecretIn('just a sentence about keys'), null);
  });

  await t.test('the drawing', () => {
    const text = formatFindings([
      { id: 'a', level: 'fail', title: 'bad thing', detail: 'why', fix: 'do this' },
      { id: 'b', level: 'ok', title: 'fine', detail: 'ok' },
    ]);
    assert.match(text, /1 fail · 1 ok/);
    assert.match(text, /❌ bad thing/);
    assert.match(text, /fix: do this/);
    assert.match(formatFindings([]), /nothing to fix/);
  });
});

test('34.5 the CLI, the doctor and the docs all read the same audit', async (t) => {
  await t.test('termcrab security and auth audit, text and JSON', () => {
    const home = tmpHome('t34sh-');
    const cfg = defaults();
    cfg.gateway.host = '0.0.0.0';
    cfg.gateway.token = 'short';
    cfg.provider.apiKey = OPENAI_KEY;
    saveConfig(cfg);

    const json = JSON.parse(cli(['security', '--json'])) as {
      ok: boolean;
      data: { counts: Record<string, number>; findings: { id: string; level: string }[] };
    };
    assert.equal(json.ok, true);
    assert.ok(json.data.counts['fail']! >= 2, 'exposed + weak token are both fails');
    assert.ok(json.data.findings.some((f) => f.id === 'gateway-token-weak'));
    assert.ok(!cli(JSON.parse('["security","--json"]') as string[]).includes(OPENAI_KEY));

    const text = cli(['security'], true);
    assert.match(text, /🔐 Security audit/);
    assert.match(text, /gateway-token-weak|the gateway token is weak/);

    const audit = JSON.parse(cli(['auth', 'audit', '--json'])) as {
      data: { findings: { id: string; level: string }[] };
    };
    assert.ok(audit.data.findings.some((f) => f.id === 'provider-key-plain'));

    // A fail exits non-zero, so a script can gate on it.
    let code = 0;
    try {
      execFileSync('node', [path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js'), 'security'], {
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
      });
    } catch (err) {
      code = (err as { status?: number }).status ?? 0;
    }
    assert.equal(code, 1, 'a fail in the audit is exit code 1');
    void home;
  });

  await t.test('the doctor carries the policy line', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'mobile', 'doctor.ts'), 'utf8');
    assert.match(src, /securityAudit\(/, 'the doctor runs the same audit');
    assert.match(src, /termcrab security/, 'and points at the command with the fixes');
    const help = fs.readFileSync(path.join(ROOT, 'src', 'command-help.ts'), 'utf8');
    assert.match(help, /cmd: 'security'/);
    assert.match(help, /'audit            where the keys are/);
  });

  await t.test('the docs say what is enforced and what is not', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'SECURITY.md'), 'utf8');
    assert.match(doc, /termcrab security/);
    assert.match(doc, /termcrab auth audit/);
    assert.match(doc, /No built-in TLS/, 'the gap is stated');
    assert.match(doc, /No external vault|no SecretRef/, 'the vault gap is stated');
    const remote = fs.readFileSync(path.join(ROOT, 'docs', 'REMOTE.md'), 'utf8');
    assert.match(remote, /bind guard/i);
    assert.match(remote, /termcrab security/);
    const docsMap = fs.readFileSync(path.join(ROOT, 'docs', 'ARCHITECTURE.md'), 'utf8');
    assert.match(docsMap, /src\/agent\/security\.ts/);
  });

  await t.test('the census rows moved for a measured reason', () => {
    const census = JSON.parse(
      execFileSync('node', ['-e', "process.stdout.write(JSON.stringify(require('./docs/openclaw/data/census.json')))"], {
        encoding: 'utf8',
      }),
    ) as { rows: { capability: string; verdict: string; evidence: string }[] };
    for (const [capability, needle] of [
      ['Secrets management', /34\.5/],
      ['Security audits \/ doctor', /34\.5/],
      ['Remote access story', /34\.5/],
    ] as const) {
      const row = census.rows.find((r) => r.capability === capability);
      assert.ok(row, `${capability} exists`);
      assert.equal(row!.verdict, 'WORKING', `${capability} is WORKING`);
      assert.match(row!.evidence, needle, `${capability} cites the batch`);
      assert.match(row!.evidence, /limit|not /i, `${capability} states its limit`);
    }
  });
});
