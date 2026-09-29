import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { AddressInfo } from 'node:net';
import { defaults } from '../src/core/config.js';
import { AgentCtx, runTurn } from '../src/agent/loop.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { SkillStore } from '../src/skills/loader.js';
import { resolveProvider } from '../src/providers/index.js';

function makeCtx(): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ttier-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  return {
    ctx: {
      config,
      memory: new MemoryStore(path.join(home, 'memory')),
      sessions: new SessionStore(path.join(home, 'sessions')),
      skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
    },
    home,
  };
}

test('tier routing: local uses localProvider, cloud ignores it, missing local falls back', async () => {
  let localHits = 0;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      localHits++;
      assert.ok(req.url?.endsWith('/chat/completions'), `unexpected url ${req.url}`);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: { role: 'assistant', content: '[local:fake-model] hello from the on-device tier' },
              finish_reason: 'stop',
            },
          ],
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  try {
    const { ctx } = makeCtx();
    ctx.localProvider = resolveProvider({
      type: 'openai',
      baseUrl: `http://127.0.0.1:${port}/v1`,
      model: 'fake-model',
      apiKey: 'test',
      stream: false,
    });

    const localReply = await runTurn(ctx, {
      sessionId: 'tier-local',
      userMessage: 'hi',
      tier: 'local',
    });
    assert.match(localReply, /on-device tier/);
    assert.equal(localHits, 1, 'local tier must hit the local endpoint');

    const cloudReply = await runTurn(ctx, {
      sessionId: 'tier-cloud',
      userMessage: 'hi',
      tier: 'cloud',
    });
    assert.match(cloudReply, /\[mock:mock-1\]/);
    assert.equal(localHits, 1, 'cloud tier must NOT hit the local endpoint');

    // tier=local without a configured local provider falls back to the main provider.
    const { ctx: bare } = makeCtx();
    bare.localProvider = undefined;
    const fallback = await runTurn(bare, {
      sessionId: 'tier-fallback',
      userMessage: 'hi',
      tier: 'local',
    });
    assert.match(fallback, /\[mock:mock-1\]/);
    assert.equal(localHits, 1, 'fallback must NOT hit the local endpoint');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
