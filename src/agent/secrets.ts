import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/paths.js';

/** Protected credentials: values are only returned on explicit request (audited). */
export interface SecretMeta {
  name: string;
  createdAt: number;
  updatedAt: number;
}
interface SecretEntry extends SecretMeta {
  value: string;
}

function file(): string {
  return path.join(stateDir(), 'secrets.json');
}

function load(): SecretEntry[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8')) as SecretEntry[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: SecretEntry[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(list, null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    fs.chmodSync(file(), 0o600);
  } catch {
    /* best effort on exotic fs */
  }
}

function audit(line: string): void {
  try {
    fs.appendFileSync(path.join(stateDir(), 'secrets-audit.log'), `${new Date().toISOString()} ${line}\n`, 'utf8');
  } catch {
    /* audit is best-effort */
  }
}

export function listSecrets(): SecretMeta[] {
  return load().map(({ name, createdAt, updatedAt }) => ({ name, createdAt, updatedAt }));
}

export function setSecret(name: string, value: string): SecretMeta {
  const n = name.trim();
  if (!n) throw new Error('secret name is empty');
  const list = load();
  const existing = list.find((s) => s.name === n);
  if (existing) {
    existing.value = value;
    existing.updatedAt = Date.now();
    save(list);
    audit(`set ${n}`);
    return { name: n, createdAt: existing.createdAt, updatedAt: existing.updatedAt };
  }
  const entry: SecretEntry = { name: n, value, createdAt: Date.now(), updatedAt: Date.now() };
  list.push(entry);
  save(list);
  audit(`set ${n}`);
  return { name: n, createdAt: entry.createdAt, updatedAt: entry.updatedAt };
}

export function requestSecret(name: string): string | null {
  const entry = load().find((s) => s.name === name);
  if (!entry) return null;
  audit(`request ${name}`);
  return entry.value;
}

export function deleteSecret(name: string): boolean {
  const list = load();
  const next = list.filter((s) => s.name !== name);
  if (next.length === list.length) return false;
  save(next);
  audit(`delete ${name}`);
  return true;
}
