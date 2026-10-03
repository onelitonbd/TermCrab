# How TermCrab beats OpenClaw — the head-to-head, smallest to biggest

**The question this answers:** not "how far are we from their 1,335 pages?" (that is [TRACKER.md](TRACKER.md)) but **"where do we actually beat them, in what order do we build, and what proves each win?"**

**Sources:** every OpenClaw claim below is cited to the page it comes from in their docs (cloned at the commit named in [00-SITE-MAP.md](00-SITE-MAP.md)); every TermCrab claim is cited to source or to a census row in [TRACKER.md](TRACKER.md). Nothing here is an opinion about features we have not built yet — those are marked **☐ build** with a proof test.

**Scoreboard today:** 150 census checks — ✅24 WORKING · 🏅14 BETTER · 🟡60 PARTIAL · ⛔7 BROKEN · ⚪45 ABSENT (44%). The 14 BETTER rows are all in the phone layer.
**Where this plan ends:** 🏅**25 BETTER**, ⛔**0 BROKEN**, core lane empty — and one sentence a competitor cannot copy without rebuilding their architecture.

---

## 0. এক নজরে (বাংলায়)

- **হারানোর আসল জায়গা একটাই, আর সেটা ফিচার না — স্থাপত্য।** OpenClaw-এর নিজের ডকে লেখা: *"Android does not host the Gateway"* — তাদের Android অ্যাপ একটা **companion node**, গেটওয়ে চালাতে হবে ম্যাক/লিনাক্স/উইন্ডোজ(WSL2)-এ। অর্থাৎ ফোন ব্যবহার করতে হলে **আরেকটা কম্পিউটার সারাক্ষণ চালু থাকতে হবে**। TermCrab-এ ফোনটাই গেটওয়ে।
- **দ্বিতীয় জায়গা: ইনস्टল-শর্ত।** তাদের লাগে **Node 24.16+ বা 26.1+** (`/install/index.md`), নেটিভ SQLite সহ; ARMv7 তাদের ডকে "unsupported"। আমাদের কিছুই লাগে না (zero runtime deps, Node ≥20.10, Termux-এর `nodejs-lts`)। ফোনে এটা দিন-রাতের পার্থক্য।
- **তৃতীয়: বিশ্বাসের অঙ্ক।** প্রথম মাপে আমাদের ৭টা BROKEN সারি ছিল — ২০২৬-১০-০৩-এ সব কটা টেস্ট দিয়ে সারানো হয়েছে (এখন ০) (কিউ, approvals, compaction, fencing…) — যতক্ষণ এগুলো ঠিক না হয়, মোত বিশ্বাসযোগ্য নয়। তাই প্ল্যানে **প্রথম কাজ কিউ ঠিক করা**, তারপর Tier 0-র ছোট ছোট ফ্লিপ, তারপর মোত মাপা।
- **যা আমরা কখনো লড়ব না:** ২৫+ চ্যানেল, নেটিভ ডেস্কটপ অ্যাপ, প্লাগিন মার্কেটপ্লেস/ফ্লিট/ক্লাউড, ১,৩৩৫ পেজের ডক সাইট। (§4)

---

## 1. "Beat" মানে কী — তিন ধরনের জয়

| ধরন | মানে | উদাহরণ | কেন ওরা কপি করতে পারবে না |
|---|---|---|---|
| **S — Structural** | ওদের স্থাপত্যে যেটা সম্ভব না | ফোনই হোস্ট; আরেকটা মেশিন লাগে না | ওদের গেটওয়ে ডেস্কটপ-ধরে-নেওয়া; কপি করতে গেলে পুরো প্রোডাক্ট বদলাতে হবে |
| **P — Phone-native** | ফোনের শক্তি সরাসরি ব্যবহার | Termux:API ১৫টা টুল (SMS, ক্যামেরা, ক্লিপবোর্ড, ব্যাটারি…), boot autostart, ব্যাটারি-সচেতন heartbeat, offline outbox, অফলাইন ভয়েস | Mobile node প্রোটোকলে এপিআই আছে, কিন্তু চালাতে companion app + দ্বিতীয় ডিভাইস দরকার |
| **Q — Quality** | একই ফিচার, কম ভাঙা/কম খরচে | zero runtime deps, কোনো registry-তে কোড চালায় না (ClawHavoc ১,৪৬৭ ক্ষতিকর skill), telemetry নেই, ডক নিজেই probe দিয়ে মিথ্যা ধরে | এটা ওদের স্কেলে "সঠিক" সিদ্ধান্ত ছিল না, আর এখন বদলানো মানে ২,০০০ কন্ট্রিবিউটরকে থামানো |

