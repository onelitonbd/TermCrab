/**
 * Google Gemini's own wire format (batch 27.2, census row "Google Gemini native").
 *
 * Gemini's API is not OpenAI-shaped either: roles are `user`/`model`, there is
 * no system message (it is a `systemInstruction`), tools are
 * `functionDeclarations` with a `parameters` schema, a tool result is a
 * `functionResponse` part inside a user turn, and images travel as
 * `inlineData`. Function calls carry no ids, so this adapter mints stable ones
 * (`gemini-<turn>-<name>`) and remembers the name on the way back, which is
 * what the loop's `tool_result` needs.
 */
import { FetchLike, Provider, ProviderError, ProviderMessage, ChatImage, ChatOpts, ChatRequest, ChatResult } from './types.js';
import { isAbortError } from './types.js';
import { sseData } from './sse.js';

export interface GeminiCfg {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

const DEFAULT_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function geminiUrl(baseUrl: string | undefined, model: string, opts: { stream: boolean; apiKey?: string }): string {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, '');
  const method = opts.stream ? 'streamGenerateContent' : 'generateContent';
  const suffix = opts.stream ? '&alt=sse' : '';
  const key = opts.apiKey ? `?key=${encodeURIComponent(opts.apiKey)}` : '';
  const sep = key ? '&' : '?';
  return `${base}/models/${encodeURIComponent(model)}:${method}${key}${opts.stream ? suffix.replace('&', sep === '?' ? '?' : '&') : ''}`;
}

type Part = Record<string, unknown>;

export interface GeminiContent {
  role: 'user' | 'model';
  parts: Part[];
}

/** Provider messages -> Gemini `contents` (system hoisted out). */
export function toGeminiContents(messages: ProviderMessage[], image?: ChatImage): GeminiContent[] {
  const out: GeminiContent[] = [];
  const lastUser = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i]!.role === 'user') return i;
    return -1;
  })();

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === 'system') continue;
    if (m.role === 'tool') {
      const part: Part = {
        functionResponse: { name: m.toolName || 'tool', response: { result: m.content || '(no output)' } },
      };
      const last = out[out.length - 1];
      // Gemini expects function responses in a user turn; merge consecutive ones.
      if (last && last.role === 'user' && last.parts.every((p) => 'functionResponse' in p)) last.parts.push(part);
      else out.push({ role: 'user', parts: [part] });
      continue;
    }
    if (m.role === 'assistant') {
      const parts: Part[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const call of m.toolCalls ?? []) parts.push({ functionCall: { name: call.name, args: call.args ?? {} } });
      if (!parts.length) parts.push({ text: '' });
      out.push({ role: 'model', parts });
      continue;
    }
    const parts: Part[] = [];
    if (image && i === lastUser) parts.push({ inlineData: { mimeType: image.mimeType, data: image.dataBase64 } });
    if (m.content) parts.push({ text: m.content });
    if (!parts.length) parts.push({ text: '' });
    out.push({ role: 'user', parts });
  }
  return out;
}

interface GeminiCandidate {
  content?: { parts?: Part[] };
  finishReason?: string;
}

