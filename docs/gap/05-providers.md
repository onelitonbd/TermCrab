# OpenClaw providers — gap report

TermCrab's provider layer is 1,521 lines across seven files and speaks exactly **one** wire protocol:
OpenAI Chat Completions. `ProviderCfg.type` is the literal union `'openai'`
(`src/core/config.ts:7`), `resolveProvider()` unconditionally returns `createOpenAi()`
(`src/providers/index.ts:63`–`82`), and `normalizeProvider()` returns `'openai'` for *any* input
string including the historical aliases `anthropic`, `gemini`, `ollama`, `mock`
(`src/onboard.ts:155`–`158`). The provider brief handed to this report claimed TermCrab has
"OpenAI-compatible + Anthropic-style"; that is wrong — verified against source, there is no
Anthropic Messages client, no `x-api-key` header, no `anthropic-version` header, no
`thinking`/`redacted_thinking` wire block anywhere in `src/providers/`. What exists is *Anthropic-shaped
types* (`ProviderMessage.thinkingBlocks`, `ChatResult.thinkingBlocks`,
`src/providers/types.ts:26`, `:46`) that no code ever populates — `finalize()` returns
`{ text, toolCalls, stopReason, thinking }` and nothing else (`src/providers/openai.ts:255`), and the
only reader is a pass-through copy (`src/agent/loop.ts:83`, `:241`, `:322`). Against that, TermCrab
has one thing OpenClaw does not have in this form at all: an **active capability prober**. It sends
real `max_tokens: 1` requests at each reasoning effort level, records which the server accepts, caches
the answer keyed on `(baseUrl, model, sha1(apiKey)[0:8])` with a 7-day TTL, and *trusts that cache
above every name heuristic* (`src/providers/probe.ts:39`, `:125`–`:131`, `:141`–`:146`,
`:186`–`:368`; consumed at `src/providers/openai.ts:167`). It is wired to run automatically at gateway
start (`src/gateway/server.ts:586`–`599`) and on every provider config change
(`src/gateway/server.ts:319`–`331`). OpenClaw reaches the same knowledge by shipping a hand-written
model catalog per vendor (`/providers/ollama/model-discovery` reads Ollama's `/api/show`;
`/providers/lmstudio` reads `/api/v1/models`; OpenAI and Anthropic publish curated catalog JSON).
TermCrab's approach generalises to hosts nobody has ever catalogued, and it is the single most
transferable idea in this comparison. Everything else here is narrower.

## Scorecard

Effort = days for one experienced developer. "Absent" is verified against source with a `file:line`
proof point; the proof point is where the capability would live if it existed.

