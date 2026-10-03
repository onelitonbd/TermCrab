/**
 * What the agent is told when a file arrives (16.1–16.3).
 *
 * The channel saves the file and asks this module for the sentence the agent
 * will read. The sentence always starts with the truth about *where the file
 * is*; what follows is whatever could be learned from it without guessing:
 *
 *   - a document  → its text, via the zero-dependency reader (`extract.ts`);
 *   - a voice note→ the transcript, via whisper.cpp when it is installed;
 *   - a picture   → what a model that can see pictures says about it.
 *
 * Every failure path appends a sentence saying what could not be done and why,
 * so the agent can tell the user "I saved it, I cannot read inside it" instead
 * of silently answering an empty message.
 */
import path from 'node:path';
import { Config } from '../core/config.js';
import { describeIncoming, type IncomingFile, type SavedFile } from './media.js';
import { extractText, isExtractable } from './extract.js';
import { DEFAULT_MAX_CHARS, type ExtractResult } from './extract.js';
import { transcribeFile } from '../mobile/whisper.js';
import { describeImage } from './vision.js';

/** What the intake needs to know about the file (bytes stay on disk). */
export interface ArrivalInfo {
  name: string;
  kind: IncomingFile['kind'];
  mimeType?: string;
  caption?: string;
}

export interface IntakeDeps {
  extract?: (saved: SavedFile, maxChars: number) => ExtractResult;
  transcribe?: (file: string) => Promise<{ ok: boolean; text?: string; error?: string }>;
  describe?: (saved: SavedFile, mimeType: string) => Promise<{ ok: boolean; text?: string; reason?: string }>;
  maxChars?: number;
  /** Above this size a voice note is not transcribed on the phone (minutes of CPU). */
  maxTranscribeMb?: number;
}

export interface IntakeFlags {
  readDocuments?: boolean;
  transcribeVoice?: boolean;
  describePhotos?: boolean;
}

export const DEFAULT_MAX_TRANSCRIBE_MB = 5;

/** The prompt fragment for one arrival. Never throws. */
export async function intakePrompt(
  saved: SavedFile,
  info: ArrivalInfo,
  flags: IntakeFlags = {},
  deps: IntakeDeps = {},
): Promise<string> {
  const base = describeIncoming(saved, { kind: info.kind, caption: info.caption });
  const extra: string[] = [];
  const maxChars = deps.maxChars ?? DEFAULT_MAX_CHARS;

  if (info.kind === 'document' && flags.readDocuments !== false) {
    if (!isExtractable(info.name)) {
      extra.push(`(no reader for ${path.extname(info.name) || 'that file type'} — the file is saved intact)`);
    } else {
      const read = (deps.extract ?? ((f: SavedFile, max: number) => extractText(f.path, { maxChars: max, name: info.name })))(saved, maxChars);
      if (read.ok && read.text) {
        extra.push(`--- text of ${path.basename(info.name)} (${read.kind}) ---\n${read.text}`);
      } else {
        extra.push(`(could not read inside it: ${read.reason ?? 'no text found'})`);
      }
    }
  }

  if (info.kind === 'audio' && flags.transcribeVoice !== false) {
    const sizeMb = saved.bytes / 1024 / 1024;
    const limit = deps.maxTranscribeMb ?? DEFAULT_MAX_TRANSCRIBE_MB;
    if (sizeMb > limit) {
      extra.push(`(voice note is ${sizeMb.toFixed(1)} MB — too long to transcribe on the phone; saved for later)`);
    } else {
      const t = await (deps.transcribe ?? transcribeFile)(saved.path);
      if (t.ok && t.text) extra.push(`Transcript:\n${t.text}`);
      else extra.push(`(not transcribed: ${t.error ?? 'the engine returned nothing'})`);
    }
  }

  if (info.kind === 'photo') {
    if (flags.describePhotos === false) {
      extra.push('(describing pictures is turned off)');
    } else {
      const d: { ok: boolean; text?: string; reason?: string } = await (
        deps.describe ?? ((f: SavedFile, mime: string) => describeImage({ file: f.path, mimeType: mime, cfg: { type: 'mock', model: '' } }))
      )(saved, info.mimeType ?? 'image/jpeg');
      if (d.ok && d.text) extra.push(`What I can see: ${d.text}`);
      else extra.push(`(I saved it but cannot see it: ${d.reason ?? 'no description'})`);
    }
  }

  return extra.length ? `${base}\n${extra.join('\n')}` : base;
}

/**
 * The production intake, wired to the app config: the same three readers as
 * above, with the real provider for pictures and the configured on/off flags.
 */
export function makeIntake(config: Config): (saved: SavedFile, info: ArrivalInfo) => Promise<string> {
  const tg = config.channels.telegram;
  const flags: IntakeFlags = {
    readDocuments: tg?.readDocuments,
    transcribeVoice: tg?.transcribeVoice,
    describePhotos: tg?.describePhotos,
  };
  return (saved, info) =>
    intakePrompt(saved, info, flags, {
      describe: (f, mime) => describeImage({ file: f.path, mimeType: mime, cfg: config.provider }),
    });
}
