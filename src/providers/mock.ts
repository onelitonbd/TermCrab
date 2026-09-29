import { ChatRequest, ChatResult, Provider } from './types.js';

/**
 * Deterministic offline provider.
 * - If the conversation contains no tool result yet, requests get_time.
 * - Otherwise returns a final answer mentioning the tool output.
 * Used by tests and `termcrab ... --demo` so the product works with ZERO API keys.
 */
export function createMock(model = 'mock-1'): Provider {
  return {
    name: 'mock',
    model,
    async chat(req: ChatRequest): Promise<ChatResult> {
      const hasToolResult = req.messages.some((m) => m.role === 'tool');
      const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
      const prompt = lastUser?.content ?? '';
      if (!hasToolResult) {
        return {
          text: '',
          toolCalls: [{ id: `mock_${req.messages.length}`, name: 'get_time', args: {} }],
          stopReason: 'tool',
        };
      }
      const toolOut = req.messages.filter((m) => m.role === 'tool').map((m) => m.content).join(' | ');
      return {
        text: `[mock:${model}] You said: "${prompt.slice(0, 120)}". Tool said: ${toolOut.slice(0, 200)}`,
        toolCalls: [],
        stopReason: 'end',
      };
    },
  };
}
