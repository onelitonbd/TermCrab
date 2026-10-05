/**
 * The whole screen as a pure function of the state and the terminal size (batch 29).
 *
 * `renderFrame` is the whole screen: a pure function of the state and the
 * terminal size, returning exactly `rows` lines of exactly `cols` cells (minus
 * escapes). Everything that could be wrong about a TUI — one line too many,
 * a wrapped path pushing the input off the bottom, a status bar that lies about
 * what is running — is then a unit test rather than a screenshot.
 */
import { cut, pad, SGR, stripAnsi, truncate, width, wrap } from './text.js';

export type BlockKind = 'user' | 'assistant' | 'thinking' | 'tool' | 'note' | 'error';

export interface Block {
  kind: BlockKind;
  text: string;
  /** Tool blocks: the call is still running (a spinner instead of a tick). */
  running?: boolean;
  /** Where the words came from, when that is worth showing (`telegram`, `web`). */
  from?: string;
  /** Wall-clock ms, shown on a finished tool card. */
  ms?: number;
}

export interface PickerRow {
  id: string;
  label: string;
  detail?: string;
  current?: boolean;
}

export interface TuiState {
  /** Product name and version, for the title bar. */
  title: string;
  provider: string;
  session: string;
  /** A turn is running right now (our own, or one attached from elsewhere). */
  running: string | null;
  blocks: Block[];
  input: string;
  /** Mind the cursor: the input is editable, so where it is matters. */
  cursor: number;
  /** One line of plain text in the status bar; the app owns its wording. */
  status: string;
  /** A selection overlay (sessions), when open. */
  picker: { title: string; rows: PickerRow[]; index: number } | null;
  /** Scrollback: 0 = follow the newest line. */
  scroll: number;
  /** The last thing that went wrong, kept until the next key press. */
  error: string | null;
  /** Frames drawn so far — a visible heartbeat when nothing else moves. */
  spinner: number;
}

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function emptyState(over: Partial<TuiState> = {}): TuiState {
  return {
    title: 'TermCrab',
    provider: '',
    session: 'main',
    running: null,
    blocks: [],
    input: '',
    cursor: 0,
    status: '',
    picker: null,
    scroll: 0,
    error: null,
    spinner: 0,
    ...over,
  };
}

/** The one-line label for a transcript block. */
function blockPrefix(block: Block, spinner: string): { text: string; colour: string } {
  switch (block.kind) {
    case 'user':
      return { text: '›', colour: SGR.cyan };
    case 'assistant':
      return { text: '⏺', colour: SGR.green };
    case 'thinking':
      return { text: '✻', colour: SGR.magenta };
    case 'tool':
      return { text: block.running ? spinner : block.running === false ? '⏺' : '·', colour: block.running ? SGR.yellow : SGR.grey };
    case 'error':
      return { text: '✗', colour: SGR.red };
    default:
      return { text: '·', colour: SGR.grey };
  }
}

/**
 * Turn the transcript into terminal lines, wrapped to the pane. Continuation
 * lines are indented to the text column, so a long paragraph reads as one
 * block instead of a wall.
 */
export function blockLines(block: Block, cols: number, spinner: string): string[] {
  const { text: mark, colour } = blockPrefix(block, spinner);
  const body = cols - 4; // "  ⏺ " and one column of breathing room
  const suffix =
    block.kind === 'tool'
      ? `${block.running ? '' : block.ms !== undefined ? ` ${SGR.grey}${block.ms}ms${SGR.reset}` : ''}`
      : block.from
        ? ` ${SGR.grey}(${block.from})${SGR.reset}`
        : '';
  const head = `${colour}${mark}${SGR.reset} `;
  if (block.kind === 'tool') {
    return [`${head}${truncate(stripAnsi(block.text), Math.max(1, body))}${suffix}`];
  }
  const first = wrap(block.text, Math.max(8, body));
  const lines: string[] = [];
  first.forEach((line, i) => {
    const prefix = i === 0 ? head : '  ';
    const style = block.kind === 'thinking' ? SGR.dim : '';
    const end = i === first.length - 1 ? style : '';
    const plain = stripAnsi(line);
    lines.push(i === 0 ? `${prefix}${style}${plain}${end}${suffix}` : `${prefix}${style}${plain}${end}`);
  });
  return lines;
}

function titleBar(state: TuiState, cols: number): string {
  const left = `🦀 ${state.title}`;
  const running = state.running ? ` ${SPINNER[state.spinner % SPINNER.length]}` : '';
  const right = `${state.session} · ${state.provider}${running}`;
  const room = cols - width(left) - width(right) - 2;
  const mid = room > 0 ? ' '.repeat(room) : '';
  return `${SGR.bold}${truncate(stripAnsi(left), Math.max(4, cols - width(right) - 1))}${SGR.reset}${mid}${SGR.grey}${truncate(stripAnsi(right), Math.max(4, cols - 4))}${SGR.reset}`;
}

