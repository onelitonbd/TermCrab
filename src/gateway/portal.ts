import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/paths.js';

/** Portal: expose a local HTTP server through the gateway under /portal/<id>. */
export interface Portal {
  id: string;
  port: number;
  createdAt: number;
}

function file(): string {
  return path.join(stateDir(), 'portal.json');
}

function load(): Portal[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8')) as Portal[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: Portal[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(list, null, 2), 'utf8');
}

export function listPortals(): Portal[] {
  return load();
}

export function getPortal(id: string): Portal | null {
  return load().find((p) => p.id === id) ?? null;
}

export function addPortal(id: string, port: number): Portal {
  const trimmed = id.trim().toLowerCase();
  const clean = trimmed.replace(/[^a-z0-9-]/g, '');
  if (!clean || clean !== trimmed) throw new Error('portal id must be alphanumeric');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('port must be 1-65535');
  const list = load();
  const existing = list.find((p) => p.id === clean);
  if (existing) {
    existing.port = port;
    save(list);
    return existing;
  }
  const portal: Portal = { id: clean, port, createdAt: Date.now() };
  list.push(portal);
  save(list);
  return portal;
}

export function removePortal(id: string): boolean {
  const list = load();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  save(next);
  return true;
}