**নিয়ম:** প্রতিটা জয়ের নিচে একটা **প্রমাণ** থাকতে হবে — হয় একটা census probe, নয়তো একটা টেস্ট, নয়তো একটা মাপা সংখ্যা (মিলিসেকেন্ড/মেগাবাইট/রেস্টার্ট-টাইম)। প্রমাণ ছাড়া কিছুই "জয়" নয়।

---

## 2. Head-to-head — ছোট থেকে বড়

### Tier 0 — কয়েক ঘণ্টা থেকে ১ দিন (প্রতিটা একটা census সারি ফ্লিপ করে)

| # | যা | OpenClaw | TermCrab | জয়ের বাক্য | Effort | প্রমাণ |
|---|---|---|---|---|---|---|
| T0.1 | Config hot-reload ✔ | watch + validate + apply (`/gateway/configuration`) | fs.watch + merge + provider re-resolve; **validation নেই** | "বদলটা আগে যাচাই, তারপর 적용 — ভাঙা কনফিগ কখনো চলমান এজেন্টকে ফেলে দেয় না" | 0.5d | test: invalid JSON → config unchanged + warn |
| T0.2 | Run identity + wait ✔ | run ids in protocol (`/gateway/protocol`) | RUN ID আছে, `--wait` নেই | "স্ক্রিপ্ট এজেন্টকে অপেক্ষা করাতে পারে: `termcrab run --wait <id>`" | 1d | test: wait returns the run's output/exit |
| T0.3 | Abort/stop ✔ | operator abort (`/gateway`) | abort কনট্রোলার আছে, বাইরে থেকে থামানোর পথ নেই | "ফোন থেকে একটা ট্যাপে চলমান কাজ থামে" | 1d | test: stop mid-run → `[interrupted]` |
| T0.4 | Progress drafts ✔ | streaming events | `thinking:delta` আছে, partial answer নেই | "এজেন্ট ভাবতে ভাবতে খসড়া দেখায়, চুপ করে থাকে না" | 1d | test: ≥2 partial events before the final text |
| T0.5 | Skill precedence ✔ | override order documented | override order implicit | "কোন skill জিতবে সেটা লেখা আর টেস্ট করা" | 0.5d | test: user skill overrides bundled one |
| T0.6 | Disk budget + pruning ✔ | state layout/backups pages | কোনো বাজেট নেই | "ফোনের স্টোরেজ শেষ হয়ে এজেন্ট থামবে না — বাজেট ছাড়ালে নিজে ছাঁটে" | 1d | test: prune keeps last N days, prints freed bytes |
| T0.7 | Release discipline ✔ | CalVer + release notes + validation | CHANGELOG আছে, tag/notes স্ক্রিপ্ট নেই | "প্রতিটা রিলিজ নাম্বারযুক্ত আর তার নোট আগে থেকে লেখা" | 0.5d | script: `npm run release -- minor` → tag + notes |

**সাব-টোটাল: ~৫.৫ দিনে ৭টা সারি WORKING/BETTER — সাতটাই শেষ (batch 10, ২০২৬-১০-০৩)।** এখন census-এ ওই সাতটা সারির কটা WORKING: ১০.১ config hot-reload, ১০.২ run wait, ১০.৩ stop, ১০.৪ drafts, ১০.৫ skill precedence, ১০.৬ disk budget, ১০.৭ release discipline — প্রতিটার প্রমাণ `test/tier0.test.ts`।

