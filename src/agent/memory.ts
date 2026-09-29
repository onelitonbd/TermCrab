import fs from 'node:fs';
import path from 'node:path';
import { memoryDir, ensureLayout } from '../core/paths.js';

/**
 * Human-readable memory:
 *   memory/MEMORY.md        - long-term facts (always injected, head-limited)
 *   memory/daily/YYYY-MM-DD.md - append-only daily log
 * Everything the agent remembers is a file you can open and edit.
 */
export class MemoryStore {
  constructor(private readonly root: string = memoryDir()) {
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

  /** Naive but effective lexical search across MEMORY.md + daily logs. */
  search(query: string, limit = 8): { file: string; line: string }[] {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);
    if (!terms.length) return [];

    const files: string[] = [];
    const mem = this.memoryFile();
    if (fs.existsSync(mem)) files.push(mem);
    const daily = path.join(this.root, 'daily');
    if (fs.existsSync(daily)) {
      for (const f of fs.readdirSync(daily).sort().reverse().slice(0, 30)) {
        files.push(path.join(daily, f));
      }
    }

    const hits: { file: string; line: string; score: number }[] = [];
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
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit).map(({ file, line }) => ({ file, line }));
  }

  stats(): { memoryBytes: number; dailyFiles: number } {
    let memoryBytes = 0;
    const mem = this.memoryFile();
    if (fs.existsSync(mem)) memoryBytes = fs.statSync(mem).size;
    const daily = path.join(this.root, 'daily');
    const dailyFiles = fs.existsSync(daily) ? fs.readdirSync(daily).length : 0;
    return { memoryBytes, dailyFiles };
  }
}
