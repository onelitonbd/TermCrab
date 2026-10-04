/** Minimal Telegram Bot API client on global fetch - zero dependencies. */

/**
 * 48.1/51.5 — an inline button. `data` comes back as a callback_query; a
 * `webApp` opens a URL as a Telegram Web App (the panel inside Telegram), which
 * is a client-side action and never reaches the bot.
 */
export interface TelegramButton {
  text: string;
  data?: string;
  webApp?: string;
}

/** Turn our buttons into the Bot API's `inline_keyboard` shape. */
export function inlineKeyboard(buttons: TelegramButton[][]): Record<string, unknown>[][] {
  return buttons.map((row) =>
    row.map((b) => {
      const out: Record<string, unknown> = { text: b.text };
      if (b.data !== undefined) out.callback_data = b.data;
      if (b.webApp) out.web_app = { url: b.webApp };
      return out;
    }),
  );
}

export class TelegramApi {
  /**
   * `baseUrl` exists for two reasons: a self-hosted Bot API server, and the
   * smoke test (36.2), which points the *real* client at a local stub so the
   * request shapes can be asserted without a network. It defaults to
   * `TCRAB_TELEGRAM_API` and then to Telegram itself.
   */
  constructor(
    private readonly token: string,
    private readonly baseUrl: string = process.env.TCRAB_TELEGRAM_API || 'https://api.telegram.org',
  ) {
    if (!token) throw new Error('telegram token missing');
  }

  private url(method: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}/bot${this.token}/${method}`;
  }

  private async call<T>(method: string, payload: Record<string, unknown>, timeoutMs = 60_000): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(this.url(method), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
      if (!data.ok) throw new Error(`telegram ${method}: ${data.description || res.status}`);
      return data.result as T;
    } finally {
      clearTimeout(timer);
    }
  }

  getMe(): Promise<{ username?: string; first_name?: string; id?: number }> {
    return this.call('getMe', {});
  }

  getUpdates(offset: number, timeoutSec: number): Promise<import('./telegram.js').TelegramUpdate[]> {
    return this.call(
      'getUpdates',
      // 48.1 — button presses arrive as their own update type; without this
      // they are silently dropped by Telegram.
      { offset, timeout: timeoutSec, allowed_updates: ['message', 'callback_query'] },
      (timeoutSec + 15) * 1000,
    );
  }

  /**
   * 48.1 — the same call, with an optional inline keyboard. Buttons are how a
   * chat can answer a question safely (an approval, a confirm) instead of
   * making a person type a command that deletes something.
   */
  sendMessage(
    chatId: number,
    html: string,
    buttons?: TelegramButton[][],
  ): Promise<unknown> {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (buttons?.length) payload.reply_markup = { inline_keyboard: inlineKeyboard(buttons) };
    return this.call('sendMessage', payload, 20_000);
  }

  /** Acknowledge a button press, so the client stops its spinner. */
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<unknown> {
    return this.call(
      'answerCallbackQuery',
      { callback_query_id: callbackQueryId, ...(text ? { text: text.slice(0, 200) } : {}) },
      10_000,
    );
  }

  /**
   * Replace the buttons under a message (or drop them) once it has been
   * answered — a decided approval must not still look pressable.
   */
  editMessageReplyMarkup(chatId: number, messageId: number, buttons: TelegramButton[][] = []): Promise<unknown> {
    return this.call(
      'editMessageReplyMarkup',
      { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: inlineKeyboard(buttons) } },
      10_000,
    );
  }

  /**
   * 48.2 — teach Telegram the command menu, so typing `/` shows the list the
   * bot actually understands. Best-effort by design: an old Bot API server that
   * does not know the method must not stop this one from starting.
   */
  setMyCommands(commands: { command: string; description: string }[]): Promise<unknown> {
    return this.call('setMyCommands', { commands }, 10_000);
  }

  /** 51.1 — a spoken reply. OGG/Opus is what Telegram wants for a voice note. */
  async sendVoice(chatId: number, filename: string, bytes: Buffer, caption?: string): Promise<unknown> {
    const form = new FormData();
    form.set('chat_id', String(chatId));
    if (caption) form.set('caption', caption.slice(0, 1024));
    form.set('voice', new Blob([new Uint8Array(bytes)]), filename);
    const res = await fetch(this.url('sendVoice'), { method: 'POST', body: form });
    const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
    if (!data.ok) throw new Error(`telegram sendVoice: ${data.description || res.status}`);
    return data.result;
  }

  sendChatAction(chatId: number, action = 'typing'): Promise<unknown> {
    return this.call('sendChatAction', { chat_id: chatId, action }, 10_000);
  }

  /** Where a file lives on Telegram's servers (then `downloadFile` fetches it). */
  getFile(fileId: string): Promise<{ file_id: string; file_path?: string; file_size?: number }> {
    return this.call('getFile', { file_id: fileId }, 20_000);
  }

  /** The bytes themselves — a different host, so not `call()`. */
  async downloadFile(filePath: string, maxBytes = 20 * 1024 * 1024): Promise<Buffer> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/file/bot${this.token}/${filePath}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`telegram download failed: ${res.status}`);
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared && declared > maxBytes) throw new Error(`file is too large (${declared} bytes)`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error(`file is too large (${buf.byteLength} bytes)`);
    return buf;
  }

  /** Send a file (multipart) with an optional caption. 20 MB is Telegram's bot cap. */
  async sendDocument(chatId: number, filename: string, bytes: Buffer, caption?: string): Promise<unknown> {
    const form = new FormData();
    form.set('chat_id', String(chatId));
    if (caption) form.set('caption', caption.slice(0, 1024));
    form.set('document', new Blob([new Uint8Array(bytes)]), filename);
    const res = await fetch(this.url('sendDocument'), { method: 'POST', body: form });
    const data = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
    if (!data.ok) throw new Error(`telegram sendDocument: ${data.description || res.status}`);
    return data.result;
  }
}

/**
 * How every chat channel hands one inbound message to the agent: return the
 * text to send back, or an empty string to say nothing. Channels differ only in
 * transport (13.5), so they all share this shape.
 */
/** Every chat surface that can talk to the agent. */
export type ChannelName = 'telegram' | 'whatsapp' | 'discord' | 'slack' | 'signal' | 'sms' | 'matrix';

export type ChannelOnMessage = (
  userId: string | number,
  chatId: string | number,
  text: string,
  displayName: string,
) => Promise<string>;
