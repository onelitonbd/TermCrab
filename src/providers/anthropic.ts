/**
 * Anthropic's own wire format (batch 27.2, census row "Anthropic native").
 *
 * Anthropic does not speak OpenAI's Chat Completions: the system prompt is a
 * top-level field, messages carry typed content blocks, tools are
 * `input_schema` (not `parameters`), and a tool result is a *user* message
 * with a `tool_result` block. Mapping all of that inside the OpenAI adapter
 * would have meant a second, hidden dialect in the same file — so this is a
 * separate adapter behind the same `Provider` interface, and every other
 * caller (loop, tools, images, usage) sees exactly what it saw before.
 *
 * Streaming is the default (the panel's typewriter), with thinking deltas
 * surfaced when the model sends them.
 */
import { FetchLike, Provider, ProviderError, ProviderMessage, ChatImage, ChatOpts, ChatRequest, ChatResult } from './types.js';
import { isAbortError } from './types.js';
import { sseData } from './sse.js';

export interface AnthropicCfg {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

const DEFAULT_BASE = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';

function baseOf(cfg: AnthropicCfg): string {
  return (cfg.baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
}

/** Where messages go: `{base}/v1/messages`, with `/v1` tolerated in the base. */
export function anthropicUrl(baseUrl: string | undefined): string {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
  return /\/v1$/.test(base) ? `${base}/messages` : `${base}/v1/messages`;
}

type Block = Record<string, unknown>;

/** One image as an Anthropic content block. */
export function imageBlock(image: ChatImage): Block {
  return { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.dataBase64 } };
}

/** Provider messages -> Anthropic's `messages` array (system is separate). */
export function toAnthropicMessages(messages: ProviderMessage[], image?: ChatImage): Block[] {
  const out: Block[] = [];
  const lastUser = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i]!.role === 'user') return i;
    return -1;
  })();

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === 'system') continue; // hoisted into the top-level `system`
    if (m.role === 'tool') {
      out.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: m.toolCallId ?? 'tool', content: m.content || '(no output)' }],
      });
      continue;
    }
    if (m.role === 'assistant') {
      const content: Block[] = [];
      for (const block of m.thinkingBlocks ?? []) content.push(block as Block);
      if (m.content) content.push({ type: 'text', text: m.content });
      for (const call of m.toolCalls ?? []) {
        content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.args ?? {} });
      }
      if (!content.length) content.push({ type: 'text', text: '' });
      out.push({ role: 'assistant', content });
      continue;
    }
    // user
    const content: Block[] = [];
    if (image && i === lastUser) content.push(imageBlock(image));
    if (m.content) content.push({ type: 'text', text: m.content });
    if (!content.length) content.push({ type: 'text', text: '' });
    out.push({ role: 'user', content });
  }
  return out;
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

function usageOf(u: AnthropicUsage | undefined): ChatResult['usage'] {
  if (!u || (u.input_tokens == null && u.output_tokens == null)) return undefined;
  const prompt = u.input_tokens ?? 0;
  const completion = u.output_tokens ?? 0;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: prompt + completion };
}

function stopOf(reason: string | undefined, sawTool: boolean): ChatResult['stopReason'] {
  if (sawTool || reason === 'tool_use') return 'tool';
  if (reason === 'max_tokens') return 'length';
  if (reason === 'end_turn' || reason === 'stop_sequence' || reason === 'stop') return 'end';
  return 'unknown';
}

/** Non-streaming response -> ChatResult. Shared with the streaming path. */
export function readAnthropicMessage(payload: { content?: Block[]; stop_reason?: string; usage?: AnthropicUsage }): ChatResult {
  let text = '';
  let thinking = '';
  const thinkingBlocks: unknown[] = [];
  const toolCalls: ChatResult['toolCalls'] = [];

  for (const block of payload.content ?? []) {
    const type = block.type;
    if (type === 'text') text += String(block.text ?? '');
    else if (type === 'thinking') {
      thinking += String(block.thinking ?? '');
      thinkingBlocks.push(block);
    } else if (type === 'redacted_thinking') {
      thinkingBlocks.push(block);
    } else if (type === 'tool_use') {
      toolCalls.push({
        id: String(block.id ?? `tool-${toolCalls.length + 1}`),
        name: String(block.name ?? ''),
        args: (block.input as Record<string, unknown>) ?? {},
      });
    }
  }
  return {
    text,
    toolCalls,
    stopReason: stopOf(payload.stop_reason, toolCalls.length > 0),
    ...(thinking ? { thinking } : {}),
    ...(thinkingBlocks.length ? { thinkingBlocks } : {}),
    usage: usageOf(payload.usage),
  };
}

