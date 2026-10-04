/**
 * Voice, measured instead of asserted (33.5).
 *
 * Every earlier test of these files ran on a machine that has no
 * `termux-speech-to-text`, no `whisper-cli` and no TTS backend — which proved
 * the *error* paths well and the working paths not at all. The phone is the
 * target device, so "it works on the phone" is the claim that has to be
 * demonstrated: here each engine is replaced by a real executable of the same
 * shape (same name, same argv/stdio contract) placed first on PATH, and the
 * whole path runs: spawn → parse → result → CLI/JSON.
 *
 * What this does and does not prove: it proves our side — the argv we pass, the
 * first-line-wins rule, the timeout, the chunking, the transcript we hand to the
 * model — for any binary that behaves like the real one. It cannot prove that
 * the real Termux:API app or whisper.cpp build is installed on a given phone;
 * that is what `termcrab doctor` and the install sentences are for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const CLI = fileURLToPath(new URL('../src/bin/termcrab.js', import.meta.url));

interface Fake {
  dir: string;
  log: string;
  home: string;
  restore: () => void;
}

/**
 * A temp directory of fake binaries in front of PATH, plus a home. Each binary
 * is a shell script, so it exercises the real spawn path.
 */
function fakeBin(scripts: Record<string, string>, tag: string): Fake {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `tcvoice-${tag}-`));
  const home = path.join(dir, 'home');
  fs.mkdirSync(home, { recursive: true });
  const log = path.join(dir, 'calls.log');
  fs.writeFileSync(log, '');
  for (const [name, body] of Object.entries(scripts)) {
    const file = path.join(dir, name);
    fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    fs.chmodSync(file, 0o755);
  }
  const oldPath = process.env.PATH;
  const oldHome = process.env.TCRAB_HOME;
  const oldPrefix = process.env.PREFIX;
  const oldLog = process.env.LOG;
  process.env.PATH = `${dir}${path.delimiter}${oldPath ?? ''}`;
  process.env.TCRAB_HOME = home;
  // The fake binaries record what they were called with; the modules spawn them
  // with this environment, so the log path rides along.
  process.env.LOG = log;
  delete process.env.PREFIX;
  return {
    dir,
    log,
    home,
    restore: () => {
      process.env.PATH = oldPath;
      if (oldHome === undefined) delete process.env.TCRAB_HOME;
      else process.env.TCRAB_HOME = oldHome;
      if (oldPrefix === undefined) delete process.env.PREFIX;
      else process.env.PREFIX = oldPrefix;
      if (oldLog === undefined) delete process.env.LOG;
      else process.env.LOG = oldLog;
    },
  };
}

const calls = (log: string): string[] =>
  fs
    .readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean);

// --------------------------------------------------------------- speech to text

