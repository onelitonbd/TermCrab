import { ChatOpts, ChatRequest, ChatResult, FetchLike, Provider, ProviderMessage, ToolDef } from './types.js';
import { readError } from './types.js';

/**
 * Ollama local provider (OpenAI-compatible, but with native Ollama API support).
 * Uses /api/chat endpoint for better tool calling support.
 */

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
}

interface OllamaResponse {
  message?: OllamaMessage;
  done?: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
}

function toOllamaMessages(messages: ProviderMessage[]): OllamaMessage[] {
  const out: OllamaMessage[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      out.push({
        role: 'assistant',
        content: m.content,
        tool_calls: m.toolCalls?.map((tc) => ({
          function: { name: tc.name, arguments: tc.args },
        })),
      });
    } else if (m.role === 'tool') {
      out.push({ role: 'tool', content: (m as { content?: string }).content ?? '' });
    }
  }
  return out;
}

function toOllamaTools(tools: ToolDef[]): unknown[] | undefined {
  if (!tools.length) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.schema,
    },
  }));
}

export function createOllama(
  cfg: { model: string; baseUrl?: string; maxTokens?: number; temperature?: number; stream?: boolean },
  fetchImpl: FetchLike = fetch,
): Provider {
  const base = cfg.baseUrl || 'http://127.0.0.1:11434';

  return {
    name: 'ollama',
    model: cfg.model,

    async chat(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
      const messages: OllamaMessage[] = [];
      if (req.system) messages.push({ role: 'system', content: req.system });
      messages.push(...toOllamaMessages(req.messages));

      const body: Record<string, unknown> = {
        model: cfg.model,
        messages,
        stream: cfg.stream !== false && opts?.onDelta ? true : false,
        options: {
          num_predict: cfg.maxTokens || 4096,
          temperature: cfg.temperature ?? 0.7,
        },
      };
      const tools = toOllamaTools(req.tools);
      if (tools) body.tools = tools;

      const res = await fetchImpl(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts?.signal,
      });
      if (!res.ok) {
        const errText = await readError(res);
        throw new Error(`Ollama HTTP ${res.status}: ${errText}`);
      }

      if (body.stream) {
        const text = await res.text();
        const lines = text.split('\n').filter((l) => l.trim());
        let fullText = '';
        const toolCalls: { id: string; name: string; args: Record<string, unknown> }[] = [];
        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaResponse;
            if (data.message?.content) {
              fullText += data.message.content;
              opts?.onDelta?.(data.message.content);
            }
            if (data.message?.tool_calls) {
              for (const tc of data.message.tool_calls) {
                toolCalls.push({
                  id: `ollama_${toolCalls.length}`,
                  name: tc.function.name,
                  args: tc.function.arguments,
                });
              }
            }
          } catch {
            /* skip malformed lines */
          }
        }
        return { text: fullText, toolCalls, stopReason: toolCalls.length ? 'tool' : 'end' };
      }

      const data = (await res.json()) as OllamaResponse;
      const msg = data.message;
      if (!msg) throw new Error('Ollama returned no message');

      const toolCalls = (msg.tool_calls ?? []).map((tc, i) => ({
        id: `ollama_${i}`,
        name: tc.function.name,
        args: tc.function.arguments,
      }));

      return { text: msg.content, toolCalls, stopReason: toolCalls.length ? 'tool' : 'end' };
    },
  };
}
