import {
  ChatOpts,
  ChatRequest,
  ChatResult,
  FetchLike,
  Provider,
  ProviderError,
  readError,
  ToolDef,
  isAbortError,
} from './types.js';
import { sseData } from './sse.js';

interface AnthropicCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
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

function mapStop(reason: string | null | undefined): ChatResult['stopReason'] {
  if (reason === 'tool_use') return 'tool';
  if (reason === 'max_tokens') return 'length';
  if (reason === 'end_turn') return 'end';
  return 'unknown';
}

function parseToolArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function createAnthropic(cfg: AnthropicCfg, fetchImpl: FetchLike = fetch): Provider {
  async function basic(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
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
        toolCalls.push({ id: block.id, name: block.name, args: (block.input ?? {}) as Record<string, unknown> });
      }
    }
    return { text, toolCalls, stopReason: mapStop(data.stop_reason) };
  }

  async function stream(req: ChatRequest, opts: ChatOpts): Promise<ChatResult> {
    const body = {
      model: cfg.model,
      max_tokens: req.maxTokens ?? cfg.maxTokens ?? 4096,
      temperature: req.temperature ?? cfg.temperature,
      system: req.system,
      messages: toAnthropicMessages(req.messages),
      tools: toAnthropicTools(req.tools),
      stream: true,
    };
    const res = await fetchImpl(joinUrl(cfg.baseUrl, '/messages'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) throw new ProviderError(`anthropic HTTP ${res.status}`, res.status, await readError(res));
    if (!res.body) throw new ProviderError('anthropic: empty stream body');

    let text = '';
    let stop: string | null = null;
    const tools = new Map<number, { id: string; name: string; args: string }>();

    for await (const data of sseData(res)) {
      let ev: { type?: string; index?: number; content_block?: { type?: string; id?: string; name?: string }; delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string } };
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      switch (ev.type) {
        case 'content_block_start':
          if (ev.content_block?.type === 'tool_use' && typeof ev.index === 'number') {
            tools.set(ev.index, { id: ev.content_block.id || `tool_${ev.index}`, name: ev.content_block.name || '', args: '' });
          }
          break;
        case 'content_block_delta':
          if (ev.delta?.type === 'text_delta' && ev.delta.text) {
            text += ev.delta.text;
            opts.onDelta?.(ev.delta.text);
          } else if (ev.delta?.type === 'input_json_delta' && typeof ev.index === 'number') {
            const acc = tools.get(ev.index);
            if (acc) acc.args += ev.delta.partial_json ?? '';
          }
          break;
        case 'message_delta':
          stop = ev.delta?.stop_reason ?? stop;
          break;
        default:
          break;
      }
    }

    const toolCalls: ChatResult['toolCalls'] = [...tools.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, t]) => ({ id: t.id, name: t.name, args: parseToolArgs(t.args) }));
    return { text, toolCalls, stopReason: toolCalls.length ? 'tool' : mapStop(stop) };
  }

  return {
    name: 'anthropic',
    model: cfg.model,
    async chat(req, opts) {
      if (opts?.onDelta && cfg.stream !== false) {
        let emitted = 0;
        const counting: ChatOpts = {
          signal: opts.signal,
          onDelta: (chunk) => {
            emitted++;
            opts.onDelta?.(chunk);
          },
        };
        try {
          return await stream(req, counting);
        } catch (err) {
          if (isAbortError(err) || emitted > 0) throw err;
          return basic(req, opts);
        }
      }
      return basic(req, opts);
    },
  };
}