### Tier 1 — দিন থেকে সপ্তাহ (এগুলো জয় না — এগুলো না করলে ওরা আমাদের হারায়)

আমাদের নিজের বিশ্লেষণই বলেছিল: *"the core lane is what makes the moat credible"* ([analysis/10](analysis/10-mobile-the-moat.md))। ফোনের এজেন্ট যদি মেসেজ হারায়, ভুলে যায় আর LAN-এর যেকোনো প্রসেস তাকে চালাতে পারে — তাহলে ফোনের মালিকানা কোনো লাভ দেয় না।

| # | কাজ | BROKEN সারি যা কমে | Effort | প্রমাণ (টেস্ট আগে, কোড পরে) |
|---|---|---|---|---|
| T1.1 | কিউ বিশ্বাস করা (batch 5) | Session queue · Queue modes · Steering | ~10d | test: একই সেশনে দুই মেসেজ → দ্বিতীয়টা অপেক্ষা করে; `queueLength` শেষে ০ |
| T1.2 | Approvals gate (batch 6) | Approval gate | ~5d | test: বিপজ্জনক টুল অনুমতি ছাড়া আটকে থাকে, deny করলে চলে না |
| T1.3 | স্মৃতি যা ভোলে না (batch 7) | Memory bootstrap · Compaction | ~6d | test: আজকের লেখা fact কালকের প্রম্পটে; compaction কিছু মুছে না |
| T1.4 | Transcript fencing (batch 8) | Transcript write fencing | ~3d | test: দুই writer → দ্বিতীয়টা আটকায় |
| T1.5 | Usage/token হিসাব (batch 9 ✔ 2026-10-03) | Token accounting | ~3d | test: রান টোকেন সংখ্যা রিপোর্ট করে, প্যানেলে দেখায় — `test/usage.test.ts`, প্রতি টার্নে ফুটার, `termcrab usage` |
| T1.6 | মডেল-লেখা compaction + generated docs map (batch 11 ✔ 2026-10-03) | LLM summarisation for compaction · Docs that match the code | ~4d | test: মডেল digest লিখল না extractor — `test/compaction-llm.test.ts` 11.1–11.4; ডক ট্রি ডিস্ক থেকে জেনারেট — `scripts/docs-map.mjs --check` suite-এর ভিতরে (census core lane now ~0d) |

| T1.7 | চ্যানেল + সারফেস প্যারিটি (batch 13 ✔ ২০২৬-১০-০৩) | Typing indicators · Per-command help · Shell completion · Colour/TTY · Discord · Slack · Signal · SMS/MMS · Matrix | ~3d | test: পাঁচটা অ্যাডাপ্টার inject করা transport দিয়ে চলে (allowlist → agent → reply → outbox) — `test/adapters.test.ts` 13.5; `termcrab <cmd> --help` প্রতিটা কমান্ডে আর প্রতিটা ডকুমেন্টেড ফ্ল্যাগ cli.ts-এ ব্যবহৃত — `test/tier2b.test.ts` 13.3; completion bash/zsh/fish একই টেবিল থেকে — 13.4; piped রানে কোনো ANSI নেই — 13.2; Telegram typing — 13.1। census: PARTIAL 53→48, WORKING 41→50, score 57% |

| T1.8 | মেশিন-পাঠ্য CLI (batch 14 ✔ ২০২৬-১০-০৩) | JSON output mode | ~2d | test: প্রতিটা structured কমান্ডে `--json` — stdout-এ **ঠিক একটা** ডকুমেন্ট `{ok, command, data}`, ব্যর্থ হলেও `{ok:false, …, error:{message, hint}}` আর exit code অপরিবর্তিত (0/1/124/130); `--json` মোডে লগ stderr-এ, তাই একটা warning ডকুমেন্ট নষ্ট করতে পারে না — `test/tier2c.test.ts` 14.1–14.5, চুক্তি লেখা `docs/CLI.md`-তে। `termcrab help <cmd>` এখন কী কী key আছে তাও বলে |

