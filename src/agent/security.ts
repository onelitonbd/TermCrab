/**
 * 34.5 — the audits: what this install actually allows, and where its secrets
 * actually are.
 *
 * Two questions a person should be able to answer in one command, and a
 * documentation page alone cannot answer either:
 *
 *   1. *What can this agent do to my device right now?* — exec on or off, is
 *      there a sandbox, does anything ask for approval, is the panel reachable
 *      from the network, are the webhook doors locked. `securityAudit()` answers
 *      it with findings that each carry the fix, and every finding is derived
 *      from the live config rather than from a table somebody typed once.
 *   2. *Where are my keys?* — `auditSecrets()` looks for key-shaped strings in
 *      the files that end up in prompts and backups (config.json, memory,
 *      state), knows which ones belong there, and says where the rest should
 *      live instead (`termcrab auth`, mode 0600, outside the config).
 *
 * Read-only by design: an audit that can change something is not an audit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { home, configPath, stateDir, memoryDir } from '../core/paths.js';
import type { Config } from '../core/config.js';

export type FindingLevel = 'ok' | 'warn' | 'fail' | 'info';

export interface Finding {
  id: string;
  level: FindingLevel;
  title: string;
  detail: string;
  fix?: string;
}

const LEVEL_RANK: Record<FindingLevel, number> = { fail: 0, warn: 1, info: 2, ok: 3 };

/** Danger tools that can change the device; approval configuration is judged against these. */
export const DANGEROUS_TOOLS = ['exec', 'write_file', 'edit_file', 'patch_file', 'send_file', 'browser'] as const;

function approvalsOf(config: Config): string[] {
  const security = (config as { security?: { approvals?: { tools?: unknown } } }).security;
  const tools = security?.approvals?.tools;
  return Array.isArray(tools) ? tools.filter((t): t is string => typeof t === 'string') : [];
}

function tokenWeakness(token: string): string | null {
  const t = token.trim();
  if (!t) return 'no token set';
  if (t.length < 24) return `only ${t.length} characters`;
  if (/^(changeme|password|token|secret|test|admin|termcrab)/i.test(t)) return 'a guessable word';
  if (/^(.)\1+$/.test(t)) return 'one repeated character';
  return null;
}

export interface SecurityOptions {
  config: Config;
  /** Injected in tests. */
  sandboxAvailable?: boolean;
  existsImpl?: (p: string) => boolean;
}

/**
 * Every finding is about the *live* config: change a setting and the finding
 * changes with it. Order is by severity, so the first line is the worst thing.
 */