function statusBar(state: TuiState, cols: number): string {
  const text = state.error ? `${SGR.red}${state.error}${SGR.reset}` : stripAnsi(state.status);
  return `${SGR.inverse}${pad(` ${text}`, cols)}${SGR.reset}`;
}

function inputLine(state: TuiState, cols: number): string {
  // The prompt tells the truth about what Enter will do.
  const prompt = state.running ? `${SGR.yellow}∷${SGR.reset} ` : `${SGR.cyan}›${SGR.reset} `;
  const room = Math.max(4, cols - 2);
  const chars = [...stripAnsi(state.input)];
  // Keep the cursor visible: slide the window when the line is longer than the
  // screen (a pasted URL on a phone).
  const cursor = Math.max(0, Math.min(state.cursor, chars.length));
  let start = 0;
  if (cursor > room) start = cursor - room;
  const visible = chars.slice(start, start + room).join('');
  return `${prompt}${pad(visible, room)}`;
}

function pickerLines(state: TuiState, cols: number, rows: number): string[] {
  const picker = state.picker!;
  const lines: string[] = [];
  lines.push(`${SGR.bold}${SGR.inverse}${pad(` ${picker.title} `, cols)}${SGR.reset}`);
  const room = Math.max(1, rows - 3);
  const start = Math.max(0, Math.min(picker.index - Math.floor(room / 2), picker.rows.length - room));
  for (const [i, row] of picker.rows.slice(start, start + room).entries()) {
    const idx = start + i;
    const mark = idx === picker.index ? '❯' : row.current ? '•' : ' ';
    const detail = row.detail ? `  ${SGR.grey}${row.detail}${SGR.reset}` : '';
    const body = truncate(stripAnsi(row.label), Math.max(4, cols - 8));
    const line = `${mark} ${body}${detail}`;
    lines.push(idx === picker.index ? `${SGR.inverse}${pad(stripAnsi(line), cols)}${SGR.reset}` : pad(line, cols));
  }
  lines.push(`${SGR.grey}${truncate('  ↑↓ choose · Enter open · Esc close', cols)}${SGR.reset}`);
  return lines;
}

/**
 * The whole screen. Exactly `rows` lines of `cols` cells: a title bar, the
 * transcript (scrolled to the newest line unless the reader scrolled back), the
 * input line and the status bar — or the picker instead of the transcript.
 */
export function renderFrame(state: TuiState, size: { rows: number; cols: number }): string[] {
  const rows = Math.max(4, size.rows);
  const cols = Math.max(20, size.cols);
  const spinner = SPINNER[state.spinner % SPINNER.length]!;

  if (state.picker) {
    const lines = pickerLines(state, cols, rows);
    while (lines.length < rows) lines.push(' '.repeat(cols));
    return lines.slice(0, rows).map((l) => pad(l, cols));
  }

  const bodyRows = Math.max(1, rows - 3);
  const all: string[] = [];
  for (const block of state.blocks) all.push(...blockLines(block, cols, spinner));

  const maxScroll = Math.max(0, all.length - bodyRows);
  const scroll = Math.max(0, Math.min(state.scroll, maxScroll));
  const end = all.length - scroll;
  const start = Math.max(0, end - bodyRows);
  const body = all.slice(start, end);
  while (body.length < bodyRows) body.unshift('');

  const lines = [titleBar(state, cols), ...body, inputLine(state, cols), statusBar(state, cols)];
  return lines.map((l) => pad(l, cols));
}

/** The cursor's screen position for a frame — 0-based row/col. */
export function cursorAt(state: TuiState, size: { rows: number; cols: number }): { row: number; col: number } {
  const cols = Math.max(20, size.cols);
  const room = Math.max(4, cols - 2);
  const cursor = Math.max(0, Math.min(state.cursor, [...stripAnsi(state.input)].length));
  const start = cursor > room ? cursor - room : 0;
  return { row: Math.max(4, size.rows) - 2, col: 2 + Math.min(cursor - start, room - 1) };
}

/** Scroll one screen when the reader asks for it. */
export function clampScroll(state: TuiState, size: { rows: number; cols: number }): number {
  const bodyRows = Math.max(1, Math.max(4, size.rows) - 3);
  const total = state.blocks.reduce((n, b) => n + blockLines(b, Math.max(20, size.cols), '⠋').length, 0);
  return Math.max(0, Math.min(state.scroll, Math.max(0, total - bodyRows)));
}

/** The whole frame as one write: cursor home, each line cleared, no flicker. */
export function frameToAnsi(lines: string[]): string {
  return `\x1b[H${lines.map((l) => `${l}\x1b[K`).join('\r\n')}\x1b[J`;
}

export { cut, width };
