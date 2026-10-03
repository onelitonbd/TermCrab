/**
 * Import an existing OpenClaw install (config, memory, sessions) into ~/.termcrab.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config, cfgSet, loadConfig, saveConfig, defaults } from '../core/config.js';
import { workspaceDir, memoryDir } from '../core/paths.js';
import { parseFrontmatter } from '../core/frontmatter.js';
import { sanitizeAgentName } from '../agent/prompt.js';
import { importSkills, ImportResult } from '../skills/importer.js';

/**
 * One-command migration from an OpenClaw home (~/.openclaw) into TermCrab.
 * Preview by default (reads only); `--apply` writes. Secrets are mapped into
 * config but NEVER printed (masked display values).
 *
 * OpenClaw layout (docs.openclaw.ai, confirmed 2026-09):
 *   ~/.openclaw/openclaw.json          JSON5 config
 *   ~/.openclaw/workspace/SOUL.md + AGENTS/USER/IDENTITY/TOOLS/MEMORY/HEARTBEAT…
 *   ~/.openclaw/workspace/memory/      daily logs (YYYY-MM-DD.md) + topic folders
 *   ~/.openclaw/workspace/skills/<name>/SKILL.md
 */

export interface MappingRow {
  /** dotted source path in openclaw.json (display) */
  from: string;
  /** dotted TermCrab config key (display) */
  to: string;
  /** masked/short display value — safe to print */
  value: string;
  status: 'will set' | 'keep yours' | 'absent';
  /** real write instruction, only used by --apply (never printed) */
  set?: { key: string; value: string };
}

export interface PlanReport {
  source: string;
  sourceExists: boolean;
  workspace: string;
  personalityFiles: string[];
  hasExistingSoul: boolean;
  soulMerges: string[];
  agentFolders: string[];
  memory: {
    sourceLines: number;
    newLines: number;
    dailyFiles: string[];
    extraFiles: string[];
    existingTarget: boolean;
  };
  skills: { name: string; description: string }[];
  skillsDir: string | null;
  configPath: string | null;
  configParseError?: string;
  rows: MappingRow[];
  unmapped: string[];
  actions: string[];
}

/** Lenient JSON5-ish parse: comments, trailing commas, unquoted keys, 'quotes'. */
export function parseJson5ish(text: string): Record<string, unknown> {
  let out = '';
  let i = 0;
  let inStr: '"' | "'" | null = null;
  let expectKeyOrValue: 'key' | 'value' = 'value';
  while (i < text.length) {
    const c = text[i]!;
    if (inStr) {
      if (c === '\\') {
        out += c + (text[i + 1] ?? '');
        i += 2;
        continue;
      }
      if (c === inStr) {
        out += '"';
        inStr = null;
        expectKeyOrValue = 'value';
        i += 1;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c as '"' | "'";
      out += '"';
      i += 1;
      continue;
    }
    if (c === ',' && /^\s*[}\]]/.test(text.slice(i + 1))) {
      i += 1;
      continue;
    }
    // quote unquoted keys: { foo: ...  or , foo:
    const keyMatch = text.slice(i).match(/^([A-Za-z_$][\w$]*)\s*:/);
    if (keyMatch && expectKeyOrValue === 'value' && /[{,]\s*$/.test(out)) {
      out += `"${keyMatch[1]}":`;
      i += keyMatch[0].length;
      continue;
    }
    if (c === '{' || c === '[') expectKeyOrValue = 'value';
    if (c === ':') expectKeyOrValue = 'value';
    if (c === ',') expectKeyOrValue = 'value';
    out += c;
    i += 1;
  }
  const parsed = JSON.parse(out) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('config is not an object');
  }
  return parsed as Record<string, unknown>;
}

