/**
 * Paired devices: a phone (or any client) proves it is allowed on this gateway
 * once, with a short code, and then carries its own token (20.1).
 *
 * The master `gateway.token` is the owner's password: long, shared, hard to
 * type on a phone, and impossible to take back from one device without
 * changing it for all of them. A paired device is the opposite: its own
 * secret, shown once, stored only as a hash, revocable alone, and stamped with
 * when it was last seen. The pairing code is short-lived (5 minutes), single
 * use, and typed once — no shared secret is ever pasted into a phone.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureLayout, stateDir } from '../core/paths.js';

export interface Device {
  id: string;
  name: string;
  /** sha256 of the device token — the token itself is never stored. */
  tokenHash: string;
  createdAt: number;
  lastSeenAt: number | null;
  lastSeenIp: string | null;
  seenCount: number;
}

interface StoredCode {
  code: string;
  createdAt: number;
  expiresAt: number;
  label: string | null;
}

interface Store {
  devices: Device[];
  codes: StoredCode[];
}

/** Codes live five minutes: long enough to walk to the phone, short enough to lose. */
export const CODE_TTL_MS = 5 * 60_000;
/** No 0/O/1/I — the code is read off a terminal and typed on a phone. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

export function devicesPath(): string {
  return path.join(stateDir(), 'devices.json');
}

function readStore(): Store {
  const file = devicesPath();
  if (!fs.existsSync(file)) return { devices: [], codes: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Store>;
    return {
      devices: Array.isArray(raw.devices) ? raw.devices : [],
      codes: Array.isArray(raw.codes) ? raw.codes : [],
    };
  } catch {
    // A corrupt file must not lock the owner out permanently: start clean,
    // keep the broken one for inspection.
    try {
      fs.renameSync(file, `${file}.corrupt`);
    } catch {
      /* ignore */
    }
    return { devices: [], codes: [] };
  }
}

