# TermCrab Architecture

Inspired by the OpenClaw architecture (Gateway / Agent / Skills / Memory) — see
[OPENCLAW_REPORT.md](../OPENCLAW_REPORT.md) — rebuilt mobile-first with zero runtime
dependencies.

## Component map

```
src/
├── bin/termcrab.ts        # entry: loads bionic guard FIRST, then CLI
├── cli.ts                 # command dispatch (parseArgs, zero deps)
├── onboard.ts             # wizard (interactive + flags)
├── core/
│   ├── paths.ts           # TCRAB_HOME resolution, package root discovery, layout
│   ├── config.ts          # config.json load/save/merge, dotted get/set
│   ├── frontmatter.ts     # dependency-free YAML-ish frontmatter parser
│   └── logger.ts          # leveled logger
├── gateway/
│   ├── server.ts          # HTTP API + SSE + static UI + channel/heartbeat wiring
│   ├── auth.ts            # constant-time token checks (header or query)
│   └── events.ts          # in-process bus -> SSE subscribers
├── agent/
│   ├── loop.ts            # the agent run: prompt -> model -> tools -> repeat
│   ├── prompt.ts          # system prompt (SOUL + memory + skills index + env)
│   ├── tools.ts           # tool registry + path guard + shell resolver
│   ├── memory.ts          # MEMORY.md + daily logs + lexical search
│   ├── sessions.ts        # JSONL transcripts with rolling window
│   └── heartbeat.ts       # proactive tick: power check -> checklist -> run
├── channels/
│   ├── api.ts             # Telegram Bot API client (global fetch)
│   └── telegram.ts        # long-poll loop, allowlist, chunking, outbox
├── providers/
│   ├── types.ts           # ChatRequest/ChatResult/Provider contract
│   ├── anthropic.ts       # Messages API (content blocks, tool_use)
│   ├── openai.ts          # chat/completions (works for OpenRouter/Groq/Ollama/...)
│   ├── mock.ts            # offline deterministic provider (tests + demo)
│   └── index.ts           # resolveProvider()
├── skills/loader.ts       # SkillStore: discovery, override, prompt index
├── mobile/                # ★ the differentiator
│   ├── bionic.ts          # Android guard: networkInterfaces + TMPDIR fixes
│   ├── power.ts           # battery readout + adaptive heartbeat decision
│   ├── outbox.ts          # offline message queue (persist + retry)
│   ├── supervisor.ts      # restart watchdog (systemd replacement)
│   ├── boot.ts            # Termux:Boot script installer
│   └── doctor.ts          # diagnostics with fix suggestions
└── ...

skills/                    # bundled SKILL.md skills (user skills live in ~/.termcrab/skills)
ui/index.html              # control UI (single file, mobile-first, SSE)
test/*.test.ts             # node:test suite
```

## Data layout (state lives in `TCRAB_HOME`, default `~/.termcrab`)

```
~/.termcrab/
├── config.json            # provider, gateway token, channel allowlists, heartbeat
├── workspace/
│   ├── SOUL.md            # identity/personality
│   └── HEARTBEAT.md       # proactive checklist
├── memory/
│   ├── MEMORY.md          # long-term facts (injected into every prompt, head-limited)
│   └── daily/2026-09-29.md
├── sessions/*.jsonl       # transcripts (rolling window of 80 entries)
├── skills/                # user skills (override bundled ones)
├── state/                 # telegram offset, outbox, pid
└── logs/                  # supervisor tee
```

## Agent run sequence

1. Channel (web/CLI/telegram) receives a message → `runTurn(ctx, …)`
2. User entry appended to the session JSONL
3. System prompt assembled: identity (SOUL.md) + memory head + skills index + env blurb
4. Loop (max `agent.maxIterations`, default 8):
   - transcript → provider messages (orphan tool results dropped)
   - provider chat call (180s timeout)
   - tool calls executed (policy/roots enforced) → results appended
   - repeat until a pure text answer
5. Events stream to SSE subscribers (`tool:start`, `delta`, `run:end`, …)
6. Final answer persisted; channel replies (Telegram chunks + HTML-escapes)

## Security invariants

1. Gateway binds `127.0.0.1` by default; **non-loopback + empty token = refuse to start**
2. All `/api/*` except `/api/health` require a bearer/query token (constant-time compare)
3. Telegram: empty allowlist = channel off; foreign senders get a lock notice
4. File tools resolve symlinks and stay inside `TCRAB_HOME` + cwd; `exec` is optional
5. Bionic guard + TMPDIR fix run before any other module (import order is load-bearing)

## Why zero dependencies

Every dependency is an install-time failure on Termux (native builds, glibc assumptions)
and an audit surface. Node 20+ gives us `fetch`, `parseArgs`, `node:test`, `node:http` —
everything else we wrote. The two devDependencies (typescript, @types/node) never reach
users' runtime.