function readJson5(file: string): Record<string, unknown> | null {
  try {
    return parseJson5ish(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function mask(v: unknown): string {
  const s = Array.isArray(v) ? `${v.length} item(s)` : String(v ?? '');
  if (/api-?key|token|secret|password/i.test(s)) return '•••';
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

function isSecretKey(key: string): boolean {
  return /api-?key|token|secret|password/i.test(key.split('.').pop() ?? '');
}

function leaves(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return [prefix || '(root)'];
  }
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out.push(...leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return out;
}

function get(obj: unknown, dotted: string): unknown {
  return dotted
    .split('.')
    .reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), obj);
}

function expandHome(p: string): string {
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function maskSecretsInLines(lines: string[]): string[] {
  return lines.map((l) => (isSecretKey(l) ? l.replace(/=\s*.*$/, '= •••') : l));
}

/** Read-only preview: NEVER writes. */
export function planOpenclaw(source: string): PlanReport {
  const src = source.replace(/\/+$/, '');
  const sourceExists = fs.existsSync(src);
  const cfgPath = fs.existsSync(path.join(src, 'openclaw.json'))
    ? path.join(src, 'openclaw.json')
    : process.env.OPENCLAW_CONFIG_PATH && fs.existsSync(process.env.OPENCLAW_CONFIG_PATH)
      ? process.env.OPENCLAW_CONFIG_PATH
      : null;
  const ocCfg = cfgPath ? readJson5(cfgPath) : null;
  const wsFromCfg = ocCfg ? get(ocCfg, 'agents.defaults.workspace') : undefined;
  const workspace =
    sourceExists && typeof wsFromCfg === 'string'
      ? expandHome(wsFromCfg)
      : path.join(src, 'workspace');

  const report: PlanReport = {
    source: src,
    sourceExists,
    workspace,
    personalityFiles: [],
    hasExistingSoul: false,
    soulMerges: [],
    agentFolders: [],
    memory: { sourceLines: 0, newLines: 0, dailyFiles: [], extraFiles: [], existingTarget: false },
    skills: [],
    skillsDir: null,
    configPath: cfgPath,
    rows: [],
    unmapped: [],
    actions: [],
  };
  if (!sourceExists) {
    report.actions.push(`source not found: ${src} — nothing to import`);
    return report;
  }

  // --- personality files ---
  const targetSoul = path.join(workspaceDir(), 'SOUL.md');
  report.hasExistingSoul = fs.existsSync(targetSoul) && fs.readFileSync(targetSoul, 'utf8').trim().length > 0;
  for (const f of ['SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md', 'TOOLS.md']) {
    const p = path.join(workspace, f);
    if (fs.existsSync(p)) {
      report.personalityFiles.push(f);
      if (f !== 'SOUL.md') report.soulMerges.push(f);
    }
  }
  // named agent folders (some workspaces keep agents/<name>/SOUL.md)
  const agentsDir = path.join(workspace, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const e of fs.readdirSync(agentsDir, { withFileTypes: true })) {
      if (e.isDirectory() && fs.existsSync(path.join(agentsDir, e.name, 'SOUL.md'))) {
        report.agentFolders.push(e.name);
      }
    }
  }

  // --- memory ---
  const srcMem = path.join(workspace, 'MEMORY.md');
  const tgtMem = path.join(memoryDir(), 'MEMORY.md');
  report.memory.existingTarget = fs.existsSync(tgtMem);
  if (fs.existsSync(srcMem)) {
    const srcLines = fs
      .readFileSync(srcMem, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    report.memory.sourceLines = srcLines.length;
    const have = report.memory.existingTarget ? fs.readFileSync(tgtMem, 'utf8').toLowerCase() : '';
    report.memory.newLines = srcLines.filter((l) => !have.includes(l.toLowerCase())).length;
  }
  const srcDaily = path.join(workspace, 'memory');
  if (fs.existsSync(srcDaily)) {
    for (const e of fs.readdirSync(srcDaily, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.md')) {
        if (!fs.existsSync(path.join(memoryDir(), 'daily', e.name))) report.memory.dailyFiles.push(e.name);
      } else if (e.isDirectory()) {
        report.memory.extraFiles.push(`memory/${e.name}/`);
      }
    }
  }

  // --- skills ---
  for (const dir of [path.join(workspace, 'skills'), path.join(src, 'skills')]) {
    if (fs.existsSync(dir)) {
      report.skillsDir = dir;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const skillMd = path.join(dir, e.name, 'SKILL.md');
        if (e.isDirectory() && fs.existsSync(skillMd)) {
          try {
            const { data } = parseFrontmatter(fs.readFileSync(skillMd, 'utf8'));
            report.skills.push({
              name: String(data.name ?? e.name),
              description: String(data.description ?? '').slice(0, 80),
            });
          } catch {
            report.skills.push({ name: e.name, description: '' });
          }
        }
      }
      break;
    }
  }

  // --- config mapping ---
  const current: Config = loadConfig();
  if (!ocCfg) {
    report.configParseError = cfgPath
      ? 'could not parse (JSON5 with unsupported syntax) — config lines skipped'
      : 'openclaw.json not found — config lines skipped';
  } else {
    const used = new Set<string>();
    const probe = (
      fromKey: string,
      toKey: string,
      extract: (v: unknown) => { display: string; set?: string } | null,
    ): void => {
      const v = get(ocCfg, fromKey);
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) {
        report.rows.push({ from: fromKey, to: toKey, value: '—', status: 'absent' });
        return;
      }
      used.add(fromKey.split('.')[0]!);
      const got = extract(v);
      if (!got) {
        report.rows.push({ from: fromKey, to: toKey, value: '—', status: 'absent' });
        return;
      }
      // Protect only values the OWNER customized (differs from TermCrab default);
      // defaults should yield to the user's existing OpenClaw preference.
      const cur = get(current, toKey);
      const def = get(defaults(), toKey);
      const customized = JSON.stringify(cur) !== JSON.stringify(def);
      if (customized && String(cur) !== got.set) {
        report.rows.push({ from: fromKey, to: toKey, value: got.display, status: 'keep yours' });
        return;
      }
      report.rows.push({
        from: fromKey,
        to: toKey,
        value: isSecretKey(toKey) ? '•••' : got.display,
        status: 'will set',
        set: got.set !== undefined ? { key: toKey, value: got.set } : undefined,
      });
    };

    probe('agents.defaults.heartbeat.every', 'heartbeat.enabled', (v) => {
      const s = String(v);
      const isZero = /^0(\s*m)?$/i.test(s);
      return { display: isZero ? 'off' : 'on', set: isZero ? 'false' : 'true' };
    });
    probe('agents.defaults.heartbeat.every', 'heartbeat.minutes', (v) => {
      const s = String(v);
      if (/^0(\s*m)?$/i.test(s)) return null;
      const min = s.match(/(\d+)\s*m/i)?.[1];
      const hr = s.match(/(\d+)\s*h/i)?.[1];
      if (min) return { display: `${min} min`, set: min };
      if (hr) return { display: `${Number(hr) * 60} min`, set: String(Number(hr) * 60) };
      return null;
    });
    probe('channels.whatsapp.allowFrom', 'channels.whatsapp.allowedJids', (v) => ({
      display: mask(v),
      set: JSON.stringify(v),
    }));
    probe('channels.whatsapp.allowFrom', 'channels.whatsapp.enabled', (v) =>
      Array.isArray(v) && v.length ? { display: 'true', set: 'true' } : null,
    );
    probe('channels.telegram.token', 'channels.telegram.token', (v) => ({
      display: '•••',
      set: String(v),
    }));
    probe('channels.telegram.allowFrom', 'channels.telegram.allowedUserIds', (v) => ({
      display: mask(v),
      set: JSON.stringify(
        (Array.isArray(v) ? v : []).map((x) => Number(x)).filter((n) => Number.isFinite(n)),
      ),
    }));
    probe('gateway.port', 'gateway.port', (v) => ({ display: String(v), set: String(v) }));

    // models: first candidate wins
    const modelCandidates = ['models.primary', 'models.default', 'agents.defaults.model', 'model'];
    let mappedModel = false;
    for (const cand of modelCandidates) {
      const v = get(ocCfg, cand);
      if (v === undefined || v === null || v === '') continue;
      used.add(cand.split('.')[0]!);
      const obj = typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
      const model = String(obj?.model ?? v);
      const provider = obj?.provider ? String(obj.provider).toLowerCase() : '';
      const baseUrl = obj?.baseUrl ? String(obj.baseUrl) : '';
      const apiKey = obj?.apiKey ? String(obj.apiKey) : '';
      report.rows.push({ from: `${cand}.model`, to: 'provider.model', value: model, status: 'will set', set: { key: 'provider.model', value: model } });
      // Migrate any historical provider type (anthropic/gemini/ollama/mock) to
      // the single supported kind: openai-compatible.
      report.rows.push({ from: `${cand}.provider`, to: 'provider.type', value: 'openai', status: 'will set', set: { key: 'provider.type', value: 'openai' } });
      if (baseUrl) {
        report.rows.push({ from: `${cand}.baseUrl`, to: 'provider.baseUrl', value: baseUrl, status: 'will set', set: { key: 'provider.baseUrl', value: baseUrl } });
      }
      if (apiKey) {
        const hasKey = Boolean(current.provider.apiKey);
        report.rows.push({
          from: `${cand}.apiKey`,
          to: 'provider.apiKey',
          value: '•••',
          status: hasKey ? 'keep yours' : 'will set',
          set: hasKey ? undefined : { key: 'provider.apiKey', value: apiKey },
        });
      }
      mappedModel = true;
      break;
    }
    if (!mappedModel) {
      report.rows.push({ from: 'models.*', to: 'provider.model', value: '—', status: 'absent' });
    }

    // unmapped leaves (transparency) — secrets shown as key names only
    const mappedSources = new Set([...used, 'channels', 'gateway']);
    const allLeaves = leaves(ocCfg);
    report.unmapped = allLeaves
      .filter((l) => {
        const top = l.split('.')[0]!;
        if (!mappedSources.has(top)) return true;
        // within mapped sections, only show leaves we never referenced
        return !report.rows.some((r) => r.from === l || r.from.startsWith(`${l}.`) || l.startsWith(`${r.from}.`));
      })
      .slice(0, 24);
    if (allLeaves.length > 24) report.unmapped.push(`…and more`);
  }

  // --- plan actions (plain English) ---
  report.actions.push(
    report.personalityFiles.length
      ? report.hasExistingSoul
        ? `merge OpenClaw personality (${report.personalityFiles.join(', ')}) into workspace/SOUL.md — SKIP (you already have one; --force replaces)`
        : `merge OpenClaw personality (${report.personalityFiles.join(', ')}) into workspace/SOUL.md`
      : 'no personality files found (SOUL/USER/AGENTS/…)',
  );
  for (const a of report.agentFolders) report.actions.push(`create named agent @${sanitizeAgentName(a) ?? a} from workspace/agents/${a}/SOUL.md`);
  report.actions.push(
    report.memory.sourceLines
      ? `merge ${report.memory.newLines} new memory line(s) from OpenClaw MEMORY.md (of ${report.memory.sourceLines})`
      : 'no MEMORY.md content to merge',
  );
  if (report.memory.dailyFiles.length) report.actions.push(`copy ${report.memory.dailyFiles.length} daily log(s) → memory/daily/`);
  for (const e of report.memory.extraFiles) report.actions.push(`copy ${e} → memory/imported-openclaw/`);
  report.actions.push(
    report.skills.length
      ? `import ${report.skills.length} skill(s): ${report.skills.map((s) => s.name).join(', ')}`
      : 'no skills found',
  );
  const willSet = report.rows.filter((r) => r.status === 'will set');
  report.actions.push(
    willSet.length ? `set ${willSet.length} config value(s) (secrets masked in this list)` : 'no config values to set',
  );
  report.actions.push('copy remaining workspace extras (HEARTBEAT/BOOT/checklists) → workspace/imported-openclaw/');
  return report;
}

/** Execute a plan. Only called with --apply. */
export async function applyOpenclaw(
  report: PlanReport,
  opts: { force?: boolean } = {},
): Promise<string[]> {
  const lines: string[] = [];
  if (!report.sourceExists) return [`source not found: ${report.source}`];
  const force = Boolean(opts.force);

  // 1) personality → workspace/SOUL.md
  if (report.personalityFiles.length && !(report.hasExistingSoul && !force)) {
    const parts: string[] = ['<!-- imported from OpenClaw -->'];
    for (const f of report.personalityFiles) {
      const content = fs.readFileSync(path.join(report.workspace, f), 'utf8').trim();
      if (!content) continue;
      parts.push(f === 'SOUL.md' ? content : `## (from OpenClaw ${f})\n\n${content}`);
    }
    const target = path.join(workspaceDir(), 'SOUL.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${parts.join('\n\n---\n\n')}\n`, 'utf8');
    lines.push(`personality: ${report.personalityFiles.length} file(s) → workspace/SOUL.md`);
  } else if (report.hasExistingSoul && !force) {
    lines.push('personality: kept your existing workspace/SOUL.md (--force to replace)');
  }

  // named agent folders
  for (const raw of report.agentFolders) {
    const safe = sanitizeAgentName(raw);
    if (!safe) {
      lines.push(`agent "${raw}": skipped (invalid name)`);
      continue;
    }
    const target = path.join(workspaceDir(), 'agents', safe, 'SOUL.md');
    if (fs.existsSync(target) && !force) {
      lines.push(`agent @${safe}: kept existing SOUL.md`);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(report.workspace, 'agents', raw, 'SOUL.md'), target);
    lines.push(`agent @${safe}: SOUL.md copied`);
  }

  // 2) memory merge
  const srcMem = path.join(report.workspace, 'MEMORY.md');
  if (fs.existsSync(srcMem) && report.memory.newLines > 0) {
    const tgt = path.join(memoryDir(), 'MEMORY.md');
    fs.mkdirSync(path.dirname(tgt), { recursive: true });
    if (!fs.existsSync(tgt)) fs.writeFileSync(tgt, '# Long-term memory\n\n', 'utf8');
    const have = fs.readFileSync(tgt, 'utf8').toLowerCase();
    const newLines = fs
      .readFileSync(srcMem, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !have.includes(l.toLowerCase()));
    const stamp = new Date().toISOString().slice(0, 10);
    fs.appendFileSync(tgt, `\n## Imported from OpenClaw (${stamp})\n\n${newLines.join('\n')}\n`, 'utf8');
    lines.push(`memory: ${newLines.length} new line(s) merged into memory/MEMORY.md`);
  } else {
    lines.push('memory: nothing new to merge');
  }

  // daily logs + topic folders
  const srcDaily = path.join(report.workspace, 'memory');
  if (fs.existsSync(srcDaily)) {
    let copied = 0;
    const dailyDir = path.join(memoryDir(), 'daily');
    fs.mkdirSync(dailyDir, { recursive: true });
    for (const name of report.memory.dailyFiles) {
      fs.copyFileSync(path.join(srcDaily, name), path.join(dailyDir, name));
      copied += 1;
    }
    if (copied) lines.push(`memory: ${copied} daily log(s) → memory/daily/`);
    if (report.memory.extraFiles.length) {
      const destRoot = path.join(memoryDir(), 'imported-openclaw');
      for (const entry of fs.readdirSync(srcDaily, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const from = path.join(srcDaily, entry.name);
        const to = path.join(destRoot, entry.name);
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.cpSync(from, to, { recursive: true, force });
        lines.push(`memory: folder memory/${entry.name}/ → memory/imported-openclaw/${entry.name}/`);
      }
    }
  }

  // 3) skills
  if (report.skillsDir && report.skills.length) {
    try {
      const results: ImportResult[] = await importSkills(report.skillsDir, { force });
      lines.push(
        `skills: ${results.map((r) => `${r.action}: ${r.name}`).join(', ')}`,
      );
    } catch (err) {
      lines.push(`skills: failed — ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    lines.push('skills: none found');
  }

  // 4) config
  const cfg = loadConfig();
  let setCount = 0;
  for (const row of report.rows) {
    if (row.status === 'will set' && row.set) {
      const updated = cfgSet(cfg, row.set.key, row.set.value);
      Object.assign(cfg, updated);
      setCount += 1;
      lines.push(`config: ${row.to} = ${isSecretKey(row.to) ? '•••' : row.value}`);
    }
  }
  if (setCount) saveConfig(cfg);

  // 5) workspace extras (HEARTBEAT, BOOT, checklists, docs-less)
  const extrasDir = path.join(workspaceDir(), 'imported-openclaw');
  let extraCount = 0;
  for (const f of ['HEARTBEAT.md', 'BOOT.md', 'BOOTSTRAP.md']) {
    const p = path.join(report.workspace, f);
    if (fs.existsSync(p)) {
      fs.mkdirSync(extrasDir, { recursive: true });
      fs.copyFileSync(p, path.join(extrasDir, f));
      extraCount += 1;
    }
  }
  const checklists = path.join(report.workspace, 'checklists');
  if (fs.existsSync(checklists)) {
    fs.mkdirSync(path.join(extrasDir, 'checklists'), { recursive: true });
    fs.cpSync(checklists, path.join(extrasDir, 'checklists'), { recursive: true, force });
    extraCount += 1;
  }
  if (extraCount) lines.push(`workspace: ${extraCount} extra item(s) → workspace/imported-openclaw/`);

  lines.push('done — next: termcrab status   then   termcrab doctor');
  return maskSecretsInLines(lines);
}
