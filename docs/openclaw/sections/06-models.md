# Models

<sub>Generated catalogue of **98 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/providers`](#providers-provider-directory) — Provider directory
- [`/providers/models`](#providersmodels-model-provider-quickstart) — Model provider quickstart
- [`/concepts/models`](#conceptsmodels-models-cli) — Models CLI
- [`/concepts/decision-models`](#conceptsdecision-models-decision-models) — Decision models
- [`/concepts/model-providers`](#conceptsmodel-providers-model-providers) — Model providers
- [`/concepts/model-providers/quick-rules`](#conceptsmodel-providersquick-rules-quick-rules) — Quick rules
- [`/concepts/model-providers/control-ui-and-keys`](#conceptsmodel-providerscontrol-ui-and-keys-control-ui-and-api-keys) — Control UI and API keys
- [`/concepts/model-providers/official-provider-plugins`](#conceptsmodel-providersofficial-provider-plugins-official-provider-plugins) — Official provider plugins
- [`/concepts/model-providers/custom-providers`](#conceptsmodel-providerscustom-providers-custom-providers-and-local-runtimes) — Custom providers and local runtimes
- [`/concepts/model-failover`](#conceptsmodel-failover-model-failover) — Model failover
- [`/providers/alibaba`](#providersalibaba-alibaba-model-studio) — Alibaba Model Studio
- [`/providers/anthropic`](#providersanthropic-anthropic) — Anthropic
- [`/plugins/reference/anthropic-vertex`](#pluginsreferenceanthropic-vertex-anthropic-vertex-plugin-reference) — Anthropic Vertex plugin reference
- [`/providers/arcee`](#providersarcee-arcee-ai) — Arcee AI
- [`/providers/baseten`](#providersbaseten-baseten) — Baseten
- [`/providers/bedrock`](#providersbedrock-amazon-bedrock) — Amazon Bedrock
- [`/providers/bedrock-mantle`](#providersbedrock-mantle-amazon-bedrock-mantle) — Amazon Bedrock Mantle
- [`/providers/cerebras`](#providerscerebras-cerebras) — Cerebras
- [`/providers/chutes`](#providerschutes-chutes) — Chutes
- [`/providers/cohere`](#providerscohere-cohere) — Cohere
- [`/providers/deepinfra`](#providersdeepinfra-deepinfra) — DeepInfra
- [`/providers/deepseek`](#providersdeepseek-deepseek) — DeepSeek
- [`/providers/featherless`](#providersfeatherless-featherless-ai) — Featherless AI
- [`/providers/fireworks`](#providersfireworks-fireworks) — Fireworks
- [`/providers/github-copilot`](#providersgithub-copilot-github-copilot) — GitHub Copilot
- [`/providers/gmi`](#providersgmi-gmi-cloud) — GMI Cloud
- [`/providers/google`](#providersgoogle-google-gemini) — Google (Gemini)
- [`/providers/groq`](#providersgroq-groq) — Groq
- [`/providers/huggingface`](#providershuggingface-hugging-face-inference) — Hugging Face (inference)
- [`/providers/longcat`](#providerslongcat-longcat) — LongCat
- [`/providers/meta`](#providersmeta-meta) — Meta
- [`/providers/minimax`](#providersminimax-minimax) — MiniMax
- [`/providers/mistral`](#providersmistral-mistral) — Mistral
- [`/providers/moonshot`](#providersmoonshot-moonshot-ai) — Moonshot AI
- [`/providers/novita`](#providersnovita-novitaai) — NovitaAI
- [`/providers/nvidia`](#providersnvidia-nvidia) — NVIDIA
- [`/providers/ollama-cloud`](#providersollama-cloud-ollama-cloud) — Ollama Cloud
- [`/providers/openai`](#providersopenai-openai) — OpenAI
- [`/providers/openai/setup`](#providersopenaisetup-openai-setup) — OpenAI setup
- [`/providers/openai/authentication`](#providersopenaiauthentication-openai-authentication) — OpenAI authentication
- [`/providers/openai/models`](#providersopenaimodels-openai-models) — OpenAI models
- [`/providers/openai/runtimes`](#providersopenairuntimes-openai-runtimes-and-codex-auth) — OpenAI runtimes and Codex auth
- [`/providers/openai/coverage-and-cost`](#providersopenaicoverage-and-cost-openai-coverage-and-cost) — OpenAI coverage and cost
- [`/providers/openai/image-and-video`](#providersopenaiimage-and-video-openai-image-generation) — OpenAI image generation
- [`/providers/openai/voice-and-speech`](#providersopenaivoice-and-speech-openai-voice-and-speech) — OpenAI voice and speech
- [`/providers/openai/azure`](#providersopenaiazure-azure-openai-endpoints) — Azure OpenAI endpoints
- [`/providers/openai/advanced`](#providersopenaiadvanced-openai-advanced-configuration) — OpenAI advanced configuration
- [`/providers/opencode`](#providersopencode-opencode) — OpenCode
- [`/providers/opencode-go`](#providersopencode-go-opencode-go) — OpenCode Go
- [`/providers/perplexity-provider`](#providersperplexity-provider-perplexity) — Perplexity
- [`/providers/qianfan`](#providersqianfan-qianfan) — Qianfan
- [`/providers/qwen`](#providersqwen-qwen) — Qwen
- [`/providers/radius`](#providersradius-radius) — Radius
- [`/providers/stepfun`](#providersstepfun-stepfun) — StepFun
- [`/providers/synthetic`](#providerssynthetic-synthetic) — Synthetic
- [`/providers/telnyx`](#providerstelnyx-telnyx) — Telnyx
- [`/providers/tencent`](#providerstencent-tencent-cloud-tokenhub-tokenplan) — Tencent Cloud (TokenHub / TokenPlan)
- [`/providers/together`](#providerstogether-together-ai) — Together AI
- [`/providers/venice`](#providersvenice-venice-ai) — Venice AI
- [`/providers/volcengine`](#providersvolcengine-volcengine-doubao) — Volcengine (Doubao)
- [`/providers/xai`](#providersxai-xai) — xAI
- [`/providers/xiaomi`](#providersxiaomi-xiaomi-mimo) — Xiaomi MiMo
- [`/providers/zai`](#providerszai-zai) — Z.AI
- [`/providers/azure-speech`](#providersazure-speech-azure-speech) — Azure Speech
- [`/providers/deepgram`](#providersdeepgram-deepgram) — Deepgram
- [`/providers/elevenlabs`](#providerselevenlabs-elevenlabs) — ElevenLabs
- [`/providers/fish-audio`](#providersfish-audio-fish-audio) — Fish Audio
- [`/providers/gradium`](#providersgradium-gradium) — Gradium
- [`/providers/inworld`](#providersinworld-inworld) — Inworld
- [`/providers/senseaudio`](#providerssenseaudio-senseaudio) — SenseAudio
- [`/providers/comfy`](#providerscomfy-comfyui) — ComfyUI
- [`/providers/fal`](#providersfal-fal) — Fal
- [`/providers/kie`](#providerskie-kie-ai) — Kie AI
- [`/providers/pixverse`](#providerspixverse-pixverse) — PixVerse
- [`/providers/runway`](#providersrunway-runway) — Runway
- [`/providers/vydra`](#providersvydra-vydra) — Vydra
- [`/providers/claude-max-api-proxy`](#providersclaude-max-api-proxy-claude-max-api-proxy) — Claude Max API proxy
- [`/providers/clawrouter`](#providersclawrouter-clawrouter) — ClawRouter
- [`/providers/cloudflare-ai-gateway`](#providerscloudflare-ai-gateway-cloudflare-ai-gateway) — Cloudflare AI gateway
- [`/providers/kilocode`](#providerskilocode-kilo-gateway) — Kilo Gateway
- [`/providers/litellm`](#providerslitellm-litellm) — LiteLLM
- [`/providers/openrouter`](#providersopenrouter-openrouter) — OpenRouter
- [`/providers/vercel-ai-gateway`](#providersvercel-ai-gateway-vercel-ai-gateway) — Vercel AI gateway
- [`/providers/ds4`](#providersds4-ds4) — ds4
- [`/providers/llmman`](#providersllmman-llmman) — llmman
- [`/providers/lmstudio`](#providerslmstudio-lm-studio) — LM Studio
- [`/providers/ollama`](#providersollama-ollama) — Ollama
- [`/providers/ollama/setup`](#providersollamasetup-ollama-setup) — Ollama setup
- [`/providers/ollama/model-discovery`](#providersollamamodel-discovery-ollama-model-discovery) — Ollama model discovery
- [`/providers/ollama/node-local-inference`](#providersollamanode-local-inference-ollama-node-local-inference) — Ollama node-local inference
- [`/providers/ollama/vision`](#providersollamavision-ollama-vision-and-image-description) — Ollama vision and image description
- [`/providers/ollama/configuration`](#providersollamaconfiguration-ollama-configuration) — Ollama configuration
- [`/providers/ollama/recipes`](#providersollamarecipes-ollama-config-recipes) — Ollama config recipes
- [`/providers/ollama/web-search`](#providersollamaweb-search-ollama-web-search) — Ollama Web Search
- [`/providers/ollama/advanced`](#providersollamaadvanced-ollama-advanced-configuration) — Ollama advanced configuration
- [`/providers/ollama/troubleshooting`](#providersollamatroubleshooting-ollama-troubleshooting) — Ollama troubleshooting
- [`/providers/sglang`](#providerssglang-sglang) — SGLang
- [`/providers/vllm`](#providersvllm-vllm) — vLLM

## Document sections

### `/providers` — Provider directory

**Provider directory** · *Models › Overview*

> Model providers (LLMs) supported by OpenClaw

<sub>source `docs/providers/index.md` · 108 lines · 357 words · 1 code blocks</sub>

**Read when:** You want to choose a model provider · You need a quick overview of supported LLM backends

**Covers:** Quick start · Provider docs · Shared overview pages · Transcription providers · Community tools

**CLI:** `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers](https://docs.openclaw.ai/providers)</sub>

---

### `/providers/models` — Model provider quickstart

**Model provider quickstart** · *Models › Overview*

> Model providers (LLMs) supported by OpenClaw

<sub>source `docs/providers/models.md` · 66 lines · 231 words · 1 code blocks</sub>

**Read when:** You want to choose a model provider · You want quick setup examples for LLM auth + model selection

**Covers:** Quick start (two steps) · Supported providers (starter set) · Additional provider variants · Related

**CLI:** `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/models](https://docs.openclaw.ai/providers/models)</sub>

---

### `/concepts/models` — Models CLI

**Models CLI** · *Models › Concepts and configuration*

> How OpenClaw resolves provider/model refs, config keys, and the /model chat command

<sub>source `docs/concepts/models.md` · 552 lines · 5200 words · 8 code blocks</sub>

**Read when:** Changing model fallback behavior or selection UX · Debugging "model is not allowed" or a stale default provider fallback · Working on models.json merge/secret behavior

**Covers:** Selection order · Selection source and fallback strictness · Quick model policy · Onboarding · "Model is not allowed" (and why replies stop) · Choose a model for a session · /model in chat · CLI · Models registry (models.json) · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw config set`, `openclaw doctor`, `openclaw health`, `openclaw infer`, `openclaw models`, `openclaw models aliases`, `openclaw models auth`

**Config:** `agents.defaults.decisionModel`, `agents.defaults.imageModel`, `agents.defaults.model`, `agents.defaults.model.fallbacks`, `agents.defaults.model.primary`, `agents.defaults.modelPolicy.allow`, `agents.defaults.modelSelectionScope`, `agents.defaults.models`

**TermCrab — providers: PARTIAL.** Failover chain + cooldowns implemented; no model catalog, no per-model capability table, no usage accounting.

<sub>live: [docs.openclaw.ai/concepts/models](https://docs.openclaw.ai/concepts/models)</sub>

---

### `/concepts/decision-models` — Decision models

**Decision models** · *Models › Concepts and configuration*

> Choose decision models and define typed choices, scores, and Boolean judgments

<sub>source `docs/concepts/decision-models.md` · 361 lines · 1963 words · 6 code blocks</sub>

**Read when:** Choosing between a chat, utility, or decision model · Defining classification or scoring rubrics · Calling or implementing the decision model plugin API

**Covers:** Choose a provider and model · Define a decision · Agent evaluation tool · Call from a plugin · Interpret scores and probabilities · Limits and unavailable results · Provide models from a plugin

**CLI:** `openclaw onnx models`, `openclaw onnx probe`

**Config:** `models.list.decisionModels`

<sub>live: [docs.openclaw.ai/concepts/decision-models](https://docs.openclaw.ai/concepts/decision-models)</sub>

---

### `/concepts/model-providers` — Model providers

**Model providers** · *Models › Concepts and configuration*

> Index of the model provider reference: quick rules, Control UI and keys, bundled provider plugins, and custom providers

<sub>source `docs/concepts/model-providers.md` · 87 lines · 428 words · 1 code blocks</sub>

**Read when:** You need a provider-by-provider model setup reference · You want example configs or CLI onboarding commands for model providers

**Covers:** Where each section moved · CLI examples · Related

**CLI:** `openclaw models`, `openclaw models list`, `openclaw models set`, `openclaw onboard`

**Config:** `models.providers`

<sub>live: [docs.openclaw.ai/concepts/model-providers](https://docs.openclaw.ai/concepts/model-providers)</sub>

---

### `/concepts/model-providers/quick-rules` — Quick rules

**Quick rules** · *Models › Model providers*

> Model refs, CLI helpers, the primary-model preservation rule, and the OpenAI provider/runtime split.

<sub>source `docs/concepts/model-providers/quick-rules.md` · 48 lines · 468 words</sub>

**Read when:** You need the model-ref and CLI-helper basics · You are adding provider auth and want to keep your primary model · You need the OpenAI provider/runtime or CLI-runtime split

**Covers:** Quick rules

**CLI:** `openclaw configure`, `openclaw models auth`, `openclaw models list`, `openclaw models set`, `openclaw onboard`

**Config:** `agents.defaults.model.primary`, `agents.defaults.modelPolicy.allow`, `agents.defaults.models`, `models.providers.*.maxTokens`, `models.providers.*.models[]`

<sub>live: [docs.openclaw.ai/concepts/model-providers/quick-rules](https://docs.openclaw.ai/concepts/model-providers/quick-rules)</sub>

---

### `/concepts/model-providers/control-ui-and-keys` — Control UI and API keys

**Control UI and API keys** · *Models › Model providers*

> Configuring providers from Settings - Models, plugin-owned provider behavior, and API key rotation.

<sub>source `docs/concepts/model-providers/control-ui-and-keys.md` · 59 lines · 548 words</sub>

**Read when:** You are adding or replacing provider keys in the Control UI · You want to know what provider plugins own · You are configuring multiple API keys or rotation

**Covers:** Configure providers in the Control UI · Plugin-owned provider behavior · API key rotation

**CLI:** `openclaw models auth`, `openclaw models fallbacks`

**Config:** `agents.defaults`

<sub>live: [docs.openclaw.ai/concepts/model-providers/control-ui-and-keys](https://docs.openclaw.ai/concepts/model-providers/control-ui-and-keys)</sub>

---

### `/concepts/model-providers/official-provider-plugins` — Official provider plugins

**Official provider plugins** · *Models › Model providers*

> Per-provider setup for the bundled provider plugins, the bundled provider table, and provider quirks.

<sub>source `docs/concepts/model-providers/official-provider-plugins.md` · 232 lines · 1902 words · 5 code blocks</sub>

**Read when:** You are setting up a bundled provider such as OpenAI, Anthropic, or Google · You need the bundled provider id, auth env, and example model · You hit a provider-specific quirk

**Covers:** Official provider plugins <sub>(10 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw models auth`, `openclaw models list`, `openclaw onboard`

**Config:** `models.providers`, `models.providers.openai.models[].contextTokens`

<sub>live: [docs.openclaw.ai/concepts/model-providers/official-provider-plugins](https://docs.openclaw.ai/concepts/model-providers/official-provider-plugins)</sub>

---

### `/concepts/model-providers/custom-providers` — Custom providers and local runtimes

**Custom providers and local runtimes** · *Models › Model providers*

> Providers configured through models.providers: custom endpoints, base URLs, and local inference servers.

<sub>source `docs/concepts/model-providers/custom-providers.md` · 436 lines · 1725 words · 17 code blocks</sub>

**Read when:** You are configuring a provider through models.providers · You are pointing OpenClaw at a custom base URL or proxy · You are running llama.cpp, LM Studio, Ollama, vLLM, or SGLang

**Covers:** Providers via models.providers (custom/base URL) <sub>(13 sub-sections)</sub>

**CLI:** `openclaw gateway restart`, `openclaw onboard`, `openclaw plugins install`

**Config:** `agents.defaults.modelPolicy.allow`, `agents.defaults.timeoutSeconds`, `models.json`, `models.providers`, `models.providers.anthropic.baseUrl`, `models.providers.moonshot`

<sub>live: [docs.openclaw.ai/concepts/model-providers/custom-providers](https://docs.openclaw.ai/concepts/model-providers/custom-providers)</sub>

---

### `/concepts/model-failover` — Model failover

**Model failover** · *Models › Concepts and configuration*

> How OpenClaw rotates auth profiles and falls back across models

<sub>source `docs/concepts/model-failover.md` · 508 lines · 5051 words · 7 code blocks</sub>

**Read when:** Diagnosing auth-profile rotation, cooldowns, or model fallback behavior · Updating failover rules for auth profiles or models · Understanding how session model overrides interact with fallback retries

**Covers:** Runtime flow · Automatic cyber-policy escalation · Selection source policy · Auth storage (keys + OAuth) · Profile IDs · Rotation order · Cooldowns · Auth failure skip cache · Billing disables · Model fallback · Session overrides and live model switching · User-visible fallback notices · Observability and failure summaries · Related config <sub>(6 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw models`, `openclaw models auth`

**Config:** `agents.defaults.imageModel`, `agents.defaults.model`, `agents.defaults.model.fallbacks`, `agents.defaults.model.primary`, `agents.entries.*.model`

**TermCrab — providers: PARTIAL.** Failover chain + cooldowns implemented; no model catalog, no per-model capability table, no usage accounting.

<sub>live: [docs.openclaw.ai/concepts/model-failover](https://docs.openclaw.ai/concepts/model-failover)</sub>

---

### `/providers/alibaba` — Alibaba Model Studio

**Alibaba Model Studio** · *Models › Chat and coding models*

> Alibaba Model Studio Wan video generation in OpenClaw

<sub>source `docs/providers/alibaba.md` · 169 lines · 656 words · 6 code blocks</sub>

**Read when:** You want to use Alibaba Wan video generation in OpenClaw · You need Model Studio or DashScope API key setup for video generation

**Covers:** Getting started · Built-in Wan models · Capabilities and limits · Advanced configuration · Related

**CLI:** `openclaw models auth`, `openclaw models list`, `openclaw models status`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/alibaba](https://docs.openclaw.ai/providers/alibaba)</sub>

---

### `/providers/anthropic` — Anthropic

**Anthropic** · *Models › Chat and coding models*

> Use Anthropic Claude via API keys or Claude CLI in OpenClaw

<sub>source `docs/providers/anthropic.md` · 1058 lines · 5551 words · 26 code blocks</sub>

**Read when:** You want to use Anthropic models in OpenClaw · You want to browse Claude CLI or Claude Desktop sessions across paired computers

**Covers:** Choose a model route · Usage and cost tracking · Getting started · Use Claude Opus 5.5 · Use Claude Sonnet 5.5 · Use Claude Fable 5.1 · Claude sessions across computers · Live model discovery · Thinking defaults (Claude 5.5, 5, 4.8, and 4.6) · Safety refusal fallback (Claude Opus, Sonnet 5.5, and Fable) · Prompt caching · Advanced configuration · Troubleshooting · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw gateway restart`, `openclaw models auth`, `openclaw models list`, `openclaw models set`, `openclaw models status`, `openclaw onboard`

**Config:** `agents.entries.*.params`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/anthropic](https://docs.openclaw.ai/providers/anthropic)</sub>

---

### `/plugins/reference/anthropic-vertex` — Anthropic Vertex plugin reference

**Anthropic Vertex plugin reference** · *Models › Chat and coding models*

> OpenClaw Anthropic Vertex provider plugin for Claude models on Google Vertex AI.

<sub>source `docs/plugins/reference/anthropic-vertex.md` · 42 lines · 168 words</sub>

**Read when:** You are installing, configuring, or auditing the anthropic-vertex plugin

**Covers:** Distribution · Surface · Claude Fable 5 · Claude Sonnet 5

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/reference/anthropic-vertex](https://docs.openclaw.ai/plugins/reference/anthropic-vertex)</sub>

---

### `/providers/arcee` — Arcee AI

**Arcee AI** · *Models › Chat and coding models*

> Arcee AI setup (auth + model selection)

<sub>source `docs/providers/arcee.md` · 157 lines · 475 words · 7 code blocks</sub>

**Read when:** You want to use Arcee AI with OpenClaw · You need the API key env var or CLI auth choice

**Covers:** Install plugin · Getting started · Non-interactive setup · Direct Arcee catalog · OpenRouter catalog · Supported features · Related

**CLI:** `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers.arcee.models`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/arcee](https://docs.openclaw.ai/providers/arcee)</sub>

---

### `/providers/baseten` — Baseten

**Baseten** · *Models › Chat and coding models*

> Baseten setup for Inkling and hosted Model APIs

<sub>source `docs/providers/baseten.md` · 159 lines · 625 words · 7 code blocks</sub>

**Read when:** You want to run Thinking Machines Lab's Inkling in OpenClaw · You want one OpenAI-compatible API for Baseten's hosted models

**Covers:** Install plugin · Getting started · Inkling · Bundled fallback catalog · Manual config · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/baseten](https://docs.openclaw.ai/providers/baseten)</sub>

---

### `/providers/bedrock` — Amazon Bedrock

**Amazon Bedrock** · *Models › Chat and coding models*

> Use Amazon Bedrock (Converse API) models with OpenClaw

<sub>source `docs/providers/bedrock.md` · 510 lines · 1844 words · 11 code blocks</sub>

**Read when:** You want to use Amazon Bedrock models with OpenClaw · You need AWS credential/region setup for model calls

**Covers:** Getting started · Automatic model discovery · Quick setup (AWS path) · Advanced configuration · Related

**CLI:** `openclaw config set`, `openclaw models list`, `openclaw status`

**Config:** `agents.defaults.params`, `memory.search.provider`, `plugins.entries.amazon-bedrock.config.discovery`, `plugins.entries.amazon-bedrock.config.discovery.enabled`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/bedrock](https://docs.openclaw.ai/providers/bedrock)</sub>

---

### `/providers/bedrock-mantle` — Amazon Bedrock Mantle

**Amazon Bedrock Mantle** · *Models › Chat and coding models*

> Use Amazon Bedrock Mantle OpenAI-compatible and Claude Messages models with OpenClaw

<sub>source `docs/providers/bedrock-mantle.md` · 241 lines · 919 words · 7 code blocks</sub>

**Read when:** You want to use Bedrock Mantle hosted OSS models with OpenClaw · You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM · You want to use Claude Opus 5, Sonnet 5, or Mythos 5 through Amazon Bedrock Mantle

**Covers:** Getting started · Automatic model discovery · Manual configuration · Advanced configuration · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw models list`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/bedrock-mantle](https://docs.openclaw.ai/providers/bedrock-mantle)</sub>

---

### `/providers/cerebras` — Cerebras

**Cerebras** · *Models › Chat and coding models*

> Cerebras setup (auth + model selection)

<sub>source `docs/providers/cerebras.md` · 166 lines · 681 words · 7 code blocks</sub>

**Read when:** You want to use Cerebras with OpenClaw · You need the Cerebras API key env var or CLI auth choice

**Covers:** Install plugin · Getting started · Non-interactive setup · Discovery and pricing · Built-in catalog · Manual config · Related

**CLI:** `openclaw models list`, `openclaw models status`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers.cerebras`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/cerebras](https://docs.openclaw.ai/providers/cerebras)</sub>

---

### `/providers/chutes` — Chutes

**Chutes** · *Models › Chat and coding models*

> Chutes setup (OAuth or API key, model discovery, aliases)

<sub>source `docs/providers/chutes.md` · 169 lines · 609 words · 4 code blocks</sub>

**Read when:** You want to use Chutes with OpenClaw · You need the OAuth or API key setup path · You want the default model, aliases, or discovery behavior

**Covers:** Install plugin · Getting started · Discovery behavior · Default aliases · Built-in starter catalog · Config example · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/chutes](https://docs.openclaw.ai/providers/chutes)</sub>

---

### `/providers/cohere` — Cohere

**Cohere** · *Models › Chat and coding models*

> Cohere setup (auth + model selection)

<sub>source `docs/providers/cohere.md` · 82 lines · 381 words · 4 code blocks</sub>

**Read when:** You want to use Cohere with OpenClaw · You need the Cohere API key env var or CLI auth choice

**Covers:** Built-in catalog · Get started · Environment-only setup · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/cohere](https://docs.openclaw.ai/providers/cohere)</sub>

---

### `/providers/deepinfra` — DeepInfra

**DeepInfra** · *Models › Chat and coding models*

> Use DeepInfra's unified API to access the most popular open source and frontier models in OpenClaw

<sub>source `docs/providers/deepinfra.md` · 141 lines · 698 words · 5 code blocks</sub>

**Read when:** You want a single API key for the top open source LLMs · You want to run models via DeepInfra's API in OpenClaw

**Covers:** Install plugin · Get an API key · CLI setup · Config snippet · Supported surfaces · Available models · Price estimates · Notes · Related

**CLI:** `openclaw doctor`, `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**Config:** `agents.defaults.mediaModels.image`, `agents.defaults.mediaModels.video`, `agents.defaults.model`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/deepinfra](https://docs.openclaw.ai/providers/deepinfra)</sub>

---

### `/providers/deepseek` — DeepSeek

**DeepSeek** · *Models › Chat and coding models*

> DeepSeek setup (auth + model selection)

<sub>source `docs/providers/deepseek.md` · 183 lines · 627 words · 9 code blocks</sub>

**Read when:** You want to use DeepSeek with OpenClaw · You need the API key env var or CLI auth choice

**Covers:** Install plugin · Getting started · Built-in catalog · Thinking and tools · Live testing · Config example · Related

**CLI:** `openclaw models list`, `openclaw models set`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/deepseek](https://docs.openclaw.ai/providers/deepseek)</sub>

---

### `/providers/featherless` — Featherless AI

**Featherless AI** · *Models › Chat and coding models*

> Featherless AI setup, model selection, and tool calling

<sub>source `docs/providers/featherless.md` · 138 lines · 392 words · 7 code blocks</sub>

**Read when:** You want to use Featherless AI with OpenClaw · You need the Featherless API key env var or model ref format

**Covers:** Setup · Default model · Other Featherless models · Troubleshooting · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/featherless](https://docs.openclaw.ai/providers/featherless)</sub>

---

### `/providers/fireworks` — Fireworks

**Fireworks** · *Models › Chat and coding models*

> Fireworks setup (auth + model selection)

<sub>source `docs/providers/fireworks.md` · 157 lines · 745 words · 7 code blocks</sub>

**Read when:** You want to use Fireworks with OpenClaw · You need the Fireworks API key env var or default model id · You are debugging Kimi thinking-off behavior on Fireworks

**Covers:** Getting started · Non-interactive setup · Built-in catalog · Custom Fireworks model ids · Related

**CLI:** `openclaw doctor`, `openclaw models list`, `openclaw models status`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/fireworks](https://docs.openclaw.ai/providers/fireworks)</sub>

---

### `/providers/github-copilot` — GitHub Copilot

**GitHub Copilot** · *Models › Chat and coding models*

> Sign in to GitHub Copilot from OpenClaw using the device flow or non-interactive token import

<sub>source `docs/providers/github-copilot.md` · 393 lines · 1763 words · 12 code blocks</sub>

**Read when:** You want to use GitHub Copilot as a model provider · You need the `openclaw models auth login-github-copilot` flow · You are choosing between the built-in Copilot provider, Copilot SDK harness, and Copilot Proxy

**Covers:** Three ways to use Copilot in OpenClaw · GitHub Enterprise (data residency) · Optional flags · Non-interactive onboarding · Memory search embeddings · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw models auth`, `openclaw models set`, `openclaw onboard`, `openclaw plugins install`, `openclaw secrets audit`

**Config:** `memory.search.fallback`, `memory.search.provider`, `memory.search.remote.headers`, `plugins.entries.github-copilot.config.discovery.enabled`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/github-copilot](https://docs.openclaw.ai/providers/github-copilot)</sub>

---

### `/providers/gmi` — GMI Cloud

**GMI Cloud** · *Models › Chat and coding models*

> Use GMI Cloud's OpenAI-compatible API with OpenClaw

<sub>source `docs/providers/gmi.md` · 103 lines · 518 words · 5 code blocks</sub>

**Read when:** You want to run OpenClaw with GMI Cloud models · You need the GMI provider id, key, or endpoint

**Covers:** Setup · When to choose GMI · Models · Troubleshooting · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/gmi](https://docs.openclaw.ai/providers/gmi)</sub>

---

### `/providers/google` — Google (Gemini)

**Google (Gemini)** · *Models › Chat and coding models*

> Google Gemini setup (AI Studio API key, Vertex AI, optional CLI runtime, and multimodal tools)

<sub>source `docs/providers/google.md` · 628 lines · 2404 words · 16 code blocks</sub>

**Read when:** You want to use Google Gemini models with OpenClaw · You need Google AI Studio, Vertex AI, or Gemini CLI runtime guidance

**Covers:** Getting started · Capabilities · Web search · Image generation · Video generation · Music generation · Text-to-speech · Realtime voice · Advanced configuration · Related

**CLI:** `openclaw models auth`, `openclaw models list`, `openclaw onboard`

**Config:** `models.list`, `models.providers.google.apiKey`, `models.providers.google.baseUrl`, `plugins.entries.google.config.webSearch`, `plugins.entries.voice-call.config.realtime.providers.google.model`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/google](https://docs.openclaw.ai/providers/google)</sub>

---

### `/providers/groq` — Groq

**Groq** · *Models › Chat and coding models*

> Groq setup (auth + model selection + Whisper transcription)

<sub>source `docs/providers/groq.md` · 159 lines · 571 words · 7 code blocks</sub>

**Read when:** You want to use Groq with OpenClaw · You need the API key env var or CLI auth choice · You are configuring Whisper audio transcription on Groq

**Covers:** Install plugin · Getting started · Built-in catalog · Reasoning models · Audio transcription · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw models list`, `openclaw plugins install`

**Config:** `tools.media.audio`, `tools.media.models`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/groq](https://docs.openclaw.ai/providers/groq)</sub>

---

### `/providers/huggingface` — Hugging Face (inference)

**Hugging Face (inference)** · *Models › Chat and coding models*

> Hugging Face Inference setup (auth + model selection)

<sub>source `docs/providers/huggingface.md` · 204 lines · 578 words · 10 code blocks</sub>

**Read when:** You want to use Hugging Face Inference with OpenClaw · You need the HF token env var or CLI auth choice

**Covers:** Getting started · Model IDs · Advanced configuration · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw models list`, `openclaw onboard`

**Config:** `agents.defaults.model.primary`, `models.json`, `models.providers.huggingface.models`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/huggingface](https://docs.openclaw.ai/providers/huggingface)</sub>

---

### `/providers/longcat` — LongCat

**LongCat** · *Models › Chat and coding models*

> LongCat API setup for LongCat-2.0

<sub>source `docs/providers/longcat.md` · 126 lines · 389 words · 4 code blocks</sub>

**Read when:** You want to use LongCat-2.0 with OpenClaw · You need the LongCat API key or model limits

**Covers:** Install plugin · Getting started · Reasoning behavior · Pricing · Self-hosted LongCat-2.0 · Troubleshooting · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`, `openclaw plugins list`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/longcat](https://docs.openclaw.ai/providers/longcat)</sub>

---

### `/providers/meta` — Meta

**Meta** · *Models › Chat and coding models*

> Meta setup, authentication, and Muse Spark model selection

<sub>source `docs/providers/meta.md` · 180 lines · 668 words · 8 code blocks</sub>

**Read when:** You want to use Meta with OpenClaw · You need the MODEL_API_KEY env var or CLI auth choice

**Covers:** Getting started · Non-interactive setup · Built-in catalog · Manual config · Smoke test · Related

**CLI:** `openclaw models list`, `openclaw models status`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/meta](https://docs.openclaw.ai/providers/meta)</sub>

---

### `/providers/minimax` — MiniMax

**MiniMax** · *Models › Chat and coding models*

> Use MiniMax models in OpenClaw

<sub>source `docs/providers/minimax.md` · 450 lines · 1720 words · 15 code blocks</sub>

**Read when:** You want MiniMax models in OpenClaw · You need MiniMax setup guidance

**Covers:** Built-in catalog · Getting started · Configure via openclaw configure · Capabilities · Advanced configuration · Notes · Troubleshooting · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw models list`, `openclaw models set`, `openclaw onboard`

**Config:** `agents.defaults.modelPolicy.allow`, `agents.defaults.models`, `models.json`, `models.mode`, `models.providers.minimax`, `models.providers.minimax-portal`, `models.providers.minimax-portal.baseUrl`, `models.providers.minimax.api`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/minimax](https://docs.openclaw.ai/providers/minimax)</sub>

---

### `/providers/mistral` — Mistral

**Mistral** · *Models › Chat and coding models*

> Use Mistral models and Voxtral transcription with OpenClaw

<sub>source `docs/providers/mistral.md` · 222 lines · 659 words · 11 code blocks</sub>

**Read when:** You want to use Mistral models in OpenClaw · You want Voxtral realtime transcription for Voice Call · You need Mistral API key onboarding and model refs

**Covers:** Getting started · Built-in LLM catalog · Audio transcription (Voxtral) · Voice Call streaming STT · Advanced configuration · Related

**CLI:** `openclaw infer model`, `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers.mistral.baseUrl`, `plugins.entries.voice-call.config.streaming.providers.mistral.apiKey`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/mistral](https://docs.openclaw.ai/providers/mistral)</sub>

---

### `/providers/moonshot` — Moonshot AI

**Moonshot AI** · *Models › Chat and coding models*

> Configure Moonshot Kimi models vs Kimi Coding (separate providers + keys)

<sub>source `docs/providers/moonshot.md` · 451 lines · 1363 words · 16 code blocks</sub>

**Read when:** You want Moonshot Kimi K3/K2 (Moonshot Open Platform) vs Kimi Coding setup · You need to understand separate endpoints, keys, and model refs · You want copy/paste config for either provider

**Covers:** Built-in model catalog · Getting started · Kimi web search · Advanced configuration · Related

**CLI:** `openclaw agent`, `openclaw configure`, `openclaw models list`, `openclaw models set`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers`, `plugins.entries.moonshot.config.webSearch`, `plugins.entries.moonshot.config.webSearch.*`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/moonshot](https://docs.openclaw.ai/providers/moonshot)</sub>

---

### `/providers/novita` — NovitaAI

**NovitaAI** · *Models › Chat and coding models*

> Use NovitaAI's OpenAI-compatible API with OpenClaw

<sub>source `docs/providers/novita.md` · 131 lines · 525 words · 5 code blocks</sub>

**Read when:** You want to run OpenClaw with NovitaAI models · You need the Novita provider id, key, or endpoint

**Covers:** Setup · Defaults · Model catalog · Video generation · When to choose Novita · Troubleshooting · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/novita](https://docs.openclaw.ai/providers/novita)</sub>

---

### `/providers/nvidia` — NVIDIA

**NVIDIA** · *Models › Chat and coding models*

> Use NVIDIA's OpenAI-compatible API in OpenClaw

<sub>source `docs/providers/nvidia.md` · 248 lines · 931 words · 7 code blocks</sub>

**Read when:** You want to use open models in OpenClaw for free · You need NVIDIA_API_KEY setup · You want to use Nemotron 3 Ultra through NVIDIA

**Covers:** Getting started · Config example · Live model catalog · Nemotron 3.5 Lightning · Nemotron 3 Ultra · Bundled fallback catalog · Advanced configuration · Related

**CLI:** `openclaw models set`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/nvidia](https://docs.openclaw.ai/providers/nvidia)</sub>

---

### `/providers/ollama-cloud` — Ollama Cloud

**Ollama Cloud** · *Models › Chat and coding models*

> Use Ollama Cloud directly with OpenClaw

<sub>source `docs/providers/ollama-cloud.md` · 116 lines · 495 words · 5 code blocks</sub>

**Read when:** You want to use hosted Ollama models without a local Ollama server · You need the ollama-cloud provider id, key, or endpoint

**Covers:** Setup · Defaults · When to choose Ollama Cloud · Models · Live test · Troubleshooting · Related

**CLI:** `openclaw models list`, `openclaw models set`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama-cloud](https://docs.openclaw.ai/providers/ollama-cloud)</sub>

---

### `/providers/openai` — OpenAI

**OpenAI** · *Models › Chat and coding models*

> Use OpenAI via API keys or Codex subscription in OpenClaw

<sub>source `docs/providers/openai.md` · 147 lines · 719 words</sub>

**Read when:** You want to use OpenAI models in OpenClaw · You want Codex subscription auth instead of API keys · You want Astra async tools, mid-turn steering, or cached reasoning changes · You need stricter GPT-5 agent execution behavior

**Covers:** Where each section moved · Related

**CLI:** `openclaw doctor`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai](https://docs.openclaw.ai/providers/openai)</sub>

---

### `/providers/openai/setup` — OpenAI setup

**OpenAI setup** · *Models › OpenAI*

> Connect OpenAI with an API key, Codex subscription, or Sign in with ChatGPT (Beta)

<sub>source `docs/providers/openai/setup.md` · 495 lines · 2129 words · 22 code blocks</sub>

**Read when:** You are connecting OpenAI to OpenClaw for the first time · You want Codex subscription auth instead of API keys · You are recovering a broken Codex OAuth route or a long-context budget

**Covers:** Getting started · Sign in with ChatGPT (Beta) <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config get`, `openclaw config set`, `openclaw config validate`, `openclaw doctor`, `openclaw models auth`, `openclaw models list`, `openclaw models status`, `openclaw onboard`

**Config:** `models.providers.openai.models[].contextTokens`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/setup](https://docs.openclaw.ai/providers/openai/setup)</sub>

---

### `/providers/openai/authentication` — OpenAI authentication

**OpenAI authentication** · *Models › OpenAI*

> Choose Codex login, Sign in with ChatGPT (Beta), or an API key for the OpenAI capabilities you need

<sub>source `docs/providers/openai/authentication.md` · 176 lines · 1446 words · 2 code blocks</sub>

**Read when:** You are choosing between Codex login, an API key, and Sign in with ChatGPT (Beta) · You want to use OpenAI-hosted plugins with OpenClaw · You are connecting an OpenAI account for an agent or a person

**Covers:** Compare capabilities · Shared agent credential or personal account? · Set up an agent's credential · Check the selected account <sub>(1 sub-sections)</sub>

**CLI:** `openclaw models accounts`, `openclaw models auth`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/authentication](https://docs.openclaw.ai/providers/openai/authentication)</sub>

---

### `/providers/openai/models` — OpenAI models

**OpenAI models** · *Models › OpenAI*

> Pick an OpenAI model ref, including GPT-6.1 Sol, GPT-6 Astra, Sol, Luna, and the GPT-5.6 tiers

<sub>source `docs/providers/openai/models.md` · 255 lines · 1825 words · 6 code blocks</sub>

**Read when:** You are choosing which OpenAI model ref to run · You want to select GPT-6.1 Sol, GPT-6 Sol, or Luna · You want Astra async tools, mid-turn steering, or cached reasoning changes · Your account does not expose a GPT-5.6 tier

**Covers:** Quick choice · Daybreak Blue and Red · GPT-6 Astra · GPT-6.1 Sol · GPT-6 Sol and Luna · GPT-5.6 limited preview <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw models list`, `openclaw models set`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/models](https://docs.openclaw.ai/providers/openai/models)</sub>

---

### `/providers/openai/runtimes` — OpenAI runtimes and Codex auth

**OpenAI runtimes and Codex auth** · *Models › OpenAI*

> Choose an OpenAI runtime and understand native Codex auth

<sub>source `docs/providers/openai/runtimes.md` · 131 lines · 1075 words · 1 code blocks</sub>

**Read when:** You need to know whether a turn runs on OpenClaw or the native Codex harness · You are mapping the openai, codex, and agentRuntime names to layers · You are debugging native Codex app-server account selection

**Covers:** Naming map · Implicit agent runtime · Native Codex app-server auth

**CLI:** `openclaw doctor`, `openclaw migrate apply`, `openclaw migrate plan`, `openclaw models auth`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/runtimes](https://docs.openclaw.ai/providers/openai/runtimes)</sub>

---

### `/providers/openai/coverage-and-cost` — OpenAI coverage and cost

**OpenAI coverage and cost** · *Models › OpenAI*

> Which OpenAI capabilities OpenClaw exposes, embeddings, and spend reporting

<sub>source `docs/providers/openai/coverage-and-cost.md` · 86 lines · 579 words · 1 code blocks</sub>

**Read when:** You want to know which OpenAI capability maps to which OpenClaw surface · You are reconciling subscription quota against Platform API billing · You are pointing memory_search at OpenAI embeddings

**Covers:** Usage and cost tracking · OpenClaw feature coverage · Memory embeddings

**CLI:** `openclaw onboard`

**Config:** `memory.search`, `plugins.entries.voice-call.config.realtime.providers.openai.apiKey`, `tools.media.audio`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/coverage-and-cost](https://docs.openclaw.ai/providers/openai/coverage-and-cost)</sub>

---

### `/providers/openai/image-and-video` — OpenAI image generation

**OpenAI image generation** · *Models › OpenAI*

> Generate and edit images with OpenAI gpt-image

<sub>source `docs/providers/openai/image-and-video.md` · 154 lines · 639 words · 7 code blocks</sub>

**Read when:** You are generating or editing images through the openai provider · You need transparent-background image output

**Covers:** Image generation <sub>(2 sub-sections)</sub>

**CLI:** `openclaw infer image`

**Config:** `agents.defaults.model`, `models.providers.openai`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/image-and-video](https://docs.openclaw.ai/providers/openai/image-and-video)</sub>

---

### `/providers/openai/voice-and-speech` — OpenAI voice and speech

**OpenAI voice and speech** · *Models › OpenAI*

> OpenAI text-to-speech, transcription, and realtime voice settings and auth

<sub>source `docs/providers/openai/voice-and-speech.md` · 475 lines · 2792 words · 6 code blocks</sub>

**Read when:** You are configuring OpenAI text-to-speech or transcription · You are setting up realtime voice for Talk, Voice Call, or Discord · You need the auth order for a specific realtime route

**Covers:** Voice and speech

**CLI:** `openclaw models auth`

**Config:** `channels.discord.voice.realtime.model`, `channels.discord.voice.realtime.speakerVoice`, `plugins.allow`, `plugins.entries.voice-call.config.realtime.providers.openai.model`, `plugins.entries.voice-call.config.streaming.providers.openai.model`, `session.commentary.append`, `session.start`, `session.temperature`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/voice-and-speech](https://docs.openclaw.ai/providers/openai/voice-and-speech)</sub>

---

### `/providers/openai/azure` — Azure OpenAI endpoints

**Azure OpenAI endpoints** · *Models › OpenAI*

> Point the bundled openai provider at an Azure OpenAI resource

<sub>source `docs/providers/openai/azure.md` · 124 lines · 516 words · 3 code blocks</sub>

**Read when:** You are routing image generation through Azure OpenAI · You need the Azure API version, deployment naming, or region rules

**Covers:** Azure OpenAI endpoints <sub>(5 sub-sections)</sub>

**Config:** `models.providers.openai.baseUrl`, `plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openai/azure](https://docs.openclaw.ai/providers/openai/azure)</sub>

---

### `/providers/openai/advanced` — OpenAI advanced configuration

**OpenAI advanced configuration** · *Models › OpenAI*

> Prompt contribution, transport, Fast mode, compaction, and route compat

<sub>source `docs/providers/openai/advanced.md` · 394 lines · 1617 words · 9 code blocks</sub>

**Read when:** You are tuning transport, Fast mode, or service tier for openai/* · You need stricter GPT-5 agent execution behavior · You are debugging server-side compaction or OpenAI-compatible proxy behavior

**Covers:** GPT-5 prompt contribution · Advanced configuration

**CLI:** `openclaw config set`, `openclaw doctor`

**Config:** `agents.defaults.promptOverlays`, `plugins.entries.codex.config.appServer.serviceTier`, `plugins.entries.openai.config.personality`, `tools.updatePlan`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/providers/openai/advanced](https://docs.openclaw.ai/providers/openai/advanced)</sub>

---

### `/providers/opencode` — OpenCode

**OpenCode** · *Models › Chat and coding models*

> Use OpenCode Zen and Go catalogs with OpenClaw

<sub>source `docs/providers/opencode.md` · 202 lines · 704 words · 9 code blocks</sub>

**Read when:** You want OpenCode-hosted model access · You want to pick between the Zen and Go catalogs

**Covers:** Getting started · Config example · Provider catalogs · Advanced configuration · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw infer model`, `openclaw models list`, `openclaw onboard`

**Config:** `models.json`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/opencode](https://docs.openclaw.ai/providers/opencode)</sub>

---

### `/providers/opencode-go` — OpenCode Go

**OpenCode Go** · *Models › Chat and coding models*

> Use the OpenCode Go catalog with the shared OpenCode setup

<sub>source `docs/providers/opencode-go.md` · 137 lines · 453 words · 6 code blocks</sub>

**Read when:** You want the OpenCode Go catalog · You need the runtime model refs for Go-hosted models

**Covers:** Getting started · Config example · Catalog · Privacy · Advanced configuration · Related

**CLI:** `openclaw config set`, `openclaw models list`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/opencode-go](https://docs.openclaw.ai/providers/opencode-go)</sub>

---

### `/providers/perplexity-provider` — Perplexity

**Perplexity** · *Models › Chat and coding models*

> Perplexity web search provider setup (API key, search modes, filtering)

<sub>source `docs/providers/perplexity-provider.md` · 127 lines · 558 words · 4 code blocks</sub>

**Read when:** You want to configure Perplexity as a web search provider · You need the Perplexity API key or OpenRouter proxy setup

**Covers:** Install plugin · Getting started · Search modes · Native API filtering · Advanced configuration · Related

**CLI:** `openclaw config set`, `openclaw configure`, `openclaw plugins install`

**Config:** `plugins.entries.perplexity.config.webSearch.apiKey`, `plugins.entries.perplexity.config.webSearch.baseUrl`, `plugins.entries.perplexity.config.webSearch.model`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/perplexity-provider](https://docs.openclaw.ai/providers/perplexity-provider)</sub>

---

### `/providers/qianfan` — Qianfan

**Qianfan** · *Models › Chat and coding models*

> Use Qianfan's unified API to access many models in OpenClaw

<sub>source `docs/providers/qianfan.md` · 145 lines · 458 words · 4 code blocks</sub>

**Read when:** You want a single API key for many LLMs · You need Baidu Qianfan setup guidance

**Covers:** Install plugin · Getting started · Built-in catalog · Config example · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers.qianfan`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/qianfan](https://docs.openclaw.ai/providers/qianfan)</sub>

---

### `/providers/qwen` — Qwen

**Qwen** · *Models › Chat and coding models*

> Use Qwen Cloud through its OpenClaw plugin

<sub>source `docs/providers/qwen.md` · 432 lines · 1980 words · 13 code blocks</sub>

**Read when:** You want to use Qwen with OpenClaw · You have an Alibaba Cloud Token Plan subscription

**Covers:** Install plugin · Getting started · Retired Qwen Portal authentication · Plan types and endpoints · Built-in catalog · Thinking controls · Multimodal add-ons · Advanced configuration · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers.bailian-token-plan`, `models.providers.modelstudio`, `models.providers.qwen.baseUrl`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/qwen](https://docs.openclaw.ai/providers/qwen)</sub>

---

### `/providers/radius` — Radius

**Radius** · *Models › Chat and coding models*

> Connect OpenClaw to Radius with browser sign-in or an organization API key

<sub>source `docs/providers/radius.md` · 82 lines · 364 words · 5 code blocks</sub>

**Read when:** You want to use Radius models in OpenClaw · You need Radius authentication or model discovery help

**Covers:** Sign in · Choose a model · Scope and troubleshooting <sub>(1 sub-sections)</sub>

**CLI:** `openclaw models auth`, `openclaw models list`, `openclaw models set`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/radius](https://docs.openclaw.ai/providers/radius)</sub>

---

### `/providers/stepfun` — StepFun

**StepFun** · *Models › Chat and coding models*

> Use StepFun models with OpenClaw

<sub>source `docs/providers/stepfun.md` · 253 lines · 467 words · 11 code blocks</sub>

**Read when:** You want StepFun models in OpenClaw · You need StepFun setup guidance

**Covers:** Install plugin · Region and endpoint overview · Built-in catalog · Getting started · Advanced configuration · Related

**CLI:** `openclaw models list`, `openclaw models set`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/stepfun](https://docs.openclaw.ai/providers/stepfun)</sub>

---

### `/providers/synthetic` — Synthetic

**Synthetic** · *Models › Chat and coding models*

> Use Synthetic's Anthropic-compatible API in OpenClaw

<sub>source `docs/providers/synthetic.md` · 149 lines · 316 words · 5 code blocks</sub>

**Read when:** You want to use Synthetic as a model provider · You need a Synthetic API key or base URL setup

**Covers:** Getting started · Config example · Model discovery · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**Config:** `agents.defaults.modelPolicy.allow`, `models.providers.synthetic.baseUrl`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/synthetic](https://docs.openclaw.ai/providers/synthetic)</sub>

---

### `/providers/telnyx` — Telnyx

**Telnyx** · *Models › Chat and coding models*

> Telnyx setup for OpenAI-compatible AI inference

<sub>source `docs/providers/telnyx.md` · 172 lines · 607 words · 8 code blocks</sub>

**Read when:** You want to run Telnyx-hosted models in OpenClaw · You want one OpenAI-compatible API for Telnyx AI inference

**Covers:** Requirements · Install plugin · Getting started · Default model · Live model discovery · Bundled fallback catalog · Manual config · Related

**CLI:** `openclaw gateway restart`, `openclaw models list`, `openclaw onboard`, `openclaw plugins install`, `openclaw update
openclaw`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/telnyx](https://docs.openclaw.ai/providers/telnyx)</sub>

---

### `/providers/tencent` — Tencent Cloud (TokenHub / TokenPlan)

**Tencent Cloud (TokenHub / TokenPlan)** · *Models › Chat and coding models*

> Tencent Cloud TokenHub and TokenPlan setup for hy4-preview

<sub>source `docs/providers/tencent.md` · 160 lines · 600 words · 8 code blocks</sub>

**Read when:** You want to use Tencent hy4-preview with OpenClaw · You need the TokenHub or TokenPlan API key setup

**Covers:** Quick start · Non-interactive setup · Built-in catalog · Existing TokenHub configurations · Advanced configuration · Related

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw models list`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/tencent](https://docs.openclaw.ai/providers/tencent)</sub>

---

### `/providers/together` — Together AI

**Together AI** · *Models › Chat and coding models*

> Together AI setup (auth + model selection)

<sub>source `docs/providers/together.md` · 139 lines · 405 words · 4 code blocks</sub>

**Read when:** You want to use Together AI with OpenClaw · You need the API key env var or CLI auth choice

**Covers:** Getting started · Built-in catalog · Video generation · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw models list`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/together](https://docs.openclaw.ai/providers/together)</sub>

---

### `/providers/venice` — Venice AI

**Venice AI** · *Models › Chat and coding models*

> Use Venice AI privacy-focused models in OpenClaw

<sub>source `docs/providers/venice.md` · 296 lines · 1235 words · 9 code blocks</sub>

**Read when:** You want privacy-focused inference in OpenClaw · You want Venice AI setup guidance

**Covers:** Privacy modes · Getting started · Model selection · Built-in catalog (16 visible models) · Model discovery · DeepSeek V4 replay behavior · Streaming and tool support · Pricing · Usage examples · Troubleshooting · Advanced configuration · Related

**CLI:** `openclaw agent`, `openclaw configure`, `openclaw models list`, `openclaw models set`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.json`, `models.providers.venice.models[].cost`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/venice](https://docs.openclaw.ai/providers/venice)</sub>

---

### `/providers/volcengine` — Volcengine (Doubao)

**Volcengine (Doubao)** · *Models › Chat and coding models*

> Volcano Engine setup (Doubao models, coding endpoints, and Seed Speech TTS)

<sub>source `docs/providers/volcengine.md` · 185 lines · 723 words · 8 code blocks</sub>

**Read when:** You want to use Volcano Engine or Doubao models with OpenClaw · You need the Volcengine API key setup · You want to use Volcengine Speech text-to-speech

**Covers:** Getting started · Providers and endpoints · Built-in catalog · Text-to-speech · Advanced configuration · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/volcengine](https://docs.openclaw.ai/providers/volcengine)</sub>

---

### `/providers/xai` — xAI

**xAI** · *Models › Chat and coding models*

> Use xAI Grok models in OpenClaw

<sub>source `docs/providers/xai.md` · 795 lines · 3596 words · 18 code blocks</sub>

**Read when:** You want to use Grok models in OpenClaw · You are configuring xAI auth or model ids

**Covers:** Setup · OAuth troubleshooting · Built-in catalog · Feature coverage · Features · Live testing · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw infer tts`, `openclaw models auth`, `openclaw models set`, `openclaw models status`, `openclaw onboard`, `openclaw status`

**Config:** `agents.defaults.mediaModels.image.timeoutMs`, `agents.defaults.mediaModels.video.timeoutMs`, `models.providers.xai.auth`, `models.providers.xai.baseUrl`, `plugins.entries.voice-call.config.realtime.providers.xai`, `plugins.entries.voice-call.config.streaming.providers.xai`, `plugins.entries.xai.config.codeExecution`, `plugins.entries.xai.config.webSearch.apiKey`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/xai](https://docs.openclaw.ai/providers/xai)</sub>

---

### `/providers/xiaomi` — Xiaomi MiMo

**Xiaomi MiMo** · *Models › Chat and coding models*

> Use Xiaomi MiMo pay-as-you-go and Token Plan models with OpenClaw

<sub>source `docs/providers/xiaomi.md` · 300 lines · 982 words · 9 code blocks</sub>

**Read when:** You want Xiaomi MiMo models in OpenClaw · You need Xiaomi MiMo auth or Token Plan setup

**Covers:** Getting started · Pay-as-you-go catalog · Token Plan catalog · Reasoning models · Text-to-speech · Config example · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers.xiaomi-token-plan`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/xiaomi](https://docs.openclaw.ai/providers/xiaomi)</sub>

---

### `/providers/zai` — Z.AI

**Z.AI** · *Models › Chat and coding models*

> Use Z.AI (GLM models) with OpenClaw

<sub>source `docs/providers/zai.md` · 336 lines · 1187 words · 11 code blocks</sub>

**Read when:** You want Z.AI / GLM models in OpenClaw · You need a simple ZAI_API_KEY setup

**Covers:** GLM models · Getting started · Rate limits and overloads · Config example · Built-in catalog · Video generation · Thinking levels · Advanced configuration · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config get`, `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/zai](https://docs.openclaw.ai/providers/zai)</sub>

---

### `/providers/azure-speech` — Azure Speech

**Azure Speech** · *Models › Speech and audio*

> Azure AI Speech text-to-speech for OpenClaw replies

<sub>source `docs/providers/azure-speech.md` · 123 lines · 480 words · 2 code blocks</sub>

**Read when:** You want Azure Speech synthesis for outbound replies · You need native Ogg Opus voice-note output from Azure Speech

**Covers:** Getting started · Configuration options · Notes · Related

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/azure-speech](https://docs.openclaw.ai/providers/azure-speech)</sub>

---

### `/providers/deepgram` — Deepgram

**Deepgram** · *Models › Speech and audio*

> Deepgram transcription for inbound voice notes

<sub>source `docs/providers/deepgram.md` · 209 lines · 581 words · 5 code blocks</sub>

**Read when:** You want Deepgram speech-to-text for audio attachments · You want Deepgram streaming transcription for Voice Call · You need a quick Deepgram config example

**Covers:** Getting started · Configuration options · Voice Call streaming STT · Notes · Related <sub>(1 sub-sections)</sub>

**Config:** `plugins.entries.voice-call.config.streaming`, `plugins.entries.voice-call.config.streaming.providers.deepgram.apiKey`, `tools.media.audio`, `tools.media.models[]`, `tools.media.models[].language`, `tools.media.models[].model`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/deepgram](https://docs.openclaw.ai/providers/deepgram)</sub>

---

### `/providers/elevenlabs` — ElevenLabs

**ElevenLabs** · *Models › Speech and audio*

> Use ElevenLabs speech, Scribe STT, and realtime transcription with OpenClaw

<sub>source `docs/providers/elevenlabs.md` · 123 lines · 333 words · 4 code blocks</sub>

**Read when:** You want ElevenLabs text-to-speech in OpenClaw · You want ElevenLabs Scribe speech-to-text for audio attachments · You want ElevenLabs realtime transcription for Voice Call or Google Meet

**Covers:** Authentication · Text-to-speech · Speech-to-text · Streaming STT · Related

**Config:** `plugins.entries.google-meet.config.realtime.providers.elevenlabs`, `plugins.entries.google-meet.config.realtime.transcriptionProvider`, `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey`, `tools.media.audio`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/elevenlabs](https://docs.openclaw.ai/providers/elevenlabs)</sub>

---

### `/providers/fish-audio` — Fish Audio

**Fish Audio** · *Models › Speech and audio*

> Use Fish Audio S2.1 hosted TTS or local S2 Pro on Apple silicon

<sub>source `docs/providers/fish-audio.md` · 154 lines · 620 words · 6 code blocks</sub>

**Read when:** You want Fish Audio text-to-speech in OpenClaw · You want expressive or cloned voices with Fish Audio · You want local Fish S2 Pro speech in macOS Talk mode

**Covers:** Hosted S2.1 · Local S2 Pro on macOS · Troubleshooting <sub>(4 sub-sections)</sub>

**CLI:** `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/fish-audio](https://docs.openclaw.ai/providers/fish-audio)</sub>

---

### `/providers/gradium` — Gradium

**Gradium** · *Models › Speech and audio*

> Use Gradium text-to-speech in OpenClaw

<sub>source `docs/providers/gradium.md` · 121 lines · 391 words · 5 code blocks</sub>

**Read when:** You want Gradium for text-to-speech · You need Gradium API key, voice, or directive token configuration

**Covers:** Install plugin · Setup · Config · Voices · Output · Auto-select order · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/gradium](https://docs.openclaw.ai/providers/gradium)</sub>

---

### `/providers/inworld` — Inworld

**Inworld** · *Models › Speech and audio*

> Inworld streaming text-to-speech for OpenClaw replies

<sub>source `docs/providers/inworld.md` · 104 lines · 445 words · 3 code blocks</sub>

**Read when:** You want Inworld speech synthesis for outbound replies · You need PCM telephony or OGG_OPUS voice-note output from Inworld

**Covers:** Install plugin · Getting started · Configuration options · Notes · Related

**CLI:** `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/inworld](https://docs.openclaw.ai/providers/inworld)</sub>

---

### `/providers/senseaudio` — SenseAudio

**SenseAudio** · *Models › Speech and audio*

> SenseAudio batch speech-to-text for inbound voice notes

<sub>source `docs/providers/senseaudio.md` · 69 lines · 203 words · 2 code blocks</sub>

**Read when:** You want SenseAudio speech-to-text for audio attachments · You need the SenseAudio API key env var or audio config path

**Covers:** Getting started · Options · Related

**Config:** `tools.media.audio`, `tools.media.models[].baseUrl`, `tools.media.models[].headers`, `tools.media.models[].language`, `tools.media.models[].model`, `tools.media.models[].prompt`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/senseaudio](https://docs.openclaw.ai/providers/senseaudio)</sub>

---

### `/providers/comfy` — ComfyUI

**ComfyUI** · *Models › Image, video, and music*

> ComfyUI workflow generation and Comfy Cloud MCP OAuth setup in OpenClaw

<sub>source `docs/providers/comfy.md` · 421 lines · 1209 words · 16 code blocks</sub>

**Read when:** You want to use local ComfyUI workflows with OpenClaw · You want to use Comfy Cloud with image, video, or music workflows · You want to connect Comfy Cloud with account OAuth through MCP · You need the comfy plugin config keys

**Covers:** Comfy Cloud with MCP OAuth · Workflow plugin · What it supports · Getting started · Configuration · Workflow details · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw mcp login`, `openclaw mcp logout`, `openclaw mcp set`, `openclaw mcp status`, `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/comfy](https://docs.openclaw.ai/providers/comfy)</sub>

---

### `/providers/fal` — Fal

**Fal** · *Models › Image, video, and music*

> fal image, video, and music generation setup in OpenClaw

<sub>source `docs/providers/fal.md` · 318 lines · 1029 words · 8 code blocks</sub>

**Read when:** You want to use fal image generation in OpenClaw · You need the FAL_KEY auth flow · You want fal defaults for image_generate, video_generate, or music_generate

**Covers:** Getting started · Image generation · Video generation · Music generation · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw infer image`, `openclaw onboard`

**Config:** `models.providers.fal.baseUrl`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/fal](https://docs.openclaw.ai/providers/fal)</sub>

---

### `/providers/kie` — Kie AI

**Kie AI** · *Models › Image, video, and music*

> Kie AI video generation setup and supported models

<sub>source `docs/providers/kie.md` · 109 lines · 511 words · 4 code blocks</sub>

**Read when:** You want to generate videos through Kie AI · You need KIE_API_KEY setup or supported video models

**Covers:** Setup · Video generation · Live testing · Related

**CLI:** `openclaw onboard`

**Config:** `agents.defaults.mediaModels.video.timeoutMs`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/kie](https://docs.openclaw.ai/providers/kie)</sub>

---

### `/providers/pixverse` — PixVerse

**PixVerse** · *Models › Image, video, and music*

> PixVerse video generation setup in OpenClaw

<sub>source `docs/providers/pixverse.md` · 169 lines · 541 words · 6 code blocks</sub>

**Read when:** You want to use PixVerse video generation in OpenClaw · You need the PixVerse API key/env setup · You want to make PixVerse the default video provider

**Covers:** Getting started · Supported modes and models · Provider options · Configuration · Advanced configuration · Related

**CLI:** `openclaw config set`, `openclaw onboard`, `openclaw plugins install`

**Config:** `agents.defaults.mediaModels.video.primary`, `agents.defaults.mediaModels.video.timeoutMs`, `models.providers.pixverse.baseUrl`, `models.providers.pixverse.region`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/pixverse](https://docs.openclaw.ai/providers/pixverse)</sub>

---

### `/providers/runway` — Runway

**Runway** · *Models › Image, video, and music*

> Runway video generation setup in OpenClaw

<sub>source `docs/providers/runway.md` · 99 lines · 325 words · 3 code blocks</sub>

**Read when:** You want to use Runway video generation in OpenClaw · You need the Runway API key/env setup · You want to make Runway the default video provider

**Covers:** Getting started · Supported modes and models · Configuration · Advanced configuration · Related

**CLI:** `openclaw config set`, `openclaw onboard`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/runway](https://docs.openclaw.ai/providers/runway)</sub>

---

### `/providers/vydra` — Vydra

**Vydra** · *Models › Image, video, and music*

> Use Vydra image, video, and speech in OpenClaw

<sub>source `docs/providers/vydra.md` · 185 lines · 425 words · 8 code blocks</sub>

**Read when:** You want Vydra media generation in OpenClaw · You need Vydra API key setup guidance

**Covers:** Setup · Capabilities · Related

**CLI:** `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/vydra](https://docs.openclaw.ai/providers/vydra)</sub>

---

### `/providers/claude-max-api-proxy` — Claude Max API proxy

**Claude Max API proxy** · *Models › Gateways and routers*

> Community proxy to expose Claude subscription credentials as an OpenAI-compatible endpoint

<sub>source `docs/providers/claude-max-api-proxy.md` · 197 lines · 558 words · 6 code blocks</sub>

**Read when:** You want to use Claude Max subscription with OpenAI-compatible tools · You want a local API server that wraps Claude Code CLI · You want to evaluate subscription-based vs API-key-based Anthropic access

**Covers:** Why use this · How it works · Getting started · Advanced configuration · Notes · Related

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/claude-max-api-proxy](https://docs.openclaw.ai/providers/claude-max-api-proxy)</sub>

---

### `/providers/clawrouter` — ClawRouter

**ClawRouter** · *Models › Gateways and routers*

> Route credential-scoped models through ClawRouter and show managed quotas

<sub>source `docs/providers/clawrouter.md` · 287 lines · 1457 words · 8 code blocks</sub>

**Read when:** You want one managed key for multiple model providers · You need ClawRouter model discovery or quota reporting in OpenClaw

**Covers:** Getting started · Managed non-interactive deployment · Readiness and live proof · Model discovery · Protocol and provider plugins · Quotas and usage · Troubleshooting · Security behavior · Related

**CLI:** `openclaw agent`, `openclaw config patch`, `openclaw models list`, `openclaw models set`, `openclaw models status`, `openclaw onboard`, `openclaw plugins enable`, `openclaw status`

**Config:** `agents.defaults.model.primary`, `agents.defaults.modelPolicy.allow`, `models.providers.clawrouter.apiKey`, `models.providers.clawrouter.baseUrl`, `models.providers.clawrouter.headers.X-ClawRouter-Project-Id`, `plugins.allow`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/clawrouter](https://docs.openclaw.ai/providers/clawrouter)</sub>

---

### `/providers/cloudflare-ai-gateway` — Cloudflare AI gateway

**Cloudflare AI gateway** · *Models › Gateways and routers*

> Cloudflare AI Gateway setup (auth + model selection)

<sub>source `docs/providers/cloudflare-ai-gateway.md` · 126 lines · 313 words · 6 code blocks</sub>

**Read when:** You want to use Cloudflare AI Gateway with OpenClaw · You need the account ID, gateway ID, or API key env var

**Covers:** Install plugin · Getting started · Non-interactive example · Advanced configuration · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/cloudflare-ai-gateway](https://docs.openclaw.ai/providers/cloudflare-ai-gateway)</sub>

---

### `/providers/kilocode` — Kilo Gateway

**Kilo Gateway** · *Models › Gateways and routers*

> Use Kilo Gateway's unified API to access many models in OpenClaw

<sub>source `docs/providers/kilocode.md` · 122 lines · 405 words · 5 code blocks</sub>

**Read when:** You want a single API key for many LLMs · You want to run models via Kilo Gateway in OpenClaw

**Covers:** Install plugin · Setup · Default model and catalog · Config example · Behavior notes · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/kilocode](https://docs.openclaw.ai/providers/kilocode)</sub>

---

### `/providers/litellm` — LiteLLM

**LiteLLM** · *Models › Gateways and routers*

> Run OpenClaw through LiteLLM Proxy for unified model access and cost tracking

<sub>source `docs/providers/litellm.md` · 213 lines · 339 words · 9 code blocks</sub>

**Read when:** You want to route OpenClaw through a LiteLLM proxy · You need cost tracking, logging, or model routing through LiteLLM

**Covers:** Quick start · Configuration · Image generation · Advanced · Related

**CLI:** `openclaw models list`, `openclaw onboard`

**Config:** `agents.defaults.mediaModels.image`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/litellm](https://docs.openclaw.ai/providers/litellm)</sub>

---

### `/providers/openrouter` — OpenRouter

**OpenRouter** · *Models › Gateways and routers*

> Use OpenRouter's unified API to access many models in OpenClaw

<sub>source `docs/providers/openrouter.md` · 530 lines · 1659 words · 17 code blocks</sub>

**Read when:** You want a single API key for many LLMs · You want to run models via OpenRouter in OpenClaw · You want to use OpenRouter for image generation · You want to use OpenRouter for music generation · You want to use OpenRouter for video generation

**Covers:** Getting started · Config example · Model references · Image generation · Video generation · Music generation · Text-to-speech · Speech-to-text (inbound audio) · Fusion router · Authentication and headers · Advanced configuration · Related

**CLI:** `openclaw infer model`, `openclaw models auth`, `openclaw models set`, `openclaw onboard`

**Config:** `agents.defaults.mediaMaxMb`, `agents.defaults.mediaModels.image`, `agents.defaults.mediaModels.image.timeoutMs`, `agents.defaults.mediaModels.music`, `agents.defaults.mediaModels.video`, `models.providers.openrouter.apiKey`, `models.providers.openrouter.params.provider`, `tools.media.audio`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/openrouter](https://docs.openclaw.ai/providers/openrouter)</sub>

---

### `/providers/vercel-ai-gateway` — Vercel AI gateway

**Vercel AI gateway** · *Models › Gateways and routers*

> Vercel AI Gateway setup (auth + model selection)

<sub>source `docs/providers/vercel-ai-gateway.md` · 131 lines · 356 words · 5 code blocks</sub>

**Read when:** You want to use Vercel AI Gateway with OpenClaw · You need the API key env var or CLI auth choice

**Covers:** Getting started · Non-interactive example · Model ID shorthand · Advanced configuration · Related

**CLI:** `openclaw models list`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/vercel-ai-gateway](https://docs.openclaw.ai/providers/vercel-ai-gateway)</sub>

---

### `/providers/ds4` — ds4

**ds4** · *Models › Local runtimes*

> Run OpenClaw through ds4, a local DeepSeek V4 Flash OpenAI-compatible server

<sub>source `docs/providers/ds4.md` · 305 lines · 513 words · 10 code blocks</sub>

**Read when:** You want to run OpenClaw against antirez/ds4 · You want a local DeepSeek V4 Flash backend with tool calls · You need the OpenClaw config for ds4-server

**Covers:** Requirements · Quickstart · Full config · On-demand startup · Think Max · Test · Troubleshooting · Related

**CLI:** `openclaw agent`, `openclaw infer model`

**Config:** `models.providers.ds4`, `models.providers.ds4.models[].contextWindow`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ds4](https://docs.openclaw.ai/providers/ds4)</sub>

---

### `/providers/llmman` — llmman

**llmman** · *Models › Local runtimes*

> Run OpenClaw with llmman (local models, hosted providers, and hybrid local + hosted routing)

<sub>source `docs/providers/llmman.md` · 1033 lines · 3494 words · 40 code blocks</sub>

**Read when:** You want to run OpenClaw against local GGUF or safetensors models through llmman · You want hybrid inference that keeps small requests local and overflows large ones to a hosted model · You need llmman setup, configuration, vision, or troubleshooting guidance

**Covers:** Auth rules · Getting started · Full config example · Model discovery · Hybrid inference · Vision and image description · Configuration · Common recipes · Advanced configuration · Troubleshooting · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw infer audio`, `openclaw infer image`, `openclaw infer model`, `openclaw models list`, `openclaw models set`, `openclaw models status`

**Config:** `agents.defaults.model.fallbacks`, `models.providers.llmman`, `models.providers.llmman.models`, `models.providers.llmman.timeoutSeconds`, `tools.profile`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/llmman](https://docs.openclaw.ai/providers/llmman)</sub>

---

### `/providers/lmstudio` — LM Studio

**LM Studio** · *Models › Local runtimes*

> Run OpenClaw with LM Studio

<sub>source `docs/providers/lmstudio.md` · 246 lines · 860 words · 13 code blocks</sub>

**Read when:** You want to run OpenClaw with open source models via LM Studio · You want to set up and configure LM Studio

**Covers:** Quick start · Non-interactive onboarding · Configuration · Troubleshooting · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw models set`, `openclaw onboard`

**Config:** `models.providers.lmstudio`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/lmstudio](https://docs.openclaw.ai/providers/lmstudio)</sub>

---

### `/providers/ollama` — Ollama

**Ollama** · *Models › Local runtimes*

> Run OpenClaw with Ollama (cloud and local models)

<sub>source `docs/providers/ollama.md` · 151 lines · 725 words</sub>

**Read when:** You want to run OpenClaw with cloud or local models via Ollama · You need Ollama setup and configuration guidance · You want Ollama vision models for image understanding

**Covers:** Where each section moved · Related

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama](https://docs.openclaw.ai/providers/ollama)</sub>

---

### `/providers/ollama/setup` — Ollama setup

**Ollama setup** · *Models › Ollama*

> Connect OpenClaw to Ollama: auth rules, onboarding, and cloud models through a local host

<sub>source `docs/providers/ollama/setup.md` · 155 lines · 699 words · 9 code blocks</sub>

**Read when:** You are connecting OpenClaw to Ollama for the first time · You need the auth rules for local, LAN, remote, or cloud hosts · You want cloud and local models served through one Ollama host

**Covers:** Auth rules · Getting started · Cloud models through a local host

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw models list`, `openclaw models set`, `openclaw onboard`

**Config:** `memory.search.provider`, `memory.search.remote.apiKey`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/setup](https://docs.openclaw.ai/providers/ollama/setup)</sub>

---

### `/providers/ollama/model-discovery` — Ollama model discovery

**Ollama model discovery** · *Models › Ollama*

> How OpenClaw discovers Ollama models implicitly, plus narrow smoke tests

<sub>source `docs/providers/ollama/model-discovery.md` · 115 lines · 541 words · 6 code blocks</sub>

**Read when:** You want to know which models OpenClaw discovers and how · You need capability, reasoning, or cost detection rules · You want a narrow text or vision probe that skips the agent tool surface

**Covers:** Model discovery (implicit provider) <sub>(1 sub-sections)</sub>

**CLI:** `openclaw infer audio`, `openclaw infer model`, `openclaw models list`

**Config:** `models.json`, `models.providers.ollama`, `models.providers.ollama.apiKey`, `models.providers.ollama.models`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/model-discovery](https://docs.openclaw.ai/providers/ollama/model-discovery)</sub>

---

### `/providers/ollama/node-local-inference` — Ollama node-local inference

**Ollama node-local inference** · *Models › Ollama*

> Delegate a bounded prompt to an Ollama model running on a paired node

<sub>source `docs/providers/ollama/node-local-inference.md` · 94 lines · 346 words · 5 code blocks</sub>

**Read when:** You want an agent to run a model on a paired desktop or server node · You need the node pairing and approval steps for Ollama commands · You want to verify node commands without an agent turn

**Covers:** Node-local inference

**CLI:** `openclaw config set`, `openclaw devices approve`, `openclaw devices list`, `openclaw node restart`, `openclaw node run`, `openclaw nodes approve`, `openclaw nodes invoke`, `openclaw nodes pending`

**Config:** `models.providers.ollama.baseUrl`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/node-local-inference](https://docs.openclaw.ai/providers/ollama/node-local-inference)</sub>

---

### `/providers/ollama/vision` — Ollama vision and image description

**Ollama vision and image description** · *Models › Ollama*

> Route image understanding through local or hosted Ollama vision models

<sub>source `docs/providers/ollama/vision.md` · 110 lines · 248 words · 5 code blocks</sub>

**Read when:** You want image description through an Ollama vision model · You are configuring an image-model default for Ollama

**Covers:** Vision and image description

**CLI:** `openclaw infer image`

**Config:** `agents.defaults.imageModel.fallbacks`, `models.providers.ollama.models`, `models.providers.ollama.timeoutSeconds`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/vision](https://docs.openclaw.ai/providers/ollama/vision)</sub>

---

### `/providers/ollama/configuration` — Ollama configuration

**Ollama configuration** · *Models › Ollama*

> The basic, explicit, and custom base URL config shapes for the Ollama provider

<sub>source `docs/providers/ollama/configuration.md` · 81 lines · 65 words · 3 code blocks</sub>

**Read when:** You are writing the Ollama provider entry in your config · You want implicit discovery, a manual model list, or a custom base URL

**Covers:** Configuration

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/configuration](https://docs.openclaw.ai/providers/ollama/configuration)</sub>

---

### `/providers/ollama/recipes` — Ollama config recipes

**Ollama config recipes** · *Models › Ollama*

> Copyable Ollama config recipes, model selection, and quick verification

<sub>source `docs/providers/ollama/recipes.md` · 308 lines · 417 words · 11 code blocks</sub>

**Read when:** You want a working config for a local, LAN, cloud, or mixed setup · You are selecting a model or verifying an Ollama setup end to end

**Covers:** Common recipes <sub>(2 sub-sections)</sub>

**CLI:** `openclaw infer model`, `openclaw models list`, `openclaw models set`, `openclaw models status`

**Config:** `models.providers.ollama`, `tools.profile`, `tools.toolSearch`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/recipes](https://docs.openclaw.ai/providers/ollama/recipes)</sub>

---

### `/providers/ollama/web-search` — Ollama Web Search

**Ollama Web Search** · *Models › Ollama*

> Use Ollama as the OpenClaw websearch provider

<sub>source `docs/providers/ollama/web-search.md` · 57 lines · 155 words · 2 code blocks</sub>

**Read when:** You want Ollama to serve the web_search tool · You need the host, auth, and requirement rules for Ollama search

**Covers:** Ollama Web Search

**CLI:** `openclaw configure`, `openclaw onboard`

**Config:** `models.providers.ollama.baseUrl`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/web-search](https://docs.openclaw.ai/providers/ollama/web-search)</sub>

---

### `/providers/ollama/advanced` — Ollama advanced configuration

**Ollama advanced configuration** · *Models › Ollama*

> Context windows, thinking control, costs, embeddings, and streaming for Ollama

<sub>source `docs/providers/ollama/advanced.md` · 272 lines · 1093 words · 7 code blocks</sub>

**Read when:** You are tuning context windows, num_ctx, or thinking control · You need Ollama memory embeddings or streaming configuration · You are using the legacy OpenAI-compatible mode

**Covers:** Advanced configuration

**CLI:** `openclaw agent`, `openclaw doctor`

**Config:** `agents.defaults.compaction.thinkingLevel`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/advanced](https://docs.openclaw.ai/providers/ollama/advanced)</sub>

---

### `/providers/ollama/troubleshooting` — Ollama troubleshooting

**Ollama troubleshooting** · *Models › Ollama*

> Fixes for common Ollama failures in OpenClaw

<sub>source `docs/providers/ollama/troubleshooting.md` · 203 lines · 447 words · 11 code blocks</sub>

**Read when:** Ollama is not detected, or no models are available · You hit connection refused, garbled output, or timeouts · A WSL2 setup reboots repeatedly

**Covers:** Troubleshooting

**CLI:** `openclaw gateway status`, `openclaw infer model`, `openclaw models set`

**Config:** `models.providers.ollama`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/ollama/troubleshooting](https://docs.openclaw.ai/providers/ollama/troubleshooting)</sub>

---

### `/providers/sglang` — SGLang

**SGLang** · *Models › Local runtimes*

> Run OpenClaw with SGLang (OpenAI-compatible self-hosted server)

<sub>source `docs/providers/sglang.md` · 156 lines · 414 words · 5 code blocks</sub>

**Read when:** You want to run OpenClaw against a local SGLang server · You want OpenAI-compatible /v1 endpoints with your own models

**Covers:** Getting started · Model discovery (implicit provider) · Explicit configuration (manual models) · Advanced configuration · Related

**CLI:** `openclaw onboard`

**Config:** `agents.defaults.models`, `models.providers.sglang`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/sglang](https://docs.openclaw.ai/providers/sglang)</sub>

---

### `/providers/vllm` — vLLM

**vLLM** · *Models › Local runtimes*

> Run OpenClaw with vLLM (OpenAI-compatible local server)

<sub>source `docs/providers/vllm.md` · 360 lines · 888 words · 17 code blocks</sub>

**Read when:** You want to run OpenClaw against a local vLLM server · You want OpenAI-compatible /v1 endpoints with your own models

**Covers:** Getting started · Model discovery (implicit provider) · Explicit configuration · Advanced configuration · Troubleshooting · Related

**CLI:** `openclaw config set`, `openclaw models list`, `openclaw onboard`

**Config:** `agents.defaults.models`, `agents.defaults.timeoutSeconds`, `models.providers.vllm`, `models.providers.vllm.baseUrl`

**TermCrab — providers: PARTIAL.** One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.

<sub>live: [docs.openclaw.ai/providers/vllm](https://docs.openclaw.ai/providers/vllm)</sub>

---
