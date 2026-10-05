/**
 * The context a turn really sends, and what to do about its size (19.1-19.4).
 *
 * `contextReport()` measures the real prompt section by section (what
 * `termcrab context` and `/context` print), `pruneToolResults()` replaces old
 * bulky tool results with a one-line stub, and a small ContextEngine registry
 * (`default`, `compact`) decides how much memory and history a turn carries.
 */
import { Config } from '../core/config.js';
import { MemoryStore } from './memory.js';
import { SkillStore } from '../skills/loader.js';
import { detectSkillsIndexBytes, promptSectionSizes } from './prompt.js';
import type { ProviderMessage } from '../providers/types.js';

export interface SectionSize {
  section: string;
  bytes: number;
  /** What the section is for, in one short phrase. */
  note: string;
}

export interface ContextReport {
  engine: string;
  /** Bytes per prompt section, biggest first. */
  sections: SectionSize[];
  totalBytes: number;
  tools: { count: number; schemaBytes: number };
  history: { messages: number; bytes: number; pruned: number };
  memory: { facts: number; totalFacts: number; budget: number; userBytes: number };
  skills: { count: number; bytes: number };
  notes: string[];
}

export interface PruneResult {
  messages: ProviderMessage[];
  pruned: number;
  bytesSaved: number;
}

/** Tools whose results are safe to stub out when they get old. */
const PRUNABLE_TOOLS = new Set([
  'read_file', 'list_dir', 'exec', 'web_fetch', 'web_search', 'search_memory',
  'inbox_list', 'inbox_read', 'process', 'image_gen', 'sessions_export',
]);

/**
 * Replace old tool results with a stub.
 *
 * The newest `keep` tool results survive untouched (a tool the model is in the
 * middle of using must not vanish), as does anything small. Everything older
 * becomes one line naming the tool, the original size and how to re-run it.
 */
export function pruneToolResults(messages: ProviderMessage[], opts: { keep?: number; maxStubBytes?: number } = {}): PruneResult {
  const keep = Math.max(0, opts.keep ?? 6);
  const toolIdx = messages.map((m, i) => (m.role === 'tool' ? i : -1)).filter((i) => i >= 0);
  const keepFrom = toolIdx.length - keep;
  let pruned = 0;
  let bytesSaved = 0;
  const out = messages.map((m, i) => {
    if (m.role !== 'tool') return m;
    const pos = toolIdx.indexOf(i);
    if (pos < keepFrom) {
      const name = m.toolName ?? 'tool';
      if (!PRUNABLE_TOOLS.has(name)) return m;
      if (m.content.length < 400) return m;
      bytesSaved += m.content.length;
      pruned++;
      const stub = `[${name} result pruned: ${Math.max(1, Math.round(m.content.length / 1024))} KB from an earlier turn; ` +
        `run ${name} again if you need it]`;
      return { ...m, content: stub };
    }
    return m;
  });
  return { messages: out, pruned, bytesSaved };
}

// ---------------------------------------------------------------- engines

export interface ContextEngine {
  name: string;
  /** One sentence a human can read. */
  describe(): string;
  /** How much memory to inject. */
  memoryBudget(config: Config): number;
  /** How many tool results stay verbatim. */
  toolResultWindow(): number;
  /** Does this engine keep the verbose sections (roster, intents, goals)? */
  includeExtras(): boolean;
}

const ENGINES: ContextEngine[] = [
  {
    name: 'default',
    describe: () => 'everything the agent knows: full memory budget, the last 6 tool results verbatim, roster and goals included',
    memoryBudget: (config) => config.agent.memoryBudget ?? 3000,
    toolResultWindow: () => 6,
    includeExtras: () => true,
  },
  {
    name: 'compact',
    describe: () => 'smaller context for long chats: half the memory budget, the last 2 tool results, roster and goals dropped',
    memoryBudget: (config) => Math.max(600, Math.floor((config.agent.memoryBudget ?? 3000) / 2)),
    toolResultWindow: () => 2,
    includeExtras: () => false,
  },
];

