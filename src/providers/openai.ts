import {
  ChatRequest,
  ChatResult,
  FetchLike,
  Provider,
  ProviderError,
  readError,
  ToolDef,
} from './types.js';

interface OpenAiCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
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

/** Works for OpenAI, OpenRouter, Groq, DeepSeek, Ollama (/v1), and most compatible servers. */
export function createOpenAi(cfg: OpenAiCfg, fetchImpl: FetchLike = fetch): Provider {
  return {
    name: 'openai-compatible',
    model: cfg.model,
    async chat(req, opts) {
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

      const body: Record<string, unknown> = {
        model: cfg.model,
        messages,
        max_tokens: req.maxTokens ?? cfg.maxTokens,
        temperature: req.temperature ?? cfg.temperature,
      };
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
            tool_calls?: { id: string; function: { name: string; arguments: string } }[];
          };
          finish_reason?: string;
        }[];
      };
      const choice = data.choices?.[0];
      const msg = choice?.message;
      let text = msg?.content ?? '';
      const toolCalls: ChatResult['toolCalls'] = [];
      for (const tc of msg?.tool_calls ?? []) {
        let args: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(tc.function.arguments || '{}');
          if (parsed && typeof parsed === 'object') args = parsed as Record<string, unknown>;
        } catch {
          args = {};
        }
        toolCalls.push({ id: tc.id || `call_${toolCalls.length}`, name: tc.function.name, args });
      }
      if (Array.isArray(text)) text = JSON.stringify(text); // some servers return array content
      const stopReason =
        choice?.finish_reason === 'tool_calls' || toolCalls.length ? 'tool' : choice?.finish_reason === 'length' ? 'length' : choice?.finish_reason === 'stop' ? 'end' : 'unknown';
      if (!text) text = '';
      return { text, toolCalls, stopReason };
    },
  };
}
