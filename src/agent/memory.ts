import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { memoryDir, ensureLayout } from '../core/paths.js';
import { EmbeddingIndex } from './embed.js';

export interface MemoryBlock {
  /** Text to inject into a prompt (facts + provenance + the budget note). */
  text: string;
  /** How many facts are in the block / how many exist on disk. */
  facts: number;
  totalFacts: number;
  /** Bytes of `text`, and the budget that was allowed. */
  bytes: number;
  budget: number;
  /** 1-based line numbers in MEMORY.md for the included facts, oldest first. */
  lines: number[];
}

/**
 * Human-readable memory:
 *   memory/MEMORY.md        - long-term facts (always injected, head-limited)
 *   memory/daily/YYYY-MM-DD.md - append-only daily log
 *   memory/index.jsonl      - optional vector index (when embeddings installed)
 * Everything the agent remembers is a file you can open and edit.
 */
export class MemoryStore {
  constructor(
    private readonly root: string = memoryDir(),
    private readonly index?: EmbeddingIndex,
  ) {
    ensureLayout();
    fs.mkdirSync(path.join(root, 'daily'), { recursive: true });
  }

  private memoryFile(): string {
    return path.join(this.root, 'MEMORY.md');
  }

  ensureFiles(): void {
    const f = this.memoryFile();
    if (!fs.existsSync(f)) fs.writeFileSync(f, '# Long-term memory\n\n', 'utf8');
  }

  readHead(maxChars = 3000): string {
    return this.readForPrompt(maxChars).text;
  }

  /**
   * The block that goes into a prompt.
   *
   * MEMORY.md is append-only: `remember()` writes at the bottom, so the newest
   * facts are the ones that matter and they are the ones that fit. The old
   * `readHead(3000)` did the opposite - it injected the *oldest* 3000 chars, so
   * a fact written today could never enter context (census: BROKEN). Facts are
   * injected newest-first until the budget is spent, rendered oldest-first, each
   * one citing the file and line it came from, and the block always says which
   * budget applied and how many facts stayed on disk.
   */
  readForPrompt(budgetBytes = 3000): MemoryBlock {
    this.ensureFiles();
    let raw = '';
    try {
      raw = fs.readFileSync(this.memoryFile(), 'utf8');
    } catch {
      raw = '';
    }
    const budget = Math.max(200, Math.floor(budgetBytes));

    const headerLines: string[] = [];
    const facts: { line: number; stamp: string; body: string }[] = [];
    const all = raw.split('\n');
    let seenFact = false;
    for (let i = 0; i < all.length; i++) {
      const line = all[i] ?? '';
      const m = /^- \[([^\]]+)\]\s*(.+)$/.exec(line.trim());
      if (m) {
        seenFact = true;
        facts.push({ line: i + 1, stamp: m[1]!, body: m[2]! });
      } else if (!seenFact && line.trim()) {
        headerLines.push(line);
      }
    }
    const header = headerLines.join('\n').trim();

    const render = (subset: { line: number; stamp: string; body: string }[]): string => {
      const lines = subset.map((f) => `- [${f.stamp}] ${f.body}  (MEMORY.md:${f.line})`);
      const note =
        facts.length > subset.length
          ? `(showing the newest ${subset.length} of ${facts.length} facts - memory budget ${budget} bytes; the rest stay on disk and are searchable with search_memory)`
          : `(all ${facts.length} facts fit the memory budget of ${budget} bytes)`;
      return [header, ...lines, note].filter(Boolean).join('\n') + '\n';
    };

    let subset: { line: number; stamp: string; body: string }[] = [];
    for (let i = facts.length - 1; i >= 0; i--) {
      const candidate = [facts[i]!, ...subset];
      if (Buffer.byteLength(render(candidate), 'utf8') > budget) break;
      subset = candidate;
    }
    let text: string;
    if (!facts.length) {
      text = `${header || '# Long-term memory'}\n(no facts yet - memory budget ${budget} bytes; use the remember tool)\n`;
    } else if (!subset.length) {
      // Even one fact is bigger than the budget: say so instead of hiding it.
      text = `${header}\n(memory holds ${facts.length} facts, none fit the ${budget}-byte budget - raise agent.memoryBudget)\n`;
    } else {
      text = render(subset);
    }

