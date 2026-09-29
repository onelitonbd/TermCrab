import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { memoryDir, ensureLayout } from '../core/paths.js';
import { EmbeddingIndex } from './embed.js';

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
    this.ensureFiles();
    let text: string;
    try {
      text = fs.readFileSync(this.memoryFile(), 'utf8');
    } catch {
      return '';
    }
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}\n... (truncated)`;
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
    return 'Remembered.';
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

  /** Vector index status (enabled=false when embeddings package is not installed). */
  indexStats(): { enabled: boolean; vectors: number } {
    if (!this.index) return { enabled: false, vectors: 0 };
    return { enabled: this.index.available, vectors: this.index.available ? this.index.size() : 0 };
  }
}