| T1.11 | ইনবক্স এজেন্টের হাতে (batch 17 ✔ ২০২৬-১০-০৩) | File operations · Disk budget | ~1.5d | test: index+sidecar (ফাইল ডিলিট করে প্রমাণ), name-traversal refusal, docs↔কোড টেবিল মিল, retention sweep-এর পরেও index সুরক্ষিত — `test/tier2f.test.ts` 17.1–17.5 |
| T1.10 | আসা ফাইল পড়া যায় (batch 16 ✔ ২০২৬-১০-০৩) | Document extraction · Transcription | ~2d | test: PDF (FlateDecode + text ops) / DOCX / PPTX / XLSX পড়া হয় নিজের reader-এ, ক্যাপ + truncation নোট, স্ক্যান PDF-এ "টেক্সট নেই" বলা হয় — `test/tier2e.test.ts` 16.1; ছবি সত্যিকারের image part হয়ে দেখতে-পারা মডেলে যায়, নাহলে সৎ "দেখতে পারছি না" + কমান্ড — 16.2; ভয়েস note → transcript, ৫ MB ক্যাপ, engine ছাড়া ইনস্টল-হিন্ট — 16.3; inbox এখন disk-এর আলাদা area, retention-এ পরিষ্কার — 16.4; নিয়ম `docs/CHANNELS.md`-এ — 16.5। census: ABSENT 37→36, WORKING 53→54, score 59% |
| T1.9 | চ্যাট-সারফেস আসল করা (batch 15 ✔ ২০২৬-১০-০৩) | Media send/receive · Group / ambient events · Slash commands in chat | ~3d | test: ছবি/ডকুমেন্ট ভয়েস inbox-এ নামে আর এজেন্ট path পায় (executables বাদ, ২০ MB সীমা) — `test/tier2d.test.ts` 15.1; `send_file` টুল + outbox — 15.2; গ্রুপে mention/উত্তর ছাড়া চুপ, mention ছেঁটে যায় — 15.3; চ্যাটে `/usage /sessions /memory /help` আসল ডেটা থেকে — 15.4; নিয়ম লেখা `docs/CHANNELS.md`-তে — 15.5। census: PARTIAL 47→46, WORKING 51→53, score 58% |

**সাব-টোটাল: ~৪২ দিন → core lane খালি (batch 11-এ শেষ, ২০২৬-১০-০৩), BROKEN ০, drift ০; প্যারিটি লেনও এগোচ্ছে (batch 13–15)।**

### Tier 2 — ফোন-নেটিভ জয় (১৪টা BETTER এখানেই; এটাই মোত)

