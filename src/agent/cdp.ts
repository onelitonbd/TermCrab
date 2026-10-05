/**
 * A real Chrome DevTools Protocol client (34.1).
 *
 * The `browser` tool used to be a stub: it guessed at HTTP endpoints CDP does
 * not have (`/json/navigate`, `/json/evaluate`), so on every machine it either
 * said "requires WebSocket CDP" or lied. This is the WebSocket half, written
 * against the protocol Chrome actually speaks:
 *
 *   GET  /json/version            → the browser name + its ws URL
 *   GET  /json/list               → the tabs, each with its own ws URL
 *   ws   Page.enable              → then Page.navigate, wait for Page.loadEventFired
 *   ws   Runtime.evaluate         → text, click, fill (by value, by reference)
 *   ws   Page.captureScreenshot   → a real PNG, written under workspace/browser/
 *
 * Two deliberate choices:
 *
 * - **No dependency.** Node 22+ ships a global `WebSocket`; on an older Node the
 *   tool says so in one sentence instead of failing obscurely. Playwright and a
 *   bundled Chromium are hundreds of megabytes — the opposite of what a phone
 *   install can carry — so the browser is *the one the owner already has*, and
 *   `termcrab browser status` explains how to start it with a debug port.
 * - **Testable without Chrome.** Every call goes through a `CdpTransport`, so
 *   the protocol logic is pinned by a fake — and by a real WebSocket round trip
 *   against a mini server in the test file — while a live Chrome is an optional
 *   extra that skips when it is not there.
 *
 * Read-only in spirit: it navigates, reads, clicks and fills. It does not type
 * passwords, does not run an OAuth consent flow, and does not persist cookies
 * of its own — those are the owner's profile, in the browser they started.
 */
import fs from 'node:fs';
import path from 'node:path';
import { workspaceDir } from '../core/paths.js';

export const CDP_PORT = Number(process.env.CDP_PORT || process.env.TCRAB_CDP_PORT || 9222);
export const CDP_HOST = process.env.CDP_HOST || '127.0.0.1';

/** How the browser is expected to be started, in one sentence. */
export function startHint(port = CDP_PORT): string {
  return (
    `no Chrome/Chromium found on ${CDP_HOST}:${port}. On a desktop start it with: ` +
    `google-chrome --remote-debugging-port=${port} (or chromium --remote-debugging-port=${port}); ` +
    `on Android, Chrome cannot be driven this way — use the browser on the machine running termcrab, ` +
    `or set CDP_HOST to that machine and forward the port (adb forward tcp:${port} tcp:${port}).`
  );
}

// ---------------------------------------------------------------------------
// Transport: the one seam. A real session is a WebSocket; tests inject their own.
// ---------------------------------------------------------------------------

