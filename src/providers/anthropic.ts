import {
  ChatRequest,
  ChatResult,
  FetchLike,
  Provider,
  ProviderError,
  readError,
  ToolDef,
} from './types.js';

interface AnthropicCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  if (b.endsWith('/v1')) return `${b}${path}`;
  return `${b}/v1${path}`;
}

function toAnthropicTools(tools: ToolDef[]): unknown[] {
  return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema }));
}

/**
 * Convert internal messages to Anthropic's content-block format.
 * Consecutive tool results collapse into a single user message.
 */
function toAnthropicMessages(messages: ChatRequest['messages']): unknown[] {
  const out: unknown[] = [];
  let pendingToolResults: unknown[] = [];

  const flushToolResults = () => {
    if (pendingToolResults.length) {
      out.push({ role: 'user', content: pendingToolResults });
      pendingToolResults = [];
    }
  };

  for (const m of messages) {
    if (m.role === 'tool') {
      pendingToolResults.push({
        type: 'tool_result',
        tool_use_id: m.toolCallId,
        content: m.content.slice(0, 100000),
      });
      continue;
    }
    flushToolResults();
    if (m.role === 'user') {
      out.push({ role: 'user', content: [{ type: 'text', text: m.content }] });
    } else {
      const content: unknown[] = [];
      if (m.content) content.push({ type: 'text', text: m.content });
      for (const call of m.toolCalls ?? []) {
        content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.args });
      }
      if (content.length) out.push({ role: 'assistant', content });
    }
  }
  flushToolResults();
  return out;
}

export function createAnthropic(cfg: AnthropicCfg, fetchImpl: FetchLike = fetch): Provider {
  return {
    name: 'anthropic',
    model: cfg.model,
    async chat(req, opts) {
      const body = {
        model: cfg.model,
        max_tokens: req.maxTokens ?? cfg.maxTokens ?? 4096,
        temperature: req.temperature ?? cfg.temperature,
        system: req.system,
        messages: toAnthropicMessages(req.messages),
        tools: toAnthropicTools(req.tools),
      };
      const res = await fetchImpl(joinUrl(cfg.baseUrl, '/messages'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: opts?.signal,
      });
      if (!res.ok) throw new ProviderError(`anthropic HTTP ${res.status}`, res.status, await readError(res));
      const data = (await res.json()) as {
        content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
        stop_reason: string | null;
      };
      let text = '';
      const toolCalls: ChatResult['toolCalls'] = [];
      for (const block of data.content ?? []) {
        if (block.type === 'text' && block.text) text += block.text;
        else if (block.type === 'tool_use' && block.id && block.name) {
          toolCalls.push({
            id: block.id,
            name: block.name,
            args: (block.input ?? {}) as Record<string, unknown>,
          });
        }
      }
      const stopReason =
        data.stop_reason === 'tool_use' ? 'tool' : data.stop_reason === 'max_tokens' ? 'length' : data.stop_reason === 'end_turn' ? 'end' : 'unknown';
      return { text, toolCalls, stopReason };
    },
  };
}
