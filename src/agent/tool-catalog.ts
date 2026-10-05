/**
 * Batch 53.1 — the tool catalog and its three switches, as every surface reads
 * them.
 *
 * The panel grew checkboxes for the three keys the config really carries
 * (`agent.allowExec`, `agent.allowBrowser`, `agent.allowCodeExec`) in batch 52;
 * this module is where that mapping lives now, so the panel's route, the CLI's
 * `termcrab tools` and the chat's `/tools` cannot drift apart. The second half
 * is the catalog itself: `buildTools()` returns 58 tools with no grouping, and
 * a phone terminal wants them grouped and named, so `groupOf()` classifies by
 * name and the suite asserts every tool lands in exactly one group (a new tool
 * cannot appear ungrouped by accident).
 */
import type { Config } from '../core/config.js';

export type ToolSwitchKey = 'allowExec' | 'allowBrowser' | 'allowCodeExec';

export interface ToolSwitch {
  /** What a person types: `termcrab tools --enable browser`, `/tools browser on`. */
  name: string;
  /** The config key it writes — the same one the panel's checkbox writes. */
  key: ToolSwitchKey;
  label: string;
  /** One sentence for the report. */
  note: string;
}

export const TOOL_SWITCHES: ToolSwitch[] = [
  {
    name: 'exec',
    key: 'allowExec',
    label: 'shell & files',
    note: 'run commands, read and write files on this device',
  },
  {
    name: 'browser',
    key: 'allowBrowser',
    label: 'browser',
    note: 'drive a browser (screenshots, clicks, page text)',
  },
  {
    name: 'code',
    key: 'allowCodeExec',
    label: 'sandboxed code',
    note: 'run code inside the sandbox',
  },
];

/** Every spelling a person (or an old route) may use, mapped to one switch. */
const ALIASES: Record<string, string> = {
  exec: 'exec',
  shell: 'exec',
  files: 'exec',
  fs: 'exec',
  browser: 'browser',
  web: 'browser',
  code: 'code',
  code_exec: 'code',
  sandbox: 'code',
};

/** `exec` | `shell` | `browser` | `code` | … → the switch, or undefined. */
export function switchFor(name: string): ToolSwitch | undefined {
  const canonical = ALIASES[(name ?? '').trim().toLowerCase()];
  return canonical ? TOOL_SWITCHES.find((s) => s.name === canonical) : undefined;
}

/** Just the config key, for a route that only needs to write it. */
export function switchKeyFor(name: string): ToolSwitchKey | undefined {
  return switchFor(name)?.key;
}

export interface SwitchState extends ToolSwitch {
  on: boolean;
}

/** The three switches and their current state, in report order. */
export function switchState(config: Config): SwitchState[] {
  return TOOL_SWITCHES.map((s) => ({ ...s, on: config.agent[s.key] === true }));
}

/** `on`/`off`/`true`/`false`/`1`/`0`/`yes`/`no` — the spellings every surface takes. */
export function parseSwitchValue(value: string): boolean | undefined {
  const v = (value ?? '').trim().toLowerCase();
  if (['on', 'true', '1', 'yes', 'y', 'enable'].includes(v)) return true;
  if (['off', 'false', '0', 'no', 'n', 'disable'].includes(v)) return false;
  return undefined;
}

// --------------------------------------------------------------- the catalog

/**
 * Groups, in the order a person wants to read them. The classifier is by
 * prefix, and the suite asserts the whole catalog is covered — so a new tool
 * either lands in one of these or the test fails until it is named.
 */
export const TOOL_GROUPS = [
  'shell & files',
  'web & browser',
  'this phone',
  'memory & identity',
  'sessions & agents',
  'goals, tasks & automations',
  'media',
  'time & skills',
] as const;

export type ToolGroup = (typeof TOOL_GROUPS)[number];