| # | যা | OpenClaw-এর নিজের ডক কী বলে | আমাদের কী আছে | জয়ের বাক্য | Effort | প্রমাণ |
|---|---|---|---|---|---|---|
| T2.1 | **কে হোস্ট** ✔ (batch 12) | *"Role: companion node app (Android does not host the Gateway). Gateway required: yes (run it on macOS, Linux, or Windows via WSL2)"* — `/platforms/android` | ফোনেই গেটওয়ে (`termcrab gateway`, Termux) | **"আপনার ফোনই এজেন্ট। আরেকটা কম্পিউটার, পেয়ারিং বা অ্যাপ দরকার নেই।"** | 1d ✔ (batch 12) | 12.2: mock brain + নেটওয়ার্ক গার্ডে শূন্য external request; CLI → HTTP → queue → run → transcript |
| T2.2 | ইনস্টল শর্ত | Node **24.16+ / 26.1+**, নেটিভ SQLite, ARMv7 unsupported — `/install/index.md`, `/install/installer.md` | zero runtime deps, Node ≥20.10, `pkg install nodejs-lts` | "যে ফোনে Termux চলে, সেখানেই চলে — nvm, npx, SQLite বিল্ড নেই" | 0d (শিপড) | `npm install` → ~0.5s, 0 নেটিভ মডিউল (census: Dependency surface 🏅) |
| T2.3 | Android ইনস্টল ডক | ৪৩টা `/install` পেজ, কিন্তু Android/Termux-এ **এজেন্ট বসানোর পথ নেই** — শুধু `ssh` করে হোস্টে যাওয়ার helper script (`/help/scripts.md`) | `docs/TERMUX.md` + onboard + boot install | "যে পেজটা ওদের ডকে নেই — ৪ কমান্ডে ফোনে এজেন্ট" | 2d (ডক লিখতে) | ডক + মাপা সময় |
| T2.4 | ফোনের সেন্সর/টুল | mobile node: camera/location/screen/notification, **কিন্তু app + pairing + হোস্ট লাগে** | ১৫টা Termux:API টুল সরাসরি (SMS, ক্যামেরা, ক্লিপবোর্ড, ব্যাটারি, WiFi, কনট্যাক্ট, নোটিফিকেশন…) | "একই প্রসেস ফোনটা ছুঁতে পারে — মাঝখানে broker/pairing নেই" | 0d (শিপড) | `test/phone-tools.test.ts` + ডেমো লিস্ট |
| T2.5 | Boot autostart | host-এ launchd/systemd (ডকে: *"System control … lives on the Gateway host"*) | Termux:Boot স্ক্রিপ্ট + wake-lock + supervisor | "Android-এ কোনো init সিস্টেম নেই — তবু রিবুটের পর এজেন্ট ফিরে আসে" | 0d (শিপড) | test + TERMUX গাইড |
| T2.6 | প্রসেস সুপারভিশন | host init নেয় দায়িত্ব | নিজের supervisor (lock file, restart watchdog) | "ইনিট না থাকলেও এজেন্ট নিজেকে বাঁচায়" | 0.5d (restart test) | test: kill → ৩০s-এ ফিরে, restart count দেখা যায় |
| T2.7 | ব্যাটারি-সচেতন সcheduling | এমন ধারণা নেই (হোস্ট সর্বদা চালু ধরে নেওয়া) | heartbeat pauses < 20% unless charging | "ফোনের ব্যাটারির হিসাব এজেন্ট নিজে রাখে" | 0d (শিপড) | census: Power-aware scheduling 🏅 + test |
| T2.8 | Offline outbox ✔ (batch 12) | gateway অনলাইন ধরে নেওয়া | store-and-forward, ঠিক একবার | "নেট গেলে মেসেজ হারায় না, ফিরলে পৌঁছায় — আর একবার ack হলে দ্বিতীয়বার যায় না" | 0.5d ✔ (batch 12) | `test/tier2.test.ts` 12.5: down → queued; restart → delivered once; acked → never again |
| T2.9 | অফলাইন ভয়েস | voice node (app), ভারী কাজ মডেলে | wake word + whisper.cpp STT + TTS locally | "নেট ছাড়াও ফোন কথা বোঝে" | 0d (শিপড) | census: Terminal voice loop 🏅 |
| T2.10 | অফলাইন মস্তিষ্ক | এর বিকল্প নেই — প্রোভাইডার লাগবে | `provider.type=mock` + `--demo`, no key/network | "কী ছাড়া, নেট ছাড়া পুরো লুপ চালিয়ে দেখানো যায়" | 0d (শিপড) | `test/offline.test.ts` |
| T2.11 | Bionic ফাঁদ | community shim/TMPDIR/patch, proot≈3GB | `src/mobile/bionic.ts` লোড হয় প্রথমে; TMPDIR default | "Error 13 / TMPDIR / proot — এই তিনটা ফাঁদ আমাদের ডিজাইনে নেই" | 0d (শিপড) | census: Android bionic guard, TMPDIR handling 🏅 |
| T2.12 | Doctor | সাধারণ doctor | Play-Store Termux, wake-lock, battery optimisation, proot অবশিষ্ট ধরে | "ফোন-নির্দিষ্ট সমস্যাগুলো নাম ধরে বলে, সাধারণ পরামর্শ নয়" | 0d (শিপড) | census: Termux doctor 🏅 + test |
| T2.13 | Migration | — | `termcrab import openclaw` | "ওদের কনফিগ নিয়ে এসে আমরা শুরু করা যায়" | 0.5d (import test) | test: sample config → our config |
| T2.14 | ডক অখণ্ডতা | ১,৩৩৫ পেজ, প্রমাণ নেই | ১৫০ probe, drift=0, প্রতিটা সংখ্যা মাপা | "আমাদের ডক মিথ্যা বলতে পারে না — code সরলেই probe DRIFT দেয়" | 0d (চলছে) | `node scripts/census.mjs` |

