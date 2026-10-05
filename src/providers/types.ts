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

/**
 * One picture to look at (16.2). Attached to the request rather than embedded
 * in a message so that `ProviderMessage.content` stays a plain string for every
 * existing caller, transcript and compaction path: only an adapter that knows
 * how to send an image looks at this field at all.
 */
export interface ChatImage {
  /** e.g. image/jpeg. Anything else is refused before a request is made. */
  mimeType: string;
  /** Base64, without the `data:` prefix. */
  dataBase64: string;
}

export interface ChatRequest {
  system: string;
  messages: ProviderMessage[];
  tools: ToolDef[];
  maxTokens?: number;
  temperature?: number;
  thinkingLevel?: ThinkingLevel;
  /** When set, the last `user` message carries this picture (vision models). */
  image?: ChatImage;
}

/**
 * What a provider really billed for one call.
 *
 * `estimated` marks a number this client computed (the offline mock provider)
 * rather than one a server reported — every surface that shows it says so.
 * When a server reports nothing, `ChatResult.usage` stays `undefined`: we never
 * guess a token count from text length and present it as a measurement.
 */
export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimated?: boolean;
}

export interface ChatResult {
  text: string;
  toolCalls: { id: string; name: string; args: Record<string, unknown> }[];
  stopReason: 'end' | 'tool' | 'length' | 'unknown';
  thinking?: string;
  /** Raw reasoning blocks to store and send back verbatim (Anthropic). */
  thinkingBlocks?: unknown[];
  /** Tokens reported by the server for this call, when it reported any. */
  usage?: Usage;
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