/** Explicit home for the names a prefix rule would place badly. */
const GROUP_OVERRIDES: Record<string, ToolGroup> = {
  get_time: 'time & skills',
  load_skill: 'time & skills',
  skill_workshop: 'sessions & agents',
  secrets: 'memory & identity',
  github_identity_status: 'memory & identity',
  remember: 'memory & identity',
  search_memory: 'memory & identity',
  update_user: 'memory & identity',
  inbox_list: 'sessions & agents',
  inbox_read: 'sessions & agents',
  send_file: 'media',
  generate_image: 'media',
  view_image: 'media',
  canvas: 'media',
  progress_card: 'sessions & agents',
  intent: 'goals, tasks & automations',
  suggest_task: 'goals, tasks & automations',
  dismiss_task: 'goals, tasks & automations',
  automations: 'goals, tasks & automations',
  dashboard: 'goals, tasks & automations',
  portal: 'goals, tasks & automations',
  create_goal: 'goals, tasks & automations',
  get_goal: 'goals, tasks & automations',
  update_goal: 'goals, tasks & automations',
  ask_user: 'sessions & agents',
  room_history: 'sessions & agents',
  terminal: 'shell & files',
  process: 'shell & files',
};

const PHONE = new Set(['screen', 'camera', 'location', 'clipboard', 'battery', 'contacts', 'wifi_info', 'notification', 'sms_send']);

/** Which group a tool belongs to. Unknown names throw, so the suite catches them. */
export function groupOf(name: string): ToolGroup {
  const override = GROUP_OVERRIDES[name];
  if (override) return override;
  if (
    name.startsWith('conversations') ||
    name.startsWith('sessions') ||
    name.startsWith('session') ||
    name.startsWith('subagents') ||
    name.startsWith('agents')
  ) {
    return 'sessions & agents';
  }
  if (name.startsWith('web_') || name === 'browser') return 'web & browser';
  if (name === 'code_exec') return 'shell & files';
  if (PHONE.has(name)) return 'this phone';
  if (['read_file', 'write_file', 'list_dir', 'edit', 'apply_patch', 'exec'].includes(name)) return 'shell & files';
  throw new Error(`tool-catalog: ${name} has no group — add it to GROUP_OVERRIDES`);
}

export interface CatalogEntry {
  name: string;
  description: string;
  group: ToolGroup;
}

/** Group a built catalog, keeping TOOL_GROUPS order and each group's own order. */
export function groupCatalog(tools: { name: string; description: string }[]): { group: ToolGroup; tools: CatalogEntry[] }[] {
  const byGroup = new Map<ToolGroup, CatalogEntry[]>();
  for (const t of tools) {
    const group = groupOf(t.name);
    const list = byGroup.get(group) ?? [];
    list.push({ name: t.name, description: t.description, group });
    byGroup.set(group, list);
  }
  return TOOL_GROUPS.filter((g) => byGroup.has(g)).map((g) => ({ group: g, tools: byGroup.get(g)! }));
}

/**
 * The switch a tool is gated by, for the listing: a person reading
 * `termcrab tools` should see *why* a tool is not there or refuses. Everything
 * not listed here is always available (memory, sessions, time, media).
 *
 * Two kinds of gate, both real in `buildTools()`:
 *  - `browser` and `code_exec` are **absent** from the catalog when their
 *    switch is off — the model never sees them;
 *  - the shell tools are always listed, and `exec` **refuses at call time**
 *    with the exact config line when `allowExec` is off.
 */
export function gateOf(name: string): ToolSwitch | undefined {
  if (name === 'browser') return TOOL_SWITCHES.find((s) => s.name === 'browser');
  if (name === 'code_exec') return TOOL_SWITCHES.find((s) => s.name === 'code');
  if (['exec', 'terminal', 'process', 'apply_patch', 'edit', 'read_file', 'write_file', 'list_dir'].includes(name)) {
    return TOOL_SWITCHES.find((s) => s.name === 'exec');
  }
  return undefined;
}

/** Which switches are off, and therefore which tools a caller will not find. */
export function offSwitches(config: Config): SwitchState[] {
  return switchState(config).filter((s) => !s.on);
}
