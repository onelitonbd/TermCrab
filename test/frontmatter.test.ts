import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter } from '../src/core/frontmatter.js';

test('parses scalar frontmatter values', () => {
  const { data, content } = parseFrontmatter('---\nname: web-research\ndescription: Does things\n---\n\n# Body');
  assert.equal(data.name, 'web-research');
  assert.equal(data.description, 'Does things');
  assert.equal(content.trim(), '# Body');
});

test('parses numbers, booleans, inline arrays', () => {
  const { data } = parseFrontmatter('---\ncount: 42\nenabled: true\ntags: [a, b, c]\n---\n');
  assert.equal(data.count, 42);
  assert.equal(data.enabled, true);
  assert.deepEqual(data.tags, ['a', 'b', 'c']);
});

test('returns whole text when no frontmatter', () => {
  const { data, content } = parseFrontmatter('# Just a doc\nwith text');
  assert.deepEqual(data, {});
  assert.equal(content, '# Just a doc\nwith text');
});

test('handles unterminated frontmatter as plain text', () => {
  const { data } = parseFrontmatter('---\nname: x');
  assert.deepEqual(data, {});
});

test('parses quoted strings', () => {
  const { data } = parseFrontmatter('---\ndesc: "hello: world"\n---\n');
  assert.equal(data.desc, 'hello: world');
});