### Tier 3 — সপ্তাহ থেকে মাস (মোত পাকা করা, সংখ্যায়)

| # | কাজ | কেন এটা জয় | Effort | প্রমাণ |
|---|---|---|---|---|
| T3.1 | মাপা সংখ্যা ✔ (batch 12) | "unmeasured claims are how trust dies" ([analysis/10](analysis/10-mobile-the-moat.md) §3) | 2d ✔ | `scripts/bench.mjs` (idle RSS · cold start · install · restart · এক টার্ন) README-র জেনারেটেড ব্লকে; 12.1 ফ্রেশ রান-এর সঙ্গে মেলায় |
| T3.2 | README ফোন-কেন্দ্রিক করা ✔ (batch 12) | পড়ুয়া প্রথম প্যারাতেই জয়টা দেখবে | 1d ✔ | প্রথম স্ক্রিনে "কী / কোথায় চলে / খরচ কত" + মাপা সংখ্যা; 12.4 টেস্টে পিন করা |
| T3.3 | নেটিভ অ্যাপের ২০% (widget/foreground polish) — **তবুও নয়**, যতক্ষণ ব্যবহারকারী না চায় | Termux:API ৮০% দেয়, maintenance ০% | 0d | প্রমাণ: §4 kill list — কোনো কাজ নেই |
| T3.4 | Termux-নির্দিষ্ট ডক গাইড ✔ (batch 12) | ওদের ডকের যে পেজ নেই | 2d ✔ | `docs/TERMUX.md`: MIUI/HyperOS · ColorOS/OxygenOS · One UI · Funtouch · EMUI ব্যাটারি টেবিল, wake-lock, proot পরিষ্কার; 12.3 প্রতিটা কমান্ড আসল কি না মেলায় |

### Tier 4 — যেখানে লড়ব না (kill list, লেখা থাকুক)

| যা | কেন নয় |
|---|---|
| ২৫+ চ্যানেল (Gmail, Matrix, LINE, Signal…) | একজনের পক্ষে অসম্ভব; আমাদের ৭টা অ্যাডাপ্টার যথেষ্ট আর Telegram-ই আসল দরজা |
| নেটিভ macOS/Windows/Linux অ্যাপ, iOS HealthKit | ফোন-ফার্স্ট বেটের বাইরে |
| Plugin marketplace / registry / fleet / cloud | ClawHavoc-এর কারণটাই ওই মডেল; আমাদের zero-dep stance-ই জয় |
| Kubernetes / Ansible / Fly / GCP ইনস্টলার | ডেস্কটপ/সার্ভার কেন্দ্রিক; ফোনে অপ্রয়োজনীয় |
| ১,৩৩৫ পেজের ডক সাইট | জিতব accuracy দিয়ে, volume দিয়ে না |

---

## 3. Plan — এই ডক অনুযায়ী কী কী ক্রমে হবে

