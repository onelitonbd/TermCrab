#!/usr/bin/env node
/**
 * Release discipline (10.7).
 *
 * The version in `package.json` and the newest entry in `CHANGELOG.md` are one
 * fact: this script writes them together and `npm test` fails when they drift.
 * A release is therefore never "a version number somebody forgot to explain",
 * and never "notes for a version that does not exist".
 *
 *   node scripts/release.mjs --check [--root <dir>]     verify (exit 1 on drift)
 *   node scripts/release.mjs patch|minor|major|1.2.3    write the next entry
 *   node scripts/release.mjs --check --notes            print the notes (for gh release create)
 *   node scripts/release.mjs patch --tag                …and create the git tag
 *
 * Notes live in CHANGELOG.md; the script never invents prose. After a bump it
 * leaves the new section empty on purpose — an empty entry fails `--check`, so
 * the notes must be written before the release can be tagged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = path.resolve(valueOf('--root') ?? process.cwd());
const pkgPath = path.join(root, 'package.json');
const changelogPath = path.join(root, 'CHANGELOG.md');
const repoRoot = path.resolve(process.cwd());
const inRepo = root === repoRoot;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function readPackage() {
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    fail(`cannot read ${pkgPath}: ${err.message}`);
  }
}

function readChangelog() {
  try {
    return fs.readFileSync(changelogPath, 'utf8');
  } catch (err) {
    fail(`cannot read ${changelogPath}: ${err.message}`);
  }
}

/** Every `## X.Y.Z - YYYY-MM-DD` section, newest first. */
function parseEntries(md) {
  const lines = md.split('\n');
  const out = [];
  let current = null;
  for (const line of lines) {
    const m = /^##\s+(\d+\.\d+\.\d+)\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/.exec(line.trim());
    if (m) {
      current = { version: m[1], date: m[2], body: [] };
      out.push(current);
      continue;
    }
    if (current) current.body.push(line);
  }
  return out.map((e) => ({ ...e, body: e.body.join('\n').trim() }));
}

function isCleanTree() {
  if (!inRepo) return true;
  try {
    return execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).trim() === '';
  } catch {
    return false;
  }
}

function bump(version, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`;
  return null;
}

function check() {
  const pkg = readPackage();
  const md = readChangelog();
  const entries = parseEntries(md);
  if (!entries.length) {
    fail(`CHANGELOG.md has no "## X.Y.Z - YYYY-MM-DD" entry, so ${pkg.version} cannot be released`);
  }
  const newest = entries[0];
  if (newest.version !== pkg.version) {
    fail(
      `package.json says ${pkg.version} but the newest CHANGELOG entry is ${newest.version} ` +
        `(${newest.date}) — bump with: node scripts/release.mjs <patch|minor|major>`,
    );
  }
  if (!newest.body.trim()) {
    fail(`the CHANGELOG entry for ${newest.version} is empty — write the notes before releasing`);
  }
  // The lock file carries the same version, and a bump that forgets it is how
  // `npm ci` ends up quoting an old release (this happened for real: 0.58.0 in
  // package.json against 0.52.0 in package-lock.json).
  const lockVersion = readLockVersion();
  if (lockVersion && lockVersion !== pkg.version) {
    fail(
      `package-lock.json says ${lockVersion} but package.json says ${pkg.version} — ` +
        'sync it with: npm install --package-lock-only',
    );
  }
  const lockNote = lockVersion ? `, package-lock.json ${lockVersion}` : '';
  const lines = newest.body.split('\n').filter((l) => l.trim()).length;
  console.log(
    `✓ version ${pkg.version} matches the newest CHANGELOG entry (${newest.date}, ${lines} line(s) of notes)${lockNote}`,
  );
  if (flag('--notes')) {
    console.log('');
    console.log(newest.body);
  }
  return { pkg, newest };
}

/**
 * The version recorded in package-lock.json, or null when there is no lock
 * (a checkout without one is fine; a *stale* one is not).
 */
function readLockVersion() {
  const lockPath = path.join(root, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return null;
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    return lock.version ?? lock.packages?.['']?.version ?? null;
  } catch (err) {
    fail(`cannot read ${lockPath}: ${err.message}`);
  }
}

/** Keep the lock's own version fields in step when one is present. */
function syncLock(version) {
  const lockPath = path.join(root, 'package-lock.json');
  if (!fs.existsSync(lockPath)) return;
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.version = version;
    if (lock.packages?.['']) lock.packages[''].version = version;
    fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    console.log(`✓ package-lock.json ${version}`);
  } catch (err) {
    fail(`cannot update ${lockPath}: ${err.message}`);
  }
}

function write(version) {
  const pkg = readPackage();
  const next = bump(pkg.version, version);
  if (!next) fail(`unknown release kind: ${version} (use patch, minor, major or X.Y.Z)`);
  const md = readChangelog();
  if (parseEntries(md).some((e) => e.version === next)) fail(`CHANGELOG.md already has an entry for ${next}`);
  const today = new Date().toISOString().slice(0, 10);
  const header = '# Changelog\n';
  if (!md.startsWith(header)) fail('CHANGELOG.md must start with "# Changelog"');
  const section = `\n## ${next} - ${today}\n\n- TODO: what changed, and why it matters to somebody on a phone.\n`;
  fs.writeFileSync(changelogPath, md.replace(header, `${header}${section}`), 'utf8');
  pkg.version = next;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`✓ package.json ${next} + a CHANGELOG section written`);
  syncLock(next);
  console.log(`  next: write the notes in CHANGELOG.md, then  git add -A && git commit -m "release: ${next}"`);
  if (inRepo) {
    console.log(`  then: node scripts/release.mjs --check   and   git tag -a v${next} -m "v${next}"`);
  }
  return next;
}

function tag(version) {
  if (!inRepo) fail('--tag only works inside the repo');
  if (!isCleanTree()) fail('the working tree is not clean — commit the release first, then tag');
  execFileSync('git', ['tag', '-a', `v${version}`, '-m', `v${version}`], { cwd: repoRoot, stdio: 'inherit' });
  console.log(`✓ tagged v${version}`);
  console.log(`  publish: git push --follow-tags   (then: gh release create v${version} --notes-file <(node scripts/release.mjs --check --notes))`);
}

const kind = args.find((a) => !a.startsWith('--'));
if (flag('--check')) {
  const { pkg } = check();
  if (flag('--tag') && inRepo) {
    if (isCleanTree()) {
      try {
        execFileSync('git', ['tag', '-a', `v${pkg.version}`, '-m', `v${pkg.version}`], { cwd: repoRoot, stdio: 'inherit' });
        console.log(`✓ tagged v${pkg.version}`);
      } catch {
        console.log(`(tag v${pkg.version} already exists)`);
      }
    } else {
      console.log('(not tagging: the working tree is not clean)');
    }
  }
} else if (kind) {
  const version = write(kind);
  if (flag('--tag') && version) tag(version);
} else {
  console.log(`usage:
  node scripts/release.mjs --check [--root <dir>] [--notes]
  node scripts/release.mjs <patch|minor|major|X.Y.Z> [--tag]`);
  process.exit(1);
}
