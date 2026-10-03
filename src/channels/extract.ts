/**
 * Read what arrived (16.1) — the text inside a document, with no dependency.
 * A path is not an answer, so this module turns what a phone user sends
 * (PDF, DOCX, PPTX, XLSX, text) into text the model can read.
 *
 * See the function docs below for the how: PDF content streams + FlateDecode,
 * Office files through a small ZIP reader on `node:zlib`, everything else
 * refused with one sentence that says what to do instead.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export interface ExtractResult {
  ok: boolean;
  /** The text, when `ok`. Always ≤ `maxChars` (a truncation note is appended). */
  text?: string;
  /** Which reader produced it: pdf | docx | pptx | xlsx | text. */
  kind?: string;
  /** One sentence saying why there is no text (when `!ok`). */
  reason?: string;
}

export const DEFAULT_MAX_CHARS = 20_000;

/** Extensions this module can turn into text by itself. */
export const EXTRACTABLE = ['.pdf', '.txt', '.md', '.csv', '.json', '.yaml', '.yml', '.log', '.ics', '.vcf', '.xml', '.docx', '.pptx', '.xlsx'];

const TEXT_LIKE = new Set(['.txt', '.md', '.csv', '.json', '.yaml', '.yml', '.log', '.ics', '.vcf', '.xml']);

/** Cap the text and say, in the text, that it was capped. */
function cap(text: string, maxChars: number): string {
  const clean = text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars)}\n… [truncated: showing the first ${maxChars} of ${clean.length} characters]`;
}

/** Decode a PDF literal string: `\(`, `\)`, `\\`, `\n`, octal escapes. */
export function unescapePdfString(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = raw[++i];
    if (next === undefined) break;
    switch (next) {
      case 'n': out += '\n'; break;
      case 'r': out += '\r'; break;
      case 't': out += '\t'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case '(': out += '('; break;
      case ')': out += ')'; break;
      case '\\': out += '\\'; break;
      default: {
        // \ddd (1–3 octal digits)
        if (/[0-7]/.test(next)) {
          let oct = next;
          while (oct.length < 3 && /[0-7]/.test(raw[i + 1] ?? '')) oct += raw[++i];
          out += String.fromCharCode(parseInt(oct, 8));
        } else {
          out += next;
        }
      }
    }
  }
  return out;
}

/**
 * Pull the text out of PDF content streams.
 *
 * Deliberately simple: it understands the operators a normal exported document
 * uses. Anything it cannot decode stays out (a missing word is better than a
 * wrong one), and `ok:false` is returned when nothing readable was found —
 * which is exactly what a scanned document looks like.
 */
export function extractPdfText(buf: Buffer): { ok: boolean; text: string } {
  const chunks: string[] = [];
  const raw = buf.toString('latin1');
  const streamRe = /stream\r?\n?/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    streamRe.lastIndex = end;
    const dictStart = raw.lastIndexOf('<<', m.index);
    const dict = dictStart >= 0 ? raw.slice(dictStart, m.index) : '';
    const body = Buffer.from(raw.slice(start, end), 'latin1');
    let data: Buffer | null = null;
    if (/FlateDecode/.test(dict)) {
      try {
        data = zlib.inflateSync(body);
      } catch {
        try {
          data = zlib.inflateRawSync(body);
        } catch {
          data = null; // a damaged/unsupported stream is skipped, not guessed
        }
      }
    } else {
      data = body;
    }
    if (!data) continue;
    const content = data.toString('latin1');
    // Only streams that actually show text, so image/binary streams stay out.
    if (!/\bTj\b|\bTJ\b/.test(content)) continue;
    chunks.push(pdfTextOps(content));
  }
  const text = chunks.join('\n').replace(/[ \t]{2,}/g, ' ');
  return { ok: text.replace(/\s+/g, '').length > 0, text };
}

/** `(text) Tj`, `[(a) -2 (b)] TJ`, `(x) '` and `(x) "` as one pass. */
function pdfTextOps(content: string): string {
  const out: string[] = [];
  // Text-showing operators (`Tj`/`TJ`/`'`/`"`) plus the positioning ones
  // (`Td`/`TD`/`T*`/`ET`), so lines break where the document breaks them.
  const opRe = /\((?:\\.|[^\\()])*\)\s*(Tj|'|")|\[((?:[^\[\]\\]|\\.)*)\]\s*TJ|\b(Td|TD|T\*|ET)\b/g;
  let line = '';
  let m: RegExpExecArray | null;
  const pushLine = (): void => {
    const t = line.trim();
    if (t) out.push(t);
    line = '';
  };
  while ((m = opRe.exec(content))) {
    if (m[3]) {
      pushLine();
    } else if (m[1]) {
      const lit = m[0].slice(1, m[0].lastIndexOf(')'));
      line += unescapePdfString(lit);
      if (m[1] !== 'Tj') pushLine();
    } else {
      const inner = m[2] ?? '';
      const parts = inner.match(/\((?:\\.|[^\\()])*\)/g) ?? [];
      for (const p of parts) line += unescapePdfString(p.slice(1, -1));
    }
  }
  pushLine();
  return out.join('\n');
}

/** Minimal ZIP reader: central directory → (name, decompressed bytes). */
export function readZip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  // End of central directory: scan backwards for the signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66_000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return files;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (compSize === 0 || localOff + 30 > buf.length) continue;
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    try {
      if (method === 0) files.set(name, Buffer.from(data));
      else if (method === 8) files.set(name, zlib.inflateRawSync(data));
    } catch {
      /* one unreadable entry must not kill the archive */
    }
  }
  return files;
}

