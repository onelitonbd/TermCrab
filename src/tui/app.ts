/**
 * The full-screen terminal: the alternate screen, raw keys, live turns and the
 * attach stream (batch 29).
 *
 * `termcrab tui` is the third surface done properly: a real screen
 * (alternate buffer, restored on every exit path), a transcript that grows
 * while a turn runs, one-line tool cards, a status bar that names the session
 * and the provider — and, when a gateway is running, an attach stream to the
 * same conversation, so a message typed on the phone appears while you watch.
 *
 * Read this file top-down: `runTui` owns the terminal and the loop; everything
 * that can be checked without a terminal lives in `frame.ts`/`text.ts`/`keys.ts`
 * and is pinned by tests.
 */
import fs from 'node:fs';
import { Config } from '../core/config.js';
import { AgentCtx, providerLabel, runTurn } from '../agent/loop.js';
import { rollingSessionKey } from '../agent/rolling.js';
import { Block, cursorAt, emptyState, frameToAnsi, renderFrame, TuiState } from './frame.js';
import { Decoded, decodeKeys, Key } from './keys.js';
import { stripAnsi } from './text.js';

export interface TuiStreams {
  input: NodeJS.ReadStream | fs.ReadStream;
  output: NodeJS.WriteStream | fs.WriteStream;
}

export interface TuiOpts {
  ctx: AgentCtx;
  /** Where to start. Defaults to the rolling main session. */
  sessionId?: string;
  /** Named agent profile, as in `termcrab agent --as`. */
  agent?: string;
  streams?: TuiStreams;
  /** Called after every frame — used by tests, and by `--frames <file>`. */
  onFrame?: (lines: string[]) => void;
  /** Attach to a running gateway, so turns from other surfaces show up. */
  attach?: { url: string; token?: string };
  version?: string;
}

export interface TuiHandle {
  /** Resolves when the user leaves the screen. */
  done: Promise<{ reason: 'quit' | 'eof' | 'error'; error?: string }>;
  /** Test seam: type into the input box and press Enter. */
  type(text: string): void;
  press(key: Key): void;
  stop(): void;
}

const ESC = {
  altScreenOn: '\x1b[?1049h',
  altScreenOff: '\x1b[?1049l',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  clear: '\x1b[2J',
  home: '\x1b[H',
  bracketedPasteOn: '\x1b[?2004h',
  bracketedPasteOff: '\x1b[?2004l',
};

/** Terminal commands worth keeping as data, so tests can assert on them. */
export const TTY_SEQUENCES = ESC;

function sizeOf(output: { columns?: number; rows?: number }): { rows: number; cols: number } {
  return { rows: output.rows || 24, cols: output.columns || 80 };
}

/**
 * Run the screen. Returns immediately with a handle; the caller awaits `done`.
 * Everything that touches the terminal goes through `write`, and every exit
 * path (quit, Ctrl-C, EOF, a thrown turn) restores the screen.
 */
