# TermCrab Agentic Gap Plan

> How we close the 20 gaps between TermCrab and OpenClaw — without losing our soul.
> Mobile-first, zero-dep, phone-native. Updated 2026-09-30.

## The 4 Core Fixes (make it agentic, not chatty)

These are the difference between "a chatbot with tools" and "an agent that does things."

### A1. Context survival — compaction, not truncation

**Problem:** `src/agent/sessions.ts:138` `maybeTrim()` deletes old lines. `src/agent/memory.ts:32` `readHead(3000)` truncates `MEMORY.md`. The agent forgets.

**Fix:**
- Add `compactSession(sessionId)` to `src/agent/sessions.ts`: when `KEEP` threshold hits, summarize the overflow into `MEMORY.md` via a local LLM call (or cloud if available), then trim.
- Add token counting (rough: `text.length / 4`) to `src/agent/loop.ts` — enforce `agent.maxTokens` budget per turn.
- Add `agent.compactThreshold` config (default: 60 entries).

**Files:** `src/agent/sessions.ts`, `src/agent/memory.ts`, `src/agent/loop.ts`, `src/core/config.ts`

**Effort:** 2-3 days. **Impact:** Highest. This is the single biggest agentic gap.

---

### A2. Task persistence — queues, interrupt, steer

**Problem:** `src/agent/loop.ts:93` `runTurn()` is a single blocking call. No queue, no interrupt, no steer. One turn = one shot.

**Fix:**
- Add `SessionQueue` to `src/agent/sessions.ts`: per-session FIFO with modes (`steer` = inject mid-turn, `followup` = queue for next turn, `collect` = drain queue before replying, `interrupt` = abort current run).
- Add `agent.wait` equivalent: `waitForTurn(sessionId, timeout)` in `src/agent/loop.ts`.
- Wire into `src/gateway/server.ts`: `POST /api/chat` becomes `enqueueTurn()` + `GET /api/chat/:id/status`.
- Add `agent.queueMode` config (default: `followup`).

**Files:** `src/agent/sessions.ts`, `src/agent/loop.ts`, `src/gateway/server.ts`, `src/core/config.ts`

**Effort:** 3-4 days. **Impact:** High. Enables multi-step tasks, user interruptions, background work.

---

### A3. Action surface — browser + code execution

**Problem:** Agent can only `web_fetch` text. Can't click, can't render JS, can't run code safely.

**Fix:**
- Add `browser` tool to `src/agent/tools.ts`: read-only Playwright-core (no deps on Termux — use system Chrome via CDP if available, else skip).
- Add `code_exec` tool: QuickJS sandbox (pure JS, no native deps) for safe code execution.
- Add `screenshot` tool: CDP `Page.captureScreenshot` if browser available.
- Gate behind `agent.allowBrowser` and `agent.allowCodeExec` config (default: false on mobile, true on desktop).

**Files:** `src/agent/tools.ts`, `src/core/config.ts`, `package.json` (add `quickjs-emscripten` as optional dep)

**Effort:** 4-5 days. **Impact:** High. This is what makes an agent *see* and *do*.

---

### A4. Failure recovery — model failover

**Problem:** `src/providers/index.ts:19` `resolveProvider()` returns one provider. One 429 or timeout kills the turn.

**Fix:**
- Add `ProviderChain` to `src/providers/index.ts`: ordered list of providers, try each on failure with cooldown.
- Add `providers: ProviderCfg[]` config array + `agent.failover` config (default: true).
- Add cooldown tracking: `providerCooldowns: Map<string, number>` in `src/providers/index.ts`.
- Wire into `src/agent/loop.ts`: `chatWithTimeout` tries chain on failure.

**Files:** `src/providers/index.ts`, `src/agent/loop.ts`, `src/core/config.ts`

**Effort:** 2 days. **Impact:** High. Turns survive provider hiccups.

---

## Phase 2: Expand surface area (more things the agent can do)

### B1. MCP client (Model Context Protocol)

