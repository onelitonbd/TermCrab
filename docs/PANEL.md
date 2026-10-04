# The web panel

One file, served by the gateway at `/` when `gateway.host` is reachable:
`ui/index.html` — markup, styles and JavaScript in one document, **no build step, no bundler, no
`node_modules`**. That is a decision, not an accident: the panel has to work on a phone that runs
the gateway, and a React+Vite dashboard would mean a toolchain, a lockfile and a build artifact in
an install whose whole promise is *zero runtime dependencies*. The cost is real and stated below.

## The screens

The menu on the left is the list of things you can look at, and every one of them reads the same
API the CLI does (`docs/API.md`), with the same token:

| Screen | What it answers |
|---|---|
| **Chat** | talk to the agent, watch a turn stream in, see tool cards, approvals and progress |
| **Status** | is it up: gateway, provider, channels, memory, disk |
| **Board** | *what is going on right now* — every live turn with a run-health verdict, queued and scheduled work, background tasks, the paired devices, storage, who can reach the agent, and any skill the agent proposed but you have not decided on |
| **Providers** | which model answers, keys, the offline demo |
| **Models** | the catalog the endpoint reports, per-model capability |
| **Memory** | what it remembers, search, the daily notes |
| **Tools** | the tools it has, and what each one is allowed to do |
| **Logs / Debug** | the structured log tail and the live event stream |
| **Work** | `WORKLOG.md` itself, with a stale/fresh verdict |
| **Settings** | plain words for the config, plus agents |

The **Board** screen is the merged view from batch 34.4–34.6: it reads `GET /api/board` (the same
object `termcrab board` prints), plus `/api/devices` (with a revoke button), `/api/runs/health`,
`/api/subagents`, `/api/disk`, `/api/presence` and `/api/skills/proposals` — seven endpoints, each
one rendered as a card with a note only when there is something to note. It **only reads**: nothing
on that screen can start, stop or schedule anything, and the single write on it (revoking a device)
is a deliberate button press.

## The docs page (`/docs`)

The panel renders markdown; so does the docs site. That is deliberate: `ui/index.html` contains
the markdown renderer between two comment markers (`==== markdown renderer … ====`), and
`termcrab docs` **slices that block out verbatim** into the docs page it builds. There is one
renderer in this repository, not two, and a test asserts the slice is byte-identical to the file —
change the panel's renderer and the docs page changes with it, or the build fails.

The Work page links to it (`open the docs site →`), next to the size, the doc count and — 37.2 — how
fresh the page is: which release it describes, how long ago it was built, and whether a doc has been
edited since (`GET /api/docs` reports it without building anything, so a panel refresh stays cheap).
When something moved, the note turns red and a **rebuild** button appears; it `POST`s the same route,
which forces a rebuild and keeps a per-release copy (36.3). The page never lies about being current,
and it never rebuilds behind your back. `GET /docs` builds the page if a source changed and serves it; the same file is
written to `state/docs-site.html` by `termcrab docs`, so it also opens straight from the phone's
file manager with no server and no network. Search, navigation and the copy buttons are inline
JavaScript and CSS in that one file — no CDN, no service worker, no fetch.

## Live Telegram runs on the Work page (37.4)

Under the docs note the Work page shows the record of runs that really happened on a real bot
(`npm run smoke:telegram -- --record`, section 37.4 in `docs/CHANNELS.md`): when the last one was,
whether a reply came back, and how long it took. It comes from `GET /api/telegram-runs`, and the
file is `docs/openclaw/data/telegram-runs.jsonl` — committed evidence, with a token *fingerprint*
instead of a token. No runs yet means the line says so; it never invents one.

## The performance budget on the Work page (38.2)

Under the docs and Telegram lines the Work page shows the last measurement: how many of the seven metrics
this machine measured, on what (`linux/x64, node v22.22.3`), how long ago, and the metric furthest along
its ceiling — `(5/7 metrics · linux/x64, node v22.22.3 · 1 min ago · worst idleRssMb 72/130 (55%))`. When
anything crossed a ceiling the line turns red and names it. It comes from `GET /api/perf`, which reads
`state/perf.json` that `termcrab perf` wrote; the panel never measures anything itself (that would boot a
gateway and run a turn on every refresh). Nothing measured yet says `(not measured yet — termcrab perf)`
rather than showing zeros.

With more than one recorded run the line also carries the movement — `coldStartMs ↑ 26% over 6 runs` (from
`state/perf-history.jsonl`, 39.1), or `steady over 6 runs` when nothing moved beyond the 3% jitter band.

## How it is tested (there is no browser in the build)

The panel's JavaScript is *extracted from the real file and executed in Node*, so the tests run the
exact code the browser runs:

- `test/markdown.test.ts` — the zero-dependency markdown renderer (including its XSS rules).
- `test/tier3e.test.ts` — the Board screen's pure functions (`boardGroups`, `boardSummary`,
  `boardCardLines`, `devicesRows`, `housekeepingRows`, `bytesText`) fed real payload shapes, and a
  live gateway serving the seven endpoints the screen calls, so a panel that reads a field the API
  does not send fails the suite.
- `test/tier2d.test.ts` and friends — the chat screen's behaviours (thinking drawer, streaming,
  approvals) asserted the same way.

The other guard is a **contract scan**: every `/api/...` path mentioned in `ui/index.html` must
exist as a route in `src/gateway/server.ts` (exact match, or a prefix for a dynamic path). A panel
button pointing at a route that was renamed fails the suite instead of showing a red toast on your
phone.

## What this is *not*

- **No component model and no virtual DOM.** Screens are functions that set `innerHTML` from the
  API's JSON. That is why each screen's *logic* lives in a small pure function — the part worth
  testing — and the rendering is deliberately thin.
- **No build step and no source maps.** The file is served as written. A syntax error is caught by
  the four test files that extract and run its code, not by a compiler.
- **Not a mobile app.** It is a page that works in a phone browser, with a drawer instead of a
  sidebar and touch targets sized for a thumb (`layout`, `chat` and the drawer are all in the same
  CSS as the desktop rules). After the Board screen the remaining gaps are cosmetic, not
  structural — no dark/light theming switch, no offline shell, and no per-screen deep links beyond
  the ones already routed (`/chat`, `/status`, `/board`, `/settings`, …).
