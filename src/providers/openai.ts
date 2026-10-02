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
import { getModelCapabilities, thinkingLevelToEffort } from './capabilities.js';

interface OpenAiCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  if (b.endsWith('/chat/completions')) return b;
  if (b.endsWith('/v1')) return `${b}${path}`;
  return `${b}/v1${path}`;
}

function toOpenAiTools(tools: ToolDef[]): unknown[] | undefined {
  if (!tools.length) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.schema },
  }));
}

function buildMessages(req: ChatRequest): unknown[] {
  const messages: unknown[] = [{ role: 'system', content: req.system }];
  for (const m of req.messages) {
    if (m.role === 'user') messages.push({ role: 'user', content: m.content });
    else if (m.role === 'tool') {
      messages.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content.slice(0, 100000) });
    } else {
      const msg: Record<string, unknown> = { role: 'assistant', content: m.content || null };
      if (m.toolCalls?.length) {
        msg.tool_calls = m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
        }));
      }
      messages.push(msg);
    }
  }
  return messages;
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

interface ToolAcc {
  id: string;
  name: string;
  args: string;
}

/**
 * Works for OpenAI, OpenRouter, Groq, DeepSeek, Ollama (/v1), and most compatible
 * servers - including SSE streaming of text and tool-call fragments.
 */
export function createOpenAi(cfg: OpenAiCfg, fetchImpl: FetchLike = fetch): Provider {
  const caps = getModelCapabilities(cfg.model, 'openai');

  /**
   * Attach reasoning effort — but ONLY for models that take it. Sending
   * `reasoning_effort` to a plain model (gpt-4o and friends) is a hard 400,
   * which used to break the whole reply whenever a thinking level was picked.
   */
  function applyThinking(body: Record<string, unknown>, req: ChatRequest): void {
    if (!req.thinkingLevel || req.thinkingLevel === 'none') return;
    if (!caps.supportsThinking) return;
    const effort = thinkingLevelToEffort(req.thinkingLevel);
    if (effort) body.reasoning_effort = effort;
  }

  function finalize(
    text: string,
    tools: Map<number, ToolAcc>,
    finish: string,
    thinking?: string,
  ): ChatResult {
    // If text contains inline <think>...</think> tags, extract them
    let cleanText = text;
    let extractedThinking = thinking || '';
    const thinkMatch = cleanText.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch && thinkMatch[1]) {
      extractedThinking = (extractedThinking ? extractedThinking + '\n' : '') + thinkMatch[1].trim();
      cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    const toolCalls: ChatResult['toolCalls'] = [...tools.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, t]) => ({ id: t.id || `call_${t.name}`, name: t.name, args: parseToolArgs(t.args) }));
    const stopReason: ChatResult['stopReason'] =
      toolCalls.length || finish === 'tool_calls'
        ? 'tool'
        : finish === 'length'
          ? 'length'
          : finish === 'stop'
            ? 'end'
            : 'unknown';
    return { text: cleanText, toolCalls, stopReason, thinking: extractedThinking || undefined };
  }

  async function basic(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: buildMessages(req),
      max_tokens: req.maxTokens ?? cfg.maxTokens,
      temperature: req.temperature ?? cfg.temperature,
    };
    applyThinking(body, req);
    const tools = toOpenAiTools(req.tools);
    if (tools) body.tools = tools;

    const res = await fetchImpl(joinUrl(cfg.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.apiKey || 'not-needed'}`,
      },
      body: JSON.stringify(body),
      signal: opts?.signal,
    });
    if (!res.ok) throw new ProviderError(`openai HTTP ${res.status}`, res.status, await readError(res));
    const data = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          reasoning_content?: string;
          thinking?: string;
          tool_calls?: { id: string; function: { name: string; arguments: string } }[];
        };
        finish_reason?: string;
      }[];
    };
    const choice = data.choices?.[0];
    const msg = choice?.message;
    let text = msg?.content ?? '';
    if (Array.isArray(text)) text = JSON.stringify(text);
    const thinkingText = msg?.reasoning_content || msg?.thinking || '';
    const toolsOut = new Map<number, ToolAcc>();
    for (const tc of msg?.tool_calls ?? []) {
      toolsOut.set(toolsOut.size, { id: tc.id, name: tc.function.name, args: tc.function.arguments || '{}' });
    }
    return finalize(text || '', toolsOut, choice?.finish_reason ?? '', thinkingText);
  }

  async function stream(req: ChatRequest, opts: ChatOpts): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: buildMessages(req),
      max_tokens: req.maxTokens ?? cfg.maxTokens,
      temperature: req.temperature ?? cfg.temperature,
      stream: true,
    };
    applyThinking(body, req);
    const tools = toOpenAiTools(req.tools);
    if (tools) body.tools = tools;

    const res = await fetchImpl(joinUrl(cfg.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.apiKey || 'not-needed'}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) throw new ProviderError(`openai HTTP ${res.status}`, res.status, await readError(res));
    if (!res.body) throw new ProviderError('openai: empty stream body');

    let text = '';
    let thinkingText = '';
    let finish = '';
    const acc = new Map<number, ToolAcc>();

    for await (const data of sseData(res)) {
      if (data === '[DONE]') break;
      let frame: {
        choices?: {
          delta?: {
            content?: string;
            reasoning_content?: string;
            thinking?: string;
            reasoning?: string;
            tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
          };
          finish_reason?: string | null;
        }[];
      };
      try {
        frame = JSON.parse(data);
      } catch {
        continue;
      }
      const choice = frame.choices?.[0];
      const reasoningChunk = choice?.delta?.reasoning_content || choice?.delta?.thinking || choice?.delta?.reasoning;
      if (reasoningChunk) {
        thinkingText += reasoningChunk;
        opts.onThinkingDelta?.(reasoningChunk);
      }
      if (choice?.delta?.content) {
        text += choice.delta.content;
        opts.onDelta?.(choice.delta.content);
      }
      for (const tc of choice?.delta?.tool_calls ?? []) {
        const i = tc.index ?? 0;
        let a = acc.get(i);
        if (!a) {
          a = { id: '', name: '', args: '' };
          acc.set(i, a);
        }
        if (tc.id) a.id = tc.id;
        if (tc.function?.name) a.name += tc.function.name;
        if (tc.function?.arguments) a.args += tc.function.arguments;
      }
      if (choice?.finish_reason) finish = choice.finish_reason;
    }

    return finalize(text, acc, finish, thinkingText);
  }

  return {
    name: 'openai-compatible',
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
