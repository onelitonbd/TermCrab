# Plugins and the ecosystem question

**Their pages:** 337 under `/plugins` — architecture, manifests, SDK guides (channel/provider/agent harness/entrypoints/runtime/migration), a hook system, and **163 generated per-plugin reference pages**. Plus 14 ClawHub pages (registry, publishing, moderation, security audits, telemetry) served from a separate source.
**Catalogue:** [`../sections/05-capabilities.md`](../sections/05-capabilities.md), [`../sections/13-pages-outside-the-navigation.md`](../sections/13-pages-outside-the-navigation.md).

---

## 1. This is the biggest gap — and the biggest trap

TermCrab scores **0%** on plugins: `packages/plugin-sdk/index.ts` is a stub, channels and providers are compiled in, there is no manifest, no loader, no install path.

The trap is reading that as "build 164 extensions". Their extension count is a *consequence* of having ~2,000 contributors who each needed one thing. Your 1-person project does not need 164 extensions; it needs **the ability to add the 165th without editing the core**, and that is a much smaller product.

## 2. What they actually built (the parts worth stealing)

- **One plugin shape for everything**: channel plugins, provider plugins, tool plugins, harness plugins — each a package with a manifest, loaded dynamically. Feature parity is not the innovation; *uniformity* is.
- **Typed SDK + JSON-schema manifests**, with allowlists and install policy — the plugin boundary is also the security boundary.
- **Hooks** as the other half of extensibility: 14 typed lifecycle hooks (`before_tool_call`, `after_tool_call`, `before_prompt_build`, `message_received/sending/sent`, `session_start/end`, compaction observers…). For most extension needs, a hook is cheaper than a plugin.
- **And the cost**: dynamic loading of arbitrary packages is what made ClawHavoc possible (1,467 malicious skills) and what CVE-2026-25253 exploited. Their response was signed manifests and install policies — i.e. the ecosystem needed a security program before it needed features.

## 3. What TermCrab should build instead (15 days, not 15 months)

A deliberately small version, sized for one maintainer and a phone:

1. **`plugins/<name>/plugin.json` + `plugin.js`** — a manifest (name, version, what it registers) and one ES module. No npm, no build step.
2. **Three registration points only**: `registerTool()`, `registerChannel()`, `registerHook()` (the minimal hook set from the roadmap: `before_tool_call`, `after_tool_call`, `message_received`, `session_start/end`).
3. **Local install only** — `plugins/` in the workspace; `termcrab plugins ls|enable|disable`. **No remote install, no registry.** This is a security decision, and it is defensible out loud: *"there is no registry, so there is nothing to poison."*
4. **A 30-line example plugin in the repo** (`plugins/hello-world/`) plus a `docs/PLUGINS.md`. If the example takes more than 30 lines, the API is wrong.
5. **Permissions declared, not enforced by magic**: a manifest field listing what the plugin wants (net, fs, exec) shown by `termcrab plugins show`, with a warning the first time it runs.

**Why this order:** hooks first (they solve half the needs with no new surface), then tools, then channels. The `before_tool_call`/`after_tool_call` pair alone gives users logging, redaction, caching, rate limiting and policy — all the things that otherwise become core edits.

## 4. What to say when someone asks "but they have 13,000 skills"

Three sentences, and all three are true:

1. "Every skill in the registry is a file you have to trust; ours are files you wrote or imported yourself."
2. "We ship a small, curated set, and we read OpenClaw's skill format natively — `termcrab import openclaw` brings your skills across unchanged."
3. "Our plugins run on your phone with zero runtime dependencies; their ecosystem assumes Node ≥ 24 and a desktop."

That is a **position**, not an apology, and it is only credible if the support matrix in the README stops implying more channels/skills than actually work (see [06-channels.md](06-channels.md)).

## 5. Done tests

- `termcrab plugins new my-tool` scaffolds a working plugin in one command; enabling it adds a tool the agent can call, with no core edit.
- A `before_tool_call` hook can block `exec` — proving the hook system is a real policy point, not a log callback.
- `docs/PLUGINS.md` shows one plugin of each of the three kinds, and all three appear in `census.mjs` as probes.
