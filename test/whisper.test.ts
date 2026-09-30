import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findWhisperBin, findWhisperModel, transcribeFile } from '../src/mobile/whisper.js';

test('whisper: model preference ranks tiny first and honors explicit paths', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-'));
  process.env.TCRAB_HOME = home;
  const models = path.join(home, 'models');
  fs.mkdirSync(models, { recursive: true });
  fs.writeFileSync(path.join(models, 'ggml-small.bin'), 'x');
  fs.writeFileSync(path.join(models, 'ggml-tiny.bin'), 'x');
  const picked = findWhisperModel();
  assert.ok(picked?.endsWith('ggml-tiny.bin'), 'tiny preferred (phone-friendly)');

  // explicit wins
  const explicit = path.join(models, 'ggml-small.bin');
  assert.equal(findWhisperModel(explicit), explicit);
  delete process.env.TCRAB_HOME;
});

test('whisper: friendly errors when engine or model is missing', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tw2-'));
  process.env.TCRAB_HOME = home;
  process.env.PATH = '/nonexistent-dir';

  // missing file first (checked before engine)
  const noFile = await transcribeFile(path.join(home, 'ghost.wav'));
  assert.equal(noFile.ok, false);
  assert.match(noFile.error!, /not found/);

  // a real file but no engine on PATH
  const wav = path.join(home, 'a.wav');
  fs.writeFileSync(wav, 'RIFF');
  const noEngine = await transcribeFile(wav);
  assert.equal(noEngine.ok, false);
  assert.match(noEngine.error!, /whisper engine not installed/);
  assert.match(noEngine.error!, /pkg install|git clone|huggingface/i, 'must say how to get it');

  // engine present (fake) but no model
  const binDir = path.join(home, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const fakeBin = path.join(binDir, 'whisper-cli');
  fs.writeFileSync(fakeBin, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(fakeBin, 0o755);
  process.env.PATH = binDir;
  const noModel = await transcribeFile(wav);
  assert.equal(noModel.ok, false);
  assert.match(noModel.error!, /no whisper model found/);
  assert.match(noModel.error!, /ggml|models/, 'points at the drop-in folder');

  delete process.env.TCRAB_HOME;
  process.env.PATH = '/usr/bin:/bin';
});

test('whisper: a fake engine that outputs text succeeds; empty output is a friendly failure', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tw3-'));
  process.env.TCRAB_HOME = home;
  const models = path.join(home, 'models');
  fs.mkdirSync(models, { recursive: true });
  fs.writeFileSync(path.join(models, 'ggml-tiny.bin'), 'x');
  const binDir = path.join(home, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const wav = path.join(home, 'clip.wav');
  fs.writeFileSync(wav, 'RIFF');

  const talker = path.join(binDir, 'whisper-cli');
  fs.writeFileSync(talker, '#!/bin/sh\necho "hello from the fake engine"\n');
  fs.chmodSync(talker, 0o755);
  process.env.PATH = binDir;
  const ok = await transcribeFile(wav, { timeoutMs: 10_000 });
  assert.equal(ok.ok, true, ok.error ?? '');
  assert.equal(ok.text, 'hello from the fake engine');
  assert.ok((ok.ms ?? 0) >= 0);

  const silent = path.join(binDir, 'whisper-cli');
  fs.writeFileSync(silent, '#!/bin/sh\nexit 0\n');
  const empty = await transcribeFile(wav, { timeoutMs: 10_000 });
  assert.equal(empty.ok, false);
  assert.match(empty.error!, /no speech recognized/);

  delete process.env.TCRAB_HOME;
  process.env.PATH = '/usr/bin:/bin';
});

test('whisper: live transcription works when the real engine + model are installed', async (t) => {
  // Optional: runs only where whisper.cpp and a ggml model exist (dev box);
  // CI/sandbox without them skips with a note — same pattern as termux tools.
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tw4-'));
  process.env.TCRAB_HOME = home;
  const models = path.join(home, 'models');
  fs.mkdirSync(models, { recursive: true });
  const sandboxModel = '/tmp/ggml-tiny.bin';
  const sandboxWav = '/tmp/whisper.cpp/samples/jfk.wav';
  const sandboxBin = '/tmp/whisper.cpp/build/bin';
  if (!fs.existsSync(sandboxModel) || !fs.existsSync(sandboxWav) || !fs.existsSync(path.join(sandboxBin, 'whisper-cli'))) {
    t.skip('no whisper engine/model/wav in sandbox');
    return;
  }
  process.env.PATH = `${sandboxBin}:${process.env.PATH ?? ''}`;
  fs.copyFileSync(sandboxModel, path.join(models, 'ggml-tiny.bin'));
  const r = await transcribeFile(sandboxWav, { timeoutMs: 120_000 });
  assert.equal(r.ok, true, r.error ?? '');
  assert.match(r.text!, /fellow Americans/i, 'must transcribe the JFK sample');
  delete process.env.TCRAB_HOME;
});