function writeStore(store: Store): void {
  ensureLayout();
  const file = devicesPath();
  fs.writeFileSync(file, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* best effort */
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Normalise a code a human typed: uppercase, ignore spaces and dashes. */
export function normalizeCode(input: string | null | undefined): string {
  return String(input ?? '').trim().toUpperCase().replace(/[\s-]/g, '');
}

function freshCode(store: Store, now: number): string {
  const taken = new Set(store.codes.filter((c) => c.expiresAt > now).map((c) => c.code));
  for (;;) {
    let code = '';
    const bytes = crypto.randomBytes(CODE_LENGTH);
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    if (!taken.has(code)) return code;
  }
}

/**
 * Make a pairing code. Expired codes and stale expired rows are dropped as a
 * side effect, so the file cannot grow forever on a device nobody pairs.
 */
export function pairCode(opts: { now?: number; ttlMs?: number; label?: string } = {}): {
  code: string;
  expiresAt: number;
  ttlMs: number;
} {
  const now = opts.now ?? Date.now();
  const ttlMs = opts.ttlMs ?? CODE_TTL_MS;
  const store = readStore();
  store.codes = store.codes.filter((c) => c.expiresAt > now);
  const code = freshCode(store, now);
  const expiresAt = now + ttlMs;
  store.codes.push({ code, createdAt: now, expiresAt, label: opts.label ?? null });
  writeStore(store);
  return { code, expiresAt, ttlMs };
}

export interface PairedDevice {
  device: Device;
  /** Shown once, at redemption; only its hash is kept. */
  token: string;
}

export type RedeemResult =
  | { ok: true; device: Device; token: string }
  | { ok: false; reason: 'unknown' | 'expired' | 'empty' };

/** Burn a code and hand back a fresh device token. Single use, always. */
export function redeemCode(
  code: string,
  name: string,
  opts: { now?: number; ip?: string | null } = {},
): RedeemResult {
  const now = opts.now ?? Date.now();
  const wanted = normalizeCode(code);
  if (!wanted) return { ok: false, reason: 'empty' };
  const store = readStore();
  const idx = store.codes.findIndex((c) => c.code === wanted);
  if (idx === -1) {
    // Distinguish "this code was already used or never existed" from "you were
    // too slow" only when we can: an expired row is still on disk.
    const expired = store.codes.some((c) => c.code === wanted && c.expiresAt <= now);
    return { ok: false, reason: expired ? 'expired' : 'unknown' };
  }
  const found = store.codes[idx]!;
  // Codes are burned before the expiry check: a wrong-or-late attempt never
  // leaves a live code behind.
  store.codes.splice(idx, 1);
  const stillLive = found.expiresAt > now;
  if (!stillLive) {
    writeStore(store);
    return { ok: false, reason: 'expired' };
  }
  const token = `tc_dev_${crypto.randomBytes(24).toString('base64url')}`;
  const device: Device = {
    id: crypto.randomBytes(4).toString('hex'),
    name: (name || found.label || 'device').trim().slice(0, 40) || 'device',
    tokenHash: hashToken(token),
    createdAt: now,
    lastSeenAt: null,
    lastSeenIp: opts.ip ?? null,
    seenCount: 0,
  };
  store.devices.push(device);
  writeStore(store);
  return { ok: true, device, token };
}

/** Does this token belong to a paired device? Stamps the sighting when it does. */
export function verifyDeviceToken(
  token: string,
  opts: { now?: number; ip?: string | null } = {},
): Device | null {
  if (!token || !token.startsWith('tc_dev_')) return null;
  const now = opts.now ?? Date.now();
  const wanted = hashToken(token);
  const store = readStore();
  const idx = store.devices.findIndex((d) => d.tokenHash === wanted);
  if (idx === -1) return null;
  const device = store.devices[idx]!;
  device.lastSeenAt = now;
  device.seenCount = (device.seenCount ?? 0) + 1;
  if (opts.ip) device.lastSeenIp = opts.ip;
  store.codes = store.codes.filter((c) => c.expiresAt > now);
  writeStore(store);
  return device;
}

export interface DeviceView extends Device {
  /** Milliseconds since the last sighting, or null when never seen. */
  seenAgoMs: number | null;
  /** True for the row that matches a presented token (used by /api/devices/whoami). */
  current?: boolean;
}

export function listDevices(opts: { now?: number } = {}): DeviceView[] {
  const now = opts.now ?? Date.now();
  return readStore()
    .devices.slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((d) => ({
      ...d,
      seenAgoMs: d.lastSeenAt === null ? null : Math.max(0, now - d.lastSeenAt),
    }));
}

/** Revoke by id or by name. Returns the row that was removed, or null. */
export function revokeDevice(idOrName: string): Device | null {
  const wanted = (idOrName || '').trim();
  if (!wanted) return null;
  const store = readStore();
  const idx = store.devices.findIndex((d) => d.id === wanted || d.name === wanted);
  if (idx === -1) return null;
  const [gone] = store.devices.splice(idx, 1);
  writeStore(store);
  return gone ?? null;
}

/** Live pairing codes (never the device tokens), for `termcrab devices --json`. */
export function liveCodes(opts: { now?: number } = {}): Array<{ code: string; expiresAt: number }> {
  const now = opts.now ?? Date.now();
  return readStore()
    .codes.filter((c) => c.expiresAt > now)
    .map((c) => ({ code: c.code, expiresAt: c.expiresAt }))
    .sort((a, b) => a.expiresAt - b.expiresAt);
}

export function formatDevice(d: DeviceView): string {
  const seen = d.seenAgoMs === null ? 'never seen' : `seen ${humanAgo(d.seenAgoMs)}`;
  return `${d.id}  ${d.name.padEnd(16)}  paired ${humanAgo(Date.now() - d.createdAt)} ago · ${seen} · ${d.seenCount ?? 0} request(s)`;
}

function humanAgo(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
