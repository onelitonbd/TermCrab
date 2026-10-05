/**
 * "Who can reach me right now?" (24.1)
 *
 * Presence in OpenClaw is a protocol feature: nodes announce themselves and
 * the gateway fans out online/typing events. We already keep the raw facts —
 * paired devices with a last-seen stamp, channels that are running or not,
 * conversations people actually wrote in, and the gateway's own count of
 * attached watchers (SSE clients: the panel, a phone, the CLI) — but nothing
 * put them in one place, so "is my phone still connected?" had no answer.
 *
 * This module derives one presence picture from those stores. It stores
 * nothing of its own: every entry is a fact someone else already owns, plus
 * one plain state and how long ago it was true. Freshness is stated, not
 * guessed: seen within `ONLINE_AFTER_MS` is online, within `RECENT_AFTER_MS`
 * is recent, older is idle, and never seen is unknown (a device can be paired
 * and simply not used yet — that is not an error).
 */
import { listDevices, type DeviceView } from './devices.js';
import { listConversations, type Conversation } from '../channels/conversations.js';

export type PresenceState = 'online' | 'recent' | 'idle' | 'unknown' | 'off';

export type PresenceKind = 'panel' | 'channel' | 'device' | 'person';

export interface PresenceEntry {
  kind: PresenceKind;
  /** Stable id for the surface (device id, channel name, `telegram:<chat>`). */
  id: string;
  label: string;
  state: PresenceState;
  lastSeenAt: number | null;
  seenAgoMs: number | null;
  /** One plain sentence: what this is and how fresh the knowledge is. */
  detail: string;
}

export interface PresenceChannelInput {
  name: string;
  /** Configured (token present / enabled) but maybe not running. */
  configured: boolean;
  running: boolean;
  detail?: string;
}

export interface PresenceInput {
  now?: number;
  /** Attached SSE clients in the gateway process (bus subscribers). */
  watchers?: number | null;
  channels?: PresenceChannelInput[];
  devices?: DeviceView[];
  conversations?: Conversation[];
  onlineAfterMs?: number;
  recentAfterMs?: number;
  /** How many people entries to include (newest first). Default 5. */
  peopleLimit?: number;
}

export interface Presence {
  now: number;
  /** null when the caller cannot know (CLI reading a panel that is down). */
  watchers: number | null;
  entries: PresenceEntry[];
  /** One line, safe for a chat /status reply or a panel header. */
  summary: string;
  onlineAfterMs: number;
  recentAfterMs: number;
}

export const ONLINE_AFTER_MS = 2 * 60_000;
export const RECENT_AFTER_MS = 60 * 60_000;

/** The freshness ladder, in one place so every surface says the same thing. */
export function presenceState(
  lastSeenAt: number | null,
  now: number,
  onlineAfterMs = ONLINE_AFTER_MS,
  recentAfterMs = RECENT_AFTER_MS,
): PresenceState {
  if (lastSeenAt === null || !Number.isFinite(lastSeenAt)) return 'unknown';
  const ago = Math.max(0, now - lastSeenAt);
  if (ago <= onlineAfterMs) return 'online';
  if (ago <= recentAfterMs) return 'recent';
  return 'idle';
}

function label(state: PresenceState): string {
  return state === 'off' ? 'not running' : state;
}