export function createAnthropic(cfg: AnthropicCfg, fetchImpl: FetchLike = fetch): Provider {
  const url = anthropicUrl(cfg.baseUrl);
  const stream = cfg.stream !== false;
  const maxTokens = cfg.maxTokens ?? 4096;

  const headers = (): Record<string, string> => ({
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
    ...(cfg.apiKey ? { 'x-api-key': cfg.apiKey } : {}),
  });

  const body = (req: ChatRequest, useStream: boolean): string =>
    JSON.stringify({
      model: cfg.model,
      max_tokens: req.maxTokens ?? maxTokens,
      ...(req.temperature != null || cfg.temperature != null ? { temperature: req.temperature ?? cfg.temperature } : {}),
      system: req.system,
      messages: toAnthropicMessages(req.messages, req.image),
      ...(req.tools.length
        ? { tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema })) }
        : {}),
      ...(useStream ? { stream: true } : {}),
    });

  return {
    name: 'anthropic',
    model: cfg.model,

    async chat(req: ChatRequest, opts: ChatOpts = {}): Promise<ChatResult> {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: headers(),
        body: body(req, stream),
        signal: opts.signal,
      }).catch((err) => {
        throw isAbortError(err) ? err : new ProviderError(`anthropic unreachable: ${(err as Error).message}`);
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ProviderError(`anthropic ${res.status}: ${text.slice(0, 300)}`, res.status, text);
      }

      if (!stream || !res.body) {
        const payload = (await res.json()) as { content?: Block[]; stop_reason?: string; usage?: AnthropicUsage };
        return readAnthropicMessage(payload);
      }

      // Streaming: content_block_delta carries text/thinking deltas; tool_use
      // arguments arrive as partial JSON strings and are accumulated per index.
      let text = '';
      let thinking = '';
      const thinkingBlocks: unknown[] = [];
      const calls = new Map<number, { id: string; name: string; json: string }>();
      let stopReason: string | undefined;
      let usage: AnthropicUsage | undefined;

      for await (const data of sseData(res)) {
        let ev: Record<string, unknown>;
        try {
          ev = JSON.parse(data) as Record<string, unknown>;
        } catch {
          continue;
        }
        const type = String(ev.type ?? '');
        if (type === 'message_start') {
          const message = (ev.message ?? {}) as { usage?: AnthropicUsage };
          usage = { ...message.usage };
        } else if (type === 'content_block_start') {
          const index = Number(ev.index ?? 0);
          const block = (ev.content_block ?? {}) as Block;
          if (block.type === 'tool_use') {
            calls.set(index, { id: String(block.id ?? `tool-${index + 1}`), name: String(block.name ?? ''), json: '' });
          } else if (block.type === 'thinking' || block.type === 'redacted_thinking') {
            thinkingBlocks.push(block);
          }
        } else if (type === 'content_block_delta') {
          const delta = (ev.delta ?? {}) as Block;
          if (delta.type === 'text_delta') {
            const chunk = String(delta.text ?? '');
            text += chunk;
            if (chunk) opts.onDelta?.(chunk);
          } else if (delta.type === 'thinking_delta') {
            const chunk = String(delta.thinking ?? '');
            thinking += chunk;
            if (chunk) opts.onThinkingDelta?.(chunk);
          } else if (delta.type === 'input_json_delta') {
            const entry = calls.get(Number(ev.index ?? 0));
            if (entry) entry.json += String(delta.partial_json ?? '');
          }
        } else if (type === 'message_delta') {
          const delta = (ev.delta ?? {}) as { stop_reason?: string };
          stopReason = delta.stop_reason ?? stopReason;
          const u = (ev.usage ?? {}) as AnthropicUsage;
          usage = { input_tokens: usage?.input_tokens ?? u.input_tokens, output_tokens: u.output_tokens ?? usage?.output_tokens };
        } else if (type === 'error') {
          const err = (ev.error ?? {}) as { message?: string };
          throw new ProviderError(`anthropic stream error: ${err.message ?? 'unknown'}`);
        }
      }

      const toolCalls: ChatResult['toolCalls'] = [];
      for (const [, entry] of [...calls].sort((a, b) => a[0] - b[0])) {
        let args: Record<string, unknown> = {};
        if (entry.json.trim()) {
          try {
            args = JSON.parse(entry.json) as Record<string, unknown>;
          } catch {
            args = { _raw: entry.json };
          }
        }
        toolCalls.push({ id: entry.id, name: entry.name, args });
      }

      return {
        text,
        toolCalls,
        stopReason: stopOf(stopReason, toolCalls.length > 0),
        ...(thinking ? { thinking } : {}),
        ...(thinkingBlocks.length ? { thinkingBlocks } : {}),
        usage: usageOf(usage),
      };
    },
  };
}
