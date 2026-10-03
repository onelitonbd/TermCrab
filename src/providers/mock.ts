import { ChatOpts, ChatRequest, ChatResult, Provider, Usage } from './types.js';

/**
 * The offline brain.
 *
 * TermCrab's quick start, CI smoke test and "no Wi-Fi" fallback all promise that
 * the agent works with no network and no API key. This provider keeps that
 * promise deterministic:
 *
 *   turn 1  -> calls one harmless tool (get_time), so the whole tool loop,
 *              event stream and transcript path run for real;
 *   turn 2  -> answers in the shape the loop has always used for the mock:
 *              `[mock:<model>] You said: … . Tool said: …`
 *
 * It never touches the network, never reads the clock for content (only for the
 * tool call it requests), and streams in small chunks so the typewriter path is
 * exercised too. `runTurn` strips the `[mock:…]` prefix for display, which keeps
 * transcripts from this provider readable in the panel.
 */

/** Split text into a few deltas so onDelta / SSE streaming is exercised. */
const CHUNKS = 4;

/**
 * The mock's token counter: 4 characters per token, plus a small per-message
 * overhead. Deterministic on purpose — a test that asserts a number must not
 * depend on a tokeniser — and honest about what it is: every Usage this
 * provider returns carries `estimated: true`, and the panel/CLI label it.
 */
function estimate(messages: { content?: string }[], text = ''): Usage {
  const overhead = 4;
  let chars = text.length;
  for (const m of messages) chars += m.content?.length ?? 0;
  const promptTokens = messages.length * overhead + Math.ceil(messages.reduce((a, m) => a + (m.content?.length ?? 0), 0) / 4);
  const completionTokens = Math.ceil(text.length / 4);
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, estimated: true };
}

export function createMock(model = 'mock-1'): Provider {
  const resolved = model && model.trim() ? model.trim() : 'mock-1';
  return {
    name: 'mock',
    model: resolved,
    async chat(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
      if (opts?.signal?.aborted) throw new Error('AbortError');

      const messages = req.messages ?? [];
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const userText = (lastUser?.content ?? '').trim();
      // A tool result anywhere means the loop has already done a round trip:
      // answer now instead of asking for another tool.
      const sawToolResult = messages.some((m) => m.role === 'tool');
      const lastTool = [...messages].reverse().find((m) => m.role === 'tool');

      if (!sawToolResult) {
        const tool = req.tools.find((t) => t.name === 'get_time') ?? req.tools[0];
        if (tool) {
          return {
            text: '',
            toolCalls: [{ id: `mock-call-${resolved}`, name: tool.name, args: {} }],
            stopReason: 'tool',
            usage: estimate(messages),
          };
        }
        // No tools offered at all: still answer, so a tools-less caller works.
      }

      const said = userText || '(nothing)';
      const toolSaid = (lastTool?.content ?? '').split('\n')[0]?.trim();
      const text =
        `[mock:${resolved}] You said: ${said}` + (toolSaid ? `. Tool said: ${toolSaid}` : '.');

      if (opts?.onDelta) {
        const size = Math.max(1, Math.ceil(text.length / CHUNKS));
        for (let i = 0; i < text.length; i += size) {
          if (opts.signal?.aborted) throw new Error('AbortError');
          opts.onDelta(text.slice(i, i + size));
          // Yield between chunks: the loop's delta handling is synchronous.
          await new Promise((r) => setImmediate(r));
        }
      }

      return { text, toolCalls: [], stopReason: 'end', usage: estimate(messages, text) };
    },
  };
}
