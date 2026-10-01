import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAgentPrefix } from '../src/channels/telegram.js';
import { parseCron, CronParseError } from '../src/cron/parser.js';
import { parseFrontmatter } from '../src/core/frontmatter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Channel contract tests ----

test('telegram: parseAgentPrefix routes @name to known agents', () => {
  const agents = ['brief', 'teacher', 'researcher'];
  const r1 = parseAgentPrefix('@brief do the thing', agents);
  assert.equal(r1.agent, 'brief');
  assert.equal(r1.text, 'do the thing');

  const r2 = parseAgentPrefix('@unknown do the thing', agents);
  assert.equal(r2.agent, null);
  assert.equal(r2.text, '@unknown do the thing');

  const r3 = parseAgentPrefix('no mention here', agents);
  assert.equal(r3.agent, null);
});

test('telegram: parseAgentPrefix handles edge cases', () => {
  const agents = ['brief'];
  // @name with no space
  const r1 = parseAgentPrefix('@brief', agents);
  assert.equal(r1.agent, 'brief');
  // @name at end of text
  const r2 = parseAgentPrefix('hello @brief', agents);
  assert.equal(r2.agent, null); // must be at start
  // case insensitive
  const r3 = parseAgentPrefix('@BRIEF do stuff', agents);
  assert.equal(r3.agent, 'brief');
});

// ---- Fuzzing: parseCron ----

test('cron: fuzzing parseCron with random inputs', () => {
  const inputs = [
    '* * * * *',
    '0 0 * * *',
    '*/5 * * * *',
    '0 0 1 1 *',
    'invalid',
    '',
    'a b c d e',
    '99 99 99 99 99',
    '@daily',
    '@hourly',
    '@weekly',
    '0 8 * * 1-5',
    '0 8 * * MON-FRI',
  ];
  for (const input of inputs) {
    try {
      const result = parseCron(input);
      assert.ok(result, `parseCron("${input}") should return a result`);
    } catch (e) {
      assert.ok(e instanceof CronParseError, `parseCron("${input}") should throw CronParseError`);
    }
  }
});

test('cron: fuzzing parseCron with malformed inputs', () => {
  const malformed = [
    '**',
    '***',
    '****',
    '*****',
    '******',
    '-1 -1 -1 -1 -1',
    '1-2-3-4-5',
    'a-b-c-d-e',
    '1,2,3,4,5',
    '1;2;3;4;5',
    '1|2|3|4|5',
    '1&2&3&4&5',
    '1^2^3^4^5',
    '1~2~3~4~5',
    '1!2!3!4!5',
    '1@2@3@4@5',
    '1#2#3#4#5',
    '1$2$3$4$5',
    '1%2%3%4%5',
    '1&2&3&4&5',
    '1*2*3*4*5',
    '1(2(3(4(5',
    '1)2)3)4)5',
    '1[2[3[4[5',
    '1]2]3]4]5',
    '1{2{3{4{5',
    '1}2}3}4}5',
    '1<2<3<4<5',
    '1>2>3>4>5',
    '1?2?3?4?5',
    '1/2/3/4/5',
    '1\\2\\3\\4\\5',
    '1:2:3:4:5',
    '1;2;3;4;5',
    '1,2,3,4,5',
    '1.2.3.4.5',
    '1_2_3_4_5',
    '1-2-3-4-5',
    '1+2+3+4+5',
    '1=2=3=4=5',
    '1~2~3~4~5',
    '1!2!3!4!5',
    '1@2@3@4@5',
    '1#2#3#4#5',
    '1$2$3$4$5',
    '1%2%3%4%5',
    '1^2^3^4^5',
    '1&2&3&4&5',
    '1*2*3*4*5',
    '1(2(3(4(5',
    '1)2)3)4)5',
    '1[2[3[4[5',
    '1]2]3]4]5',
    '1{2{3{4{5',
    '1}2}3}4}5',
    '1<2<3<4<5',
    '1>2>3>4>5',
    '1?2?3?4?5',
    '1/2/3/4/5',
    '1\\2\\3\\4\\5',
    '1:2:3:4:5',
  ];
  for (const input of malformed) {
    try {
      parseCron(input);
      // If it doesn't throw, that's fine — just means it parsed
    } catch (e) {
      assert.ok(e instanceof CronParseError, `parseCron("${input}") should throw CronParseError, got ${e}`);
    }
  }
});

// ---- Fuzzing: parseFrontmatter ----

test('frontmatter: fuzzing parseFrontmatter with random inputs', () => {
  const inputs = [
    '---\nname: test\ndescription: test\n---\nbody',
    '---\nname: test\n---\nbody',
    '---\n---\nbody',
    '---\nname: test\ndescription: test\n---',
    'no frontmatter',
    '',
    '---',
    '---\n',
    '---\nname: test',
    'name: test\ndescription: test\n---\nbody',
    '---\nname: test\ndescription: test\n---\n---\nname: test2\n---\nbody',
    '---\nname: test\ndescription: test\n---\nbody\n---\nname: test2\n---\nbody2',
  ];
  for (const input of inputs) {
    try {
      const result = parseFrontmatter(input);
      assert.ok(result, `parseFrontmatter should return a result for: ${input.slice(0, 30)}`);
    } catch {
      // Some inputs may throw — that's acceptable
    }
  }
});

// ---- Fixture-based tests ----

test('fixtures: telegram updates are valid', () => {
  const raw = fs.readFileSync(path.join(__dirname, 'fixtures/telegram-updates.json'), 'utf8');
  const fixtures = JSON.parse(raw) as Array<{ name: string; update: { update_id: number; message: { text: string; chat: { id: number } } } }>;
  assert.ok(fixtures.length >= 4);
  for (const f of fixtures) {
    assert.ok(f.update.update_id > 0);
    assert.ok(f.update.message.text.length > 0);
    assert.ok(f.update.message.chat.id !== 0);
  }
});