| Phase | কত দিন | কী | কোন সারি বদলায় |
|---|---|---|---|
| **A** | ~২ সপ্তাহ | batch 5 (কিউ) ✔ — BROKEN **7→4**, drift 0 (২০২৬-১০-০৩) + Tier 0-র ৭টা ছোট ফ্লিপ | BROKEN ≤4 · WORKING +7 |
| **B** | ~৪ সপ্তাহ | batch 6 ✔ approvals · 7 ✔ স্মৃতি · 8 ✔ write fencing · 9 ✔ usage · 10 ✔ Tier-0 sweep (৭/৭) · **11 ✔ মডেল-লেখা compaction + generated docs map** — সব ২০২৬-১০-০৩ | **BROKEN 0, drift 0, core lane ~০ দিন** (census: WORKING 41, score 53%) |
| **C** | ~২ সপ্তাহ | Tier 2-র যাচাই-বাছাই: প্রতিটা মোট-দাবির টেস্ট + মাপা সংখ্যা — **✔ batch 12 (২০২৬-১০-০৩)**: bench + README-র সংখ্যা, offline end-to-end, TERMUX গাইড, outbox exactly-once | সংখ্যা বাড়েনি (WORKING 41 · BETTER 14), কিন্তু প্রতিটা দাবির পিছনে এখন টেস্ট/স্ক্রিপ্ট |
| **D** | ~১ সপ্তাহ | প্যারিটি লেনের সস্তা ফ্লিপ — **✔ batch 13 (২০২৬-১০-০৩)**: Telegram typing, colour/TTY শৃঙ্খলা, প্রতি-কমান্ড help, shell completion, আর পাঁচটা চ্যানেল অ্যাডাপ্টারের আসল রাউটিং+টেস্ট | **WORKING 41→50 · PARTIAL 53→48 · score 53%→57%**, drift 0 |
| **E** | ~১ সপ্তাহ | মেশিন-পাঠ্য CLI — **✔ batch 14 (২০২৬-১০-০৩)**: একটা JSON envelope, ১১টা কমান্ডে `--json`, `--json` মোডে লগ stderr-এ, ব্যর্থতাও envelope + exit code, `docs/CLI.md` | **WORKING 50→51 · PARTIAL 48→47**, score 57%, drift 0 |
| **H** | ~৩ দিন | মেমোরি + context বিশ্বাসযোগ্য করা — **✔ batch 18–19 (২০২৬-১০-০৩)**: র‍্যাঙ্ক করা মেমোরি search (BM25 + phrase + recency) + provenance/taint + merge-in-place + USER.md; পুরনো tool result prune + `termcrab context` breakdown + `default`/`compact` engine | census: WORKING ৫৪→৬১, ABSENT ৩৬→৩১, score **৫৯% → ৬৩%**; ৬৬৫ টেস্ট, ০ ফেল |
| **I** | ~৫ দিন | গেটওয়েতে ভরসা — **✔ batch 20 (২০২৬-১০-০৩)**: ডিভাইস pairing (৫ মিনিটের একবার-ব্যবহারযোগ্য কোড → নিজস্ব টোকেন, শুধু hash সংরক্ষণ, যেকোনো একটা ডিভাইস আলাদা করে revoke), টাইপড wire protocol (v:1, seq, দশটা event family কোড↔ডক দুই দিকেই পাহারা দেওয়া) + idempotency key (retry = একই run), per-key rate limit (429 + retryAfterMs, চ্যাটে এক বাক্য) | census: WORKING ৬১→৬৫, ABSENT ৩১→২৮, score **৬৩% → ৬৬%** |
| **J** | ~৫ দিন | সেশন ও ট্রান্সক্রিপ্ট — **✔ batch 21 (২০২৬-১০-০৩)**: append-এ fsync + ছেঁড়া লাইন নিজে সেরে নেওয়া + `sessions verify [--repair]`; সব সেশন/archive জুড়ে র‍্যাঙ্ক করা search (BM25 + phrase + recency, snippet-এ শব্দ চিহ্নিত) CLI/চ্যাট/টুল তিন জায়গায়; `agent.sessionReset = never|daily|idle:<মিনিট>` — reset মানে পুরনো থ্রেড archive, মুছে ফেলা নয়; `sessions show <id>` বলে এই চ্যাট কী ছুঁয়েছে, কী শিখেছে, কী approval অপেক্ষায় | census: WORKING ৬৫→৬৮, ABSENT ২৮→২৬, score **৬৬% → ৬৭%** |
| **K** | ~৪ দিন | tools যেন ভদ্রভাবে ব্যর্থ হয় — **✔ batch 22 (২০২৬-১০-০৩)**: `exec`-এর চারপাশে guard (বিপর্যয়-তালিকা → এক বাক্যে refusal, timeout কিল করে বলে দেয়, output cap), সব টুলের args স্কিমা-যাচাই (ভুল args = স্পষ্ট বার্তা, ক্র্যাশ নয়), approval এখন টার্মিনালেও (y/N) এবং সিদ্ধান্ত transcript-এ লেখা থাকে | census: WORKING ৬৮→৭১, score **৬৭% → ৬৮%**, tools lane ৬৪%→৭৮% |
| **L** | ~৪ দিন | ops যেন চোখে দেখা যায় — **✔ batch 23 (২০২৬-১০-০৩)**: প্রতিটি running turn-এর verdict (working/slow/stuck/failing/queued) + করণীয় এক বাক্যে — `termcrab runs`, `/api/runs/health`, চ্যাটের `/status` লাইন, doctor-এর `running turns` চেক; প্রতিটি console লাইন `logs/termcrab.jsonl`-এ JSON হিসেবে (ts/level/area/message), `termcrab logs [n]`, rotation 2MB × 3 (config দিয়ে বদলানো যায়), `termcrab disk` logs area গোনে | census: WORKING ৭১→৭৩, score **৬৮% → ৬৯%** |
| **G** | ~৩–৪ দিন | ইনবক্স-সচেতন এজেন্ট — **✔ batch 17 (২০২৬-১০-০৩)**: `inbox_list`/`inbox_read` টুল + চ্যাটে `/inbox` ও `/inbox <নাম>`; যা পড়া হয়েছিল একবারই sidecar-এ লেখা হয় (ফাইল মুছে গেলেও টেক্সট থাকে); `.inbox-index.json` budget থেকে সুরক্ষিত, তাই trim হওয়া ফাইলও "GONE" বলে নিজের কথা বলে; docs-এর টেবিল vs কোড — টেস্টে মিলিয়ে দেখা | verdict বদলায়নি (নতুন ক্ষমতা নয়, আগেরটা শক্ত করা), evidence বদলেছে; 623 টেস্ট, 0 ফেল |
| **F** | ~১ সপ্তাহ | চ্যাট-সারফেস — **✔ batch 15 (২০২৬-১০-০৩)**: Telegram-এ media in/out (inbox + `send_file` + outbox), গ্রুপে mention-শৃঙ্খলা, চ্যাটে `/usage /sessions /memory /help`, `docs/CHANNELS.md` | **WORKING 51→53 · PARTIAL 47→46**, channels area 64%→76%, score 58%, drift 0 |
| **D** | ~৩ সপ্তাহ | Tier 0-র বাকি + যেসব PARTIAL ফ্লিপ করা সস্তা (চ্যানেল: Discord/Slack/Signal/SMS/Matrix ~২দিন করে) | BETTER ~25, PARTIAL কমতে থাকে |

