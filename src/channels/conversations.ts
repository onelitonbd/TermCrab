import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/paths.js';

/** Registry of external conversations (telegram/whatsapp/...) the channels touch. */
export interface Conversation {
  channel: string;
  address: string;
  lastSeen: number;
  lastText?: string;
}

type Sender = (address: string, text: string) => Promise<void>;
type DocumentSender = (address: string, filePath: string, caption?: string) => Promise<void>;

const senders = new Map<string, Sender>();
const documentSenders = new Map<string, DocumentSender>();
const known = new Map<string, Conversation>();
const waiters: { key: string; resolve: (text: string) => void; timer: NodeJS.Timeout }[] = [];

function file(): string {
  return path.join(stateDir(), 'conversations.json');
}

function persist(): void {
  try {
    fs.mkdirSync(stateDir(), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify([...known.values()], null, 2), 'utf8');
  } catch {
    /* best effort */
  }
}

function hydrate(): void {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8')) as Conversation[];
    for (const c of Array.isArray(raw) ? raw : []) known.set(`${c.channel}:${c.address}`, c);
  } catch {
    /* first run */
  }
}
hydrate();

export function registerSender(channel: string, send: Sender): void {
  senders.set(channel, send);
}

/** Register how a channel sends a *file* (15.2). Channels without one refuse. */
export function registerDocumentSender(channel: string, send: DocumentSender): void {
  documentSenders.set(channel, send);
}

export function channelsWithDocuments(): string[] {
  return [...documentSenders.keys()];
}

export function listConversations(): Conversation[] {
  return [...known.values()].sort((a, b) => b.lastSeen - a.lastSeen);
}

export function recordInbound(channel: string, address: string, text: string): void {
  const key = `${channel}:${address}`;
  const conv = known.get(key) ?? { channel, address, lastSeen: 0 };
  conv.lastSeen = Date.now();
  conv.lastText = text.slice(0, 200);
  known.set(key, conv);
  persist();
  for (let i = waiters.length - 1; i >= 0; i--) {
    const w = waiters[i]!;
    if (w.key === key) {
      waiters.splice(i, 1);
      clearTimeout(w.timer);
      w.resolve(text);
    }
  }
}

export async function sendTo(channel: string, address: string, text: string): Promise<void> {
  const send = senders.get(channel);
  if (!send) {
    const available = [...senders.keys()].join(', ') || '(none configured)';
    throw new Error(`channel "${channel}" is not configured (available: ${available})`);
  }
  await send(address, text);
}

/**
 * Send a file to an external conversation. The address is optional: with none,
 * it goes to the most recently active conversation on that channel — which is
 * the chat the person is talking to right now.
 */
export async function sendDocumentTo(
  channel: string,
  address: string | undefined,
  filePath: string,
  caption?: string,
): Promise<{ channel: string; address: string }> {
  const send = documentSenders.get(channel);
  if (!send) {
    const available = channelsWithDocuments().join(', ') || '(none configured)';
    throw new Error(`channel "${channel}" cannot send files (channels that can: ${available})`);
  }
  let to = address;
  if (!to) {
    const recent = listConversations().find((c) => c.channel === channel);
    if (!recent) throw new Error(`no known conversation on ${channel} yet — send the bot a message first`);
    to = recent.address;
  }
  await send(to, filePath, caption);
  return { channel, address: to };
}

export function turn(
  channel: string,
  address: string,
  text: string,
  timeoutMs: number,
): { reply: Promise<string>; send: Promise<void> } {
  const key = `${channel}:${address}`;
  const reply = new Promise<string>((resolve) => {
    const timer = setTimeout(() => {
      const i = waiters.findIndex((w) => w.resolve === resolve);
      if (i >= 0) waiters.splice(i, 1);
      resolve('(no reply in time)');
    }, timeoutMs);
    waiters.push({ key, resolve, timer });
  });
  return { reply, send: sendTo(channel, address, text) };
}