export function securityAudit(opts: SecurityOptions): Finding[] {
  const { config } = opts;
  const exists = opts.existsImpl ?? fs.existsSync;
  const findings: Finding[] = [];
  const agent = config.agent as Config['agent'] & { allowBrowser?: boolean; sandbox?: string };

  // ---- what the agent may do ----
  if (agent.allowExec) {
    const sandbox = agent.sandbox ?? 'auto';
    if (sandbox === 'off') {
      findings.push({
        id: 'exec-unsandboxed',
        level: 'fail',
        title: 'shell commands run without a sandbox',
        detail: 'agent.allowExec is on and agent.sandbox is "off": a command the model writes runs with this account\'s full access and can read ~/.ssh, the state dir and anything else you can.',
        fix: 'termcrab config set agent.sandbox auto   (bwrap or proot when the device has one)',
      });
    } else if (sandbox === 'require' && opts.sandboxAvailable === false) {
      findings.push({
        id: 'exec-nosandbox',
        level: 'fail',
        title: 'agent.sandbox is "require" but no sandbox binary is installed',
        detail: 'Every exec call will be refused, so anything that needs a shell is dead until this is fixed — which is at least honest, but it is not working.',
        fix: 'pkg install bubblewrap   (or: termcrab config set agent.sandbox auto)',
      });
    } else {
      findings.push({
        id: 'exec-policy',
        level: 'info',
        title: `shell commands allowed, sandbox: ${sandbox}${opts.sandboxAvailable === false ? ' (no sandbox binary found — commands run unconfined and say so)' : ''}`,
        detail: 'exec is the widest door in the house; it stays on because it is also the most useful one.',
        fix: 'termcrab config set agent.allowExec false   — if you would rather it never run a command',
      });
    }
  } else {
    findings.push({
      id: 'exec-off',
      level: 'ok',
      title: 'shell commands are refused',
      detail: 'agent.allowExec is off, so every exec call is answered with a sentence instead of running.',
      fix: 'termcrab config set agent.allowExec true   — to turn it on (sandbox auto by default)',
    });
  }

  // ---- the approval gate ----
  const approvals = approvalsOf(config);
  const uncovered = DANGEROUS_TOOLS.filter((t) => !approvals.includes(t));
  if (!approvals.length) {
    findings.push({
      id: 'approvals-empty',
      level: 'warn',
      title: 'nothing asks for your yes',
      detail: 'No tool is behind the approval gate, so a dangerous tool runs as soon as the model decides to use it. The gate is real (the turn pauses, the panel shows a card) — it is just not armed.',
      fix: 'termcrab config set security.approvals.tools \'["exec","write_file"]\'',
    });
  } else {
    findings.push({
      id: 'approvals',
      level: agent.allowExec && uncovered.includes('exec') ? 'warn' : 'info',
      title: `${approvals.length} tool(s) behind the approval gate`,
      detail: `gated: ${approvals.join(', ')}${uncovered.length ? ` · not gated: ${uncovered.join(', ')}` : ''}`,
      fix: agent.allowExec && uncovered.includes('exec') ? 'termcrab config set security.approvals.tools \'["exec"]\'' : undefined,
    });
  }

  // ---- the door to the network ----
  const host = config.gateway.host || '127.0.0.1';
  const nonLoopback = host === '0.0.0.0' || host === '::' || (!/^(127\.|localhost|::1)/.test(host) && host !== '');
  if (nonLoopback) {
    const weak = tokenWeakness(config.gateway.token ?? '');
    findings.push({
      id: 'gateway-exposed',
      level: weak ? 'fail' : 'warn',
      title: `the panel is bound to ${host} (reachable from the network)`,
      detail: weak
        ? `and the token is weak: ${weak}. A token is the only thing between the network and your chats, memory and shell.`
        : 'anything on that network can reach /api/*, and the only protection is the bearer token (compared in constant time, revocable per device — but plain HTTP on the wire).',
      fix: 'Put it behind a TLS terminator or a tunnel (docs/REMOTE.md), or bind loopback: termcrab config set gateway.host 127.0.0.1',
    });
    if (weak) {
      findings.push({
        id: 'gateway-token-weak',
        level: 'fail',
        title: 'the gateway token is weak',
        detail: `reason: ${weak}.`,
        fix: 'termcrab config set gateway.token "$(node -e \\"console.log(require(\'crypto\').randomBytes(24).toString(\'hex\'))\\")"',
      });
    }
  } else {
    findings.push({
      id: 'gateway-loopback',
      level: 'ok',
      title: `panel bound to ${host} (loopback only)`,
      detail: 'Only this device can reach the API. Remote access needs a tunnel or Tailscale — see docs/REMOTE.md.',
    });
  }

  // ---- webhook doors ----
  const hooks = config.hooks ?? [];
  if (hooks.length) {
    const untokened = hooks.filter((h) => !h.token).map((h) => h.id);
    findings.push({
      id: 'hooks',
      level: untokened.length ? 'warn' : 'ok',
      title: `${hooks.length} webhook(s) configured${untokened.length ? `, ${untokened.length} without a token` : ''}`,
      detail: untokened.length
        ? `a hook without a token accepts anything that can reach the port: ${untokened.join(', ')}`
        : 'every hook requires x-hook-token, compared in constant time.',
      fix: untokened.length ? 'give each hook a token in config.json (hooks.<id>.token), or remove it' : undefined,
    });
  }

  // ---- the browser ----
  if (agent.allowBrowser) {
    findings.push({
      id: 'browser',
      level: 'warn',
      title: 'the browser tool is enabled',
      detail: 'It drives the Chrome you started with a debug port — that browser has your logins. The agent can read any page and type into forms there.',
      fix: 'termcrab config set agent.allowBrowser false   — or keep a separate Chrome profile for it',
    });
  }

  // ---- files that others can read ----
  const cfg = configPath();
  try {
    const mode = fs.statSync(cfg).mode & 0o777;
    if (mode & 0o077) {
      findings.push({
        id: 'config-perms',
        level: 'warn',
        title: `config.json is readable by other users on this device (mode ${mode.toString(8)})`,
        detail: `${cfg} holds the Telegram token and whatever else was typed into it.`,
        fix: `chmod 600 ${cfg}`,
      });
    } else {
      findings.push({ id: 'config-perms', level: 'ok', title: `config.json mode ${mode.toString(8)} (owner only)`, detail: cfg });
    }
  } catch {
    /* no config file yet */
  }
  void exists;

  // ---- the keys themselves ----
  findings.push(...auditSecrets({ config }));

  return findings.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.id.localeCompare(b.id));
}