export interface CdpTransport {
  /** Send one command and resolve with its result (or reject with the protocol error). */
  send(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
  /** Wait for a protocol event by name. */
  once(event: string, timeoutMs?: number): Promise<Record<string, unknown>>;
  close(): void;
  readonly url: string;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface Waiter {
  resolve: (params: Record<string, unknown>) => void;
  timer: NodeJS.Timeout;
}

/**
 * The WebSocket session. Frames are JSON: `{id, method, params}` out,
 * `{id, result|error}` and `{method, params}` (events) in.
 */
export class WebSocketCdpTransport implements CdpTransport {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly events = new Map<string, Waiter[]>();
  private closed = false;

  private constructor(
    private readonly ws: WebSocket,
    readonly url: string,
    private readonly defaultTimeoutMs = 10_000,
  ) {
    ws.addEventListener('message', (ev: MessageEvent) => this.onMessage(String((ev as { data: unknown }).data)));
    ws.addEventListener('close', () => this.failAll(new Error('the browser closed the connection')));
    ws.addEventListener('error', () => this.failAll(new Error('the browser connection failed')));
  }

  static async connect(url: string, timeoutMs = 5_000): Promise<WebSocketCdpTransport> {
    const WS = (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
    if (!WS) {
      throw new Error(
        'this Node has no WebSocket client — the browser tool needs Node 22 or newer (node --version), or update termcrab\'s runtime',
      );
    }
    const ws = new WS(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out connecting to ${url}`)), timeoutMs);
      ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error(`could not connect to ${url}`));
      });
    });
    return new WebSocketCdpTransport(ws, url);
  }

  private onMessage(raw: string): void {
    let msg: { id?: number; result?: unknown; error?: { message?: string }; method?: string; params?: Record<string, unknown> };
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return; // a frame we cannot read is not worth killing the session over
    }
    if (typeof msg.id === 'number') {
      const pending = this.pending.get(msg.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error.message ?? 'CDP error'));
      else pending.resolve(msg.result ?? {});
      return;
    }
    if (msg.method) {
      const waiters = this.events.get(msg.method);
      const waiter = waiters?.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(msg.params ?? {});
      }
    }
  }

  private failAll(err: Error): void {
    this.closed = true;
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
    for (const [, waiters] of this.events) {
      for (const w of waiters) {
        clearTimeout(w.timer);
        w.resolve({});
      }
    }
    this.events.clear();
  }

  send(method: string, params: Record<string, unknown> = {}, timeoutMs = this.defaultTimeoutMs): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('the browser connection is closed'));
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out after ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);
      timer.unref?.();
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  once(event: string, timeoutMs = this.defaultTimeoutMs): Promise<Record<string, unknown>> {
    return new Promise<Record<string, unknown>>((resolve) => {
      const timer = setTimeout(() => {
        const list = this.events.get(event);
        const i = list?.indexOf(waiter) ?? -1;
        if (list && i >= 0) list.splice(i, 1);
        resolve({}); // a load event that never comes is handled by the caller's deadline
      }, timeoutMs);
      timer.unref?.();
      const waiter: Waiter = { resolve, timer };
      const list = this.events.get(event) ?? [];
      list.push(waiter);
      this.events.set(event, list);
    });
  }

  close(): void {
    this.closed = true;
    try {
      this.ws.close();
    } catch {
      /* already gone */
    }
  }
}

// ---------------------------------------------------------------------------
// A tiny CDP client on top of the transport
// ---------------------------------------------------------------------------

export class CdpBrowser {
  private constructor(
    private readonly t: CdpTransport,
    readonly page: { title: string; url: string },
  ) {}

  /** Attach to the first page tab, or to the browser itself when there is none. */
  static async attach(opts: { host?: string; port?: number; transport?: CdpTransport } = {}): Promise<CdpBrowser> {
    const host = opts.host ?? CDP_HOST;
    const port = opts.port ?? CDP_PORT;
    if (opts.transport) return new CdpBrowser(opts.transport, { title: '(injected)', url: opts.transport.url });
    const targets = await listTargets(host, port);
    const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!page) throw new Error(startHint(port));
    const transport = await WebSocketCdpTransport.connect(page.webSocketDebuggerUrl!);
    return new CdpBrowser(transport, { title: page.title ?? '', url: page.url ?? '' });
  }

  async close(): Promise<void> {
    this.t.close();
  }

  /** The browser's own name/version (from the HTTP endpoint — no session needed). */
  static async version(opts: { host?: string; port?: number } = {}): Promise<string> {
    const res = await fetch(`http://${opts.host ?? CDP_HOST}:${opts.port ?? CDP_PORT}/json/version`, {
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) throw new Error(`the debug port answered HTTP ${res.status}`);
    const data = (await res.json()) as { Browser?: string };
    return data.Browser ?? 'unknown';
  }

  /** Navigate and wait for the load event (or give up at the deadline). */
  async navigate(url: string, timeoutMs = 20_000): Promise<{ url: string; loaded: boolean; title: string }> {
    await this.t.send('Page.enable', {}, 5_000);
    const loaded = this.t.once('Page.loadEventFired', Math.min(timeoutMs, 15_000));
    const started = Date.now();
    const res = (await this.t.send('Page.navigate', { url }, timeoutMs)) as { errorText?: string; frameId?: string };
    if (res?.errorText) throw new Error(`navigation failed: ${res.errorText}`);
    await loaded;
    // The event is not proof on its own (a cached page can fire before we look),
    // so ask the page where it is — and accept a late answer as "not yet loaded".
    const where = (await this.evaluate<{ href: string; title: string }>(
      '({ href: location.href, title: document.title })',
    )) as { href?: string; title?: string } | null;
    return {
      url: where?.href ?? url,
      loaded: Date.now() - started < timeoutMs,
      title: where?.title ?? '',
    };
  }

  /** Evaluate in the page and return the value (or throw the page's own error). */
  async evaluate<T = unknown>(expression: string, timeoutMs = 10_000): Promise<T> {
    const res = (await this.t.send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true, userGesture: true },
      timeoutMs,
    )) as { result?: { value?: unknown }; exceptionDetails?: { exception?: { description?: string }; text?: string } };
    if (res?.exceptionDetails) {
      throw new Error(
        `the page threw: ${res.exceptionDetails.exception?.description ?? res.exceptionDetails.text ?? 'unknown error'}`,
      );
    }
    return (res?.result?.value ?? null) as T;
  }

  async text(maxChars = 20_000): Promise<string> {
    const value = await this.evaluate<string>('document.body ? document.body.innerText : ""');
    return String(value ?? '').slice(0, maxChars);
  }

  /** Click the first element matching a CSS selector, or say it is not there. */
  async click(selector: string): Promise<string> {
    const expr = `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, error: 'no element matches ' + ${JSON.stringify(selector)} };
      el.scrollIntoView({ block: 'center' });
      el.click();
      return { ok: true, what: (el.tagName || '').toLowerCase() + (el.id ? '#' + el.id : '') + (el.textContent ? ': ' + el.textContent.trim().slice(0, 60) : '') };
    })()`;
    const r = (await this.evaluate<{ ok: boolean; error?: string; what?: string }>(expr)) as {
      ok: boolean;
      error?: string;
      what?: string;
    };
    if (!r?.ok) throw new Error(r?.error ?? `could not click ${selector}`);
    return r.what ?? selector;
  }

  /**
   * Fill an input by setting the value through the native setter and firing the
   * events a framework listens for, so React/Vue state actually updates.
   * `submit` presses Enter afterwards.
   */
  async fill(selector: string, text: string, submit = false): Promise<string> {
    const expr = `(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { ok: false, error: 'no element matches ' + ${JSON.stringify(selector)} };
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      el.focus();
      if (setter) setter.call(el, ${JSON.stringify(text)}); else el.value = ${JSON.stringify(text)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true, what: (el.tagName || '').toLowerCase() + (el.name ? '[name=' + el.name + ']' : '') };
    })()`;
    const r = (await this.evaluate<{ ok: boolean; error?: string; what?: string }>(expr)) as {
      ok: boolean;
      error?: string;
      what?: string;
    };
    if (!r?.ok) throw new Error(r?.error ?? `could not fill ${selector}`);
    if (submit) {
      // A real key event, because a form listening for Enter ignores a value set.
      await this.t.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
      await this.t.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Enter',
        code: 'Enter',
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
      });
    }
    return r.what ?? selector;
  }

  /** A real screenshot, saved where the panel and the agent can both find it. */
  async screenshot(width = 1280, height = 720): Promise<{ file: string; bytes: number; width: number; height: number }> {
    await this.t.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    }, 5_000);
    const shot = (await this.t.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, 15_000)) as {
      data?: string;
    };
    if (!shot?.data) throw new Error('the browser returned no image data');
    const dir = path.join(workspaceDir(), 'browser');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `shot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`);
    const buf = Buffer.from(shot.data, 'base64');
    fs.writeFileSync(file, buf);
    return { file, bytes: buf.length, width, height };
  }
}