| Capability | OpenClaw | TermCrab (file:line) | Gap | Effort |
| --- | --- | --- | --- | --- |
| Wire protocols | Chat Completions + **Responses API** (`/providers/openai/advanced#server-side-compaction`) + Anthropic Messages + Ollama native `/api/chat` + Gemini `generateContent` + Bedrock Converse + Vertex + Azure OpenAI (`api-key` header, deployment paths, `api-version`) | Chat Completions only. `joinUrl()` appends `/chat/completions` or `/v1/chat/completions` and nothing else (`openai.ts:40`–`45`) | 7 of 8 protocols absent | 6 (Anthropic) / 3 (Ollama native) / 4 (Responses) / 3 (Azure) |
| Provider client abstraction | `api.registerProvider()` capability; 60 bundled `extensions/` (`plugins/architecture.md:34`–`56`; `dist/extensions/` = 60 dirs) | `createOpenAi()` is the only client; `resolveProvider()` has no dispatch table (`index.ts:63`–`82`) | No second client is reachable | 2 (extract a client registry) |
| Hardcoded known bases | 68 provider pages, each with its own quirks doc | 7 base URLs in one object: openai, openrouter, groq, deepseek, xai, mistral, ollama (`index.ts:9`–`17`) | 61 named hosts resolve as "custom" | 1 per host |
| `isWellKnownBase` origin matching | n/a | Origin-based, so `api.groq.com/anything` is "known" (`index.ts:40`–`45`) | Correct by design; do not "fix" | 0 |
| Auth header shape | Per-provider; OpenRouter `HTTP-Referer`/`X-Title`, AWS SigV4, Azure `api-key`, Tailscale identity | Hardcoded `authorization: Bearer ${apiKey \|\| 'not-needed'}` on every request (`openai.ts:273`, `:330`) | No custom headers, no Azure `api-key`, no AWS chain | 2 (header map) / 6 (AWS) |
| Auth profiles / OAuth | Per-agent SQLite profile store, `api_key`/`oauth`/`token`/`aws-sdk` types, rotation order, per-session pinning (`concepts/model-failover.md:150`–`210`) | One flat `apiKey` string (`config.ts:10`). Multiple keys per saved endpoint exist for *manual* selection only (`config.ts:18`–`34`, `provider-helpers.ts:52`–`58`) | No OAuth, no refresh, no rotation, no expiry | 12 (OAuth) |
| Cooldown ladder | 30 s → 1 min → 5 min by error count, stored in SQLite `usageStats` (`model-failover.md:270`–`280`) | Single flat `COOLDOWN_MS = 60_000` for every failure class (`index.ts:94`) | No backoff, no persistence — cooldowns die on restart | 2 |
| Cooldown classification | 429 + `Too many concurrent requests` + `ThrottlingException` + `quota limit exceeded` + 529 overloaded + 408/504/522/524/499 (`model-failover.md:229`–`243`) | Status set `{429,500,502,503,504}` or no status (`index.ts:143`). 401/402/408/529 → **no** cooldown | Auth and billing failures never cool down the key | 2 |
| Billing disable window | 10-minute `disabledUntil` on credit failures, distinct from rate-limit cooldown (`model-failover.md:295`–`310`) | Absent — verified: no `402`, no `disabled` field in `src/providers/` | A dead credit card is retried forever | 2 |
| `Retry-After` handling | SDK retry capped at 60 s (`OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS`), auth-failure skip cache with TTL (`model-failover.md:253`, `:283`–`292`) | Absent — verified: `grep -rn "retry-after\|retryAfter" src/providers/` returns nothing | No respect for server backoff hints | 1 |
| Failback semantics | Fallback is turn-local; session selection stays strict (`model-failover.md:60`–`65`) | Chain is rebuilt per turn and the winning fallback is not recorded (`index.ts:156`–`183`) | Consistent with OpenClaw; no gap | 0 |
| Provider chain construction | `agents.defaults.model.fallbacks`, per-agent overrides, cron payloads, selection-source policy (`model-failover.md:96`–`130`) | `config.fallbackProviders: ProviderCfg[]`, gated on `config.agent.failover` (`config.ts:55`, `:66`); only used when `fallbackProviders.length > 0` (`loop.ts:168`) | Flat single list; no per-agent/cron chain | 2 |
| `markProviderCooldown` / `providerInCooldown` exports | n/a | Exported (`index.ts:186`, `:191`) with **zero callers** outside `index.ts` — verified by grep | Dead exports; cooldown is only ever set from inside `FailoverProvider`'s own catch | 0 (delete or wire) |
| Cooldown key | Model-scoped (`cooldownModel`) | `openai:${baseUrl}:${model}` — no key component (`index.ts:97`) | Two keys on one endpoint share a cooldown | 0.5 |
| Capability probing | Per-vendor catalog reads: Ollama `/api/show`, LM Studio `/api/v1/models` reasoning options, OpenAI/Anthropic curated JSON | **Active prober**: sequential per-level requests, `BLAMES_REASONING` body matcher (`probe.ts:42`–`43`), 401/403/404 never cached (`probe.ts:297`–`306`), inconclusive results discarded (`probe.ts:349`–`357`), atomic write-then-rename (`probe.ts:114`–`118`) | **TermCrab is ahead.** OpenClaw has no equivalent generic prober | 0 — port to Anthropic |
| Probe cost control | n/a | 3 levels max, `max_tokens: 1`, `ping` user message, 8 s timeout, connection drained on success (`probe.ts:36`–`37`, `:196`–`198`, `:285`) | — | 0 |
| Probe mechanism negotiation | n/a | Tries `effort` then `budget` per level, learns which the server takes (`probe.ts:244`–`270`) | — | 0 |
| Probe undrained-error-body path | n/a | Non-ok body is only drained when it was read at `probe.ts:260`; the `!blames` break at `:262`–`266` and the `:309` accept path leave the response undrained | Socket can be closed mid-response; next probe may ECONNRESET | 0.5 |
| Thinking level scale | 6 real levels incl. Anthropic `minimal`; `xhigh`/`max` are distinct values on Claude 5.x (`providers/anthropic:615`–`694`) | 6 levels `none\|low\|medium\|high\|xhigh\|max` (`capabilities.ts:16`–`18`), but `thinkingLevelToEffort` collapses `xhigh`→`high` and `max`→`high` (`capabilities.ts:162`–`174`) | 4 of 6 levels are UI aliases on the effort path | 1 (when a provider supports >3 efforts) |
| `max_tokens` vs `max_completion_tokens` | Handled per provider | `usesMaxCompletionTokens()` keyed off `isOpenAiReasoningModel()`; `tokenLimitKey()` switches the request key (`capabilities.ts:62`–`64`, `openai.ts:132`–`134`) | Present and correct | 0 |
| Reasoning block echo-back | Anthropic `thinking`/`redacted_thinking` blocks stored and echoed verbatim (`providers/anthropic:398` "Tool calls and retained thinking") | Fields exist (`types.ts:26`, `:46`) and are copied (`loop.ts:83`, `:241`) but **never written** — `finalize()` omits them (`openai.ts:255`) | Dead type surface; costs nothing, does nothing | 0 (keep, or delete) |
| Reasoning-stream key coverage | n/a | Reads `reasoning_content` ∥ `thinking` ∥ `reasoning` in **both** paths — non-stream (`openai.ts:300`) and SSE (`openai.ts:363`) | Correct; do not regress | 0 |
| `<think>` tag stripping | n/a | Regex extraction in `finalize()` (`openai.ts:238`–`242`) | Correct | 0 |
| Streaming fallback | Native WS transport option (`providers/openai/advanced#transport-websocket-vs-sse`) | SSE with a non-duplicating retry guard: retries only when `emitted === 0` (`openai.ts:392`–`417`) | Correct; no WS | 2 |
| Model discovery | Ollama `/api/tags` + `/api/show`; LM Studio instance preloading; per-provider `models[]` with `contextWindow`/`maxTokens`/`cost`/`input` | `fetchProviderModels()` GETs `<base>/models`, tolerates `{data:[…]}` and Ollama's `{models:[…]}`, 15 s timeout, returns sorted unique ids (`provider-helpers.ts:61`–`92`) | Id list only — **no** context window, max tokens, cost, or modality per model | 3 |
| Model catalog metadata | `modelCatalog`, `modelPricing`, `modelIdNormalization`, `modelSupport` manifest fields (`plugins/manifest.md:216`+, top-level field reference) | User-ticked model ids persisted per endpoint (`config.ts:33`, `server.ts:1424`) | No metadata schema at all | 3 |
| Model aliases / families | Rolling bare aliases (`opus` → current generation), version-pinned escapes (`providers/anthropic:617`) | None — verified: no alias table in `src/providers/` | — | 1 |
| Usage / token accounting | Per-attempt usage in `usageStats`, `llm_output` hook carries usage (`plugins/hooks/reference:141`) | **Absent.** `ChatResult` has no `usage` field (`types.ts:40`–`47`); `openai.ts:279`–`291` parses only `choices`. Local-endpoint recovery from llama.cpp `timings.prompt_n`/`predicted_n` exists in OpenClaw (`providers/lmstudio:112`–`118`) | Cannot show cost, cannot budget, cannot detect context overflow | 3 |
| Cost / pricing | Published per-model input/output/cacheRead/cacheWrite; `modelPricing` opt-out policy (`providers/lmstudio:135`, `plugins/manifest.md`) | Absent — verified: no `cost`/`pricing` field in `src/providers/` or `config.ts` | — | 2 |
| Context window awareness | Per-model `contextWindow`, compaction thresholds (`providers/openai/setup#context-window-defaults-and-long-context-opt-in`) | Blind. Only `cfg.maxTokens` for *output*; input never counted (`config.ts:12`) | No truncation protection, no long-context opt-in | 3 |
| Vision / multimodal | Full: `input: ["text","image"]`, Ollama vision models, image gen/video/music, media understanding as a first-class capability (`providers/ollama/vision`, `providers/ollama/model-discovery:26`, `plugins/architecture.md:50`) | **Absent.** `buildMessages()` emits `content: m.content` as a bare string for user and tool roles (`openai.ts:58`, `:60`). `view_image` returns only format/dimensions/size — pixels never reach the model (`toolbox.ts:364`–`384`) | No image understanding at all | 4 |
| Image / video / audio generation | 3 separate registration APIs + ~12 vendor plugins (`plugins/architecture.md:48`–`52`, `dist/extensions/` has `image-generation-core`, `fal`, `google`) | Absent (no provider capability registry at all) | Out of scope for a Termux agent; only if wanted | 0 |
| Voice / realtime | TTS, STT, realtime transcription, realtime voice, duplex voice (`providers/openai/voice-and-speech`, `plugins/architecture.md:42`–`47`) | Local-only: `termux-transcribe` via a whisper ggml model (`cli.ts:859`), `termux say` for TTS. No provider capability | Deliberate; local-first is a defensible position | 0 |
| Embeddings | `registerEmbeddingProvider()`, generic contract consumed by tools + memory (`plugins/adding-capabilities:96`–`105`) | **Local only.** `@huggingface/transformers` / `@xenova`, model downloaded to `~/.termcrab/models`, opt-in via `memory.embeddings` (`config.ts:139`, `embed.ts`, `cli.ts:112`–`114`). Hybrid vector+lexical search (`memory.ts:89`–`140`) | No remote embedding provider; no provider pluggability | 2 |
| Ollama support | Native `/api/chat`, `/api/tags`, `/api/show`; **explicitly warns against `/v1`** because it breaks tool calling and emits raw tool-call JSON (`providers/ollama:12`–`20`) | Uses `/v1` (`index.ts:16`) and OpenAI-shaped tools (`openai.ts:47`–`53`) | **Live correctness risk** on Termux's primary local backend. See Loopholes §1 | 3 |
| Azure OpenAI | `api-key` header, `/openai/deployments/<name>/…?api-version=`, model name *is* the deployment name, documented parameter differences (`providers/openai/azure`) | Absent — verified: `grep -rn "azure\|api-version" src/providers/` returns nothing | — | 3 |
| Bedrock | Converse API, SigV4/instance-profile/credential-chain auth, IMDS discovery, region handling (`providers/bedrock`) | Absent | — | 6 |
| Vertex | `anthropic-vertex` bundled variant, GCP ADC, separate from Gemini API key (`providers/models:44`–`48`) | Absent | — | 6 |
| Gemini | Native `generateContent`, web search grounding, TTS, realtime voice, image/video/music gen (`providers/google`) | Absent | Reachability via OpenRouter/Gemini-OpenAI-compat only | 5 |
| Reasoning-model name heuristics | Curated per-family catalog + `/api/show` capability flags (`providers/ollama/model-discovery:26`) | Regex heuristics: `o[134]`, `gpt-5`, `codex`, `deepseek-r1`, `:thinking`, `-reasoner`, `qwq`, `kimi-k[12]` (`capabilities.ts:43`–`51`, `:99`–`134`) | Good coverage, but a heuristic where a probe exists — and it wins on *no* cache entry for non-custom hosts | 1 |
| Custom/self-hosted trust rule | n/a | Unknown host + user picked a level → always send reasoning params (`openai.ts:169`, `:179`–`182`) | Correct and well-documented | 0 |
| Official-OpenAI host guard | n/a | Exact hostname match, lookalike-safe, scheme-less fallback (`capabilities.ts:67`–`83`) | Correct; do not regress | 0 |
| `mechanism` fallback | n/a | `probedMechanism ?? (isOpenAiOfficial ? 'effort' : 'effort')` — **both arms identical** (`openai.ts:206`) | Dead ternary. A budget-only host (DeepSeek, vLLM) with a cold cache silently ignores reasoning until the probe lands | 0.5 |
| Failover mid-stream duplication | Handled by attempt boundaries | `FailoverProvider` calls `provider.chat(req, opts)` with the **same** `opts` (`index.ts:137`), so the next client's `emitted` counter starts at 0 (`openai.ts:394`–`396`) and re-emits from token 1. The `emitted > 0` guard at `openai.ts:413` is per-client and does not fire | **Bug**: partial reply from provider 1 + full reply from provider 2 both rendered. See Loopholes §2 | 1 |
| Provider health in UI | `openclaw doctor`, `plugins inspect`, `status --all` (`providers/models:82`–`86`) | `/api/probe`, `/api/probe/all` (`server.ts:1246`–`1310`), `/api/providers/detect` (`server.ts:1066`) | Present and arguably better (shows the probe) | 0 |
| Provider labels | Per-provider brand ids | 8-entry `known` host map (`provider-helpers.ts:36`–`45`) + `providerNameFor()` origin scan (`index.ts:48`–`54`) | Adequate | 0 |
| Secrets hygiene | `providerUsageAuthEnvVars` for usage-only credentials (`plugins/manifest.md`) | `maskApiKey()` shows first 3 + last 4 (`provider-helpers.ts:10`–`13`); keys live in plaintext `config.json` | Known from the gateway report; not provider-specific | 0 (cross-ref `02-gateway.md`) |

