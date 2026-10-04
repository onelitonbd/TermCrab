import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import {
  MIGRATIONS,
  SCHEMA_VERSION,
  readStamp,
  resetSchemaGuard,
  runMigrations,
} from '../src/core/schema.js';
import { collectHome, planRestore, readBackup, restoreBackup, writeBackup } from '../src/core/backup.js';

/**
 * Batch 31 — storage you can move between phones.
 *
 * 31.1 a schema version and migrations that carry an old home forward,
 * 31.2 backup/restore that round-trips everything worth having.
 */

const execFileAsync = promisify(execFile);

function homeDir(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t31-${tag}-`));
  return dir;
}

function cli(args: string[], home: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(process.cwd(), 'dist/src/bin/termcrab.js'), ...args],
      { encoding: 'utf8', env: { ...process.env, TCRAB_HOME: home } },
      (err, stdout, stderr) => resolve({ stdout: stdout ?? '', stderr: stderr ?? '', code: err ? ((err as { code?: number }).code ?? 1) : 0 }),
    );
  });
}

// ---------------------------------------------------------------------------
// 31.1 — the version stamp and the steps
// ---------------------------------------------------------------------------

test('31.1 a fresh home is adopted at the current version, not pretend-migrated', () => {
  const root = homeDir('fresh');
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  const outcome = runMigrations(root, { release: 'test' });
  assert.equal(outcome.to, SCHEMA_VERSION);
  assert.equal(outcome.adopted, true, 'an empty directory has nothing to migrate');
  assert.equal(outcome.applied.length, MIGRATIONS.length);
  assert.equal(outcome.applied.every((a) => a.changed === 0), true);
  assert.equal(outcome.backupDir, null, 'nothing to snapshot in an empty home');

  const stamp = readStamp(root);
  assert.equal(stamp.version, SCHEMA_VERSION);
  assert.equal(stamp.release, 'test');
  assert.equal(stamp.applied.length, MIGRATIONS.length, 'the stamp names what ran');

  // Running again is a no-op, and does not duplicate history.
  const again = runMigrations(root, { release: 'test' });
  assert.equal(again.applied.length, 0);
  assert.equal(readStamp(root).applied.length, MIGRATIONS.length);
});

test('31.1 an old config is carried forward: renamed keys move, nothing else changes', () => {
  const root = homeDir('legacy');
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  const legacy = {
    provider: { type: 'openai', api_key: 'sk-legacy', base_url: 'http://127.0.0.1:11434/v1', model: 'llama3' },
    agent: { name: 'Crabby', allow_exec: true, max_iterations: 6, session_reset: 'daily' },
    telegramToken: '123:abc',
    gateway: { port: 7788 },
  };
  fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify(legacy, null, 2));

  // Transcripts written by an early build used seconds.
  fs.mkdirSync(path.join(root, 'sessions'), { recursive: true });
  const oldLine = JSON.stringify({ role: 'user', content: 'from last year', ts: 1_700_000_000 });
  fs.writeFileSync(path.join(root, 'sessions', 'main.jsonl'), `${oldLine}\n`);

  // The outbox used to live under workspace/.
  fs.mkdirSync(path.join(root, 'workspace'), { recursive: true });
  fs.writeFileSync(path.join(root, 'workspace', 'outbox.json'), JSON.stringify({ items: [{ text: 'hello' }] }));

  const before = readStamp(root);
  assert.equal(before.version, 0, 'no stamp means pre-31');
  const outcome = runMigrations(root, { release: 'test' });
  assert.equal(outcome.from, 0);
  assert.equal(outcome.to, SCHEMA_VERSION);
  assert.equal(outcome.adopted, false);
  assert.ok(outcome.backupDir, 'a non-fresh home is snapshotted before anything changes');
  assert.equal(fs.existsSync(path.join(outcome.backupDir!, 'config.json')), true, 'the old config is in the snapshot');
  assert.match(fs.readFileSync(path.join(outcome.backupDir!, 'README.txt'), 'utf8'), /Nothing here is needed unless/);

  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8')) as Record<string, Record<string, unknown>>;
  assert.equal(cfg.provider!.apiKey, 'sk-legacy');
  assert.equal(cfg.provider!.baseUrl, 'http://127.0.0.1:11434/v1');
  assert.equal('api_key' in cfg.provider!, false, 'the old key is gone, not duplicated');
  assert.equal(cfg.agent!.allowExec, true);
  assert.equal(cfg.agent!.maxIterations, 6);
  assert.equal(cfg.agent!.sessionReset, 'daily');
  assert.equal((cfg.channels!.telegram as Record<string, unknown>).token, '123:abc', 'the old top-level Telegram token moved into channels');
  assert.equal('telegramToken' in cfg, false);
  assert.equal(cfg.provider!.model, 'llama3', 'untouched keys stay untouched');

  const entry = JSON.parse(fs.readFileSync(path.join(root, 'sessions', 'main.jsonl'), 'utf8').trim()) as { ts: number; content: string };
  assert.equal(entry.ts, 1_700_000_000_000, 'seconds became milliseconds');
  assert.equal(entry.content, 'from last year', 'and the line is otherwise the same');

  assert.equal(fs.existsSync(path.join(root, 'workspace', 'outbox.json')), false, 'the old outbox moved');
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'state', 'outbox.json'), 'utf8')).items.length, 1);

  // Second run: nothing left to do.
  const again = runMigrations(root, { release: 'test' });
  assert.equal(again.applied.length, 0);
});

test('31.1 a home from a newer release is refused, and a dry run changes nothing', () => {
  const root = homeDir('newer');
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, 'state', 'schema.json'), JSON.stringify({ version: SCHEMA_VERSION + 5, applied: [] }));
  fs.writeFileSync(path.join(root, 'config.json'), '{}');
  const refused = runMigrations(root, { release: 'test' });
  assert.match(refused.refused ?? '', /newer TermCrab/);
  assert.match(refused.refused ?? '', /update the app/);
  assert.equal(readStamp(root).version, SCHEMA_VERSION + 5, 'the stamp is left exactly as it was');

  const old = homeDir('dry');
  fs.mkdirSync(path.join(old, 'state'), { recursive: true });
  fs.writeFileSync(path.join(old, 'config.json'), JSON.stringify({ provider: { api_key: 'x' } }));
  const dry = runMigrations(old, { release: 'test', dryRun: true });
  assert.ok(dry.applied.length > 0, 'the dry run lists what would happen');
  assert.equal(readStamp(old).version, 0, 'and writes no stamp');
  assert.equal(JSON.parse(fs.readFileSync(path.join(old, 'config.json'), 'utf8')).provider.api_key, 'x', 'and touches no file');
});

test('31.1 a failed step leaves the version where it was', () => {
  const root = homeDir('fail');
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config.json'), '{}');
  const boom = {
    id: `0001-boom`,
    what: 'throws on purpose',
    run: () => {
      throw new Error('disk on fire');
    },
  };
  // Reuse the module's own list by running a step directly through the public
  // path: temporarily splice it in.
  const steps = MIGRATIONS.splice(0, MIGRATIONS.length, boom as never);
  try {
    const outcome = runMigrations(root, { release: 'test' });
    assert.equal(outcome.to, 0, 'the version did not advance');
    assert.match(outcome.refused ?? '', /0001-boom failed: disk on fire/);
    assert.equal(readStamp(root).version, 0);
  } finally {
    MIGRATIONS.splice(0, MIGRATIONS.length, ...steps);
  }
  // The real list is intact for every other test.
  assert.ok(MIGRATIONS.some((s) => s.id === '0001-config-key-names'));
});

// ---------------------------------------------------------------------------
// 31.2 — backup and restore
// ---------------------------------------------------------------------------

function seedHome(root: string): void {
  fs.mkdirSync(path.join(root, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(root, 'memory'), { recursive: true });
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  fs.mkdirSync(path.join(root, 'workspace'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify({ provider: { type: 'mock', model: 'mock-1' } }, null, 2));
  fs.writeFileSync(path.join(root, 'sessions', 'main.jsonl'), `${JSON.stringify({ role: 'user', content: 'the plumber comes at 11', ts: Date.now() })}\n`);
  fs.writeFileSync(path.join(root, 'memory', 'MEMORY.md'), '- the plumber comes at 11\n');
  fs.writeFileSync(path.join(root, 'state', 'crons.json'), JSON.stringify([{ id: 'morning' }]));
  fs.writeFileSync(path.join(root, 'state', 'gateway.pid'), String(process.pid));
  fs.writeFileSync(path.join(root, 'workspace', 'SOUL.md'), '# Crabby\n');
  runMigrations(root, { release: 'test' });
}

test('31.2 the archive is a real tar with a manifest, and it round-trips a home', () => {
  const source = homeDir('src');
  seedHome(source);
  const archive = path.join(homeDir('arch'), 'backup.tar');
  const written = writeBackup(archive, { release: 'test', root: source });
  assert.equal(written.manifest.format, 'termcrab-backup');
  assert.equal(written.manifest.schemaVersion, SCHEMA_VERSION);
  assert.ok(written.manifest.files >= 5);

  // It is a tar a person's own tools can read.
  const stdout = fs.readFileSync(archive).length > 0 ? execFileSync('tar', ['-tf', archive], { encoding: 'utf8' }) : '';
  assert.match(stdout, /manifest\.json/);
  assert.match(stdout, /config\.json/);
  assert.match(stdout, /sessions\/main\.jsonl/);
  assert.equal(/gateway\.pid/.test(stdout), false, 'pid files are not backed up');

  // Our own reader agrees.
  const read = readBackup(archive);
  assert.equal(read.manifest.release, 'test');
  assert.ok(read.entries.some((e) => e.name === 'memory/MEMORY.md'));

  // Nothing here yet: a plan says so.
  const target = homeDir('dest');
  const plan = planRestore(archive, { root: target });
  assert.equal(plan.tooNew, false);
  assert.ok(plan.files.every((f) => !f.exists), 'an empty home has no conflicts');

  const restored = restoreBackup(archive, { root: target });
  assert.equal(restored.movedTo, null, 'nothing was there to move aside');
  assert.equal(fs.readFileSync(path.join(target, 'memory', 'MEMORY.md'), 'utf8'), '- the plumber comes at 11\n');
  assert.equal(fs.readFileSync(path.join(target, 'sessions', 'main.jsonl'), 'utf8').length > 0, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'state', 'crons.json'), 'utf8'))[0].id, 'morning');
  assert.equal(readStamp(target).version, SCHEMA_VERSION, 'the schema came with the data');
});

test('31.2 restoring over an existing home moves the old files aside instead of deleting them', () => {
  const source = homeDir('src2');
  seedHome(source);
  fs.writeFileSync(path.join(source, 'memory', 'MEMORY.md'), '- new fact\n');
  const archive = path.join(homeDir('arch2'), 'b.tar');
  writeBackup(archive, { release: 'test', root: source });

  const target = homeDir('dest2');
  fs.mkdirSync(path.join(target, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(target, 'memory', 'MEMORY.md'), '- old fact I might want\n');
  const restored = restoreBackup(archive, { root: target });
  assert.ok(restored.movedTo, 'the previous files were moved, not overwritten');
  assert.equal(fs.readFileSync(path.join(target, 'memory', 'MEMORY.md'), 'utf8'), '- new fact\n');
  assert.equal(fs.readFileSync(path.join(restored.movedTo!, 'memory', 'MEMORY.md'), 'utf8'), '- old fact I might want\n');
});

test('31.2 a newer backup is refused without --force, and junk is refused with a sentence', () => {
  const source = homeDir('src3');
  seedHome(source);
  const archive = path.join(homeDir('arch3'), 'c.tar');
  writeBackup(archive, { release: 'test', root: source });

  const target = homeDir('dest3');
  assert.throws(() => restoreBackup(archive, { root: target, thisSchema: SCHEMA_VERSION - 1 }), /newer TermCrab/);
  const forced = restoreBackup(archive, { root: target, thisSchema: SCHEMA_VERSION - 1, force: true });
  assert.ok(forced.restored > 0, '--force really restores');

  const junk = path.join(homeDir('junk'), 'not-a-backup.tar');
  fs.writeFileSync(junk, 'hello, I am not a tar file at all\n');
  assert.throws(() => readBackup(junk), /not a tar archive|truncated|empty/);
  const plainDir = homeDir('plain');
  fs.writeFileSync(path.join(plainDir, 'something.txt'), 'an ordinary tar\n');
  const plainTar = path.join(plainDir, 'plain.tar');
  execFileSync('tar', ['-cf', plainTar, '-C', plainDir, 'something.txt']);
  assert.throws(() => readBackup(plainTar), /not one of ours|no manifest/);
});

// ---------------------------------------------------------------------------
// 31.2 — the commands a person actually types
// ---------------------------------------------------------------------------

test('31.2 `termcrab backup`, `restore --dry-run` and `schema` speak plainly on the terminal', async () => {
  const source = homeDir('cli-src');
  seedHome(source);
  const archive = path.join(homeDir('cli-arch'), 'home.tar');

  const backup = await cli(['backup', archive], source);
  assert.equal(backup.code, 0, backup.stderr);
  assert.match(backup.stdout, /📦/);
  assert.match(backup.stdout, /schema \d+/);
  assert.match(backup.stdout, /restore it with: termcrab restore home\.tar/);

  const backupJson = await cli(['backup', archive, '--json'], source);
  const parsed = JSON.parse(backupJson.stdout) as { ok: boolean; data: { format: string; files: number } };
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.format, 'termcrab-backup');
  assert.ok(parsed.data.files > 0);

  const target = homeDir('cli-dest');
  const dry = await cli(['restore', archive, '--dry-run'], target);
  assert.equal(dry.code, 0);
  assert.match(dry.stdout, /would be written/);
  assert.equal(fs.existsSync(path.join(target, 'memory', 'MEMORY.md')), false, 'a dry run writes nothing');

  const real = await cli(['restore', archive], target);
  assert.equal(real.code, 0);
  assert.match(real.stdout, /✅ restored \d+ file\(s\)/);
  assert.match(real.stdout, /schema: 3 of 3|schema: 2 of 3|schema: 1 of 3/);

  const schema = await cli(['schema'], source);
  assert.equal(schema.code, 0);
  assert.match(schema.stdout, /🧬 state schema \d+/);
  assert.match(schema.stdout, /✔ 0001-config-key-names/);

  const schemaJson = await cli(['schema', '--json'], source);
  const parsedSchema = JSON.parse(schemaJson.stdout) as { data: { current: number; stamp: { version: number } } };
  assert.equal(parsedSchema.data.current, SCHEMA_VERSION);
  assert.equal(parsedSchema.data.stamp.version, SCHEMA_VERSION);

  // A missing file and a wrong file are both sentences, not stack traces.
  const missing = await cli(['restore', path.join(target, 'nope.tar')], target);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /no such file/);
});

test('31.1 the CLI carries an old home forward on the next command, and says so', async () => {
  resetSchemaGuard();
  const root = homeDir('carry');
  fs.mkdirSync(path.join(root, 'state'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify({ provider: { type: 'mock', model: 'mock-1', api_key: 'legacy-key' } }));
  const result = await cli(['sessions', 'ls'], root);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stderr, /state schema 0 → 3: 3 migration\(s\) ran/, 'the upgrade is announced on stderr (stdout stays machine-readable)');
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8')) as { provider: Record<string, unknown> };
  assert.equal(cfg.provider.apiKey, 'legacy-key');
  assert.equal(readStamp(root).version, SCHEMA_VERSION);

  // A newer stamp stops the command instead of corrupting anything.
  fs.writeFileSync(path.join(root, 'state', 'schema.json'), JSON.stringify({ version: SCHEMA_VERSION + 9, applied: [] }));
  const refused = await cli(['sessions', 'ls'], root);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /newer TermCrab/);
});

test('31.2 collectHome never walks into a backup of a backup', () => {
  const root = homeDir('collect');
  seedHome(root);
  fs.mkdirSync(path.join(root, 'state', 'backups', '2026-01-01'), { recursive: true });
  fs.writeFileSync(path.join(root, 'state', 'backups', '2026-01-01', 'config.json'), '{}');
  const entries = collectHome(root).map((e) => e.rel);
  assert.equal(entries.some((e) => e.startsWith('state/backups')), false, 'snapshots are not archived');
  assert.ok(entries.includes('config.json'));
  assert.ok(entries.includes('sessions/main.jsonl'));
});

// ---------------------------------------------------------------------------
// 31.3 — an update that can be taken back
// ---------------------------------------------------------------------------

test('31.3 a build snapshot keeps the code, and restoring it puts the old build back', async () => {
  const { latestBuildSnapshot, restoreBuildSnapshot, snapshotBuild, verifyBuild } = await import('../src/core/updater.js');
  const home = homeDir('snap');
  const root = homeDir('install');
  fs.mkdirSync(path.join(root, 'dist', 'src', 'bin'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist', 'test'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ui'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'termcrab', version: '1.2.3' }));
  fs.writeFileSync(path.join(root, 'ui', 'index.html'), '<html></html>');
  const good = '#!/usr/bin/env node\nif (process.argv[2] === "--version") { console.log("termcrab 1.2.3"); process.exit(0); }\nif (process.argv[2] === "schema") { console.log(JSON.stringify({ ok: true, command: "schema", data: {} })); process.exit(0); }\nprocess.exit(0);\n';
  fs.writeFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), good);
  fs.writeFileSync(path.join(root, 'dist', 'test', 'huge.js'), 'x'.repeat(1000));

  const snap = snapshotBuild(home, root, '1.2.3');
  assert.ok(snap, 'a snapshot was written');
  assert.ok(snap!.files >= 3);
  assert.equal(fs.existsSync(path.join(snap!.dir, 'dist', 'test', 'huge.js')), false, 'the test build is not snapshotted');
  assert.equal(fs.existsSync(path.join(snap!.dir, 'dist', 'src', 'bin', 'termcrab.js')), true);
  assert.equal(latestBuildSnapshot(home), snap!.dir, 'it is the newest snapshot');

  // The build that replaces it is broken in the way that matters: it cannot start.
  fs.writeFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), 'this is not javascript (((\n');
  const broken = await verifyBuild(root);
  assert.equal(broken.ok, false);
  assert.ok(broken.detail.length > 5, 'it says why');

  // Weird exit code but valid JS: also caught.
  fs.writeFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), 'console.error("boom"); process.exit(3);\n');
  assert.equal((await verifyBuild(root)).ok, false);

  // A build that runs but answers nonsense is caught too.
  fs.writeFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), 'console.log("hello");\n');
  assert.match((await verifyBuild(root)).detail, /did not answer --version/);

  // The good one verifies — and the snapshot can put it back.
  fs.writeFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), 'broken\n');
  const written = restoreBuildSnapshot(snap!.dir, root);
  assert.ok(written >= 2, 'the files came back');
  assert.equal(fs.readFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), 'utf8'), good);
  assert.equal((await verifyBuild(root)).ok, true, 'and the restored build starts');
});

test('31.3 verifyBuild accepts a real-looking build and rejects one whose schema layer is broken', async () => {
  const { verifyBuild } = await import('../src/core/updater.js');
  const root = homeDir('verify');
  fs.mkdirSync(path.join(root, 'dist', 'src', 'bin'), { recursive: true });
  const entry = path.join(root, 'dist', 'src', 'bin', 'termcrab.js');
  fs.writeFileSync(entry, 'console.log("termcrab 1.2.3");\n');
  assert.equal((await verifyBuild(root)).ok, false, 'a build that cannot answer `schema` is not verified');
  fs.writeFileSync(entry, 'if (process.argv[2] === "schema") { console.log(\'{"ok":true}\'); } else { console.log("termcrab 1.2.3"); }\n');
  const ok = await verifyBuild(root);
  assert.equal(ok.ok, true);
  assert.match(ok.detail, /termcrab 1\.2\.3/);

  // The real build in this repository verifies as it stands.
  const real = await verifyBuild(process.cwd());
  assert.equal(real.ok, true, real.detail);
});

test('31.3 a failed apply rolls back to exactly the files that were there before', async () => {
  const { applyVerified } = await import('../src/core/updater.js');
  const home = homeDir('apply');
  const root = path.join(home, 'install');
  fs.mkdirSync(path.join(root, 'dist', 'src', 'bin'), { recursive: true });
  fs.mkdirSync(path.join(root, 'ui'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'termcrab', version: '1.0.0' }));
  fs.writeFileSync(path.join(root, 'ui', 'index.html'), 'old panel');
  const original = 'console.log("termcrab 1.0.0");\n';
  fs.writeFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), original);

  // The update "succeeds" but produces a build that cannot run: rollback.
  const result = await applyVerified({
    homeRoot: home,
    release: '1.0.0',
    root,
    runImpl: async (_cmd: string, args: string[]) => {
      if (args.includes('status')) return '';
      if (args.includes('--abbrev-ref')) return 'main\n';
      if (args.includes('pull')) {
        fs.writeFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), 'throw new Error("broken build");\n');
        fs.writeFileSync(path.join(root, 'ui', 'index.html'), 'new panel');
        return '';
      }
      return '';
    },
    verify: async (r: string) => (await import('../src/core/updater.js')).verifyBuild(r),
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /did not start/);
  assert.equal(result.rolledBack, true, 'the rollback ran');
  assert.equal(fs.readFileSync(path.join(root, 'dist', 'src', 'bin', 'termcrab.js'), 'utf8'), original, 'the old build is back, byte for byte');
  assert.equal(fs.readFileSync(path.join(root, 'ui', 'index.html'), 'utf8'), 'old panel');
  assert.ok(fs.existsSync(path.join(result.snapshot!, 'dist', 'src', 'bin', 'termcrab.js')), 'and the snapshot is kept for next time');
});
