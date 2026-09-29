# Spike results (v0.5 P2 — "keep or kill")

> Timeboxed experiments, decided 2026-09-29. Each row: what we asked, what we
> found, and the verdict. Evidence is reproducible from the commands shown.

## #10 Real wake word (always-on DSP) — ❌ KILL (for now)

**Question:** Does an always-on wake-word loop stay under ~5% battery/hour on a
mid-range phone?

**What we found:**

- The roadmap line "we already ship onnxruntime" was **wrong** — TermCrab has
  *zero* runtime dependencies (by design), and `onnxruntime-node` is
  **~300 MB unpacked** with platform binaries for win32/darwin/linux only —
  a poor fit for Termux (bionic libc, phones, data caps).
- Good open options exist (`onnxruntime`-based openWakeWord models, Porcupine
  ONNX, sub-130 KB keyword models with <10 ms inference), so the *technology*
  is viable — but none ship inside TermCrab's zero-dep contract, and
- **The battery question itself can't be answered in this sandbox** (no phone,
  no radio, no real mic). Any "yes" would be a guess.

**Verdict:** the honest scope stays what it is today: an **STT session loop**
(`termcrab wake` — say the keyword, then your command), which costs battery
only while you're using it. Revisit only with an on-device battery measurement
from a real phone. The current wake loop also gained a gateway/SSE UI in 0.6.0,
so the feature is more useful now without any always-on cost.

## #11 Whisper.cpp audio notes — ✅ KEEP (shipped `termcrab transcribe`)

**Question:** Is on-device transcription good enough for voice memos?

**What we found (measured in this sandbox, x86 CPU):**

- whisper.cpp **built from source** in ~90 s with a pip-installed cmake — the
  same recipe works on Termux (`pkg install cmake clang git`).
- A real 10.5 s voice sample (JFK) transcribed **word-perfect** in **1.1 s**
  (~9× realtime) with the tiny model (75 MB). Phones are slower but tiny-model
  realtime factor still lands well ahead of audio length.
- Community proof: multiple Termux wrappers (termux-whisper, termux-stt
  reporting 15× realtime on-device) show this is routine on Android.

**Verdict: KEEP.** Shipped as `termcrab transcribe <file>`:

- finds `whisper-cli` on PATH or in `~/whisper.cpp/build/bin`
- finds a model in `~/models/` (tiny preferred), `--model` to point anywhere
- missing engine/model → exact install steps, never a stack trace
- doctor got a `whisper` check; the `voice` skill knows the command
- tests: fake-engine unit tests + live JFK transcription (skips where absent)

## #12 Signal channel re-eval — ⏸️ STILL DEFERRED

**Question:** Did signal-cli packaging improve enough on Termux?

**What we found:**

- signal-cli is current (v0.14.8) but ships **Linux x86_64 tarballs + Java**;
  on Termux it needs `pkg install openjdk-17` (now an official Termux package —
  that part *did* improve) plus the glibc-flavored native bits, which is where
  it historically breaks on Android/bionic.
- Bigger wall: **Signal is hostile to unofficial clients** — their own subreddit
  moderators remove non-official app discussion "for security reasons" and
  Signal developers have stated they don't want third-party clients on their
  servers. Accounts used with unofficial clients risk being blocked.

**Verdict: keep deferred.** The blocker is no longer just packaging — it's
policy risk for our user's Signal account. Telegram + WhatsApp (opt-in) cover
the phone-messenger need. Revisit only if Signal changes its stance.

## #13 CI enablement — 🔶 READY, needs one human click

**Question:** Can we turn on GitHub Actions?

**What we found:**

- The sandbox's GitHub App token **cannot create workflow files** — push
  rejected with: `refusing to allow a GitHub App to create or update workflow
  .github/workflows/ci.yml without workflows permission` (re-verified
  2026-09-29). The REST contents API is also closed to it.
- The workflow file itself is done, tested locally, and lives at
  `ci/github-actions.yml`: Node 20/22/24 matrix, `npm test`, CLI smoke
  (mock provider), `npm pack --dry-run`.

**Verdict:** not a code problem — a **one-time manual step** for the repo
owner. Step-by-step (including the prefilled GitHub URL) is in
[CONTRIBUTING.md](../CONTRIBUTING.md). Once the file exists, add the badge.
