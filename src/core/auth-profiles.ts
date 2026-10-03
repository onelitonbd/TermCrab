/**
 * Named API keys, so a config does not have to carry the secret (27.3).
 *
 * OpenClaw calls these auth profiles; the point is the same: the thing you
 * edit and share (`config.json`) stays free of credentials, the thing that
 * holds them (`state/auth-profiles.json`, mode 0600) is one file you can chmod
 * or delete, and switching a provider/key is one word:
 *
 *   termcrab auth add work --provider openai --key sk-…
 *   termcrab config set provider.authProfile work
 *
 * `resolveAuth(cfg)` is the only function that turns a profile name into a
 * key, and it is called where the provider is built — so no other code path
 * can read a key out of the store, and a missing profile is a clear error
 * rather than a request with an empty key.
 */
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from './paths.js';
import type { ProviderCfg } from './config.js';

export interface AuthProfile {
  /** The name you type: `termcrab auth add work …`. */
  id: string;
  provider: 'openai' | 'anthropic' | 'gemini';
  /** Base URL this profile is for (optional; empty = the provider default). */
  baseUrl?: string;
  model?: string;
  createdAt: number;
  updatedAt: number;
  /** Never the key itself — only whether one is set. */
  hasKey: boolean;
}

export const AUTH_AUDIT = 'auth-audit.log';

function file(): string {
  return path.join(stateDir(), 'auth-profiles.json');
}

interface StoredProfile extends Omit<AuthProfile, 'hasKey'> {
  key: string;
}

function load(): StoredProfile[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8')) as StoredProfile[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: StoredProfile[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(list, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(file(), 0o600);
  } catch {
    /* best effort on exotic filesystems */
  }
}

function audit(line: string): void {
  try {
    fs.appendFileSync(path.join(stateDir(), AUTH_AUDIT), `${new Date().toISOString()} ${line}\n`, 'utf8');
  } catch {
    /* audit is best-effort */
  }
}

/** Public view: metadata only, never a key. */
export function listAuthProfiles(): AuthProfile[] {
  return load().map(({ key, ...rest }) => ({ ...rest, hasKey: Boolean(key) }));
}

export function getAuthProfile(id: string): AuthProfile | undefined {
  return listAuthProfiles().find((p) => p.id === id);
}

export function setAuthProfile(input: {
  id: string;
  provider: AuthProfile['provider'];
  key: string;
  baseUrl?: string;
  model?: string;
}): AuthProfile {
  const id = input.id.trim();
  if (!id) throw new Error('profile name is empty');
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) throw new Error('profile name must be letters, digits, dot, dash or underscore');
  if (!input.key.trim()) throw new Error('key is empty');
  const list = load();
  const existing = list.find((p) => p.id === id);
  const now = Date.now();
  if (existing) {
    existing.provider = input.provider;
    existing.key = input.key;
    if (input.baseUrl !== undefined) existing.baseUrl = input.baseUrl;
    if (input.model !== undefined) existing.model = input.model;
    existing.updatedAt = now;
  } else {
    list.push({
      id,
      provider: input.provider,
      key: input.key,
      ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
      ...(input.model ? { model: input.model } : {}),
      createdAt: now,
      updatedAt: now,
    });
  }
  save(list);
  audit(`set ${id} (${input.provider})`);
  return { ...getAuthProfile(id)! };
}

export function removeAuthProfile(id: string): boolean {
  const list = load();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  save(next);
  audit(`remove ${id}`);
  return true;
}

/** The key for a profile, or null. This is the only reader of stored keys. */
export function authProfileKey(id: string): string | null {
  const found = load().find((p) => p.id === id);
  if (!found) return null;
  audit(`use ${id} (${found.provider})`);
  return found.key;
}

/**
 * Fill in `apiKey` (and any baseUrl/model the profile carries) from a profile
 * name. A config with no profile passes through untouched, so nothing existing
 * changes behaviour.
 */
export function resolveAuth(cfg: ProviderCfg): ProviderCfg {
  const id = cfg.authProfile?.trim();
  if (!id) return cfg;
  const profile = load().find((p) => p.id === id);
  if (!profile) {
    throw new Error(`auth profile "${id}" not found — add it: termcrab auth add ${id} --provider ${cfg.type === 'mock' ? 'openai' : cfg.type} --key <key>`);
  }
  if (profile.provider !== cfg.type && cfg.type !== 'openai') {
    // A profile written for another vendor is a config mistake, not a fallback.
    throw new Error(`auth profile "${id}" is for ${profile.provider}, but the provider is ${cfg.type}`);
  }
  return {
    ...cfg,
    apiKey: cfg.apiKey || profile.key,
    ...(cfg.baseUrl ? {} : profile.baseUrl ? { baseUrl: profile.baseUrl } : {}),
    ...(cfg.model ? {} : profile.model ? { model: profile.model } : {}),
  };
}
