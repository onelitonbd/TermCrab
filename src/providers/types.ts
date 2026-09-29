/** Provider-agnostic chat contract used by the agent loop. */

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema for arguments. */
  schema: Record<string, unknown>;
}

export type ProviderRole = 'user' | 'assistant' | 'tool';

export interface ProviderMessage {
  role: ProviderRole;
  content: string;
  /** Present on assistant messages that request tools. */
  toolCalls?: { id: string; name: string; args: Record<string, unknown> }[];
  /** Present on role:"tool" results. */
  toolCallId?: string;
  /** Original tool name for role:"tool" results (Anthropic mapping). */
  toolName?: string;
}

export interface ChatRequest {
  system: string;
  messages: ProviderMessage[];
  tools: ToolDef[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  text: string;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
  stopReason: 'end' | 'tool' | 'length' | 'unknown';
}

export interface Provider {
  readonly name: string;
  readonly model: string;
  chat(req: ChatRequest, opts?: { signal?: AbortSignal }): Promise<ChatResult>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 600);
  } catch {
    return '';
  }
}

export { readError };
