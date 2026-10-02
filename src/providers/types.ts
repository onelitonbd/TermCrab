/** Provider-agnostic chat contract used by the agent loop. */

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema for arguments. */
  schema: Record<string, unknown>;
}

export type ProviderRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ProviderMessage {
  role: ProviderRole;
  content: string;
  /** Present on assistant messages that request tools. */
  toolCalls?: { id: string; name: string; args: Record<string, unknown> }[];
  /** Present on role:"tool" results. */
  toolCallId?: string;
  /** Original tool name for role:"tool" results (Anthropic mapping). */
  toolName?: string;
  /**
   * Raw reasoning blocks from the provider (Anthropic thinking / redacted_thinking).
   * They must be echoed back verbatim on the next turn, otherwise a tool-result
   * follow-up is rejected. Other providers leave this unset.
   */
  thinkingBlocks?: unknown[];
}

export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ChatRequest {
  system: string;
  messages: ProviderMessage[];
  tools: ToolDef[];
  maxTokens?: number;
  temperature?: number;
  thinkingLevel?: ThinkingLevel;
}

export interface ChatResult {
  text: string;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
  stopReason: 'end' | 'tool' | 'length' | 'unknown';
  thinking?: string;
  /** Raw reasoning blocks to store and send back verbatim (Anthropic). */
  thinkingBlocks?: unknown[];
}

export interface ChatOpts {
  signal?: AbortSignal;
  /** Incremental text deltas for typewriter UX (streaming providers). */
  onDelta?: (chunk: string) => void;
  /** Incremental thinking/reasoning deltas for thinking UX. */
  onThinkingDelta?: (chunk: string) => void;
}

export interface Provider {
  readonly name: string;
  readonly model: string;
  chat(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult>;
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

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || name === 'TimeoutError';
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