## Wire protocols

OpenClaw's provider breadth is not 68 hand-written clients — it is one capability contract
(`registerProvider`, `plugins/architecture.md:34`) filled by 60 bundled packages
(`dist/extensions/` contains 60 directories; `plugins/reference/` lists 164 reference pages spanning
providers, channels, media, memory, diagnostics, and integrations). A new vendor is a manifest plus
one `register()` call.

TermCrab has the opposite shape: a `createOpenAi()` factory that is parameterised by URL
(`openai.ts:124`) and one entry point that always calls it (`index.ts:63`–`82`). There is no
dispatch table to extend, so adding a second wire protocol is not a config change — it is a new
client plus a branch in `resolveProvider()`.

Priority order if protocols get added, based on reach rather than catalogue size:

| Protocol | Why | Cost | Where it plugs in |
| --- | --- | --- | --- |
| Ollama native `/api/chat` | Correctness on Termux's primary local backend (§1 below) | 3 d | New `createOllama()`; `resolveProvider()` branch on `providerNameFor() === 'ollama'` |
| Anthropic Messages | Largest demand, unlocks real extended thinking + prompt caching + 5 distinct efforts | 6 d | New `createAnthropic()`; populate the already-typed `thinkingBlocks` |
| Responses API | Server-side compaction, cached reasoning, async tools, steering | 4 d | New `createOpenAiResponses()` sharing the tool schema builder (`openai.ts:47`–`53`) |
| Azure OpenAI | Enterprise key requirement; mechanical once headers are parameterised | 3 d | Header map + path builder in `joinUrl()` (`openai.ts:40`–`45`) |
| Bedrock / Vertex / Gemini | Large setup surface, low Termux relevance | 6 d each | Only after the four above |