export function runTui(opts: TuiOpts): TuiHandle {
  const input = (opts.streams?.input ?? process.stdin) as NodeJS.ReadStream;
  const output = (opts.streams?.output ?? process.stdout) as NodeJS.WriteStream;
  const config: Config = opts.ctx.config;
  const sessionId =
    opts.sessionId ??
    rollingSessionKey(config, { fallback: 'terminal:main', channel: 'terminal', chatId: 'main' });

  const state = emptyState({
    title: `TermCrab${opts.version ? ` ${opts.version}` : ''}`,
    provider: providerLabel(config),
    session: sessionId,
    status:
      config.agent.rollingSession !== false && sessionId === (config.agent.mainSession || 'main')
        ? 'main session · shared with the panel and your Telegram DM · /help for keys'
        : '/help for keys · /new to start over · Ctrl-C to leave',
  });

  let queue: string[] = [];
  let rest = '';
  let stopped = false;
  let finished = false;
  let pending: Promise<unknown> | null = null;
  const history: string[] = [];
  let historyAt = -1;

  let resolveDone: (v: { reason: 'quit' | 'eof' | 'error'; error?: string }) => void = () => undefined;
  const done = new Promise<{ reason: 'quit' | 'eof' | 'error'; error?: string }>((r) => {
    resolveDone = r;
  });

  const write = (text: string): void => {
    try {
      output.write(text);
    } catch {
      /* a closed pipe is not an error worth a stack trace */
    }
  };

  const frame = (): void => {
    const size = sizeOf(output as unknown as { columns?: number; rows?: number });
    const lines = renderFrame(state, size);
    const box = cursorAt(state, size);
    write(`${ESC.hideCursor}${frameToAnsi(lines)}\x1b[${box.row + 1};${box.col + 1}H${ESC.showCursor}`);
    opts.onFrame?.(lines);
  };

  const say = (kind: Block['kind'], text: string, extra: Partial<Block> = {}): void => {
    state.blocks.push({ kind, text, ...extra });
    state.scroll = 0;
  };

  const status = (text: string): void => {
    state.status = text;
    state.error = null;
  };

  const finish = (reason: 'quit' | 'eof' | 'error', error?: string): void => {
    if (finished) return;
    finished = true;
    stopped = true;
    cleanup();
    write(`${ESC.showCursor}${ESC.bracketedPasteOff}${ESC.altScreenOff}`);
    resolveDone({ reason, error });
  };

  const cleanup = (): void => {
    try {
      if (input.isTTY && typeof input.setRawMode === 'function') input.setRawMode(false);
    } catch {
      /* already gone */
    }
    // A resumed stdin keeps the event loop alive after the screen is gone, so
    // the process would hang around after Ctrl-C with nothing to do.
    try {
      input.pause();
    } catch {
      /* fine */
    }
    input.removeListener('data', onData);
    input.removeListener('end', onEnd);
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    output.removeListener('resize', onResize);
    abort?.abort();
  };

  const onSignal = (): void => {
    if (pending) {
      // First Ctrl-C stops the turn; a second leaves the screen.
      abort?.abort();
      say('note', '[stopped] you interrupted the turn');
      return;
    }
    finish('quit');
  };
  const onResize = (): void => {
    state.scroll = 0;
    frame();
  };
  const onEnd = (): void => finish('eof');
  let abort: AbortController | null = null;

  // --- one turn, run in this process (the CLI's own lane), streamed in ------
  const submit = async (text: string): Promise<void> => {
    say('user', text);
    state.running = text;
    frame();
    abort = new AbortController();
    const stream: { block: Block | null } = { block: null };
    const tools = new Map<string, Block>();
    const started = Date.now();
    try {
      await runTurn(opts.ctx, {
        sessionId,
        userMessage: text,
        channel: 'terminal',
        agent: opts.agent,
        signal: abort.signal,
        onEvent: (ev) => {
          if (ev.type === 'delta') {
            if (!stream.block) {
              stream.block = { kind: 'assistant', text: '' };
              state.blocks.push(stream.block);
            }
            stream.block.text += ev.text;
          } else if (ev.type === 'thinking:delta') {
            const last = state.blocks[state.blocks.length - 1];
            if (last?.kind === 'thinking') last.text += ev.text;
            else state.blocks.push({ kind: 'thinking', text: ev.text });
          } else if (ev.type === 'tool:start') {
            const block: Block = { kind: 'tool', text: `${ev.name} …`, running: true };
            tools.set(ev.toolCallId ?? ev.name, block);
            state.blocks.push(block);
            // A tool card is one line: the arguments are in the detail pane,
            // not splattered across the transcript.
            const args = Object.entries(ev.args ?? {})
              .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
              .map(([k, v]) => `${k}=${String(v).slice(0, 40)}`)
              .slice(0, 3)
              .join(' ');
            if (args) block.text = `${ev.name} ${stripAnsi(args)}`;
          } else if (ev.type === 'tool:end') {
            const block = tools.get(ev.toolCallId ?? ev.name);
            if (block) {
              block.running = false;
              block.text = `${ev.name} ${ev.ok ? '✓' : '✗'}${/^\s*$/.test(ev.preview ?? '') ? '' : ` ${stripAnsi(ev.preview).split('\n')[0]!.slice(0, 60)}`}`;
            }
          } else if (ev.type === 'error') {
            state.error = ev.message;
          }
          state.scroll = 0;
          frame();
        },
      });
      if (stream.block && !stream.block.text) stream.block.text = '(no answer)';
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
      say('error', state.error);
    } finally {
      state.running = null;
      abort = null;
      pending = null;
      status(`${(Date.now() - started) / 1000 < 0.05 ? '' : `${Math.round((Date.now() - started) / 1000)}s · `}${state.blocks.filter((b) => b.kind === 'tool').length} tool call(s) this screen`);
      frame();
    }
  };

  // --- the picker ----------------------------------------------------------
  const openSessions = (): void => {
    const rows = opts.ctx.sessions.list().map((s) => ({
      id: s.id,
      label: s.id,
      detail: `${s.messages} msg · ${new Date(s.modified * 1000).toISOString().slice(0, 16).replace('T', ' ')}`,
      current: s.id === state.session,
    }));
    if (!rows.some((r) => r.id === sessionId)) {
      rows.unshift({ id: sessionId, label: sessionId, detail: 'current', current: true });
    }
    const index = Math.max(0, rows.findIndex((r) => r.id === state.session));
    state.picker = { title: `${rows.length} conversation(s) — Enter opens, Esc closes`, rows, index };
    frame();
  };

  const pick = (): void => {
    const picker = state.picker;
    if (!picker) return;
    const row = picker.rows[picker.index];
    state.picker = null;
    if (row) {
      state.session = row.id;
      state.blocks = [];
      say('note', `opened ${row.id} — the transcript below is new; /history shows the file`);
    }
    frame();
  };

  // --- one key -------------------------------------------------------------
  const press = (key: Key): void => {
    if (state.picker) {
      const picker = state.picker;
      if (key.name === 'up' || key.name === 'pageup') {
        picker.index = (picker.index - 1 + picker.rows.length) % picker.rows.length;
      } else if (key.name === 'down' || key.name === 'pagedown') {
        picker.index = (picker.index + 1) % picker.rows.length;
      } else if (key.name === 'enter') {
        pick();
        return;
      } else if (key.name === 'escape') {
        state.picker = null;
      }
      frame();
      return;
    }

    state.error = null;

    if (key.name === 'ctrl') {
      if (key.letter === 'c') {
        onSignal();
        if (finished) return;
        frame();
        return;
      }
      if (key.letter === 'd') {
        if (!state.input) {
          finish('quit');
          return;
        }
        // Delete-under-cursor, like a shell.
        const chars = [...state.input];
        chars.splice(state.cursor, 1);
        state.input = chars.join('');
        frame();
        return;
      }
      if (key.letter === 'l') {
        state.blocks = [];
        frame();
        return;
      }
      if (key.letter === 'a') {
        state.cursor = 0;
        frame();
        return;
      }
      if (key.letter === 'e') {
        state.cursor = [...state.input].length;
        frame();
        return;
      }
      if (key.letter === 'u') {
        state.input = state.input.slice(state.cursor);
        state.cursor = 0;
        frame();
        return;
      }
      if (key.letter === 'k') {
        state.input = state.input.slice(0, state.cursor);
        frame();
        return;
      }
      return;
    }

    if (key.name === 'enter') {
      const text = state.input.trim();
      state.input = '';
      state.cursor = 0;
      if (!text) {
        frame();
        return;
      }
      history.push(text);
      historyAt = -1;
      if (text.startsWith('/')) {
        runCommand(text);
        return;
      }
      if (pending) {
        say('note', '[busy] a turn is already running here — Enter again queues nothing; wait or Ctrl-C');
        frame();
        return;
      }
      pending = submit(text);
      return;
    }

    if (key.name === 'backspace') {
      const chars = [...state.input];
      if (state.cursor > 0) {
        chars.splice(state.cursor - 1, 1);
        state.cursor -= 1;
        state.input = chars.join('');
      }
      frame();
      return;
    }
    if (key.name === 'delete') {
      const chars = [...state.input];
      chars.splice(state.cursor, 1);
      state.input = chars.join('');
      frame();
      return;
    }
    if (key.name === 'left') {
      state.cursor = Math.max(0, state.cursor - 1);
      frame();
      return;
    }
    if (key.name === 'right') {
      state.cursor = Math.min([...state.input].length, state.cursor + 1);
      frame();
      return;
    }
    if (key.name === 'home') {
      state.cursor = 0;
      frame();
      return;
    }
    if (key.name === 'end') {
      state.cursor = [...state.input].length;
      frame();
      return;
    }
    if (key.name === 'up') {
      if (state.scroll > 0 && historyAt < 0) {
        state.scroll += Math.max(1, Math.floor(sizeOf(output as unknown as { rows?: number }).rows / 2));
        frame();
        return;
      }
      if (history.length) {
        historyAt = historyAt < 0 ? history.length - 1 : Math.max(0, historyAt - 1);
        state.input = history[historyAt] ?? '';
        state.cursor = [...state.input].length;
      }
      frame();
      return;
    }
    if (key.name === 'down') {
      if (state.scroll > 0 && historyAt < 0) {
        state.scroll = Math.max(0, state.scroll - Math.max(1, Math.floor(sizeOf(output as unknown as { rows?: number }).rows / 2)));
        frame();
        return;
      }
      if (history.length && historyAt >= 0) {
        if (historyAt >= history.length - 1) {
          historyAt = -1;
          state.input = '';
        } else {
          historyAt += 1;
          state.input = history[historyAt] ?? '';
        }
        state.cursor = [...state.input].length;
      }
      frame();
      return;
    }
    if (key.name === 'pagedown') {
      state.scroll = 0;
      frame();
      return;
    }
    if (key.name === 'tab') {
      say('note', 'Tab completes nothing yet — /help lists the keys');
      frame();
      return;
    }
    if (key.name === 'escape') {
      state.scroll = 0;
      frame();
      return;
    }
    if (key.name === 'char') {
      const chars = [...state.input];
      chars.splice(state.cursor, 0, key.char);
      state.cursor += 1;
      state.input = chars.join('');
      frame();
    }
  };

  const runCommand = (line: string): void => {
    const [cmd = '', ...args] = line.slice(1).split(/\s+/);
    switch (cmd) {
      case 'quit':
      case 'exit':
      case 'q':
        finish('quit');
        return;
      case 'help':
        say('note', 'keys: Enter send · ↑↓ history/scroll · Ctrl-U/K edit · Ctrl-L clear · Ctrl-C stop or leave · PgDn back to the newest line');
        say('note', 'commands: /sessions · /new · /status · /history · /dir · /help · /quit');
        break;
      case 'sessions':
      case 's':
        openSessions();
        return;
      case 'new':
        opts.ctx.sessions.reset(sessionId);
        state.blocks = [];
        say('note', `new thread: the transcript was archived (not deleted) — sessions search still finds it`);
        break;
      case 'status': {
        const runs = state.running ? `running: ${state.running.slice(0, 40)}` : 'idle';
        say('note', `${state.session} · ${state.provider} · ${runs} · ${opts.ctx.sessions.list().length} conversation(s) on disk`);
        break;
      }
      case 'history': {
        const entries = opts.ctx.sessions.read(sessionId).slice(-12);
        for (const e of entries) {
          const role = e.role === 'user' ? 'you' : e.role === 'assistant' ? 'agent' : e.role;
          const text = 'content' in e ? String(e.content ?? '') : 'result' in e ? String(e.result ?? '') : '';
          say(e.role === 'user' ? 'user' : e.role === 'assistant' ? 'assistant' : 'note', `${role}: ${truncate1(text, 160)}`);
        }
        break;
      }
      case 'dir': {
        const cwd = process.cwd();
        let names: string[] = [];
        try {
          names = fs.readdirSync(cwd, { withFileTypes: true }).slice(0, 40).map((d) => (d.isDirectory() ? `${d.name}/` : d.name));
        } catch (err) {
          say('error', `cannot list ${cwd}: ${err instanceof Error ? err.message : String(err)}`);
          break;
        }
        say('note', `${cwd} — ${names.join('  ')}`);
        break;
      }
      default:
        say('error', `unknown command /${cmd} — /help lists them`);
    }
    frame();
  };

  const truncate1 = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max)}…` : text);

  // --- the wire ------------------------------------------------------------
  const onData = (chunk: Buffer | string): void => {
    const decoded: Decoded = decodeKeys(rest + chunk.toString('utf8'));
    rest = decoded.rest;
    queue = queue.concat(decoded.keys as unknown as string[]);
    while (queue.length && !stopped) press(queue.shift() as unknown as Key);
  };

  // --- attach: turns from the panel or the phone, on this same session -----
  const attachTo = async (): Promise<void> => {
    if (!opts.attach) return;
    const { url, token } = opts.attach;
    // The panel may not be up yet — opening the screen first is normal, so
    // keep trying for a few seconds instead of printing a connection error.
    let res: Response | null = null;
    let lastError = '';
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        res = await fetch(`${url}/api/sessions/${encodeURIComponent(sessionId)}/attach`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        await new Promise((r) => setTimeout(r, 400));
        if (stopped) return;
      }
    }
    if (!res) throw new Error(`no gateway at ${url} (${lastError})`);
    if (!res.ok || !res.body) throw new Error(`attach failed: HTTP ${res.status}`);
    say('note', `attached: turns from the panel or your phone on ${sessionId} show up here`);
    frame();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let current: Block | null = null;
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split('\n\n');
      buf = frames.pop() ?? '';
      for (const raw of frames) {
        const type = /^event: (.+)$/m.exec(raw)?.[1];
        const dataLine = /^data: (.+)$/m.exec(raw)?.[1];
        if (!type || !dataLine) continue;
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(dataLine) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (payload.sessionId && payload.sessionId !== sessionId) continue;
        const from = typeof payload.channel === 'string' ? payload.channel : 'elsewhere';
        if (type === 'run:start') {
          current = { kind: 'assistant', text: '', from };
          state.blocks.push(current);
          state.running = 'a turn from another surface';
        } else if (type === 'delta' && current) {
          current.text += String(payload.text ?? '');
        } else if (type === 'run:end') {
          if (current && !current.text) current.text = String(payload.text ?? '(no answer)');
          current = null;
          state.running = null;
        } else if (type === 'state') {
          state.status = `attached · ${Array.isArray(payload.transcript) ? payload.transcript.length : 0} earlier line(s) on disk`;
        } else {
          continue;
        }
        state.scroll = 0;
        frame();
      }
    }
  };

  // --- start ---------------------------------------------------------------
  if (!process.stdout.isTTY && !opts.streams) {
    // A pipe or a file: drawing a screen there helps nobody.
    write('termcrab tui needs a terminal. Use `termcrab` (the line REPL), or pipe a question: echo "hi" | termcrab run\n');
    return { done: Promise.resolve({ reason: 'error', error: 'not a tty' }), type: (t) => input.push(t), press, stop: () => undefined };
  }

  write(`${ESC.altScreenOn}${ESC.bracketedPasteOn}${ESC.clear}${ESC.home}`);
  try {
    if (input.isTTY && typeof input.setRawMode === 'function') input.setRawMode(true);
    input.resume();
  } catch {
    /* a non-TTY stdin: keys will arrive from `type()` */
  }
  input.on('data', onData);
  input.on('end', onEnd);
  output.on('resize', onResize);
  process.on('SIGINT', () => finish('quit'));
  process.on('SIGTERM', () => finish('quit'));

  say('note', `screen ready · ${state.session} · ${state.provider}`);
  frame();
  if (opts.attach) {
    attachTo().catch((err) => {
      state.error = err instanceof Error ? err.message : String(err);
      frame();
    });
  }

  return {
    done,
    type: (text: string) => onData(Buffer.from(text, 'utf8')),
    press: (key: Key) => press(key),
    stop: () => finish('quit'),
  };
}
