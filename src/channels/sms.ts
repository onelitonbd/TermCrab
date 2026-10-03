import { log } from '../core/logger.js';
import { bus } from '../gateway/events.js';
import { ChannelOnMessage } from './api.js';
import { outboxAck, outboxFail, outboxMarkSending, outboxPending, outboxPush } from '../mobile/outbox.js';

/**
 * SMS channel over Twilio (optional, needs an account — nothing bundled).
 * Off by default: set channels.sms.enabled = true.
 *
 * Twilio posts form-encoded messages to a webhook; `handleIncoming` turns one
 * of those into an agent turn and sends the answer back through the Twilio REST
 * API, returning the TwiML the webhook should reply with. The HTTP call is
 * injectable (`sendSms`), so the routing is testable without an account.
 */

export interface SmsCfg {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  allowedNumbers: string[];
}

export interface SmsWebhookBody {
  From?: string;
  To?: string;
  Body?: string;
  MessageSid?: string;
}

export interface SmsDeps {
  cfg: SmsCfg;
  onMessage: ChannelOnMessage;
  /** Test seam: defaults to the Twilio REST API. */
  sendSms?: (to: string, from: string, body: string) => Promise<void>;
  fetchImpl?: typeof fetch;
}

export class SmsChannel {
  private running = false;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly deps: SmsDeps) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
  }

  async start(): Promise<void> {
    const { cfg } = this.deps;
    if (!cfg.enabled || !cfg.accountSid) {
      log.warn('sms: not enabled or missing config — channel off');
      return;
    }
    // Twilio delivers by calling the gateway's webhook; nothing to open here.
    this.running = true;
    log.info('sms: channel ready (webhook: POST /api/sms/:token)');
  }

  /**
   * One inbound Twilio webhook. Returns the TwiML the webhook should answer
   * with (empty `<Response/>` when the message was ignored).
   */
  async handleIncoming(body: SmsWebhookBody): Promise<string> {
    const { cfg } = this.deps;
    const from = body.From ?? '';
    const text = body.Body ?? '';
    if (!from || !text.trim()) return '<Response/>';
    if (cfg.allowedNumbers.length > 0 && !cfg.allowedNumbers.includes(from)) {
      log.warn(`sms: rejected message from non-allowlisted number ${from}`);
      return '<Response/>';
    }

    bus.emit({ type: 'sms:message', from, text });
    let reply: string;
    try {
      reply = await this.deps.onMessage(from, from, text, from);
    } catch (err) {
      reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
    }
    if (!reply) return '<Response/>';
    await this.send(from, reply);
    // Twilio accepts an empty response for messages we send ourselves.
    return '<Response/>';
  }

  async send(to: string, text: string): Promise<void> {
    try {
      await this.rawSend(to, text);
    } catch (err) {
      outboxPush({ channel: 'sms', chatId: to, text, error: err instanceof Error ? err.message : String(err) });
      log.warn('sms send failed, queuing to outbox:', err instanceof Error ? err.message : err);
    }
  }

  private async rawSend(to: string, text: string): Promise<void> {
    if (this.deps.sendSms) {
      await this.deps.sendSms(to, this.deps.cfg.fromNumber, text);
      return;
    }
    const { accountSid, authToken, fromNumber } = this.deps.cfg;
    const res = await this.fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: text }).toString(),
    });
    if (!res.ok) throw new Error(`twilio send failed: ${res.status}`);
  }

  async flushOutbox(): Promise<number> {
    let sent = 0;
    for (const item of outboxPending('sms')) {
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
  }
}