## Auth and credentials

TermCrab's key handling is a single string. `ProviderEntry` does hold multiple keys per saved
endpoint (`config.ts:26`–`34`) and `providerOutboundKey()` picks between them
(`provider-helpers.ts:52`–`58`), but nothing rotates. `providerOutboundKey` picks the *active* key
if it belongs to that endpoint, else `keys[0]`, else the CLI key — a fixed preference order with no
health signal, no expiry, no usage tracking, and no cooldown. OpenClaw's equivalent
(`model-failover.md:150`–`292`) is four credential types, a four-level rotation order, per-session
pinning for cache warmth, an error-count-scaled cooldown ladder, a billing-disable window, and an
auth-failure skip cache.

The cheap 80% is failure classification, not OAuth. Today `FailoverProvider` cools a key down only
for `{429, 500, 502, 503, 504}` or a status-less network error (`index.ts:143`). Adding 401/402/408/529
plus `Retry-After` parsing is roughly two days and fixes the common real-world cases: a revoked key
retried on every turn, and an exhausted-credit account retried on every turn.

OAuth is the expensive half and is worth deferring until there is a second provider that needs it.

## Failover and resilience

The chain itself is honest and correctly shaped: turn-local, rebuilt per turn, cooldown-aware
(`index.ts:156`–`183`), with abort errors correctly re-thrown rather than retried
(`index.ts:139`). Three concrete gaps, in order of value:

