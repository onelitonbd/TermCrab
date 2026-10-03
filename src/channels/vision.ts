/**
 * Looking at a picture for the agent (16.2).
 *
 * A phone user photographs a receipt, a sign, a page of a book. The agent only
 * sees that picture if the configured model can see — so this module answers
 * three questions honestly:
 *
 *   1. can the configured model see pictures at all? (`canSeeImages`);
 *   2. if yes, what is in it? (one small call, tools off, ≤2 sentences);
 *   3. if no, say which knob to turn instead of pretending.
 *
 * The call is deliberately separate from the agent loop: it is one message, no
 * tools, and its text is what the loop is then asked about. That keeps the
 * picture out of the transcript (a base64 JPEG in every history would blow up
 * the context and the disk) while still letting the agent answer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ProviderCfg } from '../core/config.js';
import { Provider, ChatImage } from '../providers/types.js';
import { describeModel } from '../providers/catalog.js';
import { providerSummary, resolveProvider } from '../providers/index.js';

/** Largest picture we will send: base64 inflates by ~33% and servers cap this. */
export const MAX_VISION_MB = 4;

/**
 * Model names that can see. Written as substrings of the lower-cased model id,
 * so `openai/gpt-4o-2024-08-06` and `gpt-4o-mini` both match. Unknown names are
 * treated as blind on purpose: sending an image to a model that cannot read one
 * is a wasted call and a confusing error.
 */
export const VISION_MODEL_PATTERNS = [
  // OpenAI
  'gpt-4o', 'gpt-4.1', 'gpt-4-turbo', 'gpt-5', 'chatgpt-4o', 'o3', 'o4-mini',
  // Anthropic (through a gateway or a compatible proxy)
  'claude-3', 'claude-4', 'claude-sonnet', 'claude-opus', 'claude-haiku',
  // Google
  'gemini',
  // Open weights
  'llava', 'moondream', 'pixtral', 'qwen-vl', 'qwen2-vl', 'qwen2.5-vl',
  'internvl', 'minicpm-v', 'llama-3.2-11b-vision', 'llama-3.2-90b-vision',
  'phi-3.5-vision', 'phi-4-multimodal', 'glm-4v', 'yi-vision', 'mistral-small-3',
  'deepseek-vl', 'idefics',
];

/**
 * Models that look like the patterns above but cannot actually take an image.
 * Checked first, so `o1` (reasoning, text-only) is not mistaken for `o3`.
 */
const NOT_VISION = ['o1-', 'o1mini', 'o1-mini', 'gpt-4-0', 'gpt-3.5'];

export function canSeeImages(cfg: Pick<ProviderCfg, 'type' | 'model'>): boolean {
  const model = (cfg.model || '').toLowerCase().trim();
  // The offline brain reports what it was handed and says plainly that it is a
  // simulation; that is what makes the whole path testable with no network.
  if (cfg.type === 'mock') return true;
  if (!model) return false;
  if (NOT_VISION.some((n) => model.includes(n))) return false;
  if (VISION_MODEL_PATTERNS.some((p) => model.includes(p))) return true;
  // 27.3: the name patterns miss new ids; the catalog knows the ones we track,
  // so a model listed there as seeing images is not called blind just because
  // this list is older than it. An unknown model is still blind (a wasted call
  // and a confusing error are worse than saying "I cannot see it").
  return describeModel(model).vision === true;
}

export type VisionResult =
  | { ok: true; text: string; model: string }
  | { ok: false; reason: string };

const DEFAULT_PROMPT =
  'Describe this picture for an agent that must answer its owner. At most 2 sentences. ' +
  'If it contains text (a page, a sign, a receipt), quote the important lines.';

/** Base64 for the wire (no `data:` prefix — the adapter adds it). */
export function imageToChatImage(bytes: Buffer, mimeType: string): ChatImage {
  return { mimeType: mimeType || 'image/jpeg', dataBase64: bytes.toString('base64') };
}

/**
 * One vision call. Never throws; every failure is a sentence the agent (and the
 * user) can act on.
 */
export async function describeImage(
  opts: {
    /** The saved picture. */
    file?: string;
    bytes?: Buffer;
    mimeType?: string;
    cfg: Pick<ProviderCfg, 'type' | 'model'>;
    prompt?: string;
    provider?: Provider;
    maxMb?: number;
    maxTokens?: number;
  },
): Promise<VisionResult> {
  if (!canSeeImages(opts.cfg)) {
    return {
      ok: false,
      reason:
        `${providerSummary(opts.cfg as ProviderCfg)} cannot see pictures — ` +
        'set one that can (gpt-4o, claude-sonnet-4, gemini-2.5-flash, qwen2.5-vl, …) with: ' +
        'termcrab config set provider.model <model>',
    };
  }
  let bytes = opts.bytes;
  if (!bytes && opts.file) {
    try {
      bytes = fs.readFileSync(opts.file);
    } catch (err) {
      return { ok: false, reason: `could not open ${path.basename(opts.file)} (${err instanceof Error ? err.message : String(err)})` };
    }
  }
  if (!bytes) return { ok: false, reason: 'no picture to look at' };
  const maxMb = opts.maxMb ?? MAX_VISION_MB;
  if (bytes.byteLength > maxMb * 1024 * 1024) {
    return {
      ok: false,
      reason: `the picture is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB — too large to send to the model (limit ${maxMb} MB)`,
    };
  }
  const provider = opts.provider ?? resolveProvider(opts.cfg as ProviderCfg);
  try {
    const res = await provider.chat({
      system:
        'You look at one picture and describe it for a phone agent. Be concrete and short. ' +
        'Never invent details you cannot see; if the picture is unreadable, say that.',
      messages: [{ role: 'user', content: opts.prompt ?? DEFAULT_PROMPT }],
      tools: [],
      maxTokens: opts.maxTokens ?? 300,
      temperature: 0,
      image: imageToChatImage(bytes, opts.mimeType ?? 'image/jpeg'),
    });
    const text = (res.text ?? '').trim();
    if (!text) return { ok: false, reason: 'the model returned no description' };
    return { ok: true, text, model: provider.model };
  } catch (err) {
    return {
      ok: false,
      reason: `the vision model could not answer (${err instanceof Error ? err.message : String(err)})`,
    };
  }
}