**Why:** OpenClaw speaks MCP. If you do, any MCP server becomes a tool source.

**Fix:** Add `src/providers/mcp.ts` — stdio MCP client (JSON-RPC over stdin/stdout). Add `mcp` tool to `src/agent/tools.ts` that lists/calls MCP tools. Config: `mcp.servers: [{ name, command, args }]`.

**Effort:** 3 days. **Impact:** Medium-high. Unlocks GitHub, filesystem, database MCP servers.

---

### B2. More tools

| Tool | What | Effort |
|---|---|---|
| `image_gen` | Replicate/Stability API for images | 1 day |
| `pdf_extract` | Pure-JS PDF text extraction | 2 days |
| `email_send` | SMTP via `nodemailer` (optional dep) | 1 day |
| `calendar` | CalDAV read/write | 2 days |
| `contacts` | Termux:API `termux-contact-list` | 0.5 days |
| `sms_send` | Termux:API `termux-sms-send` | 0.5 days |
| `location` | Termux:API `termux-location` | 0.5 days |
| `clipboard` | Termux:API `termux-clipboard-get/set` | 0.5 days |
| `camera` | Termux:API `termux-camera-photo` | 0.5 days |
| `battery` | Termux:API `termux-battery-status` | 0.5 days |

**Total:** ~8 days. **Impact:** Medium. Each is a phone-native superpower OpenClaw doesn't have.

---

### B3. More channels

| Channel | Library | Effort |
|---|---|---|
| Discord | `discord.js` (optional) | 2 days |
| Slack | `@slack/bolt` (optional) | 2 days |
| Signal | `signal-cli` external | 1 day |
| iMessage | macOS native | 2 days |
| SMS/MMS | Twilio | 1 day |
| Matrix | `matrix-js-sdk` (optional) | 2 days |

**Total:** ~10 days. **Impact:** Medium. Each is a new user surface.

---

### B4. More providers

| Provider | Effort |
|---|---|
| Google Gemini | 1 day |
| Ollama (local) | 0.5 days |
| OpenRouter | 0.5 days (already OpenAI-compatible) |
| Groq | 0.5 days (already OpenAI-compatible) |
| xAI | 0.5 days (already OpenAI-compatible) |
| Mistral | 0.5 days (already OpenAI-compatible) |

**Total:** ~3 days. **Impact:** Medium. Most are free via OpenAI-compatible base URL.

---

### B5. Inbound webhooks

**Why:** External services should be able to poke the agent.

**Fix:** Add `POST /api/hooks/:id` to `src/gateway/server.ts`. Validates hook token, enqueues a turn with the webhook payload as the user message. Config: `hooks: [{ id, token, prompt }]`.

**Effort:** 1 day. **Impact:** Medium. Enables GitHub/Stripe/CI integrations.

---

### B6. Canvas / A2UI (agent-driven UI)

**Why:** Agent should be able to push live widgets to the Control UI.

**Fix:** Add `canvas` tool to `src/agent/tools.ts`: `canvas_update(widgetId, html)` pushes to SSE subscribers. Add `src/gateway/canvas.ts`: widget registry + SSE broadcast. Update `ui/index.html` to render widgets.

**Effort:** 2 days. **Impact:** Medium. Differentiator for proactive agents.

---

## Phase 3: Polish (make it feel mature)

### C1. Config hot-reload

**Fix:** Watch `config.json` with `fs.watch()` in `src/gateway/server.ts`. On change, reload config, re-resolve provider, log the diff. No restart needed.

**Effort:** 0.5 days. **Impact:** Medium. Quality of life.

---

### C2. Observability

**Fix:** Add `src/core/tracing.ts`: run spans (start/end/duration), token counts, tool call latencies. Export to `/api/traces` (JSON) and optional OTel endpoint. Add `agent.tracing` config.

**Effort:** 2 days. **Impact:** Medium. Debugging and cost tracking.

---

### C3. Session replay

