import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { workspaceDir } from '../core/paths.js';
import type { Config } from '../core/config.js';

/**
 * Image generation (batch 26, census row "Image / media generation").
 *
 * Two backends, one contract:
 *   - a configured OpenAI-compatible provider with an image endpoint
 *     (`POST {baseUrl}/images/generations`), and
 *   - the mock provider, which draws a real, deterministic PNG locally so the
 *     feature is testable and usable offline (no network, no API key, no deps).
 *
 * Everything is written to `<workspace>/outbox/` — the folder for things the
 * agent wants to send out — and the result is a path the model can hand to
 * `send_file`, the canvas or a reply.
 */

export interface ImageRequest {
  prompt: string;
  /** `1024x1024`, `1536x1024`, `1024` … default from config.media.size. */
  size?: string;
  /** Optional file name (no extension needed); default is a slug of the prompt. */
  name?: string;
  /** Directory override; default `<workspace>/outbox`. */
  outDir?: string;
  /** Exact path to write (wins over `outDir`/`name`); parent dirs are created. */
  outFile?: string;
  /** Model override; default config.media.imageModel, else `gpt-image-1`. */
  model?: string;
}

export interface ImageResult {
  path: string;
  bytes: number;
  width: number;
  height: number;
  prompt: string;
  provider: string;
  model: string;
  /** True when the mock provider drew a local placeholder instead of calling out. */
  placeholder: boolean;
}

// ---------------------------------------------------------------------- PNG

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Encode an 8-bit truecolour PNG from a per-pixel function. Written by hand
 * because TermCrab ships zero runtime dependencies and a PNG is three chunks.
 */
export function encodePng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[row + 1 + x * 3] = r & 0xff;
      raw[row + 2 + x * 3] = g & 0xff;
      raw[row + 3 + x * 3] = b & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  // 10..12: compression, filter, interlace — all zero.
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** FNV-1a — small, stable, and enough to make the placeholder deterministic. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * A real PNG that stands in for a generated one: a deterministic two-colour
 * gradient plus soft rings, seeded by the prompt. Same prompt, same bytes —
 * so it is safe in tests and honest in the UI ("this is a placeholder").
 */
export function placeholderPng(prompt: string, width: number, height: number): Buffer {
  const seed = hash(prompt);
  const hue = seed % 360;
  const cx = width * (0.3 + ((seed >>> 8) % 40) / 100);
  const cy = height * (0.3 + ((seed >>> 16) % 40) / 100);
  const rgb = (h: number, s: number, l: number): [number, number, number] => {
    // HSL -> RGB, all in [0,1].
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): number => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };
  const maxR = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) || 1;
  return encodePng(width, height, (x, y) => {
    const d = Math.hypot(x - cx, y - cy) / maxR;
    const band = 0.5 + 0.5 * Math.sin(d * 18);
    const l = 0.28 + 0.5 * d;
    const [r, g, b] = rgb(hue + d * 90, 0.55, Math.min(0.92, l));
    const shade = 0.75 + 0.25 * band;
    return [Math.round(r * shade), Math.round(g * shade), Math.round(b * shade)];
  });
}

// ------------------------------------------------------------------ helpers

/** `1024x1024` (or bare `1024`) -> a pair, clamped to something sane. */
export function parseSize(size: string | undefined, fallback = '1024x1024'): { width: number; height: number } {
  const text = (size ?? fallback).trim().toLowerCase();
  const m = /^(\d{2,4})(?:\s*x\s*(\d{2,4}))?$/.exec(text);
  if (!m) throw new Error(`bad size "${size}" — use e.g. 1024x1024`);
  const width = Math.min(2048, Math.max(64, Number(m[1])));
  const height = Math.min(2048, Math.max(64, Number(m[2] ?? m[1])));
  return { width, height };
}

function slug(prompt: string, name?: string): string {
  const base = (name ?? prompt).toLowerCase();
  const cleaned = base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || 'image';
}

/** Where generated media lands: `<workspace>/outbox`. */
export function outboxDir(): string {
  return path.join(workspaceDir(), 'outbox');
}

// --------------------------------------------------------------- generation

/**
 * Generate an image and write it to disk. Under the mock provider (or with no
 * image endpoint configured) this draws the local placeholder rather than
 * failing, and says so in the result — the caller decides whether to mention it.
 */
export async function generateImage(
  config: Config,
  req: ImageRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<ImageResult> {
  const prompt = req.prompt?.trim();
  if (!prompt) throw new Error('prompt is empty');
  const { width, height } = parseSize(req.size ?? config.media?.size);
  const model = req.model ?? config.media?.imageModel ?? 'gpt-image-1';
  const provider = config.provider ?? { type: 'mock', model: 'mock-1', baseUrl: '', apiKey: '' };
  const dir = req.outFile ? path.dirname(path.resolve(req.outFile)) : (req.outDir ?? outboxDir());
  fs.mkdirSync(dir, { recursive: true });
  const file = req.outFile
    ? path.resolve(req.outFile)
    : path.join(dir, `${slug(prompt, req.name)}-${Date.now().toString(36)}.png`);
  const size = `${width}x${height}`;

  const base = (provider.baseUrl ?? '').replace(/\/+$/, '');
  const mock = provider.type === 'mock' || !base;
  if (mock) {
    const png = placeholderPng(prompt, width, height);
    fs.writeFileSync(file, png);
    return {
      path: file,
      bytes: png.length,
      width,
      height,
      prompt,
      provider: 'mock',
      model: 'placeholder',
      placeholder: true,
    };
  }

  const res = await fetchImpl(`${base}/images/generations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({ model, prompt, size, n: 1, response_format: 'b64_json' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`image endpoint said ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
  const payload = (await res.json()) as { data?: { b64_json?: string; url?: string; revised_prompt?: string }[] };
  const first = payload.data?.[0];
  let bytes: Buffer | null = null;
  if (first?.b64_json) bytes = Buffer.from(first.b64_json, 'base64');
  else if (first?.url) {
    const download = await fetchImpl(first.url);
    if (download.ok) bytes = Buffer.from(await download.arrayBuffer());
  }
  if (!bytes?.length) throw new Error('the image endpoint returned no image');
  fs.writeFileSync(file, bytes);
  return {
    path: file,
    bytes: bytes.length,
    width,
    height,
    prompt,
    provider: provider.type,
    model,
    placeholder: false,
  };
}