**প্রথম কাজ সবসময় যেটা ব্রোকেন — নতুন ফিচার পরে।** কারণ: BROKEN সারি মানে ফাইল-ট্রি-তে ফিচার আছে কিন্তু কোনো কোড সেটা ছোঁয় না; ওগুলোই "আমরা এগিয়ে" ভ্রম তৈরি করে।

---

## 4. কীভাবে এই ডক সত্য থাকবে

1. প্রতিটা "আমরা এগিয়ে/BETTER" দাবির পাশে হয় একটা **census সারি** (probe-সহ) নয়তো একটা **টেস্ট**, নয়তো একটা **মাপা সংখ্যা** থাকতে হবে — `test/beat-plan.test.ts` এটা যাচাই করে (প্রতিটা tier-এ অন্তত একটা সারি, প্রতিটা সারিতে effort + proof কলাম, আর "already BETTER" দাবিগুলো census-এর সত্যিকারের BETTER সারির সাথে মেলে)।
2. OpenClaw-এর দাবি সবসময় **পেজের নাম ধরে** লেখা — কেউ খুলে মিলিয়ে দেখতে পারবে।
3. এই ডকের কাজের অগ্রগতি [WORKLOG.md](../../WORKLOG.md)-এ থাকে; লেভেলের হিসাব [TRACKER.md](TRACKER.md)-এ।
4. কোনো দাবি পুরনো হয়ে গেলে census probe `DRIFT` দেয় — তখন দাবিটা টেস্টে ফ্লিপ হয়, নয়তো ডক থেকে যায় না।