/** `<a:t>`, `<w:t>` and friends: the text runs of an Office XML part. */
function xmlRuns(xml: string): string {
  const out: string[] = [];
  // Paragraph ends become newlines so the text keeps a shape.
  const normalised = xml.replace(/<\/(w:p|a:p|text:p)>/g, '\n</$1>');
  const re = /<(?:[a-z0-9]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[a-z0-9]+:)?t>/gi;
  let m: RegExpExecArray | null;
  let line = '';
  let lastIndex = 0;
  while ((m = re.exec(normalised))) {
    if (normalised.slice(lastIndex, m.index).includes('\n')) {
      if (line.trim()) out.push(line.trim());
      line = '';
    }
    line += unescapeXml(m[1] ?? '');
    lastIndex = m.index + m[0].length;
  }
  if (line.trim()) out.push(line.trim());
  return out.join('\n');
}

export function unescapeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_all, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_all, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractOffice(ext: string, zip: Map<string, Buffer>, maxChars: number): ExtractResult {
  const decode = (name: string): string => (zip.get(name) ?? Buffer.alloc(0)).toString('utf8');
  if (ext === '.docx') {
    const body = decode('word/document.xml');
    if (!body) return { ok: false, reason: 'that .docx has no readable document part (it may be a .doc renamed)' };
    const text = cap(xmlRuns(body), maxChars);
    return text
      ? { ok: true, text, kind: 'docx' }
      : { ok: false, reason: 'the Word file has no text runs this reader understands' };
  }
  if (ext === '.pptx') {
    const slides = [...zip.keys()].filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => {
      const n = (s: string): number => Number(s.match(/(\d+)/)?.[1] ?? 0);
      return n(a) - n(b);
    });
    if (!slides.length) return { ok: false, reason: 'that .pptx has no slide parts' };
    const parts = slides.map((s, i) => `— slide ${i + 1} —\n${xmlRuns(decode(s))}`);
    const text = cap(parts.join('\n'), maxChars);
    return text
      ? { ok: true, text, kind: 'pptx' }
      : { ok: false, reason: 'the slides have no text this reader understands (pictures only?)' };
  }
  // xlsx: the string table is readable; the numbers live in the sheet XML with
  // no type information this reader can trust, so they are declared unsupported.
  const shared = decode('xl/sharedStrings.xml');
  if (!shared) return { ok: false, reason: 'that .xlsx has no shared string table' };
  const strings = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => {
    const runs = [...m[1]!.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((r) => unescapeXml(r[1] ?? ''));
    return runs.join('');
  });
  if (!strings.length) return { ok: false, reason: 'the spreadsheet has no text cells' };
  const text = cap(`${strings.join('\n')}\n… [numbers in the grid are not read by this reader]`, maxChars);
  return { ok: true, text, kind: 'xlsx' };
}

/**
 * Turn one saved file into text the model can read.
 * Never throws: an unreadable file is a sentence, not a crash.
 */
export function extractText(
  filePath: string,
  opts: { maxChars?: number; name?: string } = {},
): ExtractResult {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const ext = path.extname(opts.name ?? filePath).toLowerCase();
  let buf: Buffer;
  try {
    buf = fs.readFileSync(filePath);
  } catch (err) {
    return { ok: false, reason: `could not open ${path.basename(filePath)} (${err instanceof Error ? err.message : String(err)})` };
  }
  try {
    if (TEXT_LIKE.has(ext)) {
      const text = cap(buf.toString('utf8'), maxChars);
      return text ? { ok: true, text, kind: 'text' } : { ok: false, reason: 'the file is empty' };
    }
    if (ext === '.pdf') {
      const r = extractPdfText(buf);
      if (!r.ok) {
        return {
          ok: false,
          reason: 'that PDF has no text layer (a scan is a picture of a page) — the file is saved and can be read with an OCR app',
        };
      }
      return { ok: true, text: cap(r.text, maxChars), kind: 'pdf' };
    }
    if (ext === '.docx' || ext === '.pptx' || ext === '.xlsx') {
      return extractOffice(ext, readZip(buf), maxChars);
    }
    return {
      ok: false,
      reason: `no reader for ${ext || 'that file type'} yet (it is saved intact; open it on the phone to read it)`,
    };
  } catch (err) {
    return { ok: false, reason: `could not read ${path.basename(filePath)}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Is this something `extractText` can read? (Used by the intake to skip work.) */
export function isExtractable(name: string): boolean {
  return EXTRACTABLE.includes(path.extname(name).toLowerCase());
}
