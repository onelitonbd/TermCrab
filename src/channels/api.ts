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
}