**Fix:** Add `replaySession(sessionId)` to `src/agent/sessions.ts`: re-execute a session's user messages with full tool trace. Add `POST /api/sessions/:id/replay` to gateway.

**Effort:** 1 day. **Impact:** Medium. Debugging and demos.

---

### C4. Voice depth

**Fix:** Add continuous STT mode (not just two-phase). Add `voice_continuous` config. Add TTS streaming (chunked synthesis). Add `src/mobile/tts-stream.ts`.

**Effort:** 3 days. **Impact:** Medium. Hands-free phone agent.

---

### C5. Testing maturity

**Fix:** Add channel contract tests (mock Telegram/WhatsApp servers). Add `test/fixtures/` with recorded API responses. Add fuzzing for `parseCron` and `parseFrontmatter`. Add `npm run test:watch`.

**Effort:** 3 days. **Impact:** Medium. Confidence to refactor.

---

### C6. Multi-agent isolation

**Fix:** Add `agent.isolation` config: `shared` (current) vs `isolated` (separate memory/skills per agent). Add `AGENTS.md` roster to `workspace/`. Add `@mention` handoff protocol in `src/channels/telegram.ts`.

**Effort:** 2 days. **Impact:** Medium. Team of agents.

---

## Phase 4: Ecosystem (the long game)

### D1. ClawHub-compatible skill registry

**Fix:** Add `termcrab skills publish` — push a skill to a registry. Add `termcrab skills search` — query ClawHub. Add `termcrab skills install <name>` — pull from registry.

**Effort:** 3 days. **Impact:** High long-term. Access to 13k skills.

---

### D2. Plugin SDK

**Fix:** Add `packages/plugin-sdk/` — typed interface for channels/providers/tools. Add `termcrab plugin init` scaffold. Add `termcrab plugin publish`.

**Effort:** 5 days. **Impact:** High long-term. Community extensions.

---

### D3. Community building

**Fix:** 
- `docs/LAUNCH.md` — Show HN, r/termux, r/LocalLLaMA posts
- `SOUL.md` gallery — templates for students/devs/families
- `termcrab doctor --share` — redacted diagnostic paste for issue triage
- Weekly build-in-public thread

**Effort:** Ongoing. **Impact:** High long-term. The moat.

---

## Priority Order (what to build first)

| Priority | Item | Effort | Impact |
|---|---|---|---|
| P0 | A1. Compaction | 2-3d | Highest |
| P0 | A4. Failover | 2d | High |
| P1 | A2. Queues | 3-4d | High |
| P1 | A3. Browser + code | 4-5d | High |
| P2 | B1. MCP client | 3d | Med-high |
| P2 | B2. Phone tools (sms, camera, location, clipboard) | 2d | Medium |
| P2 | B5. Webhooks | 1d | Medium |
| P3 | C1. Hot-reload | 0.5d | Medium |
| P3 | C2. Tracing | 2d | Medium |
| P3 | B6. Canvas | 2d | Medium |
| P4 | B3. More channels | 10d | Medium |
| P4 | B4. More providers | 3d | Medium |
| P4 | D1. Skill registry | 3d | High long-term |
| P4 | D2. Plugin SDK | 5d | High long-term |

## What we deliberately DON'T build

- **Desktop apps** (macOS/iOS/Android native) — we're phone-first, web UI is enough
- **Docker/systemd** — Termux is the platform, supervisor is the init
- **Proot** — never, ever
- **164 extensions** — we add what users ask for, not what looks impressive
- **VC funding** — open-core, community-driven

## Success metrics

| Horizon | Metric |
|---|---|
| After A1+A4 | Agent survives 20-turn tasks without forgetting |
| After A2+A3 | Agent can browse the web and run code |
| After B1+B2 | Agent has 40+ tools, speaks MCP |
| After P0-P3 | Feels like OpenClaw on a phone |
| After P4 | Community starts contributing |

---

*The goal isn't to be OpenClaw. It's to be the agent that works on a phone when OpenClaw can't even start.*