// ---------------------------------------------------------------------------
// The HTTP discovery endpoints (no session needed — and the cheap status probe)
// ---------------------------------------------------------------------------

export interface CdpTarget {
  id?: string;
  type?: string;
  title?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
}

export async function listTargets(host = CDP_HOST, port = CDP_PORT, timeoutMs = 2_000): Promise<CdpTarget[]> {
  const res = await fetch(`http://${host}:${port}/json/list`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`the debug port answered HTTP ${res.status}`);
  const data = (await res.json()) as CdpTarget[];
  return Array.isArray(data) ? data : [];
}

export async function isCdpAvailable(host = CDP_HOST, port = CDP_PORT): Promise<boolean> {
  try {
    const res = await fetch(`http://${host}:${port}/json/version`, { signal: AbortSignal.timeout(2_000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** One line for `termcrab browser status` and the tool's `status` action. */
export async function browserStatus(host = CDP_HOST, port = CDP_PORT): Promise<{
  available: boolean;
  browser?: string;
  tabs: { title: string; url: string }[];
  hint?: string;
}> {
  if (!(await isCdpAvailable(host, port))) {
    return { available: false, tabs: [], hint: startHint(port) };
  }
  const browser = await CdpBrowser.version({ host, port }).catch(() => 'unknown');
  const targets = await listTargets(host, port).catch(() => []);
  return {
    available: true,
    browser,
    tabs: targets
      .filter((t) => t.type === 'page')
      .map((t) => ({ title: t.title ?? '', url: t.url ?? '' })),
  };
}
