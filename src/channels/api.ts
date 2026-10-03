/** Minimal Telegram Bot API client on global fetch - zero dependencies. */

export class TelegramApi {
  constructor(private readonly token: string) {
    if (!token) throw new Error('telegram token missing');
  }

  private url(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`;
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
      { offset, timeout: timeoutSec, allowed_updates: ['message'] },
      (timeoutSec + 15) * 1000,
    );
  }

  sendMessage(chatId: number, html: string): Promise<unknown> {
    return this.call('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true }, 20_000);
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
    const url = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
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
