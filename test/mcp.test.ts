import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMcpClient, mcpToolsToDefs } from '../src/providers/mcp.js';

// Helper: create a minimal MCP server script for testing
const MCP_SERVER_SCRIPT = `
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2024-11-05', capabilities: {} } }) + '\\n');
    } else if (msg.method === 'tools/list') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'echo', description: 'Echo text', inputSchema: { type: 'object', properties: { text: { type: 'string' } } } }] } }) + '\\n');
    } else if (msg.method === 'tools/call') {
      const text = msg.params?.arguments?.text ?? '';
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'Echo: ' + text }] } }) + '\\n');
    }
  } catch {}
});
`;

test('mcp: listTools returns tools from server', async () => {
  const client = createMcpClient({
    name: 'test',
    command: 'node',
    args: ['-e', MCP_SERVER_SCRIPT],
  });
  const tools = await client.listTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0]!.name, 'echo');
  client.close();
});

test('mcp: callTool returns result', async () => {
  const client = createMcpClient({
    name: 'test',
    command: 'node',
    args: ['-e', MCP_SERVER_SCRIPT],
  });
  const result = await client.callTool('echo', { text: 'hello' });
  assert.ok(result.includes('Echo: hello'), `expected "Echo: hello", got: ${result}`);
  client.close();
});

test('mcp: mcpToolsToDefs converts tools correctly', () => {
  const tools = [
    { name: 'echo', description: 'Echo text', inputSchema: { type: 'object', properties: {} } },
    { name: 'add', description: 'Add numbers', inputSchema: { type: 'object', properties: {} } },
  ];
  const defs = mcpToolsToDefs(tools, 'myserver');
  assert.equal(defs.length, 2);
  assert.equal(defs[0]!.name, 'mcp_myserver_echo');
  assert.ok(defs[0]!.description.includes('[MCP:myserver]'));
  assert.equal(defs[1]!.name, 'mcp_myserver_add');
});

test('mcp: callTool on closed client throws', async () => {
  const client = createMcpClient({
    name: 'test',
    command: 'node',
    args: ['-e', 'setTimeout(() => {}, 1000)'],
  });
  client.close();
  await assert.rejects(() => client.callTool('echo', { text: 'hi' }), /closed/);
});

test('mcp: listTools on server with no tools returns empty', async () => {
  const client = createMcpClient({
    name: 'empty',
    command: 'node',
    args: ['-e', `
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin });
      rl.on('line', (line) => {
        try {
          const msg = JSON.parse(line);
          if (msg.method === 'initialize') {
            process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }) + '\\n');
          } else if (msg.method === 'tools/list') {
            process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [] } }) + '\\n');
          }
        } catch {}
      });
    `],
  });
  const tools = await client.listTools();
  assert.equal(tools.length, 0);
  client.close();
});
