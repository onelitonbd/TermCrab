import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { log } from '../core/logger.js';

/**
 * ClawHub-compatible skill registry.
 * Publish, search, and install skills from a remote registry.
 * Compatible with OpenClaw's ClawHub format.
 */

export interface RegistrySkill {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
  content?: string; // SKILL.md content (only in search results if requested)
}

export interface RegistryConfig {
  url: string;
  token?: string;
}

const DEFAULT_REGISTRY = 'https://clawhub.ai/api';

function registryUrl(cfg: RegistryConfig): string {
  return cfg.url || DEFAULT_REGISTRY;
}

function authHeaders(cfg: RegistryConfig): Record<string, string> {
  return cfg.token ? { authorization: `Bearer ${cfg.token}` } : {};
}

/**
 * Search for skills in the registry.
 */
export async function searchSkills(
  query: string,
  cfg: RegistryConfig = { url: DEFAULT_REGISTRY },
  fetchImpl: typeof fetch = fetch,
): Promise<RegistrySkill[]> {
  try {
    const url = `${registryUrl(cfg)}/skills/search?q=${encodeURIComponent(query)}`;
    const res = await fetchImpl(url, { headers: { accept: 'application/json', ...authHeaders(cfg) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { skills?: RegistrySkill[] };
    return data.skills ?? [];
  } catch (err) {
    log.warn('skill registry search failed:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Get a skill's full content from the registry.
 */
export async function getSkill(
  name: string,
  cfg: RegistryConfig = { url: DEFAULT_REGISTRY },
  fetchImpl: typeof fetch = fetch,
): Promise<RegistrySkill | null> {
  try {
    const url = `${registryUrl(cfg)}/skills/${encodeURIComponent(name)}`;
    const res = await fetchImpl(url, { headers: { accept: 'application/json', ...authHeaders(cfg) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as RegistrySkill;
  } catch (err) {
    log.warn('skill registry get failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Install a skill from the registry to the user's skills directory.
 */
export async function installSkill(
  name: string,
  cfg: RegistryConfig = { url: DEFAULT_REGISTRY },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  const skill = await getSkill(name, cfg, fetchImpl);
  if (!skill || !skill.content) {
    return { ok: false, error: `skill not found: ${name}` };
  }

  const destDir = path.join(userSkillsDir(), name);
  fs.mkdirSync(destDir, { recursive: true });
  const destFile = path.join(destDir, 'SKILL.md');
  fs.writeFileSync(destFile, skill.content, 'utf8');
  log.info(`skill installed: ${name} from registry`);
  return { ok: true };
}

/**
 * Publish a skill to the registry.
 */
export async function publishSkill(
  name: string,
  content: string,
  meta: { description: string; version?: string; author?: string; tags?: string[] },
  cfg: RegistryConfig = { url: DEFAULT_REGISTRY },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${registryUrl(cfg)}/skills`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        ...authHeaders(cfg),
      },
      body: JSON.stringify({
        name,
        description: meta.description,
        version: meta.version || '1.0.0',
        author: meta.author,
        tags: meta.tags,
        content,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${body}` };
    }
    log.info(`skill published: ${name}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * List all skills in the registry.
 */
export async function listRegistrySkills(
  cfg: RegistryConfig = { url: DEFAULT_REGISTRY },
  fetchImpl: typeof fetch = fetch,
): Promise<RegistrySkill[]> {
  try {
    const url = `${registryUrl(cfg)}/skills`;
    const res = await fetchImpl(url, { headers: { accept: 'application/json', ...authHeaders(cfg) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { skills?: RegistrySkill[] };
    return data.skills ?? [];
  } catch (err) {
    log.warn('skill registry list failed:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Generate a skill manifest for publishing.
 */
export function generateManifest(name: string, description: string, version = '1.0.0'): string {
  return JSON.stringify(
    {
      name,
      description,
      version,
      author: '',
      tags: [],
      content: '',
    },
    null,
    2,
  );
}

// --- Local helpers ---

function userSkillsDir(): string {
  return path.join(process.env.TCRAB_HOME || path.join(process.env.HOME || '/root', '.termcrab'), 'skills');
}

/**
 * Compute a skill hash for deduplication.
 */
export function skillHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}
