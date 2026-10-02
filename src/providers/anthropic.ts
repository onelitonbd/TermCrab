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
import { getModelCapabilities, thinkingLevelToTokens } from './capabilities.js';

/** Claude's max extended-thinking budget that still leaves room for an answer. */
const ANTHROPIC_MAX_THINKING_BUDGET = 32000;

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
      // Preserved reasoning blocks come first — Anthropic rejects a tool-result
      // follow-up when the thinking blocks of the tool-call turn went missing.
      for (const b of m.thinkingBlocks ?? []) {
        if (b && typeof b === 'object') content.push(b);
      }
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
  const caps = getModelCapabilities(cfg.model, 'anthropic');

  /**
   * Extended thinking, only for Claude models that actually support it.
   * The budget must stay below max_tokens and temperature must be left unset,
   * so both are adjusted here instead of trusting the caller.
   */
  function thinkingRequest(req: ChatRequest): {
    thinking?: { type: 'enabled'; budget_tokens: number };
    maxTokens?: number;
    omitTemperature: boolean;
  } {
    const level = req.thinkingLevel;
    if (!level || level === 'none' || !caps.supportsThinking) return { omitTemperature: false };
    const budget = Math.min(thinkingLevelToTokens(level) ?? 0, ANTHROPIC_MAX_THINKING_BUDGET);
    if (!budget) return { omitTemperature: false };
    const base = req.maxTokens ?? cfg.maxTokens ?? 4096;
    return {
      thinking: { type: 'enabled', budget_tokens: budget },
      maxTokens: Math.max(base, budget + 4096),
      omitTemperature: true,
    };
  }

  /** Keep only replayable reasoning blocks (a thinking block needs its signature). */
  function replayable(blocks: Record<string, unknown>[]): unknown[] | undefined {
    const out = blocks.filter(
      (b) => (b.type === 'thinking' && b.signature) || b.type === 'redacted_thinking',
    );
    return out.length ? out : undefined;
  }

  async function basic(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
    const think = thinkingRequest(req);
    const body: Record<string, unknown> = {
      model: cfg.model,
      max_tokens: think.maxTokens ?? req.maxTokens ?? cfg.maxTokens ?? 4096,
      system: req.system,
      messages: toAnthropicMessages(req.messages),
      tools: toAnthropicTools(req.tools),
    };
    if (think.omitTemperature) {
      // Extended thinking requires the model's default temperature.
    } else {
      body.temperature = req.temperature ?? cfg.temperature;
    }
    if (think.thinking) body.thinking = think.thinking;
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
      content: {
        type: string;
        text?: string;
        thinking?: string;
        signature?: string;
        data?: string;
        id?: string;
        name?: string;
        input?: unknown;
      }[];
      stop_reason: string | null;
    };
    let text = '';
    let thinkingText = '';
    const toolCalls: ChatResult['toolCalls'] = [];
    const blocks: Record<string, unknown>[] = [];
    for (const block of data.content ?? []) {
      if (block.type === 'thinking' && block.thinking) {
        thinkingText += block.thinking;
        blocks.push({ type: 'thinking', thinking: block.thinking, signature: block.signature ?? '' });
      } else if (block.type === 'redacted_thinking' && block.data) {
        blocks.push({ type: 'redacted_thinking', data: block.data });
      } else if (block.type === 'text' && block.text) text += block.text;
      else if (block.type === 'tool_use' && block.id && block.name) {
        toolCalls.push({ id: block.id, name: block.name, args: (block.input ?? {}) as Record<string, unknown> });
      }
    }
    return {
      text,
      toolCalls,
      stopReason: mapStop(data.stop_reason),
      thinking: thinkingText || undefined,
      thinkingBlocks: replayable(blocks),
    };
  }

  async function stream(req: ChatRequest, opts: ChatOpts): Promise<ChatResult> {
    const think = thinkingRequest(req);
    const body: Record<string, unknown> = {
      model: cfg.model,
      max_tokens: think.maxTokens ?? req.maxTokens ?? cfg.maxTokens ?? 4096,
      system: req.system,
      messages: toAnthropicMessages(req.messages),
      tools: toAnthropicTools(req.tools),
      stream: true,
    };
    if (!think.omitTemperature) body.temperature = req.temperature ?? cfg.temperature;
    if (think.thinking) body.thinking = think.thinking;
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
    let thinkingText = '';
    let stop: string | null = null;
    const tools = new Map<number, { id: string; name: string; args: string }>();
    const reasoning = new Map<number, Record<string, unknown>>();

    for await (const data of sseData(res)) {
      let ev: {
        type?: string;
        index?: number;
        content_block?: { type?: string; id?: string; name?: string; data?: string };
        delta?: {
          type?: string;
          text?: string;
          thinking?: string;
          signature?: string;
          partial_json?: string;
          stop_reason?: string;
        };
      };
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      switch (ev.type) {
        case 'content_block_start':
          if (typeof ev.index === 'number' && ev.content_block?.type === 'thinking') {
            reasoning.set(ev.index, { type: 'thinking', thinking: '', signature: '' });
          } else if (typeof ev.index === 'number' && ev.content_block?.type === 'redacted_thinking') {
            reasoning.set(ev.index, { type: 'redacted_thinking', data: ev.content_block.data ?? '' });
          } else if (ev.content_block?.type === 'tool_use' && typeof ev.index === 'number') {
            tools.set(ev.index, { id: ev.content_block.id || `tool_${ev.index}`, name: ev.content_block.name || '', args: '' });
          }
          break;
        case 'content_block_delta':
          if (ev.delta?.type === 'text_delta' && ev.delta.text) {
            text += ev.delta.text;
            opts.onDelta?.(ev.delta.text);
          } else if (ev.delta?.type === 'thinking_delta') {
            const chunk = ev.delta.thinking ?? '';
            const block = typeof ev.index === 'number' ? reasoning.get(ev.index) : undefined;
            if (block) block.thinking = String(block.thinking ?? '') + chunk;
            if (chunk) {
              thinkingText += chunk;
              opts.onThinkingDelta?.(chunk);
            }
          } else if (ev.delta?.type === 'signature_delta') {
            const block = typeof ev.index === 'number' ? reasoning.get(ev.index) : undefined;
            if (block) block.signature = String(block.signature ?? '') + (ev.delta.signature ?? '');
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
    const blocks = [...reasoning.entries()].sort((a, b) => a[0] - b[0]).map(([, b]) => b);
    return {
      text,
      toolCalls,
      stopReason: toolCalls.length ? 'tool' : mapStop(stop),
      thinking: thinkingText || undefined,
      thinkingBlocks: replayable(blocks),
    };
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
          onThinkingDelta: (chunk) => opts.onThinkingDelta?.(chunk),
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