test('33.5 dictation runs a real recognizer and takes the first phrase', async () => {
  const fake = fakeBin(
    {
      'termux-speech-to-text': `printf 'set a timer for ten minutes\\nand another line\\n' >> ${'"$LOG"'} 2>/dev/null || true
printf 'set a timer for ten minutes\\nand another line\\n'`,
    },
    'stt',
  );
  try {
    const { listenOnce } = await import('../src/mobile/stt.js');
    const one = await listenOnce(5_000);
    assert.equal(one.ok, true, one.error);
    assert.equal(one.text, 'set a timer for ten minutes', 'the first recognized line is the phrase');

    // Nothing heard is a sentence, not a hang.
    fs.writeFileSync(path.join(fake.dir, 'termux-speech-to-text'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    fs.chmodSync(path.join(fake.dir, 'termux-speech-to-text'), 0o755);
    const silent = await listenOnce(2_000);
    assert.equal(silent.ok, false);
    assert.match(String(silent.error), /no speech recognized|nothing heard/);

    // A recognizer that never answers hits the deadline and says so — with the
    // wait it actually had (43.2: the sentence used to say 30s no matter what
    // the caller asked for).
    fs.writeFileSync(path.join(fake.dir, 'termux-speech-to-text'), '#!/bin/sh\nsleep 2\n', { mode: 0o755 });
    fs.chmodSync(path.join(fake.dir, 'termux-speech-to-text'), 0o755);
    const started = Date.now();
    const slow = await listenOnce(150);
    assert.equal(slow.ok, false);
    assert.ok(Date.now() - started < 3_000, 'settles at the deadline');
    assert.match(String(slow.error), /nothing heard/);
    assert.match(String(slow.error), /waited 0\.\ds/, 'the timeout names the wait this call had');
    assert.doesNotMatch(String(slow.error), /waited 30s/, 'not a hard-coded 30s the caller never asked for');

    // Continuous mode: a phrase goes to the callback and listening continues
    // until stop() — with a delay between attempts so it cannot spin.
    fs.writeFileSync(
      path.join(fake.dir, 'termux-speech-to-text'),
      '#!/bin/sh\nprintf "phrase %s\\n" "$(date +%s%N)"\n',
      { mode: 0o755 },
    );
    fs.chmodSync(path.join(fake.dir, 'termux-speech-to-text'), 0o755);
    const { startContinuousStt: start } = await import('../src/mobile/tts-stream.js');
    const heard: string[] = [];
    const loop = start((t) => heard.push(t), { timeoutMs: 5_000, restartDelayMs: 20 });
    // 43.3 — wait for the second phrase instead of timing the loop with a
    // stopwatch: a fixed 400 ms window is a flake waiting for a loaded machine
    // (it went red once in a full-suite run and passed three times alone).
    const deadline = Date.now() + 3_000;
    while (heard.length < 2 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
    loop.stop();
    const atStop = heard.length;
    assert.ok(atStop >= 2, `continuous listening keeps going (heard ${atStop})`);
    assert.equal(loop.isRunning(), false);
    await new Promise((r) => setTimeout(r, 250));
    assert.equal(heard.length, atStop, 'nothing arrives after stop()');

    // 43.1 — the race that flake was made of, made deterministic: a phrase
    // already in the pipe when stop() is called must not be delivered. The busy
    // loop keeps the event loop from reading the child's output until after
    // stop(), so the delivery has to lose the race every single time.
    const raced: string[] = [];
    const blocked = start((t) => raced.push(t), { timeoutMs: 5_000, restartDelayMs: 20 });
    const until = Date.now() + 250;
    while (Date.now() < until) { /* deliberately block the event loop */ }
    blocked.stop();
    await new Promise((r) => setTimeout(r, 250));
    assert.deepEqual(raced, [], 'a stopped listener never calls back, even for speech already in the pipe');
    assert.equal(blocked.isRunning(), false);
  } finally {
    fake.restore();
  }
});

// ------------------------------------------------------------------ text to speech

test('33.5 speaking passes the words to a real backend, and reports which one', async () => {
  const fake = fakeBin(
    {
      'termux-tts-speak': `printf '%s\\n' "$@" >> ${'"$LOG"'}
exit 0`,
    },
    'tts',
  );
  try {
    process.env.LOG_MARKER = 'x';
    const { speak } = await import('../src/mobile/tts.js');
    const r = await speak('  good morning, handsome  ');
    assert.equal(r.ok, true, r.error);
    assert.equal(r.backend, 'termux-tts-speak', 'the phone-native backend wins when it exists');
    assert.deepEqual(calls(fake.log), ['good morning, handsome'], 'the words arrive trimmed, as one argument');

    // The same path through the CLI, as one JSON document.
    const said = JSON.parse(
      (await execFileP(process.execPath, [CLI, 'say', 'hello from the phone', '--json'], { env: { ...process.env } })).stdout,
    ) as { ok: boolean; data: { spoken: boolean; backend: string; chars: number } };
    assert.equal(said.ok, true);
    assert.equal(said.data.spoken, true);
    assert.equal(said.data.backend, 'termux-tts-speak');
    assert.equal(said.data.chars, 'hello from the phone'.length);

    // The text arrives trimmed, as one argument — no shell interpretation.
    const { speakStream, splitForTts } = await import('../src/mobile/tts-stream.js');
    const beforeStream = calls(fake.log).length;
    const short = await speakStream('First sentence. Second sentence here. Third one.');
    assert.equal(short.ok, true, short.error);
    assert.equal(short.backend, 'termux-tts-speak', 'streaming uses the same backend chain as say');
    assert.equal(
      calls(fake.log).length - beforeStream,
      1,
      'short text is one chunk, so one backend call — chunking is for long text, not every sentence',
    );

    // Chunking: sentences, never a chunk past the cap — and the long text really
    // is spoken chunk by chunk, in order.
    const long = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} with a few words in it.`).join(' ');
    const chunks = splitForTts(long);
    assert.ok(chunks.length > 2, 'long text is spoken in several chunks');
    for (const c of chunks) assert.ok(c.length <= 200, `chunk fits: ${c.length}`);
    assert.match(chunks.join(' '), /Sentence number 0/);
    assert.match(chunks.at(-1)!, /Sentence number 11/);

    const beforeLong = calls(fake.log).length;
    const streamed = await speakStream(long);
    assert.equal(streamed.ok, true, streamed.error);
    const spoken = calls(fake.log).slice(beforeLong);
    assert.equal(spoken.length, chunks.length, 'the backend is called once per chunk');
    assert.deepEqual(spoken, chunks, 'the chunks arrive in order, unmodified');

    // A backend that fails is named, not hidden.
    fs.writeFileSync(path.join(fake.dir, 'termux-tts-speak'), '#!/bin/sh\necho "no audio device" >&2\nexit 3\n', { mode: 0o755 });
    fs.chmodSync(path.join(fake.dir, 'termux-tts-speak'), 0o755);
    const failed = await speak('this will not play');
    assert.equal(failed.ok, false);
    assert.equal(failed.backend, 'termux-tts-speak');
    assert.ok(String(failed.error).length > 0);

    // Nothing to say is not an error to log.
    const empty = await speak('   ');
    assert.equal(empty.ok, false);
    assert.equal(empty.error, 'nothing to say');


    // With the phone backend gone, the desktop chain is used — and named.
    fs.rmSync(path.join(fake.dir, 'termux-tts-speak'));
    fs.writeFileSync(path.join(fake.dir, 'espeak-ng'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    fs.chmodSync(path.join(fake.dir, 'espeak-ng'), 0o755);
    const fallback = await speak('fallback please');
    assert.equal(fallback.ok, true, fallback.error);
    assert.equal(fallback.backend, 'espeak-ng');

    // And with nothing at all, one sentence with the install step.
    fs.rmSync(path.join(fake.dir, 'espeak-ng'));
    const none = await speak('anyone home');
    assert.equal(none.ok, false);
    assert.match(String(none.error), /no TTS backend found.*termux-api/s);
  } finally {
    fake.restore();
  }
});

// -------------------------------------------------------------- local transcription

test('33.5 an audio file is transcribed by the engine on PATH, and the CLI shows it', async () => {
  const fake = fakeBin(
    {
      'whisper-cli': `printf '%s ' "$@" >> ${'"$LOG"'}
printf '\\n' >> ${'"$LOG"'}
printf '[00:00:00.000 --> 00:00:02.000]  Remember to call your mother.\\n' >&2
printf 'Remember to call your mother.\\n'
exit 0`,
    },
    'whisper',
  );
  try {
    // A model in the home's models/ folder is what whisper.cpp needs.
    fs.mkdirSync(path.join(fake.home, 'models'), { recursive: true });
    fs.writeFileSync(path.join(fake.home, 'models', 'ggml-tiny.bin'), 'fake weights');
    const audio = path.join(fake.dir, 'note.wav');
    fs.writeFileSync(audio, 'RIFF....');

    const { transcribeFile, findWhisperBin, findWhisperModel } = await import('../src/mobile/whisper.js');
    assert.equal(path.basename(String(findWhisperBin())), 'whisper-cli', 'the engine on PATH is found');
    assert.match(String(findWhisperModel()), /ggml-tiny\.bin$/);

    const t = await transcribeFile(audio, { timeoutMs: 10_000 });
    assert.equal(t.ok, true, t.error);
    assert.equal(t.text, 'Remember to call your mother.');
    assert.ok(typeof t.ms === 'number' && t.ms >= 0);
    const argv = calls(fake.log)[0]!.trim();
    assert.match(argv, /-m .*ggml-tiny\.bin -f .*note\.wav -np$/, 'the argv is the documented one');

    // The same thing through the real CLI, as one JSON document.
    const env = { ...process.env };
    const cli = await execFileP(process.execPath, [CLI, 'transcribe', audio, '--json'], { env });
    const parsed = JSON.parse(cli.stdout) as { ok: boolean; data: { text: string; engine: string; model: string } };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.data.text, 'Remember to call your mother.');
    assert.match(parsed.data.engine, /whisper-cli$/);
    assert.match(parsed.data.model, /ggml-tiny\.bin$/);

    // The transcript is what the agent reads: the arrival prompt carries it.
    const { intakePrompt } = await import('../src/channels/intake.js');
    const prompt = await intakePrompt(
      { path: audio, name: 'note.wav', bytes: 8, kind: 'audio', mimeType: 'audio/wav' } as never,
      { kind: 'audio', name: 'note.wav', caption: '' } as never,
      {},
      {},
    );
    assert.match(prompt, /Transcript:\nRemember to call your mother\./);

    // A missing model is a sentence naming the exact file to drop in.
    fs.rmSync(path.join(fake.home, 'models', 'ggml-tiny.bin'));
    const noModel = await transcribeFile(audio, { timeoutMs: 5_000 });
    assert.equal(noModel.ok, false);
    assert.match(String(noModel.error), /no whisper model found.*ggml-tiny\.bin/s);

    // An engine that fails says which engine failed; one that hangs hits the deadline.
    fs.writeFileSync(path.join(fake.dir, 'whisper-cli'), '#!/bin/sh\necho "bad audio" >&2\nexit 1\n', { mode: 0o755 });
    fs.chmodSync(path.join(fake.dir, 'whisper-cli'), 0o755);
    fs.writeFileSync(path.join(fake.home, 'models', 'ggml-tiny.bin'), 'fake weights');
    const broke = await transcribeFile(audio, { timeoutMs: 5_000 });
    assert.equal(broke.ok, false);
    assert.match(String(broke.error), /bad audio|whisper/);

    fs.writeFileSync(path.join(fake.dir, 'whisper-cli'), '#!/bin/sh\nsleep 2\n', { mode: 0o755 });
    fs.chmodSync(path.join(fake.dir, 'whisper-cli'), 0o755);
    const hung = await transcribeFile(audio, { timeoutMs: 200 });
    assert.equal(hung.ok, false);
    assert.match(String(hung.error), /timed out after 0s|timed out/);

    // And with no engine, the error is the install recipe (this machine's normal state).
    fs.rmSync(path.join(fake.dir, 'whisper-cli'));
    const none = await transcribeFile(audio, { timeoutMs: 5_000 });
    assert.equal(none.ok, false);
    assert.match(String(none.error), /whisper engine not installed.*whisper\.cpp/s);
  } finally {
    fake.restore();
  }
});