export function listContextEngines(): { name: string; description: string }[] {
  return ENGINES.map((e) => ({ name: e.name, description: e.describe() }));
}

export function contextEngine(name?: string): ContextEngine {
  const wanted = (name ?? 'default').trim().toLowerCase();
  return ENGINES.find((e) => e.name === wanted) ?? ENGINES[0]!;
}

// ---------------------------------------------------------------- report

export function contextReport(ctx: {
  config: Config;
  memory: MemoryStore;
  skills: SkillStore;
  agentName?: string;
  sessionId: string;
  channel?: string;
  messages?: ProviderMessage[];
  toolCount?: number;
  toolSchemaBytes?: number;
}): ContextReport {
  const engine = contextEngine(ctx.config.agent.contextEngine);
  const memoryBlock = ctx.memory.readForPrompt(engine.memoryBudget(ctx.config));
  const sections = promptSectionSizes({
    config: ctx.config,
    memoryBlock: memoryBlock.text,
    skills: ctx.skills,
    agentName: ctx.agentName,
    channel: ctx.channel,
    includeExtras: engine.includeExtras(),
  });

  const messages = ctx.messages ?? [];
  const historyBytes = messages.reduce((a, m) => a + m.content.length, 0);
  const toolResults = messages.filter((m) => m.role === 'tool').length;
  const prunePreview = pruneToolResults(messages, { keep: engine.toolResultWindow() });

  const sorted = [...sections].sort((a, b) => b.bytes - a.bytes);
  const notes: string[] = [];
  if (!memoryBlock.facts && memoryBlock.totalFacts) {
    notes.push(`memory holds ${memoryBlock.totalFacts} facts but none fit the ${memoryBlock.budget}-byte budget — raise agent.memoryBudget`);
  }
  if (prunePreview.pruned) {
    notes.push(`${prunePreview.pruned} older tool result(s) would be pruned, saving ${Math.round(prunePreview.bytesSaved / 1024)} KB`);
  }
  if (engine.name !== 'default') notes.push(`context engine "${engine.name}": ${engine.describe()}`);

  return {
    engine: engine.name,
    sections: sorted,
    totalBytes: sorted.reduce((a, s) => a + s.bytes, 0),
    tools: { count: ctx.toolCount ?? 0, schemaBytes: ctx.toolSchemaBytes ?? 0 },
    history: { messages: messages.length, bytes: historyBytes, pruned: prunePreview.pruned },
    memory: {
      facts: memoryBlock.facts,
      totalFacts: memoryBlock.totalFacts,
      budget: memoryBlock.budget,
      userBytes: Buffer.byteLength(ctx.memory.readUserBlock(600), 'utf8'),
    },
    skills: { count: detectSkillsIndexBytes(ctx.skills).count, bytes: detectSkillsIndexBytes(ctx.skills).bytes },
    notes,
  };
}

/** The human page `termcrab context` prints. */
export function renderContext(report: ContextReport): string {
  const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;
  const lines: string[] = [];
  lines.push(`Context — engine "${report.engine}"`);
  lines.push('');
  lines.push(`  prompt sections            ${kb(report.totalBytes)}`);
  for (const s of report.sections) lines.push(`    ${s.section.padEnd(24)} ${kb(s.bytes).padStart(8)}   ${s.note}`);
  lines.push(`  tool schemas               ${kb(report.tools.schemaBytes).padStart(8)}   (${report.tools.count} tools)`);
  lines.push(`  hot transcript             ${kb(report.history.bytes).padStart(8)}   (${report.history.messages} messages)`);
  lines.push(
    `  memory                     ${String(report.memory.facts).padStart(8)}   of ${report.memory.totalFacts} facts, budget ${report.memory.budget} bytes, USER.md ${report.memory.userBytes} bytes`,
  );
  lines.push(`  skills index               ${String(report.skills.count).padStart(8)}   ${kb(report.skills.bytes)}`);
  if (report.history.pruned) lines.push(`  pruned tool results        ${String(report.history.pruned).padStart(8)}   (old results replaced by one-line stubs)`);
  for (const n of report.notes) lines.push(`  note: ${n}`);
  return lines.join('\n');
}