// ---- where the keys are ------------------------------------------------

export interface SecretHit {
  /** Where it was found, as a path a person can open. */
  where: string;
  /** The key path inside the file (`provider.apiKey`, or `line 12`). */
  field: string;
  /** Never the whole secret: a masked preview only. */
  preview: string;
  level: FindingLevel;
  why: string;
  fix?: string;
}

const KEY_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'OpenAI-style key', re: /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{30,}/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

export function maskValue(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return '••••';
  return `${v.slice(0, 4)}…${v.slice(-4)} (${v.length} chars)`;
}

/** The first key-shaped string in a piece of text, if any. */
export function findSecretIn(text: string): { name: string; value: string } | null {
  for (const p of KEY_PATTERNS) {
    const m = p.re.exec(text);
    if (m) return { name: p.name, value: m[0] };
  }
  return null;
}

/** True for files that are *supposed* to hold credentials. */
function expectedSecretFile(file: string): boolean {
  const base = path.basename(file);
  return base === 'secrets.json' || base === 'auth-profiles.json' || base === 'secrets-audit.log';
}

export interface SecretsOptions {
  config?: Config;
  /** Extra files to scan (tests use this for a temp home). */
  files?: string[];
}

/**
 * Look for key-shaped strings where they should not be: the config that is
 * copied into every prompt's neighbourhood, the memory the model reads, and the
 * state files that travel in every backup. The credential stores themselves are
 * checked for permissions, not for content.
 */