1. No backoff. One flat 60 s (`index.ts:94`). A provider that fails 20 turns in a row is retried
   every 60 s forever.
2. No persistence. `cooldowns` is a module-level `Map` (`index.ts:93`), so a gateway restart
   immediately re-hits a provider that was rate-limited one second ago. The gateway already restarts
   itself (`core/updater.ts`, supervisor), so this is not hypothetical.
3. No mid-stream guard (§2).

OpenClaw's failover doc is ~39 KB of policy. TermCrab needs ~40 lines to close the gap that
matters; matching OpenClaw's full policy is not worth it for a single-user Termux agent.

## Capability detection — the one place TermCrab wins

Do not undersell this. The prober is the best-engineered file in `src/providers/`.

| Property | TermCrab | Note |
| --- | --- | --- |
| Method | Ask the server, don't guess | `probe.ts:186`–`368` |
| Request cost | `max_tokens: 1`, single-token `ping` user message | `probe.ts:37`, `:219`–`223` |
| Level coverage | Sequential low/medium/high; first 401 short-circuits | `probe.ts:235`–`239`, `:297` |
| Rejection detection | Body regex `BLAMES_REASONING` | `probe.ts:42`–`43` |
| Mechanism discovery | Tries `effort`, falls back to `budget` | `probe.ts:244`–`270` |
| Poison-push protection | 401/403/404 and inconclusive results are **never cached** | `probe.ts:297`–`306`, `:349`–`357` |
| Correct request key per model | `max_completion_tokens` for reasoning models, so probe 400s aren't misread | `probe.ts:223` |
| Cache key | `(baseUrl, model, sha1(apiKey)[0:8])` | `probe.ts:125`–`131` |
| Cache durability | 7-day TTL, atomic write-then-rename, mtime-keyed in-memory mirror | `probe.ts:39`, `:92`–`:122` |
| Trigger | Automatic at gateway start and on provider config change | `server.ts:586`–`599`, `:319`–`331` |
| Trust order | probe cache > name heuristic > custom-host user intent > nothing | `openai.ts:166`–`183` |

