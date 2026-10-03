# Providers and models

**Their pages:** 98 under `/providers` (per-vendor pages, OAuth flows, failover, auth-credential semantics) + 58 under `/concepts` on models, model-providers and failover.
**Catalogue:** [`../sections/06-models.md`](../sections/06-models.md).

---

## 1. Where TermCrab is: 35%, and mostly honest

**Real:** one OpenAI-compatible client (`src/providers/openai.ts`) with host presets for OpenAI, OpenRouter, Groq, DeepSeek, xAI, Mistral and Ollama (`src/providers/index.ts:10-18`), host-aware capability heuristics (`capabilities.ts`), live model probing (`/api/probe`, `/api/providers/detect`), a picker (`src/channels/picker.ts`), a **failover chain with cooldowns**, a local-model tier wired to dreaming, and — the good part — thinking-level mapping per host/model.

That is a deliberate design: one client covers ~20 real endpoints (OpenAI, OpenRouter, Groq, DeepSeek, xAI, Mistral, Ollama, vLLM, llama.cpp, LM Studio, Together, Fireworks…). For a phone-first product this is arguably the right call, and the `capabilities.ts` heuristics are smarter than they look.

**The lie to fix:** `anthropic` and `gemini` are named in onboarding and accepted in config, then silently coerced: `merged.provider.type = 'openai'` (`src/core/config.ts:205`). A user who selects Anthropic gets an OpenAI-compatible request to an Anthropic base URL. Either add native adapters or stop naming them.

## 2. What their provider layer has that yours genuinely cannot match cheaply

- **35+ providers as plugins**, including OAuth subscription flows (Claude Pro/Max, Copilot, Qwen portals) — the difference between "bring an API key" and "use the subscription you already pay for".
- **Model catalog with per-model capability data** (context windows, tool support, vision, reasoning) rather than name heuristics.
- **Auth profiles**: multiple keys per provider, rotation, SecretRef indirection, credential discovery from external CLIs, and a documented probe-reason vocabulary so failures are diagnosable.
- **Model failover as a documented contract** — chains, cooldowns, overflow recovery.

## 3. What a phone-first provider layer should do instead

1. **Native Anthropic adapter (4d)** — not for elegance, for *prompt caching*. On a phone on mobile data, Anthropic's cache hits are the single biggest cost/latency lever a personal agent has. (Gemini is 3d and can wait.)
2. **Key-per-provider → key-per-purpose (2d)**: `agent.fallbackProviders` exists; add a second key for the same provider so a rate-limited key can rotate.
3. **Cost accounting (3d, already in the core lane)** — carry `usage` into events and the UI. On a phone this is not a nice-to-have; the user is paying per token on a metered connection.
4. **Model catalog (2d)**: a small checked-in JSON of context windows + tool/vision support for the 30 most common models, with the heuristic as a fallback. Removes the "why did it stop calling tools at 8k tokens" class of bug.
5. **Local tier for more than dreaming (3d)**: route summarisation, title generation, memory extraction and heartbeat ticks to `config.localProvider` before spending cloud tokens.
6. **Stop naming what does not exist (0.5d)**: either the adapter ships or onboarding says "Anthropic via OpenAI-compatible endpoint".

## 4. Done tests

- Choosing "Anthropic" in onboarding produces a real Anthropic Messages API request (native adapter), or the option is gone.
- `termcrab status` shows tokens + estimated cost for today, per model.
- A forced 429 on the primary provider silently fails over and the turn completes (existing behaviour; add the test to pin it).
- Swapping `localProvider` to a local Ollama instance moves dreaming + summarisation off the cloud (observable in logs).

## 5. The strategic note

Their provider breadth exists to serve people who will try anything and read logs when it breaks. Your user is on a phone, paying for data, and wants the assistant to just work. So the value is not in 35 providers; it is in **picking the right model automatically, failing over without a retry prompt, and never spending money silently**. Cost transparency + failover + a good local tier is a better phone-LLM story than a long provider list — and it is ~12 days, not 12 months.
