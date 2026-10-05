/**
 * install-ci.mjs — put the CI workflow where GitHub reads it (32.4).
 *
 * GitHub only runs a workflow from `.github/workflows/`, and it refuses pushes
 * that add or change files there unless the pushing credential carries the
 * `workflows` permission (a GitHub App can have `contents: write` and still be
 * told "Resource not accessible by integration"). This repository is written
 * from such an integration, so the workflow itself is versioned at `ci/ci.yml`
 * — reviewable, diffable, and pushed like any other file — and this script
 * copies it into place, byte for byte:
 *
 *   node scripts/install-ci.mjs            # write .github/workflows/ci.yml
 *   node scripts/install-ci.mjs --check    # verify the installed copy matches
 *   node scripts/install-ci.mjs --dest DIR # write somewhere else (tests)
 *
 * After running it, commit and push `.github/workflows/ci.yml` from an account
 * that has the `workflows` permission.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'ci', 'ci.yml');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const check = process.argv.includes('--check');
const destDir = path.resolve(arg('--dest') ?? path.join(ROOT, '.github', 'workflows'));
const dest = path.join(destDir, 'ci.yml');

if (!fs.existsSync(SOURCE)) {
  console.error(`✗ ${path.relative(ROOT, SOURCE)} is missing — the workflow source lives there`);
  process.exit(1);
}
const source = fs.readFileSync(SOURCE, 'utf8');

if (check) {
  if (!fs.existsSync(dest)) {
    console.error(`✗ ${path.relative(ROOT, dest)} is not installed — run: node scripts/install-ci.mjs (then commit + push it from an account with the workflows permission)`);
    process.exit(1);
  }
  const installed = fs.readFileSync(dest, 'utf8');
  if (installed !== source) {
    console.error(`✗ ${path.relative(ROOT, dest)} differs from ${path.relative(ROOT, SOURCE)} — run: node scripts/install-ci.mjs`);
    process.exit(1);
  }
  console.log('✓ CI workflow installed and identical to ci/ci.yml');
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, source, 'utf8');
console.log(`✓ wrote ${path.relative(ROOT, dest)} (${source.split('\n').length} lines)`);
console.log('  next: commit it and push from an account with the `workflows` permission');
console.log('        (an integration without it is refused: "refusing to allow a GitHub App to create or update workflow")');
