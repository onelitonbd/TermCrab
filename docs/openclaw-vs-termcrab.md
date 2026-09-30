# OpenClaw vs TermCrab - a real, unflinching comparison

**Compiled:** 2026-09-30
**Sources:** `OPENCLAW_REPORT.md` (compiled 2026-09-29 from the official repo, docs and live GitHub API), a fresh web check on 2026-09-30 ([InfoQ on OpenClaw 2.0](https://www.infoq.com/news/2026/09/openclaw-2-release/), [MarkTechPost on 2026.9.5](https://www.marktechpost.com/2026/09/19/openclaw-releases-2026-9-5/), [OpenClaw ecosystem digest 2026-09-30](https://github.com/datnguyenquy94/news-radar/issues/645)), and this repository's own stats.

This document does not sell either project. It states where TermCrab loses badly, where it genuinely wins, and what that means for the roadmap.

---

## 1. The scoreboard

| Metric | OpenClaw | TermCrab |
|---|---|---|
| Stars / reach | 390,000+ GitHub stars, ~3.2M monthly active users | No public audience yet (sharing deliberately deferred) |
| People | ~2,000 contributors; 933 devs shipped 2.0; 502 accounts in one release | 1 owner + AI agents |
| History | Created 2025-11; two renames (Clawdbot -> Moltbot -> OpenClaw); foundation-governed | ~2 months of development; 57 commits; 21 tagged releases (v0.1.0 -> v0.30.0) |
| Latest release | v2026.9.7, shipped 2026-09-30 (update safety); 2.0 = 16,000 PRs ([InfoQ](https://www.infoq.com/news/2026/09/openclaw-2-release/)) | v0.30.0, shipped 2026-09-30 (settings redesign) |
| Codebase | Monorepo: ~91% TypeScript (421MB), plus Swift/Kotlin/Rust; src + 23 packages + 164 extensions + React UI | ~11.3k LOC src (64 TS files) + 4.4k test LOC + 4.3k single-file UI; no packages, no extensions |
| Runtime deps | Large dependency tree; Node >= 24.16 or >= 26.1 | **Zero runtime dependencies** (devDeps: typescript, @types/node); Node >= 20.10 |
| License | MIT | MIT |
| Tests | Vitest-style suites, contract tests per channel, semgrep/oxlint/CI at 16k-PR scale | 285 tests (284 pass / 1 skip), real HTTP endpoint pins, browser (jsdom) batteries, 0 planned-tool lies |
| Channels | 30+ (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams, SMS...) | 5 surfaces: Web panel, TUI/CLI, Telegram, WhatsApp, voice; plus internal cron/dream/heartbeat/subagent |
| Skills | 49 bundled + 13,000+ on ClawHub + agent self-writing skills | 5 bundled (daily-briefing, shell-safety, termux-api, voice, web-research) + OpenClaw SKILL.md import (`termcrab import openclaw`) |
| Tools / plugins | ~44 in-loop tools here vs 164 plugin extensions, MCP + ACP, browser control, media generation | ~44 tools, no plugin API, no MCP |
| Apps | macOS/Windows/Linux desktop, iOS/Android node apps, Canvas widgets | One-file mobile-first web panel + TUI |
| Security record | CVE-2026-25253 (zero-click WS hijack), "ClawHavoc" (1,467 malicious skills), 1,142 advisories in 5 months | No advisories; skills are local files you write or import - no registry supply chain exists |
| Governance | OpenClaw Foundation (501c3), corporate donors | The owner's laptop |

**Honest summary of the scoreboard:** OpenClaw wins on every axis of scale, ecosystem, breadth and polish. Anyone claiming otherwise is selling something.

---

## 2. Same bones - own the ancestry first

TermCrab is not an independent invention. Its architecture was deliberately planned against OpenClaw's shape (`OPENCLAW_REPORT.md` section 5 is literally the blueprint): a gateway daemon, an agent loop, Markdown skills with YAML frontmatter, `SOUL.md`/`MEMORY.md`/`HEARTBEAT.md`, JSONL session transcripts, cron, heartbeat, dreaming consolidation, a control UI and a TUI. We even ship `termcrab import openclaw` and read OpenClaw's skill files unchanged.

The difference is the *point of the build*: OpenClaw is architected for maximum reach on desktops and servers; TermCrab is architected to run natively, lightly and verifiably on the owner's phone. Everything below follows from that one choice.

---

## 3. Where OpenClaw grills us (no mercy)

1. **Ecosystem, brutally.** 13k+ community skills, ClawHub registry, self-writing skills, MCP/ACP protocol support, 164 extensions including browser control, meeting bots, media generation. We have ~44 tools and 5 skills. If a capability exists somewhere, OpenClaw probably has a skill for it today.
2. **Channels.** 30+ messaging platforms vs our 2 real chat channels. Discord, Slack, Signal, iMessage, Teams - absent here entirely.
3. **Surface polish.** Native desktop apps, iOS/Android nodes, Canvas widgets, voice calls, and a rebuilt browser-first primary UI in 2.0 with auto-detection of existing subscriptions/keys. Our web panel (single HTML file) just got its settings page redesigned - it is honest and usable, not in the same league of ambition.
4. **Machinery at scale.** Atomic updates with rollback, plugin hot reload without gateway restart, typed wire protocol with pairing nonces, per-channel contract tests, 502 contributors in a single release ([MarkTechPost](https://www.marktechpost.com/2026/09/19/openclaw-releases-2026-9-5/)), 500 PRs and 147 issues touched in one day ([digest](https://github.com/datnguyenquy94/news-radar/issues/645)). We have `tsc` and `node:test`.
5. **The churn tax cuts both ways.** 2.0 brought "migration problems, broken gateways, lost automations, model authentication issues" for some users ([InfoQ](https://www.infoq.com/news/2026/09/openclaw-2-release/)). They move fast at scale and some users bleed for it. We cannot even afford that kind of breakage - and we do not have their throughput to recover from it either.
6. **Docs and community.** A full docs site, thousands of guides, a foundation, security process. We have `docs/` and one very opinionated owner.

---

## 4. Where TermCrab grills THEM (their own report card)

The evidence is in `OPENCLAW_REPORT.md`, compiled from their repo and community guides:

1. **The phone reality - their Achilles heel.** On Android/Termux, OpenClaw: fails its official installer; needs proot + Ubuntu (~3GB disk, +800ms tool latency); needs a hand-edited "bionic bypass" for the Error-13 crash; dies on screen-off; assumes `/tmp` that Android does not have; idles at 145MB-1GB RAM with ~1.25s startup; drains 5-10%/h under load; has **no official Android path in its docs**. TermCrab was built the other way around: the bionic guard is the *first thing the binary loads*, `TMPDIR` defaults are baked in, a supervisor + wake-lock + boot scripts keep it alive, the heartbeat adapts to battery (pauses below 20%), an offline outbox stores-and-forwards on flaky networks, and `doctor` checks for the exact failure modes the community blogged about. Every one of those comes from section 5's acceptance table - we built against their scars.
2. **Supply chain, by construction.** Their history: a zero-click WebSocket CVE, and 1,467 malicious skills found in the registry ("ClawHavoc"); 1,142 security advisories in five months. TermCrab has **zero runtime dependencies** and **no skill registry**: skills are Markdown files in *your* workspace that *you* wrote or explicitly imported. There is no `npm install` attack surface and no registry to poison. This is not luck; it is the tradeoff of having no ecosystem.
3. **Install floor.** OpenClaw demands Node >= 24.16/26. Termux users typically have `nodejs-lts`. TermCrab runs on Node >= 20.10. On a phone, that wall is the difference between "installed" and "forum thread".
4. **Test density.** 285 tests across ~20k lines, including a real `node:http` portal proxy test, config round-trips, and three jsdom browser batteries (26/26, 32/32, 22/22) - plus the discipline to delete fake "planned" tool badges rather than ship them (v0.26). Per line of code, our verification is denser and every claim in a release note was re-tested the same day.
5. **Readability.** The whole system is 64 TypeScript files plus one HTML file. The owner can read every line that runs on their device. OpenClaw's `src/` alone is ~70 modules, before 23 packages and 164 extensions.
6. **Release cadence with evidence.** 21 releases, each gated by the suite, tagged and published with a changelog. No release ships without fresh green tests - a bar 2.0's migration pain suggests is not universal at their scale.

---

## 5. Where WE get grilled (self-honesty)

1. **Context management.** We do not compact. Long sessions grow until the provider's limit; OpenClaw summarizes/compacts old turns and enforces token budgets per model. This is their `compaction` vs our full-transcript read - a real architectural gap.
2. **Breadth.** Two messaging channels. No Discord/Slack/Signal. No desktop or mobile native apps. No Canvas. No browser control, media generation, meeting bots, voice calls.
3. **Extensibility.** No plugin API: every contribution is a core edit by us. No MCP: no external tool ecosystem can plug in. Bus factor: 1.
4. **Security machinery.** Only `tsc` + tests. No semgrep/oxlint/dependency scanning/contract tests. Zero dependencies helps, but gateway/auth code deserves static analysis.
5. **Protocol rigor.** Token auth only - no device pairing with challenge nonces, no typed wire-protocol schema, no idempotency keys for side effects. Their WS handshake model is stronger.
6. **Ops.** No atomic updates or rollback for our own installs; upgrades are replace-and-restart. No Docker/Nix/systemd paths.
7. **WhatsApp risk.** Baileys is unofficial - the same TOS exposure OpenClaw has. Shared weakness, not ours to claim.
8. **Support reality.** No foundation, no docs site, no community. If OpenClaw is a city, TermCrab is a workshop.

---

## 6. Verdict

| If you want... | Winner |
|---|---|
| The most capable self-hosted agent ecosystem today (desktop/VPS, many channels, apps, plugins) | **OpenClaw - not close** |
| It running natively on an Android phone: light, no proot, no hand-patches, survives Doze | **TermCrab** |
| Zero supply-chain exposure, readable code you can audit in an afternoon | **TermCrab** |
| Every release note backed by same-day green tests | **TermCrab** (discipline, not scale) |
| Community, docs, third-party skills, protocol-level security machinery | **OpenClaw** |

**Strategy (unchanged, now with receipts):** do not chase their breadth. Own two axes - **phone-native** and **trustworthy-by-verification** - and steal selectively from their roadmap:

1. **Context compaction** (biggest real gap; do next),
2. deeper `doctor` + safer update flow (they proved the failure modes),
3. pairing-style device approval before exposing anything beyond loopback,
4. an MCP client only when it serves the phone use-case.

What NOT to build: 30 channels, an app store, a plugin marketplace, native apps. Those are their wars. Ours is a crab that lives in your pocket, never asks for proot, and proves every claim with tests.
