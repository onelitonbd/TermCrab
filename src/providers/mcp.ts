import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { ToolDef } from './types.js';

/**
 * Minimal MCP (Model Context Protocol) client over stdio.
 * Speaks JSON-RPC 2.0 to MCP servers. No external dependencies.
 */

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpClient {
  readonly name: string;
  listTools(): Promise<McpTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<string>;
  close(): void;
}

const JSONRPC_TIMEOUT_MS = 30_000;

export function createMcpClient(config: McpServerConfig): McpClient {
  const child: ChildProcessWithoutNullStreams = spawn(config.command, config.args ?? [], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...(config.env ?? {}) },
  });

  let msgId = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  let buffer = '';
  let closed = false;

  child.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as { id?: number; result?: unknown; error?: { message?: string } };
        if (msg.id !== undefined && pending.has(msg.id)) {
          const { resolve, reject } = pending.get(msg.id)!;
          pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message ?? 'MCP error'));
          else resolve(msg.result);
        }
      } catch {
        /* skip malformed lines */
      }
    }
  });

  child.stderr.on('data', (_chunk: Buffer) => {
    // swallow stderr — could log in debug mode
  });

  child.on('close', (code) => {
    closed = true;
    for (const { reject } of pending.values()) {
      reject(new Error(`MCP server ${config.name} closed (code ${code})`));
    }
    pending.clear();
  });

  child.on('error', (err) => {
    closed = true;
    for (const { reject } of pending.values()) {
      reject(new Error(`MCP server ${config.name} error: ${err.message}`));
    }
    pending.clear();
  });

  function sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (closed) return Promise.reject(new Error(`MCP server ${config.name} is closed`));
    const id = ++msgId;
    const msg = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP ${config.name} timeout: ${method}`));
      }, JSONRPC_TIMEOUT_MS);
      pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      child.stdin.write(`${JSON.stringify(msg)}\n`, 'utf8');
    });
  }

  async function initialize(): Promise<void> {
    await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'termcrab', version: '0.30.4' },
    });
    // Send initialized notification
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`, 'utf8');
  }

  // Auto-initialize on creation
  const initPromise = initialize().catch(() => {
    // Server may not support initialize — continue anyway
  });

  return {
    name: config.name,

    async listTools(): Promise<McpTool[]> {
      await initPromise;
      const result = (await sendRequest('tools/list')) as {
        tools?: { name: string; description?: string; inputSchema?: Record<string, unknown> }[];
      };
      return (result.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description ?? '',
        inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
      }));
    },

    async callTool(name: string, args: Record<string, unknown>): Promise<string> {
      await initPromise;
      const result = (await sendRequest('tools/call', { name, arguments: args })) as {
        content?: { type?: string; text?: string }[];
        isError?: boolean;
      };
      if (result.isError) {
        const text = result.content?.map((c) => c.text ?? '').join('\n') ?? 'unknown error';
        throw new Error(`MCP tool ${name} error: ${text}`);
      }
      return result.content?.map((c) => c.text ?? '').join('\n') ?? '';
    },

    close(): void {
      if (!closed) {
        child.stdin.end();
        child.kill('SIGTERM');
      }
    },
  };
}

/**
 * Convert MCP tools to TermCrab ToolDef format.
 */
export function mcpToolsToDefs(tools: McpTool[], serverName: string): ToolDef[] {
  return tools.map((t) => ({
    name: `mcp_${serverName}_${t.name}`,
    description: `[MCP:${serverName}] ${t.description}`.slice(0, 500),
    schema: t.inputSchema,
  }));
}