The decision matrix in `openai.ts:139`–`161` is the clearest written justification of provider
behaviour in the repository. Two flaws only:

- `xhigh`/`max` collapse to `high` on the effort path (`capabilities.ts:167`–`171`), so a probed
  "supports high" result is reported as supporting all six levels (`probe.ts:326`–`329`) and the two
  extra UI levels are silently identical. Correct today; wrong the moment a provider exposes
  `xhigh` (Anthropic 5.x already does, `providers/anthropic:615`).
- The `mechanism` ternary at `openai.ts:206` has two identical arms.

The other thing OpenClaw has and the prober cannot replace: **catalog metadata**. `fetchProviderModels`
returns a sorted array of id strings (`provider-helpers.ts:91`). Nothing anywhere in TermCrab knows
a model's context window, output cap, cost, or modality. `/api/providers/:id/models` (`server.ts:1404`)
hands the UI bare ids. That is a three-day gap with a clear schema (id, contextWindow, maxTokens,
cost, input modalities, reasoning flag) and it fixes three problems at once: cost display, safe
compaction thresholds, and correct `max_tokens` for non-OpenAI hosts.

## Local and on-device inference

Termux's differentiator. `resolveProvider()` has a local-tier branch ahead of the failover chain
(`loop.ts:164`–`165`), so an on-device model serves light turns while cloud handles heavy ones. The
README states this as tiered inference. Two facts qualify it:

- The local tier is whatever `ctx.localProvider` holds; there is no automatic small-model routing
  decision in the provider layer.
- It inherits the `/v1` Ollama problem below.