export function auditSecrets(opts: SecretsOptions = {}): Finding[] {
  const findings: Finding[] = [];
  const files = opts.files ?? collectScanFiles();
  const hits: SecretHit[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (expectedSecretFile(file)) {
      const mode = (() => {
        try {
          return fs.statSync(file).mode & 0o777;
        } catch {
          return 0o600;
        }
      })();
      if (mode & 0o077) {
        findings.push({
          id: `secret-file-perms:${path.basename(file)}`,
          level: 'fail',
          title: `${path.basename(file)} is readable by other users (mode ${mode.toString(8)})`,
          detail: file,
          fix: `chmod 600 ${file}`,
        });
      }
      continue;
    }
    // config.json and memory are scanned line by line so the finding can point
    // at the field rather than at the whole file.
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const hit = findSecretIn(line);
      if (!hit) continue;
      const isTelegram = /"token"\s*:/.test(line) && /telegram|bot/i.test(file + text.slice(0, 400));
      const isGateway = /"gateway"/i.test(text.slice(0, 2000)) && /"token"\s*:/.test(line) && path.basename(file) === 'config.json';
      const fieldMatch = /"([A-Za-z0-9_.-]+)"\s*:/.exec(line);
      const field = fieldMatch ? fieldMatch[1]! : `line ${i + 1}`;
      hits.push({
        where: file,
        field,
        preview: maskValue(hit.value),
        level: isGateway && !isTelegram ? 'warn' : 'fail',
        why: isTelegram
          ? 'the Telegram bot token — it has to live somewhere, and this is where the channel reads it'
          : isGateway
            ? 'the panel token: the gateway needs it in the config, and it is the key to every API route'
            : `${hit.name} found in a file that is read into prompts or carried in backups`,
        fix: isTelegram
          ? `keep it, and keep this file 0600: chmod 600 ${file}`
          : 'move it out of here: termcrab auth add <name> --provider <p> --key <key>, then reference the profile (provider.authProfile)',
      });
    }
  }

  const misplaced = hits.filter((h) => h.level === 'fail');
  if (misplaced.length) {
    findings.push({
      id: 'secrets-misplaced',
      level: 'fail',
      title: `${misplaced.length} key-shaped string(s) outside the credential stores`,
      detail: misplaced.map((h) => `${path.basename(h.where)} → ${h.field}: ${h.preview}`).join(' · '),
      fix: misplaced[0]!.fix,
    });
  }

  // The provider key in config.json is the one a person can actually fix today.
  const providerKey = (opts.config?.provider as { apiKey?: string } | undefined)?.apiKey;
  if (providerKey && providerKey.trim().length > 8) {
    const used = Boolean((opts.config?.provider as { authProfile?: string } | undefined)?.authProfile);
    if (!used) {
      findings.push({
        id: 'provider-key-plain',
        level: 'warn',
        title: 'the model provider key sits in config.json in plaintext',
        detail: `provider.apiKey is set (${maskValue(providerKey)}) and no auth profile is in use. config.json is the file most likely to be pasted into a bug report.`,
        fix: 'termcrab auth add work --provider <openai|anthropic|gemini> --key <key> && termcrab config set provider.authProfile work',
      });
    }
  }

  // Credential stores: report what is there, without values.
  const profiles = path.join(stateDir(), 'auth-profiles.json');
  const secrets = path.join(stateDir(), 'secrets.json');
  const present = [profiles, secrets].filter((f) => fs.existsSync(f));
  if (present.length) {
    findings.push({
      id: 'credential-stores',
      level: 'ok',
      title: `credential store(s) in use: ${present.map((f) => path.basename(f)).join(', ')}`,
      detail: 'keys live outside config.json; `termcrab auth list` shows the profiles, never the values, and every set/read is written to state/secrets-audit.log.',
    });
  }
  return findings;
}

function collectScanFiles(): string[] {
  const out: string[] = [];
  const add = (p: string): void => {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) out.push(p);
    } catch {
      /* skip */
    }
  };
  add(configPath());
  for (const dir of [home(), memoryDir(), stateDir()]) {
    let names: string[] = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const p = path.join(dir, name);
      try {
        if (fs.statSync(p).isFile() && /\.(json|md|txt|log)$/i.test(name)) out.push(p);
      } catch {
        /* skip */
      }
    }
  }
  return [...new Set(out)];
}

const ICON: Record<FindingLevel, string> = { fail: '❌', warn: '⚠️', info: 'ℹ️', ok: '✅' };

export function formatFindings(findings: Finding[], title = 'Security audit'): string {
  const counts = { fail: 0, warn: 0, info: 0, ok: 0 };
  for (const f of findings) counts[f.level]++;
  const head =
    `🔐 ${title} — ` +
    [
      counts.fail ? `${counts.fail} fail` : '',
      counts.warn ? `${counts.warn} warn` : '',
      counts.info ? `${counts.info} info` : '',
      counts.ok ? `${counts.ok} ok` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  if (!findings.length) return `${head}\n✅ nothing to fix` + '\n';
  const lines = findings.map((f) => {
    const bits = [`${ICON[f.level]} ${f.title}`, `     ${f.detail}`];
    if (f.fix) bits.push(`     fix: ${f.fix}`);
    return bits.join('\n');
  });
  return [head, ...lines].join('\n');
}
