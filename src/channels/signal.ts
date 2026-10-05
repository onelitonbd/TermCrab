import { log } from '../core/logger.js';
import { spawn, ChildProcess } from 'node:child_process';
import readline from 'node:readline';
import { bus } from '../gateway/events.js';
import { ChannelOnMessage } from './api.js';
import { outboxAck, outboxFail, outboxMarkSending, outboxPending, outboxPush } from '../mobile/outbox.js';

/**
 * Signal channel (optional, requires signal-cli — no bundled dependency).
 * Off by default: set channels.signal.enabled = true.
 *
 * signal-cli runs as a daemon and prints one JSON envelope per line; this
 * adapter parses those lines, routes the text to the agent and sends the answer
 * back with `signal-cli send`. Both the process (`spawn`) and the sender
 * (`sendText`) are injectable, so the parsing and routing are testable without
 * signal-cli or a phone number.
 */

export interface SignalCfg {
  enabled: boolean;
  phoneNumber: string;
  allowedNumbers: string[];
}

/** The part of a signal-cli `--json` envelope this adapter needs. */
export interface SignalEnvelope {
  envelope?: {
    source?: string;
    sourceNumber?: string;
    sourceName?: string;
    dataMessage?: { message?: string; timestamp?: number };
  };
}

export interface SignalDeps {
  cfg: SignalCfg;
  onMessage: ChannelOnMessage;
  spawn?: typeof spawn;
  sendText?: (to: string, text: string) => Promise<void>;
}

/** Pull the text out of one signal-cli line. Returns null for anything else. */
export function parseSignalLine(line: string): { from: string; name: string; text: string } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) return null;
  let parsed: SignalEnvelope;
  try {
    parsed = JSON.parse(trimmed) as SignalEnvelope;
  } catch {
    return null;
  }
  const env = parsed.envelope;
  const from = env?.source ?? env?.sourceNumber;
  const text = env?.dataMessage?.message;
  if (!from || !text) return null;
  return { from, name: env?.sourceName || from, text };
}

export class SignalChannel {
  private running = false;
  private child: ChildProcess | null = null;
  private readonly spawnFn: typeof spawn;

  constructor(private readonly deps: SignalDeps) {
    this.spawnFn = deps.spawn ?? spawn;
  }

  async start(): Promise<void> {
    const { cfg } = this.deps;
    if (!cfg.enabled || !cfg.phoneNumber) {
      log.warn('signal: not enabled or no phone number — channel off');
      return;
    }
    try {
      const child = this.spawnFn('signal-cli', ['-u', cfg.phoneNumber, 'daemon', '--json'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      this.child = child;
      if (child.stdout) {
        const rl = readline.createInterface({ input: child.stdout });
        rl.on('line', (line) => {
          const msg = parseSignalLine(line);
          if (!msg) return;
          void this.handleMessage(msg.from, msg.name, msg.text).catch((err) =>
            log.warn('signal: handler failed:', err instanceof Error ? err.message : err),
          );
        });
      }
      child.on?.('exit', (code) => {
        this.running = false;
        if (code) log.warn(`signal: signal-cli exited with code ${code}`);
      });
      this.running = true;
      log.info('signal: channel started');
    } catch (err) {
      log.warn('signal: failed to start:', err instanceof Error ? err.message : String(err));
    }
  }

  /** Returns the reply it sent, or null when the message was ignored. */
  async handleMessage(from: string, name: string, text: string): Promise<string | null> {
    const { cfg } = this.deps;
    if (cfg.allowedNumbers.length > 0 && !cfg.allowedNumbers.includes(from)) {
      log.warn(`signal: rejected message from non-allowlisted number ${from}`);
      return null;
    }
    bus.emit({ type: 'signal:message', from, text });
    let reply: string;
    try {
      reply = await this.deps.onMessage(from, from, text, name);
    } catch (err) {
      reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
    }
    if (reply) await this.send(from, reply);
    return reply || null;
  }

  async send(to: string, text: string): Promise<void> {
    try {
      await this.rawSend(to, text);
    } catch (err) {
      outboxPush({ channel: 'signal', chatId: to, text, error: err instanceof Error ? err.message : String(err) });
      log.warn('signal send failed, queuing to outbox:', err instanceof Error ? err.message : err);
    }
  }

  private async rawSend(to: string, text: string): Promise<void> {
    if (this.deps.sendText) {
      await this.deps.sendText(to, text);
      return;
    }
    const cfg = this.deps.cfg;
    await new Promise<void>((resolve, reject) => {
      const child = this.spawnFn('signal-cli', ['-u', cfg.phoneNumber, 'send', '-m', text, to], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`signal-cli send exited with ${code}`))));
    });
  }

  async flushOutbox(): Promise<number> {
    let sent = 0;
    for (const item of outboxPending('signal')) {
      outboxMarkSending(item.id);
      try {
        await this.rawSend(String(item.chatId), item.text);
        outboxAck(item.id);
        sent++;
      } catch (err) {
        outboxFail(item.id, err instanceof Error ? err.message : String(err));
      }
    }
    return sent;
  }

  stop(): void {
    this.running = false;
    try {
      this.child?.kill();
    } catch {
      /* already gone */
    }
  }
}
