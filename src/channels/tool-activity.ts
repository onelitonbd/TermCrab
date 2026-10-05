/**
 * Batch 53.3 — a long turn is not silent.
 *
 * Telegram shows "typing…" while the agent works, and that was the whole story:
 * a turn that runs six tools over two minutes looked exactly like a turn that
 * was stuck. This is the tracker behind the fix — one status message, sent when
 * the first tool starts, edited (never re-sent) as tool names accumulate, and
 * removed when the turn ends.
 *
 * Kept out of the channel on purpose: `send`/`edit`/`remove` are the port, so a
 * test drives the whole shape with three functions and a controllable clock,
 * and the Telegram client is only one implementation of it.
 */

export interface ToolStatusPort {
  /** Send the first status line; the id is what later edits address. */
  send(text: string): Promise<number | null>;
  /** Replace the text of a status message that was already sent. */
  edit(messageId: number, text: string): Promise<void>;
  /** Take it away when the turn is over. */
  remove(messageId: number): Promise<void>;
}

export interface ToolActivityOptions {
  /** How many tool names the line shows before it counts the rest. */
  limit?: number;
  /** Minimum gap between two edits — Telegram rate-limits, and a turn is chatty. */
  minMs?: number;
  /** Injectable clock, so a test does not sleep. */
  now?: () => number;
  /** Prefix of the status line. */
  icon?: string;
}

export interface ToolActivity {
  /** A tool started. */
  note(name: string): void;
  /** The turn is over: flush the last edit and clear the message. */
  finish(): Promise<void>;
  /** What the message says (and said) — for tests and for the panel's own use. */
  snapshot(): { messageId: number | null; text: string; edits: number; names: string[] };
}

/** `🛠️ exec · read_file · write_file (+2)` */
export function toolStatusText(names: string[], limit = 4, icon = '🛠️'): string {
  if (!names.length) return `${icon} working…`;
  const shown = names.slice(-limit);
  const more = names.length - shown.length;
  return `${icon} ${shown.join(' · ')}${more > 0 ? ` (+${more})` : ''}`;
}

export function makeToolActivity(port: ToolStatusPort, opts: ToolActivityOptions = {}): ToolActivity {
  const limit = opts.limit ?? 4;
  const minMs = opts.minMs ?? 1500;
  const now = opts.now ?? (() => Date.now());
  const icon = opts.icon ?? '🛠️';

  const names: string[] = [];
  let messageId: number | null = null;
  let text = '';
  let edits = 0;
  let lastEditAt = 0;
  let pending: Promise<void> = Promise.resolve();

  const push = (work: () => Promise<void>): void => {
    pending = pending.then(work).catch(() => undefined);
  };

  /**
   * The decision is taken *inside* the serialized chain, never at note() time:
   * a tool that starts while the first send is still in flight used to look
   * like "no message yet" and opened a second one.
   */
  const render = async (force: boolean): Promise<void> => {
    const want = toolStatusText(names, limit, icon);
    if (want === text) return;
    const stamp = now();
    if (!force && messageId !== null && stamp - lastEditAt < minMs) return;
    if (messageId === null) {
      text = want;
      lastEditAt = stamp;
      const id = await port.send(want);
      if (id !== null) messageId = id;
      // Tools that landed while the send was in flight: catch up in the same
      // breath, or the line stays a tool behind until the next one starts.
      const after = toolStatusText(names, limit, icon);
      if (messageId !== null && after !== text && now() - lastEditAt >= minMs) {
        text = after;
        lastEditAt = now();
        edits += 1;
        await port.edit(messageId, after);
      }
      return;
    }
    const id = messageId;
    text = want;
    lastEditAt = stamp;
    edits += 1;
    await port.edit(id, want);
  };

  return {
    note(name: string) {
      const tool = (name ?? '').trim();
      if (!tool) return;
      names.push(tool);
      // The first tool always gets a message; the rest are throttled.
      const force = messageId === null && names.length === 1;
      push(() => render(force));
    },
    async finish() {
      await pending; // a send that was still in flight gets its id first
      if (messageId === null) return;
      const id = messageId;
      messageId = null;
      push(() => port.remove(id));
      await pending;
    },
    snapshot() {
      return { messageId, text, edits, names: [...names] };
    },
  };
}