/** "3 minute(s)" — short, and never a raw number of milliseconds. */
export function humanAgo(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} second(s)`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute(s)`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} hour(s)` : `${Math.round(h / 24)} day(s)`;
}

function agoText(seenAgoMs: number | null): string {
  return seenAgoMs === null ? 'never seen' : `seen ${humanAgo(seenAgoMs)} ago`;
}

export function buildPresence(input: PresenceInput = {}): Presence {
  const now = input.now ?? Date.now();
  const onlineAfterMs = input.onlineAfterMs ?? ONLINE_AFTER_MS;
  const recentAfterMs = input.recentAfterMs ?? RECENT_AFTER_MS;
  const watchers = input.watchers ?? null;
  const entries: PresenceEntry[] = [];

  // The gateway itself: attached clients are the only truly live signal we
  // have — a device token is stamped on use, but a panel holding an SSE
  // connection is presence right now.
  if (watchers !== null) {
    entries.push({
      kind: 'panel',
      id: 'panel',
      label: watchers === 1 ? '1 watcher' : `${watchers} watchers`,
      state: watchers > 0 ? 'online' : 'idle',
      lastSeenAt: watchers > 0 ? now : null,
      seenAgoMs: watchers > 0 ? 0 : null,
      detail:
        watchers > 0
          ? `${watchers} client(s) attached to the gateway (panel, phone or CLI)`
          : 'nobody is attached to the gateway right now',
    });
  }

  for (const ch of input.channels ?? []) {
    // A transport nobody configured is not presence, and listing seven dead
    // channels would bury the live ones.
    if (!ch.configured && !ch.running) continue;
    entries.push({
      kind: 'channel',
      id: ch.name,
      label: ch.name,
      state: ch.running ? 'online' : ch.configured ? 'off' : 'unknown',
      lastSeenAt: ch.running ? now : null,
      seenAgoMs: ch.running ? 0 : null,
      detail:
        ch.detail ??
        (ch.running
          ? 'running — messages sent here will be answered'
          : ch.configured
            ? 'configured but not running (check the logs, then: termcrab doctor)'
            : 'not configured'),
    });
  }

  for (const d of input.devices ?? []) {
    const state = presenceState(d.lastSeenAt, now, onlineAfterMs, recentAfterMs);
    const seenAgoMs = d.lastSeenAt === null ? null : Math.max(0, now - d.lastSeenAt);
    entries.push({
      kind: 'device',
      id: d.id,
      label: d.name,
      state,
      lastSeenAt: d.lastSeenAt,
      seenAgoMs,
      detail: `${agoText(seenAgoMs)} · ${d.seenCount ?? 0} request(s)${d.lastSeenIp ? ` · ${d.lastSeenIp}` : ''}`,
    });
  }

  // People, not transports: who actually wrote recently. This is what "is
  // anyone there?" means to a human, and it survives a channel restart.
  const people = (input.conversations ?? [])
    .slice()
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, input.peopleLimit ?? 5);
  for (const c of people) {
    const seenAgoMs = Math.max(0, now - c.lastSeen);
    entries.push({
      kind: 'person',
      id: `${c.channel}:${c.address}`,
      label: `${c.channel}:${c.address}`,
      state: presenceState(c.lastSeen, now, onlineAfterMs, recentAfterMs),
      lastSeenAt: c.lastSeen,
      seenAgoMs,
      detail: `${agoText(seenAgoMs)}${c.lastText ? ` · "${c.lastText.slice(0, 60)}"` : ''}`,
    });
  }

  return { now, watchers, entries, summary: '', onlineAfterMs, recentAfterMs };
}

/** The one-line version: what is here, and what is quiet. */
export function presenceLine(p: Presence): string {
  const online = p.entries.filter((e) => e.state === 'online');
  const bits: string[] = [];
  const watchers = p.entries.find((e) => e.kind === 'panel');
  if (watchers) {
    bits.push(watchers.state === 'online' ? watchers.label : 'no watchers');
  }
  for (const e of p.entries.filter((x) => x.kind === 'channel')) {
    bits.push(e.state === 'online' ? `${e.label} running` : `${e.label} ${label(e.state)}`);
  }
  const devices = p.entries.filter((e) => e.kind === 'device');
  const devicesOnline = devices.filter((e) => e.state === 'online').length;
  if (devices.length) bits.push(`${devices.length} device(s), ${devicesOnline} online`);
  const recent = p.entries.filter((e) => e.kind === 'person' && (e.state === 'online' || e.state === 'recent')).length;
  bits.push(recent ? `${recent} person(s) recently` : 'nobody wrote recently');
  const head = online.length ? '👀 here:' : '👀 quiet:';
  return `${head} ${bits.join(' · ')}`;
}

/** The multi-line view `termcrab presence` prints. */
export function formatPresence(p: Presence): string {
  if (!p.entries.length) return '  ⚪ nothing to report — no devices, channels or conversations yet.';
  const icon = (s: PresenceState): string =>
    s === 'online' ? '🟢' : s === 'recent' ? '🟡' : s === 'off' ? '🔴' : s === 'idle' ? '⚪' : '⚫';
  const lines: string[] = [];
  const kindTitle: Record<PresenceKind, string> = {
    panel: 'watching',
    channel: 'channels',
    device: 'devices',
    person: 'people',
  };
  for (const kind of ['panel', 'channel', 'device', 'person'] as PresenceKind[]) {
    const group = p.entries.filter((e) => e.kind === kind);
    if (!group.length) continue;
    lines.push(`  ${kindTitle[kind]}`);
    for (const e of group) {
      lines.push(`    ${icon(e.state)} ${e.label.padEnd(20)} ${e.state.padEnd(8)} ${e.detail}`);
    }
  }
  return lines.join('\n');
}

/**
 * The local, no-gateway view: devices and conversations come from disk, so
 * they are real; the watcher count cannot be known from here and is passed as
 * null rather than faked as zero. `configuredChannels` lets a caller that does
 * hold the config (the CLI, the gateway) still show the channel rows.
 */
export function localPresence(
  opts: { now?: number; configuredChannels?: PresenceChannelInput[]; watchers?: number | null; peopleLimit?: number } = {},
): Presence {
  return buildPresence({
    now: opts.now,
    watchers: opts.watchers ?? null,
    channels: opts.configuredChannels ?? [],
    devices: listDevices({ now: opts.now }),
    conversations: listConversations(),
    peopleLimit: opts.peopleLimit,
  });
}

/** Fill in the summary on a picture built by this module (kept derivable). */
export function withSummary(p: Presence): Presence {
  return { ...p, summary: presenceLine(p) };
}