    return {
      text,
      facts: subset.length,
      totalFacts: facts.length,
      bytes: Buffer.byteLength(text, 'utf8'),
      budget,
      lines: subset.map((f) => f.line),
    };
  }

  remember(fact: string): string {
    this.ensureFiles();
    const clean = fact.trim().replace(/\r/g, '');
    if (!clean) return 'Nothing to remember.';
    const existing = fs.readFileSync(this.memoryFile(), 'utf8');
    const needle = clean.toLowerCase();
    if (existing.toLowerCase().includes(needle)) return 'Already known - not duplicated.';

    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const entry = `- [${stamp}] ${clean}\n`;
    const beforeLines = existing.length ? existing.replace(/\n$/, '').split('\n').length : 0;
    const factLine = beforeLines + 1;

    // Long-term facts: append under a Facts section.
    fs.appendFileSync(this.memoryFile(), entry, 'utf8');

    // Optional vector index (fire-and-forget; lexical copy is the source of truth).
    if (this.index?.available) {
      const id = `mem:${crypto.createHash('md5').update(clean).digest('hex').slice(0, 16)}`;
      void this.index.add(id, clean);
    }

    // Daily log mirror.
    const day = new Date().toISOString().slice(0, 10);
    const daily = path.join(this.root, 'daily', `${day}.md`);
    if (!fs.existsSync(daily)) fs.writeFileSync(daily, `# ${day}\n\n`, 'utf8');
    fs.appendFileSync(daily, entry, 'utf8');
    // Provenance, so the model (and the human) can check the source line.
    return `Remembered (MEMORY.md:${factLine}, daily/${day}.md).`;
  }

  logDaily(line: string): void {
    const day = new Date().toISOString().slice(0, 10);
    const daily = path.join(this.root, 'daily', `${day}.md`);
    if (!fs.existsSync(daily)) fs.writeFileSync(daily, `# ${day}\n\n`, 'utf8');
    fs.appendFileSync(daily, `- ${line.trim()}\n`, 'utf8');
  }

  /** Lexical search across MEMORY.md + daily logs, merged with vector hits when available. */
  async search(query: string, limit = 8): Promise<{ file: string; line: string; score?: number }[]> {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    const hits: { file: string; line: string; score: number }[] = [];

    // Vector (semantic) hits first when embeddings are installed.
    if (this.index?.available && terms.length) {
      for (const v of await this.index.search(query, limit)) {
        hits.push({ file: 'vector', line: v.text, score: 5 + v.score * 5 });
      }
    }

    if (terms.length) {
      const files: string[] = [];
      const mem = this.memoryFile();
      if (fs.existsSync(mem)) files.push(mem);
      const daily = path.join(this.root, 'daily');
      if (fs.existsSync(daily)) {
        for (const f of fs.readdirSync(daily).sort().reverse().slice(0, 30)) {
          files.push(path.join(daily, f));
        }
      }
      // Compacted session digests
      const compacted = path.join(this.root, 'compacted');
      if (fs.existsSync(compacted)) {
        for (const f of fs.readdirSync(compacted).sort().reverse().slice(0, 10)) {
          files.push(path.join(compacted, f));
        }
      }

      for (const file of files) {
        let text: string;
        try {
          text = fs.readFileSync(file, 'utf8');
        } catch {
          continue;
        }
        for (const line of text.split('\n')) {
          const lower = line.toLowerCase();
          let score = 0;
          for (const t of terms) if (lower.includes(t)) score++;
          if (score > 0 && line.trim()) hits.push({ file: path.basename(file), line: line.trim(), score });
        }
      }
    }

    hits.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const out: { file: string; line: string; score?: number }[] = [];
    for (const h of hits) {
      if (seen.has(h.line)) continue;
      seen.add(h.line);
      out.push({ file: h.file, line: h.line, score: h.score });
      if (out.length >= limit) break;
    }
    return out;
  }

  stats(): { memoryBytes: number; dailyFiles: number } {
    let memoryBytes = 0;
    const mem = this.memoryFile();
    if (fs.existsSync(mem)) memoryBytes = fs.statSync(mem).size;
    const daily = path.join(this.root, 'daily');
    const dailyFiles = fs.existsSync(daily) ? fs.readdirSync(daily).length : 0;
    return { memoryBytes, dailyFiles };
  }

  /** Replace MEMORY.md wholesale (web editor). Throws on oversized input. */
  write(text: string): void {
    const clean = text.replace(/\r\n/g, '\n');
    if (clean.length > 500_000) throw new Error('MEMORY.md too large (500KB max)');
    fs.mkdirSync(path.dirname(this.memoryFile()), { recursive: true });
    const body = clean.endsWith('\n') ? clean : `${clean}\n`;
    fs.writeFileSync(this.memoryFile(), body, 'utf8');
  }

  /** Vector index status (enabled=false when embeddings package is not installed). */
  indexStats(): { enabled: boolean; vectors: number } {
    if (!this.index) return { enabled: false, vectors: 0 };
    return { enabled: this.index.available, vectors: this.index.available ? this.index.size() : 0 };
  }
}
