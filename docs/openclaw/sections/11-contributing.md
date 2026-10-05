# Contributing

<sub>Generated catalogue of **56 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/maturity/scorecard`](#maturityscorecard-maturity-scorecard) — Maturity scorecard
- [`/maturity/taxonomy`](#maturitytaxonomy-maturity-taxonomy) — Maturity taxonomy
- [`/reference/test`](#referencetest-tests) — Tests
- [`/reference/test/local`](#referencetestlocal-run-tests-locally) — Run tests locally
- [`/reference/test/lanes`](#referencetestlanes-control-ui-tui-and-e2e-lanes) — Control UI, TUI, and E2E lanes
- [`/reference/test/docker`](#referencetestdocker-docker-test-suites) — Docker test suites
- [`/reference/test/performance`](#referencetestperformance-test-performance-and-benchmarks) — Test performance and benchmarks
- [`/reference/test/runner-internals`](#referencetestrunner-internals-test-runner-internals) — Test runner internals
- [`/reference/test/remote-proof`](#referencetestremote-proof-remote-test-proof) — Remote test proof
- [`/ci`](#ci-ci-pipeline) — CI pipeline
- [`/ci/pipeline`](#cipipeline-ci-pipeline-jobs) — CI pipeline jobs
- [`/ci/watching-runs`](#ciwatching-runs-watch-a-ci-run) — Watch a CI run
- [`/ci/checkout`](#cicheckout-ci-checkout-ownership) — CI checkout ownership
- [`/ci/scope-and-routing`](#ciscope-and-routing-ci-scope-and-routing) — CI scope and routing
- [`/ci/scope-and-routing/selection`](#ciscope-and-routingselection-scope-selection) — Scope selection
- [`/ci/scope-and-routing/node-test-lanes`](#ciscope-and-routingnode-test-lanes-node-test-lanes) — Node test lanes
- [`/ci/scope-and-routing/job-budgets`](#ciscope-and-routingjob-budgets-job-budgets-and-platform-lanes) — Job budgets and platform lanes
- [`/ci/scope-and-routing/manual-dispatches`](#ciscope-and-routingmanual-dispatches-manual-dispatches) — Manual dispatches
- [`/ci/runners`](#cirunners-ci-runner-classes) — CI runner classes
- [`/ci/capacity`](#cicapacity-ci-capacity-and-shard-weights) — CI capacity and shard weights
- [`/ci/release-validation`](#cirelease-validation-release-validation-workflows) — Release validation workflows
- [`/ci/release-validation/full-release-validation`](#cirelease-validationfull-release-validation-full-release-validation) — Full Release Validation
- [`/ci/release-validation/live-and-e2e-shards`](#cirelease-validationlive-and-e2e-shards-live-and-e2e-shards) — Live and E2E shards
- [`/ci/release-validation/package-acceptance`](#cirelease-validationpackage-acceptance-package-acceptance) — Package Acceptance
- [`/ci/release-validation/install-smoke-and-docker-e2e`](#cirelease-validationinstall-smoke-and-docker-e2e-install-smoke-and-docker-e2e) — Install smoke and Docker E2E
- [`/ci/release-validation/plugin-prerelease`](#cirelease-validationplugin-prerelease-plugin-prerelease) — Plugin Prerelease
- [`/ci/scheduled-workflows`](#cischeduled-workflows-scheduled-and-maintenance-workflows) — Scheduled and maintenance workflows
- [`/ci/local-proof`](#cilocal-proof-local-checks-and-testbox) — Local checks and Testbox
- [`/help/scripts`](#helpscripts-scripts) — Scripts
- [`/concepts/qa-e2e-automation`](#conceptsqa-e2e-automation-qa-overview) — QA overview
- [`/concepts/qa-e2e-automation/command-surface`](#conceptsqa-e2e-automationcommand-surface-command-surface) — Command surface
- [`/concepts/qa-e2e-automation/operator-flow`](#conceptsqa-e2e-automationoperator-flow-operator-flow) — Operator flow
- [`/concepts/qa-e2e-automation/scenario-coverage`](#conceptsqa-e2e-automationscenario-coverage-canonical-scenario-coverage) — Canonical scenario coverage
- [`/concepts/qa-e2e-automation/channel-qa-reference`](#conceptsqa-e2e-automationchannel-qa-reference-channel-qa-reference) — Channel QA reference
- [`/concepts/qa-e2e-automation/slack-qa`](#conceptsqa-e2e-automationslack-qa-slack-qa) — Slack QA
- [`/concepts/qa-e2e-automation/whatsapp-and-credentials`](#conceptsqa-e2e-automationwhatsapp-and-credentials-whatsapp-qa-and-credentials) — WhatsApp QA and credentials
- [`/concepts/qa-e2e-automation/extending-the-stack`](#conceptsqa-e2e-automationextending-the-stack-extending-the-qa-stack) — Extending the QA stack
- [`/concepts/qa-e2e-automation/qa-reporting`](#conceptsqa-e2e-automationqa-reporting-qa-reporting) — QA reporting
- [`/concepts/personal-agent-benchmark-pack`](#conceptspersonal-agent-benchmark-pack-personal-agent-benchmark-pack) — Personal agent benchmark pack
- [`/help/testing`](#helptesting-testing) — Testing
- [`/help/testing/suites`](#helptestingsuites-test-suites-and-commands) — Test suites and commands
- [`/help/testing/live-workflows`](#helptestinglive-workflows-live-and-dockerparallels-workflows) — Live and Docker/Parallels workflows
- [`/help/testing/docker`](#helptestingdocker-docker-test-runners) — Docker test runners
- [`/help/testing/qa-runners`](#helptestingqa-runners-qa-specific-runners) — QA-specific runners
- [`/help/testing/contracts`](#helptestingcontracts-contract-tests) — Contract tests
- [`/help/testing/writing-tests`](#helptestingwriting-tests-writing-and-adding-tests) — Writing and adding tests
- [`/help/testing-updates-plugins`](#helptesting-updates-plugins-testing-updates-and-plugins) — Testing: updates and plugins
- [`/help/testing-live`](#helptesting-live-testing-live-suites) — Testing: live suites
- [`/help/testing-live/quick-smokes`](#helptesting-livequick-smokes-quick-live-smokes-and-the-android-node-sweep) — Quick live smokes and the Android node sweep
- [`/help/testing-live/model-smoke`](#helptesting-livemodel-smoke-live-model-smoke-profile-keys) — Live model smoke (profile keys)
- [`/help/testing-live/cli-backends`](#helptesting-livecli-backends-cli-backend-and-apns-lanes) — CLI backend and APNs lanes
- [`/help/testing-live/acp-and-codex`](#helptesting-liveacp-and-codex-acp-bind-and-codex-app-server-lanes) — ACP bind and Codex app-server lanes
- [`/help/testing-live/long-context-and-matrix`](#helptesting-livelong-context-and-matrix-openai-long-context-and-the-live-model-matrix) — OpenAI long context and the live model matrix
- [`/help/testing-live/media-providers`](#helptesting-livemedia-providers-media-provider-live-lanes) — Media provider live lanes
- [`/concepts/mantis`](#conceptsmantis-mantis) — Mantis
- [`/concepts/mantis-slack-desktop-runbook`](#conceptsmantis-slack-desktop-runbook-mantis-slack-desktop-runbook) — Mantis Slack desktop runbook

## Document sections

### `/maturity/scorecard` — Maturity scorecard

**Maturity scorecard** · *Contributing › Maturity*

> OpenClaw release readiness scores for product areas, integrations, and supported workflows.

<sub>source `docs/maturity/scorecard.md` · 985 lines · 10218 words</sub>

**Covers:** What this page is for · At a glance · Score bands · Surface explorer · Decision context · QA evidence summary <sub>(51 sub-sections)</sub>

<sub>live: [docs.openclaw.ai/maturity/scorecard](https://docs.openclaw.ai/maturity/scorecard)</sub>

---

### `/maturity/taxonomy` — Maturity taxonomy

**Maturity taxonomy** · *Contributing › Maturity*

> Detailed reference for the product areas and checks behind the OpenClaw maturity scorecard.

<sub>source `docs/maturity/taxonomy.md` · 6143 lines · 20289 words</sub>

**Covers:** How to read this page · Maturity levels · Product areas · Details <sub>(4 sub-sections)</sub>

<sub>live: [docs.openclaw.ai/maturity/taxonomy](https://docs.openclaw.ai/maturity/taxonomy)</sub>

---

### `/reference/test` — Tests

**Tests** · *Contributing › Testing and CI*

> Index of the OpenClaw testing reference, one page per reader job

<sub>source `docs/reference/test.md` · 54 lines · 321 words</sub>

**Read when:** Running or fixing tests

**Covers:** Where each section moved · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/test](https://docs.openclaw.ai/reference/test)</sub>

---

### `/reference/test/local` — Run tests locally

**Run tests locally** · *Contributing › Tests*

> Routine local test order, the core test commands, and the local PR gate

<sub>source `docs/reference/test/local.md` · 366 lines · 3094 words · 2 code blocks</sub>

**Read when:** You are running or fixing tests on your own machine · You need the local land and gate command list

**Covers:** Routine local order · Core commands · Local PR gate <sub>(1 sub-sections)</sub>

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/test/local](https://docs.openclaw.ai/reference/test/local)</sub>

---

### `/reference/test/lanes` — Control UI, TUI, and E2E lanes

**Control UI, TUI, and E2E lanes** · *Contributing › Tests*

> Control UI, TUI, extension, Gateway, and live lane commands and fixture rules

<sub>source `docs/reference/test/lanes.md` · 209 lines · 2372 words · 1 code blocks</sub>

**Read when:** You are running or writing a Control UI, TUI, or extension test · You need the Gateway or live E2E lane commands

**Covers:** Control UI, TUI, and extension lanes · Gateway and E2E <sub>(3 sub-sections)</sub>

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/test/lanes](https://docs.openclaw.ai/reference/test/lanes)</sub>

---

### `/reference/test/docker` — Docker test suites

**Docker test suites** · *Contributing › Tests*

> The full Docker suite scheduler, its lanes, and the onboarding and QR smokes

<sub>source `docs/reference/test/docker.md` · 104 lines · 1319 words · 2 code blocks</sub>

**Read when:** You are running Docker test lanes · You need the Docker scheduler environment variables

**Covers:** Full Docker suite (pnpm test:docker:all) · Onboarding E2E (Docker) · QR import smoke (Docker) <sub>(3 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw health`, `openclaw mcp serve`, `openclaw skills install`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/test/docker](https://docs.openclaw.ai/reference/test/docker)</sub>

---

### `/reference/test/performance` — Test performance and benchmarks

**Test performance and benchmarks** · *Contributing › Tests*

> Import profiling, CPU and heap profiles, shard timings, and benchmark scripts

<sub>source `docs/reference/test/performance.md` · 608 lines · 5340 words · 13 code blocks</sub>

**Read when:** You are profiling a slow test run · You need a startup, gateway, or model latency benchmark

**Covers:** Test performance tooling · Benchmarks <sub>(4 sub-sections)</sub>

**Config:** `cron.list`, `cron.status`, `memory.rss`, `models.list`, `plugins.setEnabled`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/test/performance](https://docs.openclaw.ai/reference/test/performance)</sub>

---

### `/reference/test/runner-internals` — Test runner internals

**Test runner internals** · *Contributing › Tests*

> Shared build locks, isolated test state and homes, and JSON report merging

<sub>source `docs/reference/test/runner-internals.md` · 330 lines · 3089 words · 1 code blocks</sub>

**Read when:** A run leaked state, retained a lock, or lost a report · You need machine-readable results from a multi-project run

**Covers:** Shared test state and process helpers · Public test diagnostics · JSON reports across native processes

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/test/runner-internals](https://docs.openclaw.ai/reference/test/runner-internals)</sub>

---

### `/reference/test/remote-proof` — Remote test proof

**Remote test proof** · *Contributing › Tests*

> When agents use Crabbox or Testbox, and the wrapper, lease, and trust rules

<sub>source `docs/reference/test/remote-proof.md` · 429 lines · 3584 words · 6 code blocks</sub>

**Read when:** You are deciding between local and remote proof · You are running OpenClaw tests on Crabbox or Testbox

**Covers:** Remote proof policy for agents · Testbox runner sizing · Crabbox repository setup

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/test/remote-proof](https://docs.openclaw.ai/reference/test/remote-proof)</sub>

---

### `/ci` — CI pipeline

**CI pipeline** · *Contributing › Testing and CI*

> CI job graph, scope gates, release umbrellas, and local command equivalents

<sub>source `docs/ci.md` · 317 lines · 3848 words</sub>

**Read when:** You need to understand why a CI job did or did not run · You are debugging a failing GitHub Actions check · You are coordinating a release validation run or rerun · You are changing ClawSweeper dispatch or GitHub activity forwarding

**Covers:** Where each section moved · Related

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci](https://docs.openclaw.ai/ci)</sub>

---

### `/ci/pipeline` — CI pipeline jobs

**CI pipeline jobs** · *Contributing › CI*

> Job graph, fail-fast order, and the Control UI size budgets

<sub>source `docs/ci/pipeline.md` · 1000 lines · 11034 words · 2 code blocks</sub>

**Read when:** You need to know which CI job owns a check · You want the order jobs run in and what blocks what · You need to satisfy or configure security-sensitive pull request review

**Covers:** Pipeline overview · Security review checks · Fail-fast order · Control UI size budgets · Related <sub>(5 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/pipeline](https://docs.openclaw.ai/ci/pipeline)</sub>

---

### `/ci/watching-runs` — Watch a CI run

**Watch a CI run** · *Contributing › CI*

> Wait on a pull request head, recover a stuck run, and clear the evidence gate

<sub>source `docs/ci/watching-runs.md` · 227 lines · 1997 words · 2 code blocks</sub>

**Read when:** You are debugging a failing GitHub Actions check · You need to rerun or recover a pull request run

**Covers:** Watching pull request CI · PR context and evidence · Related <sub>(1 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/watching-runs](https://docs.openclaw.ai/ci/watching-runs)</sub>

---

### `/ci/checkout` — CI checkout ownership

**CI checkout ownership** · *Contributing › CI*

> Shared checkout anchors, retry budgets, and trusted action policy

<sub>source `docs/ci/checkout.md` · 61 lines · 2802 words</sub>

**Read when:** A CI checkout step failed or retried · You are changing checkout anchors or trusted action policy

**Covers:** Checkout ownership · Related

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/checkout](https://docs.openclaw.ai/ci/checkout)</sub>

---

### `/ci/scope-and-routing` — CI scope and routing

**CI scope and routing** · *Contributing › CI*

> Changed-scope detection, lane routing, and manual dispatch behavior

<sub>source `docs/ci/scope-and-routing.md` · 41 lines · 297 words</sub>

**Read when:** You need to understand why a CI job did or did not run · You are changing changed-scope detection or dispatch inputs

**Covers:** Where each section moved · Related

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/scope-and-routing](https://docs.openclaw.ai/ci/scope-and-routing)</sub>

---

### `/ci/scope-and-routing/selection` — Scope selection

**Scope selection** · *Contributing › Scope and routing*

> Changed-scope detection and the per-area rules that select CI lanes

<sub>source `docs/ci/scope-and-routing/selection.md` · 190 lines · 5598 words</sub>

**Read when:** You need to know why a lane was or was not selected for a diff · You are changing changed-scope detection

**Covers:** Scope and routing · Process proof tier <sub>(1 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/scope-and-routing/selection](https://docs.openclaw.ai/ci/scope-and-routing/selection)</sub>

---

### `/ci/scope-and-routing/node-test-lanes` — Node test lanes

**Node test lanes** · *Contributing › Scope and routing*

> How the slowest Node test families are split, balanced, packed, and cached

<sub>source `docs/ci/scope-and-routing/node-test-lanes.md` · 153 lines · 6883 words</sub>

**Read when:** You are changing Vitest sharding, packing, or shard timings · You are debugging a CI cache restore or a Node shard budget

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/scope-and-routing/node-test-lanes](https://docs.openclaw.ai/ci/scope-and-routing/node-test-lanes)</sub>

---

### `/ci/scope-and-routing/job-budgets` — Job budgets and platform lanes

**Job budgets and platform lanes** · *Contributing › Scope and routing*

> UI shards, concurrency and job budgets, lint memory policy, Android rows, and sticky-disk keys

<sub>source `docs/ci/scope-and-routing/job-budgets.md` · 79 lines · 1207 words</sub>

**Read when:** You are changing job counts, concurrency caps, or matrix budgets · You are working on Android CI rows or sticky-disk keys

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/scope-and-routing/job-budgets](https://docs.openclaw.ai/ci/scope-and-routing/job-budgets)</sub>

---

### `/ci/scope-and-routing/manual-dispatches` — Manual dispatches

**Manual dispatches** · *Contributing › Scope and routing*

> Manual CI dispatch behavior, release-gate fallbacks, and the Windows Testbox Probe

<sub>source `docs/ci/scope-and-routing/manual-dispatches.md` · 250 lines · 2498 words · 1 code blocks</sub>

**Read when:** You are dispatching CI or Full Release Validation by hand · You need the Windows Testbox Probe inputs

**Covers:** Manual dispatches <sub>(1 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/scope-and-routing/manual-dispatches](https://docs.openclaw.ai/ci/scope-and-routing/manual-dispatches)</sub>

---

### `/ci/runners` — CI runner classes

**CI runner classes** · *Contributing › CI*

> Event-based runner routing, Blacksmith classes, and runner backend modes

<sub>source `docs/ci/runners.md` · 452 lines · 8954 words · 4 code blocks</sub>

**Read when:** You need to know which runner a lane uses · You are choosing or changing a runner class

**Covers:** Runners · Related <sub>(7 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/runners](https://docs.openclaw.ai/ci/runners)</sub>

---

### `/ci/capacity` — CI capacity and shard weights

**CI capacity and shard weights** · *Contributing › CI*

> Runner registration budget, concurrency headroom, and measured shard timings

<sub>source `docs/ci/capacity.md` · 923 lines · 13183 words</sub>

**Read when:** You are tuning CI concurrency or shard counts · You need the measured timings behind shard packing

**Covers:** Runner registration budget · Vitest worker sizing · Owner-path and release coverage · Measured shard weights · Bounded hybrid hosted offload · Related <sub>(2 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/capacity](https://docs.openclaw.ai/ci/capacity)</sub>

---

### `/ci/release-validation` — Release validation workflows

**Release validation workflows** · *Contributing › CI*

> Full Release Validation, Package Acceptance, install smoke, and Docker E2E

<sub>source `docs/ci/release-validation.md` · 47 lines · 311 words</sub>

**Read when:** You are coordinating a release validation run or rerun · You need to validate a published package or plugin build

**Covers:** Where each section moved · Related

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/release-validation](https://docs.openclaw.ai/ci/release-validation)</sub>

---

### `/ci/release-validation/full-release-validation` — Full Release Validation

**Full Release Validation** · *Contributing › Release validation*

> The Full Release Validation umbrella, release publish, and Docker Release dispatch

<sub>source `docs/ci/release-validation/full-release-validation.md` · 259 lines · 2024 words · 3 code blocks</sub>

**Read when:** You are dispatching or rerunning Full Release Validation · You are publishing a release or a Docker image

**Covers:** Mobile store releases · Full Release Validation

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/release-validation/full-release-validation](https://docs.openclaw.ai/ci/release-validation/full-release-validation)</sub>

---

### `/ci/release-validation/live-and-e2e-shards` — Live and E2E shards

**Live and E2E shards** · *Contributing › Release validation*

> Named live and E2E shards in the release live/E2E child workflow

<sub>source `docs/ci/release-validation/live-and-e2e-shards.md` · 34 lines · 488 words</sub>

**Read when:** You are rerunning a failed live or E2E shard · You need the shard names for a manual one-shot run

**Covers:** Live and E2E shards

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/release-validation/live-and-e2e-shards](https://docs.openclaw.ai/ci/release-validation/live-and-e2e-shards)</sub>

---

### `/ci/release-validation/package-acceptance` — Package Acceptance

**Package Acceptance** · *Contributing › Release validation*

> Package Acceptance jobs, candidate sources, suite profiles, and dispatch examples

<sub>source `docs/ci/release-validation/package-acceptance.md` · 233 lines · 2305 words · 2 code blocks</sub>

**Read when:** You are validating an installable OpenClaw package · You are debugging a failed package acceptance run

**Covers:** Package Acceptance <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw dist-tags`, `openclaw versions`

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/release-validation/package-acceptance](https://docs.openclaw.ai/ci/release-validation/package-acceptance)</sub>

---

### `/ci/release-validation/install-smoke-and-docker-e2e` — Install smoke and Docker E2E

**Install smoke and Docker E2E** · *Contributing › Release validation*

> Install Smoke coverage, the local Docker E2E aggregate, and release-path Docker chunks

<sub>source `docs/ci/release-validation/install-smoke-and-docker-e2e.md` · 134 lines · 2057 words · 1 code blocks</sub>

**Read when:** You are running or debugging Docker E2E lanes · You need the local Docker E2E tunables or the release-path chunk names

**Covers:** Install smoke · Local Docker E2E <sub>(3 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/release-validation/install-smoke-and-docker-e2e](https://docs.openclaw.ai/ci/release-validation/install-smoke-and-docker-e2e)</sub>

---

### `/ci/release-validation/plugin-prerelease` — Plugin Prerelease

**Plugin Prerelease** · *Contributing › Release validation*

> The separate Plugin Prerelease workflow, its batching limits, and when it runs

<sub>source `docs/ci/release-validation/plugin-prerelease.md` · 10 lines · 224 words</sub>

**Read when:** You are running or triaging Plugin Prerelease

**Covers:** Plugin Prerelease

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/release-validation/plugin-prerelease](https://docs.openclaw.ai/ci/release-validation/plugin-prerelease)</sub>

---

### `/ci/scheduled-workflows` — Scheduled and maintenance workflows

**Scheduled and maintenance workflows** · *Contributing › CI*

> Performance, QA Lab, CodeQL, Security Review, maintenance jobs, and ClawSweeper forwarding

<sub>source `docs/ci/scheduled-workflows.md` · 618 lines · 6160 words · 9 code blocks</sub>

**Read when:** You are changing ClawSweeper dispatch or GitHub activity forwarding · You are triaging a nightly, scheduled, or maintenance workflow

**Covers:** Hourly main CI · Nightly Full Release Validation · OpenClaw Performance · Security Review reconciler · QA Lab · CodeQL · Maintenance workflows · ClawSweeper activity forwarding · Related <sub>(14 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/scheduled-workflows](https://docs.openclaw.ai/ci/scheduled-workflows)</sub>

---

### `/ci/local-proof` — Local checks and Testbox

**Local checks and Testbox** · *Contributing › CI*

> Local command equivalents, shrink-only ratchets, and Crabbox remote proof

<sub>source `docs/ci/local-proof.md` · 683 lines · 5469 words · 11 code blocks</sub>

**Read when:** You want to reproduce a CI lane on your own machine · You are producing Testbox or Crabbox proof for a pull request

**Covers:** Local equivalents · Workflow lint tools · Surface ratchets · Local check gates and changed routing · Testbox validation · Related <sub>(2 sub-sections)</sub>

**TermCrab — ci: PARTIAL.** `npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw's lint/type/test budgets and contract tests per channel.

<sub>live: [docs.openclaw.ai/ci/local-proof](https://docs.openclaw.ai/ci/local-proof)</sub>

---

### `/help/scripts` — Scripts

**Scripts** · *Contributing › Testing and CI*

> Repository scripts: purpose, scope, and safety notes

<sub>source `docs/help/scripts.md` · 56 lines · 342 words</sub>

**Read when:** Running scripts from the repo · Adding or changing scripts under ./scripts

**Covers:** Conventions · Auth monitoring scripts · GitHub read helper · When adding scripts · Related

**CLI:** `openclaw message send`, `openclaw models status`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/scripts](https://docs.openclaw.ai/help/scripts)</sub>

---

### `/concepts/qa-e2e-automation` — QA overview

**QA overview** · *Contributing › Testing and CI*

> Index of the private QA stack: qa-lab, qa-channel, repo-backed scenarios, live transport lanes, transport adapters, and reporting.

<sub>source `docs/concepts/qa-e2e-automation.md` · 70 lines · 442 words</sub>

**Read when:** Understanding how the QA stack fits together · Extending qa-lab, qa-channel, or a transport adapter · Adding repo-backed QA scenarios · Building higher-realism QA automation around the Gateway dashboard

**Covers:** Where each section moved · Related docs

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation](https://docs.openclaw.ai/concepts/qa-e2e-automation)</sub>

---

### `/concepts/qa-e2e-automation/command-surface` — Command surface

**Command surface** · *Contributing › QA stack*

> The pnpm openclaw qa subcommand table and the profile-backed qa run selector.

<sub>source `docs/concepts/qa-e2e-automation/command-surface.md` · 79 lines · 726 words · 2 code blocks</sub>

**Read when:** You need to pick the right qa subcommand · You are choosing a QA profile for `qa run`

**Covers:** Command surface <sub>(1 sub-sections)</sub>

**CLI:** `openclaw qa`, `openclaw qa run`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/command-surface](https://docs.openclaw.ai/concepts/qa-e2e-automation/command-surface)</sub>

---

### `/concepts/qa-e2e-automation/operator-flow` — Operator flow

**Operator flow** · *Contributing › QA stack*

> Bring up QA Lab and run the observability, Matrix, Discord Mantis, Slack desktop, and credential-pool lanes.

<sub>source `docs/concepts/qa-e2e-automation/operator-flow.md` · 322 lines · 1916 words · 9 code blocks</sub>

**Read when:** You are running a QA lane end to end · You need the Matrix live lane or a Mantis runner

**Covers:** Operator flow <sub>(5 sub-sections)</sub>

**CLI:** `openclaw infer image`, `openclaw matrix encryption`, `openclaw qa buzz`, `openclaw qa credentials`, `openclaw qa discord`, `openclaw qa docker-build-image`, `openclaw qa mantis`, `openclaw qa matrix`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/operator-flow](https://docs.openclaw.ai/concepts/qa-e2e-automation/operator-flow)</sub>

---

### `/concepts/qa-e2e-automation/scenario-coverage` — Canonical scenario coverage

**Canonical scenario coverage** · *Contributing › QA stack*

> How taxonomy coverage IDs, scenario YAML, and profiles select what a QA run executes, plus the Multipass suite runner.

<sub>source `docs/concepts/qa-e2e-automation/scenario-coverage.md` · 53 lines · 361 words · 1 code blocks</sub>

**Read when:** You are choosing which scenarios a run covers · You need the Multipass suite lane

**Covers:** Canonical scenario coverage

**CLI:** `openclaw qa suite`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/scenario-coverage](https://docs.openclaw.ai/concepts/qa-e2e-automation/scenario-coverage)</sub>

---

### `/concepts/qa-e2e-automation/channel-qa-reference` — Channel QA reference

**Channel QA reference** · *Contributing › QA stack*

> Shared CLI flags for the real-transport lanes and the Buzz, Telegram, and Discord lane reference.

<sub>source `docs/concepts/qa-e2e-automation/channel-qa-reference.md` · 262 lines · 1474 words · 8 code blocks</sub>

**Read when:** You are running the Buzz, Telegram, or Discord QA lane · You need the flags every real-transport lane accepts

**Covers:** Buzz, Discord, Slack, Telegram, and WhatsApp QA reference <sub>(4 sub-sections)</sub>

**CLI:** `openclaw qa buzz`, `openclaw qa discord`, `openclaw qa telegram`

**Config:** `channels.discord.voice.autoJoin`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/channel-qa-reference](https://docs.openclaw.ai/concepts/qa-e2e-automation/channel-qa-reference)</sub>

---

### `/concepts/qa-e2e-automation/slack-qa` — Slack QA

**Slack QA** · *Contributing › QA stack*

> The Slack QA lane and the workspace, app, and scope provisioning it needs.

<sub>source `docs/concepts/qa-e2e-automation/slack-qa.md` · 373 lines · 1551 words · 8 code blocks</sub>

**Read when:** You are running the Slack QA lane · You are provisioning a Slack workspace for QA

**Covers:** Slack QA <sub>(3 sub-sections)</sub>

**CLI:** `openclaw qa credentials`, `openclaw qa slack`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/slack-qa](https://docs.openclaw.ai/concepts/qa-e2e-automation/slack-qa)</sub>

---

### `/concepts/qa-e2e-automation/whatsapp-and-credentials` — WhatsApp QA and credentials

**WhatsApp QA and credentials** · *Contributing › QA stack*

> The WhatsApp QA lane and the shared Convex credential pool used by the real-transport lanes.

<sub>source `docs/concepts/qa-e2e-automation/whatsapp-and-credentials.md` · 208 lines · 1312 words · 1 code blocks</sub>

**Read when:** You are running the WhatsApp QA lane · You are leasing QA credentials from the Convex pool

**Covers:** WhatsApp QA · Convex credential pool

**CLI:** `openclaw qa whatsapp`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/whatsapp-and-credentials](https://docs.openclaw.ai/concepts/qa-e2e-automation/whatsapp-and-credentials)</sub>

---

### `/concepts/qa-e2e-automation/extending-the-stack` — Extending the QA stack

**Extending the QA stack** · *Contributing › QA stack*

> Repo-backed seed assets, provider mock lanes, transport adapters, and what adding a channel takes.

<sub>source `docs/concepts/qa-e2e-automation/extending-the-stack.md` · 211 lines · 1253 words</sub>

**Read when:** You are adding QA scenarios or seed assets · You are adding or extending a transport adapter

**Covers:** Repo-backed seeds · Provider mock lanes · Transport adapters <sub>(3 sub-sections)</sub>

**CLI:** `openclaw audit`, `openclaw qa`, `openclaw qa mock-openai`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/extending-the-stack](https://docs.openclaw.ai/concepts/qa-e2e-automation/extending-the-stack)</sub>

---

### `/concepts/qa-e2e-automation/qa-reporting` — QA reporting

**QA reporting** · *Contributing › QA stack*

> QA report and evidence artifacts, the character-eval judged report, and where each run writes them.

<sub>source `docs/concepts/qa-e2e-automation/qa-reporting.md` · 165 lines · 1182 words · 1 code blocks</sub>

**Read when:** You are reading a QA report or evidence file · You need the character-eval judged report format

**Covers:** Reporting <sub>(4 sub-sections)</sub>

**CLI:** `openclaw qa character-eval`, `openclaw qa coverage`

<sub>live: [docs.openclaw.ai/concepts/qa-e2e-automation/qa-reporting](https://docs.openclaw.ai/concepts/qa-e2e-automation/qa-reporting)</sub>

---

### `/concepts/personal-agent-benchmark-pack` — Personal agent benchmark pack

**Personal agent benchmark pack** · *Contributing › Testing and CI*

> Local qa-channel scenarios for privacy-preserving personal assistant workflow checks.

<sub>source `docs/concepts/personal-agent-benchmark-pack.md` · 76 lines · 481 words · 1 code blocks</sub>

**Read when:** Running local personal agent reliability checks · Extending the repo-backed QA scenario catalog · Verifying reminder, reply, memory, redaction, safe tool followthrough, task status, share-safe diagnostics, proof-backed completion claims, and failure recovery

**Covers:** Scenarios · Privacy Model · Extending the pack · Related

**CLI:** `openclaw qa run`

<sub>live: [docs.openclaw.ai/concepts/personal-agent-benchmark-pack](https://docs.openclaw.ai/concepts/personal-agent-benchmark-pack)</sub>

---

### `/help/testing` — Testing

**Testing** · *Contributing › Testing and CI*

> Index of the OpenClaw testing kit, one page per reader job

<sub>source `docs/help/testing.md` · 74 lines · 471 words</sub>

**Read when:** Running tests locally or in CI · Adding regressions for model/provider bugs · Debugging gateway + agent behavior

**Covers:** Where each section moved · Related

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing](https://docs.openclaw.ai/help/testing)</sub>

---

### `/help/testing/suites` — Test suites and commands

**Test suites and commands** · *Contributing › Testing guide*

> The unit, e2e, and live suites, which one to run, and the offline regression checks

<sub>source `docs/help/testing/suites.md` · 406 lines · 4024 words · 1 code blocks</sub>

**Read when:** You need to pick a test suite or command · You want to know what each suite covers

**Covers:** Quick start · Test suites (what runs where) · Which suite should I run? · Live (network-touching) tests · Docs sanity · Offline regression (CI-safe) <sub>(8 sub-sections)</sub>

**CLI:** `openclaw qa suite`

**Config:** `diagnostics.stability`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing/suites](https://docs.openclaw.ai/help/testing/suites)</sub>

---

### `/help/testing/live-workflows` — Live and Docker/Parallels workflows

**Live and Docker/Parallels workflows** · *Contributing › Testing guide*

> Live provider debugging lanes plus the Docker and Parallels smokes that support them

<sub>source `docs/help/testing/live-workflows.md` · 116 lines · 966 words</sub>

**Read when:** You are debugging a real provider or model · You need a live Docker or Parallels lane

**Covers:** Live and Docker/Parallels workflows

**CLI:** `openclaw agent`, `openclaw models list`, `openclaw qa suite`, `openclaw setup`, `openclaw status`, `openclaw yes`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing/live-workflows](https://docs.openclaw.ai/help/testing/live-workflows)</sub>

---

### `/help/testing/docker` — Docker test runners

**Docker test runners** · *Contributing › Testing guide*

> The Docker works-in-Linux runners, their scheduler, lanes, and env vars

<sub>source `docs/help/testing/docker.md` · 167 lines · 3259 words · 1 code blocks</sub>

**Read when:** You are running the Docker test lanes · You need a Docker lane name or env var

**Covers:** Docker runners (optional "works in Linux" checks)

**CLI:** `openclaw mcp serve`, `openclaw onboard`, `openclaw update`

**Config:** `session.maintenance.coldStorage.afterDays`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing/docker](https://docs.openclaw.ai/help/testing/docker)</sub>

---

### `/help/testing/qa-runners` — QA-specific runners

**QA-specific runners** · *Contributing › Testing guide*

> The qa-lab command surface, shared Convex credentials, and adding a channel to QA

<sub>source `docs/help/testing/qa-runners.md` · 425 lines · 2819 words · 6 code blocks</sub>

**Read when:** You are running a QA Lab or live transport lane · You need the shared QA credential contract

**Covers:** QA-specific runners <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw qa`, `openclaw qa aimock`, `openclaw qa buzz`, `openclaw qa coverage`, `openclaw qa credentials`, `openclaw qa matrix`, `openclaw qa run`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing/qa-runners](https://docs.openclaw.ai/help/testing/qa-runners)</sub>

---

### `/help/testing/contracts` — Contract tests

**Contract tests** · *Contributing › Testing guide*

> Plugin and channel contract test commands, categories, and when to run them

<sub>source `docs/help/testing/contracts.md` · 64 lines · 378 words</sub>

**Read when:** You changed a channel, provider, or plugin-sdk surface

**Covers:** Contract tests (plugin and channel shape) <sub>(4 sub-sections)</sub>

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing/contracts](https://docs.openclaw.ai/help/testing/contracts)</sub>

---

### `/help/testing/writing-tests` — Writing and adding tests

**Writing and adding tests** · *Contributing › Testing guide*

> Temp-directory rules, agent reliability eval gaps, and how to add a regression

<sub>source `docs/help/testing/writing-tests.md` · 172 lines · 1301 words · 2 code blocks</sub>

**Read when:** You are writing a new test · You are adding a regression for a provider bug

**Covers:** Test Temp Directories · Agent reliability evals (skills) · Cost budget · Raw SQLite state access · Skills watchers · Flake triage · Adding regressions (guidance)

**Config:** `skills.status`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing/writing-tests](https://docs.openclaw.ai/help/testing/writing-tests)</sub>

---

### `/help/testing-updates-plugins` — Testing: updates and plugins

**Testing: updates and plugins** · *Contributing › Testing and CI*

> How OpenClaw validates update paths, package migrations, and plugin install/update behavior

<sub>source `docs/help/testing-updates-plugins.md` · 649 lines · 4166 words · 13 code blocks</sub>

**Read when:** Changing OpenClaw update, doctor, package acceptance, or plugin install behavior · Preparing or approving a release candidate · Debugging package update, plugin dependency cleanup, or plugin install regressions

**Covers:** On this page · What we protect · Local proof during development · Headless node auto-update proof · Docker lanes · Package Acceptance · Release default · Legacy compatibility · Adding coverage · Failure triage · Related

**CLI:** `openclaw agent`, `openclaw config set`, `openclaw doctor`, `openclaw plugins update`, `openclaw update`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-updates-plugins](https://docs.openclaw.ai/help/testing-updates-plugins)</sub>

---

### `/help/testing-live` — Testing: live suites

**Testing: live suites** · *Contributing › Testing and CI*

> Live (network-touching) tests: model matrix, CLI backends, ACP, media providers, credentials

<sub>source `docs/help/testing-live.md` · 86 lines · 739 words</sub>

**Read when:** Running live model matrix / CLI backend / ACP / media-provider smokes · Debugging live-test credential resolution · Adding a new provider-specific live test

**Covers:** Live tests vs your real gateway · Credentials (never commit) · Where each section moved · Related

**CLI:** `openclaw gateway stop`, `openclaw models list`

**Config:** `agents.*.workspace`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-live](https://docs.openclaw.ai/help/testing-live)</sub>

---

### `/help/testing-live/quick-smokes` — Quick live smokes and the Android node sweep

**Quick live smokes and the Android node sweep** · *Contributing › Live testing guide*

> Ad hoc local media/voice smokes plus the Android node capability sweep

<sub>source `docs/help/testing-live/quick-smokes.md` · 44 lines · 173 words · 2 code blocks</sub>

**Read when:** You want a fast ad hoc media or voice-call live check · You are sweeping the commands a connected Android node advertises

**Covers:** Live: local smoke commands · Live: Android node capability sweep

**CLI:** `openclaw infer tts`, `openclaw voicecall setup`, `openclaw voicecall smoke`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-live/quick-smokes](https://docs.openclaw.ai/help/testing-live/quick-smokes)</sub>

---

### `/help/testing-live/model-smoke` — Live model smoke (profile keys)

**Live model smoke (profile keys)** · *Contributing › Live testing guide*

> The two-layer live model smoke: direct completion and the gateway + dev agent pipeline

<sub>source `docs/help/testing-live/model-smoke.md` · 91 lines · 690 words · 1 code blocks</sub>

**Read when:** You are smoking a provider or model with your own profile keys · You need to tell a broken provider key apart from a broken gateway pipeline

**Covers:** Live: model smoke (profile keys) <sub>(2 sub-sections)</sub>

**CLI:** `openclaw models list`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-live/model-smoke](https://docs.openclaw.ai/help/testing-live/model-smoke)</sub>

---

### `/help/testing-live/cli-backends` — CLI backend and APNs lanes

**CLI backend and APNs lanes** · *Contributing › Live testing guide*

> Live CLI backend smoke (Claude, Gemini, other local CLIs) and the APNs HTTP/2 proxy reachability check

<sub>source `docs/help/testing-live/cli-backends.md` · 79 lines · 585 words · 4 code blocks</sub>

**Read when:** You are validating the gateway against a local CLI backend · You are checking APNs reachability through an HTTP CONNECT proxy

**Covers:** Live: CLI backend smoke (Claude, Gemini, or other local CLIs) · Live: APNs HTTP/2 proxy reachability

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-live/cli-backends](https://docs.openclaw.ai/help/testing-live/cli-backends)</sub>

---

### `/help/testing-live/acp-and-codex` — ACP bind and Codex app-server lanes

**ACP bind and Codex app-server lanes** · *Contributing › Live testing guide*

> The live ACP conversation-bind smoke and the plugin-owned Codex app-server harness smoke

<sub>source `docs/help/testing-live/acp-and-codex.md` · 198 lines · 898 words · 9 code blocks</sub>

**Read when:** You are debugging `/acp spawn ... --bind here` against a real ACP agent · You are running the Codex app-server harness, its stress probes, or its Docker recipe

**Covers:** Live: ACP bind smoke (/acp spawn ... --bind here) · Live: Codex app-server harness smoke

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-live/acp-and-codex](https://docs.openclaw.ai/help/testing-live/acp-and-codex)</sub>

---

### `/help/testing-live/long-context-and-matrix` — OpenAI long context and the live model matrix

**OpenAI long context and the live model matrix** · *Contributing › Live testing guide*

> The OpenAI long-context proof runs, the recommended live recipes, and the curated model matrix

<sub>source `docs/help/testing-live/long-context-and-matrix.md` · 261 lines · 1300 words · 7 code blocks</sub>

**Read when:** You are crossing the OpenAI long-context pricing boundary on purpose · You want the curated modern/small model lists or a copy-ready live recipe

**Covers:** Live: OpenAI long context · Live: model matrix (what we cover) <sub>(4 sub-sections)</sub>

**CLI:** `openclaw models scan`, `openclaw qa manual`

**Config:** `models.providers`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-live/long-context-and-matrix](https://docs.openclaw.ai/help/testing-live/long-context-and-matrix)</sub>

---

### `/help/testing-live/media-providers` — Media provider live lanes

**Media provider live lanes** · *Contributing › Live testing guide*

> Deepgram, BytePlus, ComfyUI, and the shared image/music/video generation live sweeps

<sub>source `docs/help/testing-live/media-providers.md` · 147 lines · 928 words · 1 code blocks</sub>

**Read when:** You are running an image, music, or video generation live sweep · You changed a media provider plugin and need its live lane

**Covers:** Deepgram live (audio transcription) · BytePlus coding plan live · ComfyUI workflow media live · Image generation live · Music generation live · Video generation live · Media live harness

**CLI:** `openclaw infer image`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/testing-live/media-providers](https://docs.openclaw.ai/help/testing-live/media-providers)</sub>

---

### `/concepts/mantis` — Mantis

**Mantis** · *Contributing › Testing and CI*

> Mantis captures visual end-to-end evidence for live transport comparisons and focused candidate-only browser proofs, then attaches the artifacts to PRs.

<sub>source `docs/concepts/mantis.md` · 546 lines · 3517 words · 7 code blocks</sub>

**Read when:** Building or running live visual QA for OpenClaw bugs · Adding before and after verification for a pull request · Adding Discord, Slack, WhatsApp, or other live transport scenarios · Running focused Control UI browser proof for a candidate ref · Debugging QA runs that need screenshots, browser automation, or VNC access

**Covers:** Ownership · CLI commands · Evidence manifest · GitHub automation · Machines and secrets · Run outcomes · Adding a scenario · Open questions <sub>(6 sub-sections)</sub>

**CLI:** `openclaw gateway run`, `openclaw qa discord`, `openclaw qa mantis`, `openclaw qa slack`, `openclaw qa telegram`

<sub>live: [docs.openclaw.ai/concepts/mantis](https://docs.openclaw.ai/concepts/mantis)</sub>

---

### `/concepts/mantis-slack-desktop-runbook` — Mantis Slack desktop runbook

**Mantis Slack desktop runbook** · *Contributing › Testing and CI*

> Operator runbook for Mantis Slack desktop QA: GitHub dispatch, local CLI, warm VNC leases, hydrate modes, timing interpretation, artifacts, and failure handling.

<sub>source `docs/concepts/mantis-slack-desktop-runbook.md` · 235 lines · 984 words · 8 code blocks</sub>

**Read when:** Running Mantis Slack desktop QA from GitHub or locally · Debugging slow Mantis Slack desktop runs · Choosing source, prehydrated, or warm-lease mode · Posting screenshot and video evidence to a PR

**Covers:** Terms · Storage model · GitHub dispatch · Local CLI · Hydrate modes · Timing interpretation · Evidence checklist · Failure handling · Related

**CLI:** `openclaw qa mantis`

<sub>live: [docs.openclaw.ai/concepts/mantis-slack-desktop-runbook](https://docs.openclaw.ai/concepts/mantis-slack-desktop-runbook)</sub>

---