interface GeminiPayload {
  candidates?: GeminiCandidate[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
}

function usageOf(u: GeminiPayload['usageMetadata']): ChatResult['usage'] {
  if (!u || (u.promptTokenCount == null && u.candidatesTokenCount == null)) return undefined;
  const prompt = u.promptTokenCount ?? 0;
  const completion = u.candidatesTokenCount ?? 0;
  return { promptTokens: prompt, completionTokens: completion, totalTokens: u.totalTokenCount ?? prompt + completion };
}

function stopOf(reason: string | undefined, sawTool: boolean): ChatResult['stopReason'] {
  if (sawTool) return 'tool';
  if (reason === 'STOP' || reason === 'FINISH_REASON_STOP') return 'end';
  if (reason === 'MAX_TOKENS') return 'length';
  return 'unknown';
}

/** One candidate's parts -> ChatResult (shared by streaming and not). */
export function readGeminiCandidate(candidate: GeminiCandidate | undefined, usage: GeminiPayload['usageMetadata'], turn = 0): ChatResult {
  let text = '';
  const toolCalls: ChatResult['toolCalls'] = [];
  for (const part of candidate?.content?.parts ?? []) {
    if (typeof part.text === 'string') text += part.text;
    else if (part.functionCall) {
      const call = part.functionCall as { name?: string; args?: Record<string, unknown> };
      toolCalls.push({
        id: `gemini-${turn}-${toolCalls.length + 1}-${call.name ?? 'tool'}`,
        name: String(call.name ?? 'tool'),
        args: call.args ?? {},
      });
    }
  }
  return { text, toolCalls, stopReason: stopOf(candidate?.finishReason, toolCalls.length > 0), usage: usageOf(usage) };
}

export function createGemini(cfg: GeminiCfg, fetchImpl: FetchLike = fetch): Provider {
  const stream = cfg.stream !== false;
  let turn = 0;

  const body = (req: ChatRequest): string =>
    JSON.stringify({
      contents: toGeminiContents(req.messages, req.image),
      systemInstruction: { parts: [{ text: req.system }] },
      ...(req.tools.length
        ? {
            tools: [
              {
                functionDeclarations: req.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                  parameters: t.schema,
                })),
              },
            ],
          }
        : {}),
      generationConfig: {
        ...(req.maxTokens ?? cfg.maxTokens ? { maxOutputTokens: req.maxTokens ?? cfg.maxTokens } : {}),
        ...(req.temperature != null || cfg.temperature != null ? { temperature: req.temperature ?? cfg.temperature } : {}),
      },
    });

  return {
    name: 'gemini',
    model: cfg.model,

    async chat(req: ChatRequest, opts: ChatOpts = {}): Promise<ChatResult> {
      turn++;
      const res = await fetchImpl(geminiUrl(cfg.baseUrl, cfg.model, { stream, apiKey: cfg.apiKey }), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(cfg.apiKey ? { 'x-goog-api-key': cfg.apiKey } : {}),
        },
        body: body(req),
        signal: opts.signal,
      }).catch((err) => {
        throw isAbortError(err) ? err : new ProviderError(`gemini unreachable: ${(err as Error).message}`);
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ProviderError(`gemini ${res.status}: ${text.slice(0, 300)}`, res.status, text);
      }

      if (!stream || !res.body) {
        const payload = (await res.json()) as GeminiPayload;
        return readGeminiCandidate(payload.candidates?.[0], payload.usageMetadata, turn);
      }

      // Streaming frames are whole candidates with partial parts; text parts are
      // deltas, function calls arrive once.
      let text = '';
      let usage: GeminiPayload['usageMetadata'];
      let finish: string | undefined;
      const calls: ChatResult['toolCalls'] = [];
      for await (const data of sseData(res)) {
        let payload: GeminiPayload;
        try {
          payload = JSON.parse(data) as GeminiPayload;
        } catch {
          continue;
        }
        usage = payload.usageMetadata ?? usage;
        const candidate = payload.candidates?.[0];
        finish = candidate?.finishReason ?? finish;
        for (const part of candidate?.content?.parts ?? []) {
          if (typeof part.text === 'string' && part.text) {
            text += part.text;
            opts.onDelta?.(part.text);
          } else if (part.functionCall) {
            const call = part.functionCall as { name?: string; args?: Record<string, unknown> };
            if (!calls.some((c) => c.name === call.name && JSON.stringify(c.args ?? {}) === JSON.stringify(call.args ?? {}))) {
              calls.push({
                id: `gemini-${turn}-${calls.length + 1}-${call.name ?? 'tool'}`,
                name: String(call.name ?? 'tool'),
                args: call.args ?? {},
              });
            }
          }
        }
      }
      return { text, toolCalls: calls, stopReason: stopOf(finish, calls.length > 0), usage: usageOf(usage) };
    },
  };
}

/** Gemini's own model list, for `termcrab models` (catalog row, 27.3). */
export async function listGeminiModels(
  baseUrl: string | undefined,
  apiKey: string | undefined,
  fetchImpl: FetchLike = fetch,
): Promise<{ id: string; label: string }[]> {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, '').replace(/\/v1beta$/, '');
  const res = await fetchImpl(`${base}/v1beta/models${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`);
  if (!res.ok) throw new ProviderError(`gemini models ${res.status}`, res.status);
  const payload = (await res.json()) as { models?: { name?: string; displayName?: string }[] };
  return (payload.models ?? [])
    .map((m) => ({ id: String(m.name ?? '').replace(/^models\//, ''), label: m.displayName ?? '' }))
    .filter((m) => m.id);
}