Embeddings are local-only by design (`config.ts:139`, `cli.ts:112`–`114`), with hybrid
vector + lexical search over `MEMORY.md`, the last 30 daily logs, and compacted digests
(`memory.ts:96`–`128`). That is a solid design for a phone: no API key, no network, no cost. It does
mean memory search quality is bounded by whatever `@huggingface/transformers` can run in Termux, and
there is no fallback to a hosted embedding provider when that is unavailable.

## Loopholes and correctness bugs

Ordered by user-visible damage.

1. **Ollama over `/v1` is documented by OpenClaw as broken for tool calling.** `providers/ollama:12`–`20`
   carries an explicit `<Warning>`: *"Do not use the `/v1` OpenAI-compatible URL. It breaks tool calling
   and models can emit raw tool-call JSON as plain text."* TermCrab hardcodes
   `ollama: 'http://127.0.0.1:11434/v1'` (`index.ts:16`) and sends OpenAI-shaped `tools`
   (`openai.ts:47`–`53`). Termux is the primary target and a local Ollama/llama.cpp is the primary
   local story, so this is the highest-likelihood failure in this document. It is unverified either
   way in this repo — `grep -rn "ollama" test/` returns nothing — so treat the severity as
   "documented upstream, plausible here, untested locally."
2. **Failover duplicates a partial reply.** `FailoverProvider.chat()` forwards the caller's `opts`
   unchanged (`index.ts:137`). Client 1 streams 400 characters, then throws; client 2 starts with its
   own `emitted = 0` (`openai.ts:394`) and streams its whole answer. The `emitted > 0` guard that
   exists inside `createOpenAi` (`openai.ts:413`) cannot fire because the retry is a different client.
   The user sees the tail of one answer glued to the front of another. Fix: wrap `opts` once at the
   `FailoverProvider` boundary with a shared "already emitted" latch, or refuse to fail over once any
   delta has been forwarded.
3. **Cooldowns are lost on restart and ignore the API key.** `cooldowns` is an in-process `Map`
   (`index.ts:93`) and `providerKey()` omits the key (`index.ts:97`). The gateway self-restarts on
   update (`core/updater.ts`), so the first turn after every update re-hits a provider that was
   429'd.
4. **`mechanism` fallback is unreachable.** `openai.ts:206` evaluates
   `isOpenAiOfficial ? 'effort' : 'effort'`. A budget-only host (DeepSeek, vLLM, llama.cpp) reached
   before the startup probe completes — and the probe is fire-and-forget (`server.ts:590`) — gets
   `reasoning_effort`, which those servers ignore silently. Thinking appears to do nothing. The
   probe fixes it seconds later; the user sees one confusing turn.
5. **Undrained probe error bodies.** `probe.ts:262`–`266` breaks out of the mechanism-candidate loop
   on a non-`ok` response whose body doesn't blame reasoning, without calling `.text()`. The response
   body is never drained, and the `:309` accept path adds the level and continues. The comment at
   `probe.ts:282`–`284` explains exactly why this causes `ECONNRESET` on the next probe — the fix was
   applied to the success branch and not to this one.
6. **The four reasoning-stream keys are read, but the fourth shape is not.** `basic()` and `stream()`
   both read `reasoning_content ∥ thinking ∥ reasoning` (`openai.ts:300`, `:363`). Providers that
   return reasoning inside `delta.content` as a `<think>` block are handled by the regex in
   `finalize()` (`openai.ts:238`) but only for the *non-streamed* accumulated text — during SSE the
   tags arrive in fragments and the regex sees the un-closed buffer. Cosmetic (the trace leaks into
   the answer) but confusing.
7. **`thinkingBlocks` is a permanently-`undefined` field.** Declared at `types.ts:26` and `:46`,
   copied at `loop.ts:83`/`:241`/`:322`, never assigned. Serialised into session JSONL as `undefined`
   forever. Not a bug today; delete it or populate it in the Anthropic client.
8. **`providerInCooldown` and `markProviderCooldown` have no callers.** Verified by grep across
   `src/`. The cooldown map is only ever written from `FailoverProvider`'s own catch (`index.ts:144`),
   so a future caller cannot force a cooldown and the UI cannot display one.

