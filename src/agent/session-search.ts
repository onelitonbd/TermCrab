/**
 * Search across past conversations: the transcripts on disk, ranked (21.2).
 *
 * The toolbox used to do a substring scan over the 30 newest sessions, which
 * answers "did I ever type this exact string" and nothing else. This ranks
 * like memory search does — BM25-ish term weights, a bonus when every word is
 * present, an exact-phrase boost, and a 30-day recency half-life — and it
 * searches the archive too, so a conversation from last month is findable.
 * Every hit carries where it came from (session, role, when) and a snippet
 * with the matched words marked, because "which chat was that?" is the
 * question and a bare id is not an answer.
 */
import { SessionStore, type Entry } from './sessions.js';
import fs from 'node:fs';

export interface SessionHit {
  sessionId: string;
  /** Which file the match is in — the live transcript or the older archive. */
  part: 'hot' | 'archive';
  /** 1-based line inside that file. */
  line: number;
  role: 'user' | 'assistant' | 'tool' | 'system';
  when: number;
  score: number;
  snippet: string;
}

export interface SearchOpts {
  limit?: number;
  /** Search only this session. */
  sessionId?: string;
  now?: number;
  /** How many sessions to look at (newest first). Default 200. */
  maxSessions?: number;
}

const STOP = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'did', 'do', 'does', 'for', 'from', 'had',
  'has', 'have', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our',
  'so', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
]);

export function terms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9\u0980-\u09ff]+/)
        .filter((w) => w.length >= 2 && !STOP.has(w)),
    ),
  ];
}

function entryText(entry: Entry): string {
  if (entry.role === 'tool') return `${entry.name} ${entry.result}`.slice(0, 4000);
  const calls = entry.role === 'assistant' && entry.toolCalls?.length
    ? ` ${entry.toolCalls.map((c) => `${c.name} ${JSON.stringify(c.args ?? {})}`).join(' ')}`
    : '';
  return `${entry.content}${calls}`;
}

function scoreOf(
  text: string,
  wanted: string[],
  df: Map<string, number>,
  totalDocs: number,
  when: number,
  now: number,
): number {
  const lower = text.toLowerCase();
  const words = lower.split(/[^a-z0-9\u0980-\u09ff]+/).filter(Boolean);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  let score = 0;
  let present = 0;
  for (const term of wanted) {
    const tf = counts.get(term) ?? 0;
    if (tf > 0) present += 1;
    if (tf > 0) {
      const idf = Math.log(1 + totalDocs / (1 + (df.get(term) ?? 0)));
      score += (tf / (tf + 1.2)) * Math.max(0.2, idf);
    }
  }
  if (present === 0) return 0;
  if (present === wanted.length && wanted.length > 1) score *= 1.6;
  if (wanted.length && lower.includes(wanted.join(' '))) score *= 2.0;
  const ageDays = Math.max(0, (now - when) / 86_400_000);
  score *= 0.5 + 0.5 * Math.exp(-ageDays / 30);
  return score;
}

/** A window around the first matched word, with matches marked «…». */
export function snippet(text: string, wanted: string[], width = 150): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const lower = flat.toLowerCase();
  let at = -1;
  for (const term of wanted) {
    const i = lower.indexOf(term);
    if (i >= 0 && (at < 0 || i < at)) at = i;
  }
  if (at < 0) at = 0;
  const start = Math.max(0, at - Math.floor(width / 3));
  const window = flat.slice(start, start + width);
  let marked = window;
  for (const term of wanted) {
    marked = marked.replace(new RegExp(escapeRe(term), 'gi'), (m) => `«${m}»`);
  }
  return `${start > 0 ? '…' : ''}${marked}${start + width < flat.length ? '…' : ''}`;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rank every entry in every (or one) transcript. Returns [] when nothing
 * matches — the caller decides how to say that.
 */
export function searchSessions(
  query: string,
  opts: SearchOpts = {},
  store: SessionStore = new SessionStore(),
): SessionHit[] {
  const wanted = terms(query);
  if (!wanted.length) return [];
  const now = opts.now ?? Date.now();
  const limit = Math.max(1, Math.min(100, opts.limit ?? 10));

  const sessions: Array<{ id: string }> = opts.sessionId
    ? [{ id: opts.sessionId }]
    : store.list().slice(0, opts.maxSessions ?? 200);

  // Two passes: collect documents and the document frequency of each term, so
  // a word that appears everywhere ("taka", in a chat about prices) weighs less
  // than one that appears once.
  interface Doc {
    sessionId: string;
    part: 'hot' | 'archive';
    line: number;
    entry: Entry;
    text: string;
  }
  const docs: Doc[] = [];
  const df = new Map<string, number>();
  for (const s of sessions) {
    for (const part of ['hot', 'archive'] as const) {
      const file = part === 'hot' ? store.transcriptFile(s.id) : store.archivePath(s.id);
      if (!fs.existsSync(file)) continue;
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (!line.trim()) continue;
        let entry: Entry;
        try {
          entry = JSON.parse(line) as Entry;
        } catch {
          continue; // a torn line is `sessions verify`'s business, not a search hit
        }
        const text = entryText(entry);
        const words = new Set(text.toLowerCase().split(/[^a-z0-9\u0980-\u09ff]+/).filter(Boolean));
        for (const term of wanted) {
          if (words.has(term)) df.set(term, (df.get(term) ?? 0) + 1);
        }
        docs.push({ sessionId: s.id, part, line: i + 1, entry, text });
      }
    }
  }

  const hits: SessionHit[] = [];
  for (const doc of docs) {
    const entry = doc.entry;
    let score = scoreOf(doc.text, wanted, df, Math.max(1, docs.length), entry.ts ?? now, now);
    if (score <= 0) continue;
    if (entry.role === 'tool') score *= 0.85; // tool output is noisy by nature
    hits.push({
      sessionId: doc.sessionId,
      part: doc.part,
      line: doc.line,
      role: entry.role,
      when: entry.ts ?? 0,
      score: Math.round(score * 1000) / 1000,
      snippet: entry.role === 'tool' ? `[${entry.name}] ${snippet(doc.text, wanted)}` : snippet(doc.text, wanted),
    });
  }
  // A near-tie goes to the *earlier* line: an assistant's reply almost always
  // echoes the user's words, and the original is what a person is looking for
  // when they ask "which chat was that?".
  hits.sort((a, b) => {
    const scale = Math.max(a.score, b.score) || 1;
    if (Math.abs(a.score - b.score) > 0.05 * scale) return b.score - a.score;
    return a.when - b.when;
  });
  return hits.slice(0, limit);
}

/** The same hits as lines a human reads, for the CLI and the chat. */
export function formatSessionHits(query: string, hits: SessionHit[]): string {
  if (!hits.length) return `no conversation mentions “${query}”`;
  return hits
    .map((h) => {
      const when = h.when ? new Date(h.when).toISOString().slice(0, 16).replace('T', ' ') : 'unknown time';
      const where = h.part === 'archive' ? 'archive' : 'live';
      return `  ${h.score.toFixed(2)}  ${h.sessionId} [${h.role}] ${when} (${where}:${h.line})\n      ${h.snippet}`;
    })
    .join('\n');
}
