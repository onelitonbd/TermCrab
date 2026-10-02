import { ChatOpts, ChatRequest, ChatResult, FetchLike, Provider, ProviderMessage, ToolDef } from './types.js';
import { readError } from './types.js';
import { getModelCapabilities, thinkingLevelToTokens } from './capabilities.js';

/**
 * Google Gemini provider (REST API, no SDK needed).
 * Supports streaming, tool calling, and content blocks.
 */

interface GeminiPart {
  text?: string;
  /** Gemini marks reasoning summaries with thought: true. */
  thought?: boolean;
  functionCall?: { name: string; args: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: {
    content: GeminiContent;
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

function toGeminiMessages(messages: ProviderMessage[]): GeminiContent[] {
  const out: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'assistant') {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.toolCalls) {
        for (const tc of m.toolCalls) {
          parts.push({ functionCall: { name: tc.name, args: tc.args } });
        }
      }
      out.push({ role: 'model', parts });
    }
    // tool results are merged into the next user message
  }
  return out;
}

function toGeminiTools(tools: ToolDef[]): { functionDeclarations: unknown[] } | undefined {
  if (!tools.length) return undefined;
  return {
    functionDeclarations: tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.schema,
    })),
  };
}

export function createGemini(
  cfg: { apiKey: string; model: string; baseUrl?: string; maxTokens?: number; temperature?: number; stream?: boolean },
  fetchImpl: FetchLike = fetch,
): Provider {
  const base = cfg.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  const model = cfg.model || 'gemini-2.0-flash';
  const caps = getModelCapabilities(model, 'gemini');
  // Gemini accepts thinking budgets between 1K and 24K tokens; clamp so a High/
  // XHigh/Max choice can never turn into a 400 for an out-of-range budget.
  const GEMINI_MAX_THINKING_BUDGET = 24576;

  function thinkingConfig(req: ChatRequest): Record<string, unknown> | undefined {
    if (!req.thinkingLevel || req.thinkingLevel === 'none') return undefined;
    if (!caps.supportsThinking) return undefined;
    const budget = thinkingLevelToTokens(req.thinkingLevel);
    if (!budget) return undefined;
    return { thinkingBudget: Math.min(budget, GEMINI_MAX_THINKING_BUDGET), includeThoughts: true };
  }

  return {
    name: 'gemini',
    model: cfg.model,

    async chat(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
      const contents = toGeminiMessages(req.messages);
      const tools = toGeminiTools(req.tools);
      const generationConfig: Record<string, unknown> = {
        maxOutputTokens: cfg.maxTokens || 8192,
        temperature: cfg.temperature ?? 0.7,
      };
      const thinkCfg = thinkingConfig(req);
      if (thinkCfg) generationConfig.thinkingConfig = thinkCfg;
      const body: Record<string, unknown> = { contents, generationConfig };
      if (tools) body.tools = [tools];
      if (req.system) body.systemInstruction = { parts: [{ text: req.system }] };

      const url = `${base}/models/${model}:streamGenerateContent?alt=sse&key=${cfg.apiKey}`;

      if (cfg.stream !== false && opts?.onDelta) {
        // Streaming
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: opts?.signal,
        });
        if (!res.ok) {
          const errText = await readError(res);
          throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
        }
        const text = await res.text();
        // Parse SSE chunks
        const chunks = text.split('\n\n').filter((c) => c.startsWith('data: '));
        let fullText = '';
        let thinkingText = '';
        const toolCalls: { id: string; name: string; args: Record<string, unknown> }[] = [];
        for (const chunk of chunks) {
          try {
            const data = JSON.parse(chunk.slice(6)) as GeminiResponse;
            const candidate = data.candidates?.[0];
            if (!candidate) continue;
            for (const part of candidate.content.parts) {
              if (part.text && part.thought) {
                thinkingText += part.text;
                opts.onThinkingDelta?.(part.text);
              } else if (part.text) {
                fullText += part.text;
                opts.onDelta?.(part.text);
              }
              if (part.functionCall) {
                toolCalls.push({
                  id: `gemini_${toolCalls.length}`,
                  name: part.functionCall.name,
                  args: part.functionCall.args,
                });
              }
            }
          } catch {
            /* skip malformed chunks */
          }
        }
        return {
          text: fullText,
          toolCalls,
          stopReason: toolCalls.length ? 'tool' : 'end',
          thinking: thinkingText || undefined,
        };
      }

      // Non-streaming
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts?.signal,
      });
      if (!res.ok) {
        const errText = await readError(res);
        throw new Error(`Gemini HTTP ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as GeminiResponse;
      const candidate = data.candidates?.[0];
      if (!candidate) throw new Error('Gemini returned no candidates');

      const parts = candidate.content.parts;
      const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text!).join('');
      const thinking = parts.filter((p) => p.text && p.thought).map((p) => p.text!).join('');
      const toolCalls = parts
        .filter((p) => p.functionCall)
        .map((p, i) => ({
          id: `gemini_${i}`,
          name: p.functionCall!.name,
          args: p.functionCall!.args,
        }));

      return { text, toolCalls, stopReason: toolCalls.length ? 'tool' : 'end', thinking: thinking || undefined };
    },
  };
}