Not bugs, but worth stating plainly: there is no `usage` accounting anywhere
(`ChatResult` at `types.ts:40`–`47` has no such field), so `agent.maxIterations` is the only cost
control that exists. `maxIterations` is set to a hard 1000 with a repetition detector as the real
guard (`loop.ts:197`, `:247`–`264`) — the config key is read nowhere. See `02-gateway.md` for the
adjacent finding that `queueMode` and `isolation` are likewise dead config.

## Sequenced worklist

Effort in days for one experienced developer. Blocks are ordered by damage prevented per day spent.

### Block 0 — correctness, 3 days

1. Fix the failover mid-stream duplication (§2). One shared emitted-latch at the `FailoverProvider`
   boundary. **1 day.**
2. Replace the identical-arm ternary at `openai.ts:206` with a real fallback: `isOpenAiOfficial ? 'effort' : 'budget'`-for-known-budget-hosts, and drain the probe body on the `!blames` path (`probe.ts:262`). **0.5 day.**
3. Add 401/402/408/529 to the cooldown set and honour `Retry-After` in `index.ts:143`. **1 day.**
4. Write an integration test against a real Ollama `/v1` endpoint with tool calling, so §1 is
   measured rather than inherited from a doc. **0.5 day.**

### Block 1 — make the local story correct, 3 days

5. Implement Ollama native `/api/chat` as a second client, selected by host in `resolveProvider()`,
   with `/v1` kept as an explicit opt-out rather than a default. **3 days.** If test 4 shows `/v1`
   tool calling works acceptably, downgrade this to 1 day and keep it as a config choice.

### Block 2 — observability that pays for itself, 8 days

6. Parse `usage` from both response paths and thread it onto `ChatResult`
   (`types.ts:40`). Include the llama.cpp `timings.prompt_n`/`predicted_n` recovery for loopback
   hosts, as OpenClaw does (`providers/lmstudio:112`–`118`). **2 days.**
7. Expose cumulative input/output tokens per session and in `session_status`
   (`toolbox.ts:774`). Makes #6 visible. **1 day.**
8. Give `ChatResult` a model-metadata envelope and widen `fetchProviderModels()`
   (`provider-helpers.ts:61`) to return `{id, contextWindow?, maxTokens?, input?, reasoning?}`
   rather than `string[]`. Keep string[] consumers working. **3 days.**
9. With #8: a context-window guard that counts input tokens against the discovered window and
   compacts before the server 400s. Reuse the existing compaction path (`sessions.ts:164`). **2 days.**

### Block 3 — resilience, 5 days

10. Replace the flat 60 s cooldown with an error-count ladder (30 s / 1 min / 5 min) and persist
    cooldowns + last-used to `~/.termcrab/state/` so a restart does not forget them. Include the API
    key fingerprint in the key. **3 days.**
11. Add a 10-minute billing-disable window distinct from the rate-limit cooldown. **2 days.**

### Block 4 — second protocol, 6 days

12. Anthropic Messages client: `/v1/messages`, `x-api-key`, `anthropic-version`, `thinking` block
    with `budget_tokens`, real 5-level efforts including `xhigh`, and population of the existing
    `thinkingBlocks` field. Port the prober to it — `probe.ts` is protocol-parameterised except for
    `probeOnce` (`probe.ts:210`–`231`), so this is mostly a new `probeOnce`. **6 days.**
13. Prompt caching (`cacheRetention: short|long|none`) on the Anthropic client. **1 day.**

### Block 5 — explicit, deferred

14. Responses API transport. **4 days.** Only if long-context or async tools become a real need.
15. Azure OpenAI (header + path parameterisation). **3 days.** Only for a named user.
16. Bedrock / Vertex / Gemini native. **6 days each.** Not justified for a Termux-first agent.
17. Remote embedding provider behind the same contract as the local one, selected by config.
    **2 days.** Only if local embedding quality proves insufficient in the field.
18. Vision input in `buildMessages()` (`openai.ts:55`–`74`) — content arrays with `image_url`.
    **4 days.** Note this needs the tool loop to accept image parts from channels first, so treat
    it as a channels project that lands here.

Total: 25 days for Blocks 0–4, which closes every correctness bug and every gap a single-user
Termux agent will actually hit. Items 14–18 are 17 more days of optional reach.