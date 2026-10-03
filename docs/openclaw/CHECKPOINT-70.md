# ৭০% চেকপয়েন্ট — TermCrab কোথায় দাঁড়িয়ে আছে (২০২৬-১০-০৩)

এই লেখাটা আপনার জন্য, কোডের জন্য নয়। আপনি বলেছিলেন ৭০% হলে বসে আলোচনা করব — এখন **৭০%**। নিচে শুধু যাচাই করা সংখ্যা আর কী বাকি।

## ১. এক নজরে

| জিনিস | সংখ্যা | মানে |
|---|---|---|
| capability score | **৭০%** | OpenClaw-এর ১৫০টা চেকের বিপরীতে মাপা (আগে ছিল ৪৪% এই পড়াশোনা শুরুর সময়) |
| WORKING | **৭৪** | আজ সত্যিই কাজ করে, টেস্টে pinned |
| BETTER | **১৪** | OpenClaw যা করে তার চেয়ে ভালো/বেশি |
| PARTIAL | **৩৯** | কিছু আছে, পুরো নয় — প্রতিটার পাশে লেখা আছে কী নেই |
| ABSENT | **২৩** | এখনো নেই |
| probe drift | **০** | কোনো দাবি আর কোড আলাদা হয়ে যায়নি |
| টেস্ট | **৭৩৮+** | ০ ফেল, ~৫০ সেকেন্ডে পুরো suite |
| চলতি release | **০.৫৫.০** | প্রতি batch-এ একটা করে, প্রতিটার CHANGELOG + WORKLOG প্রমাণসহ |

মাপাটা `node scripts/census.mjs` চলে, আর প্রতিটা "WORKING" দাবির পাশে কোন ফাইল/টেস্ট তার প্রমাণ লেখা থাকে — কোনো সংখ্যা মুখে বলা নয়।

## ২. এলাকা ধরে (কোথায় শক্ত, কোথায় ফাঁক)

| এলাকা | score | ~দিন বাকি | মন্তব্য |
|---|---|---|---|
| context | ৯২% | ~৬ | prompt/compaction/memory — প্রায় শেষ |
| gateway | ৯০% | ~৬ | এই batch-এ শেষ ABSENT-ও গেল (presence + event triggers) |
| agent | ৮১% | ~২৬ | loop নিয়ে যা দরকার তার বেশিরভাগ আছে |
| mobile | ৭৯% | ~২৭ | ফোন-ফার্স্ট দিকটা আমাদের সবচেয়ে বড় সুবিধা |
| tools | ৭৮% | ~২১ | shell/browser/file — guarded shell সহ |
| channels | ৭৬% | ~৪১ | telegram পাকা, বাকিগুলো thinner |
| security | ৭৪% | ~১৫ | approval, secrets, bind guard |
| sessions | ৭৪% | ~১৯ | durable transcript, search, reset policies |
| ops | ৬৯% | ~২২ | runs/logs/presence/events এইমাত্র যোগ হলো |
| skills | ৬৫% | ~৯ | loader আছে, বাজার নেই (ইচ্ছাকৃত) |
| surfaces | ৫৮% | ~৩৭ | TUI/panel আছে, native app নেই (ইচ্ছাকৃত) |
| storage | ৪৭% | ~১৫ | backup/budget আছে, migrations নেই |
| providers | ৪২% | ~২৭ | mock+Anthropic-style+local; Google/OpenAI-নির্দিষ্ট কাজ বাকি |
| automation | ৪০% | ~২১ | cron/heartbeat আছে; file/condition watcher নেই |
| plugins | ০% | ~৩৫ | **ইচ্ছাকৃতভাবে বাদ** — ফোনে এর লাভ নেই |

মোট বাকি ~৩২৭ ডেভেলপার-দিন; তার মধ্যে **core lane মাত্র ~৩ দিন**, বাকিটা parity (~১৯২) আর ইচ্ছাকৃতভাবে বাদ দেওয়া "later" (~১৩২)।

## ৩. আপনার "লাভ কী" — যাচাই করা সুবিধা

BEAT-PLAN-এর প্রমাণসহ দাবিগুলো এই দুটো জায়গায় লেখা: `docs/openclaw/BEAT-PLAN.md` (Tier 0/1/2) আর `docs/openclaw/TRACKER.md`। সংক্ষেপে যা আমরা ওদের চেয়ে এগিয়ে:

1. **গেটওয়ে নিজেই ফোনে** — OpenClaw-এর Android app নিজেই লিখেছে "Android does not host the Gateway" (তাদের `platforms/android.md`)। আমরা Termux-এ gateway চালাই; একই ফোনে panel, telegram, cron — আলাদা মেশিন লাগে না।
2. **শূন্য runtime dependency** — ওদের Node ২৪/২৬ আর native SQLite দরকার; আমরা Node ≥২০.১০-এ শুধু stdlib দিয়ে চালাই (৭৩৮ টেস্ট তার প্রমাণ)।
3. **Android/Termux ইনস্টল পথ** — ওদের ৪৩টা `/install` পেজে Termux-এ *এজেন্ট* বসানোর পথ নেই (শুধু SSH helper)।
4. **ব্যর্থতা মানুষকে বোঝায়** — guarded shell (catastrophe list + timeout), প্রতি tool-এর schema boundary-তে যাচাই, approval টার্মিনাল থেকে `y/N`, আর এখন `termcrab runs` বলতে পারে *কেন* আটকে আছে + কী করতে হবে।
5. **অপ্স চোখে দেখা যায়** — `runs`, `logs` (JSONL + rotation), `presence`, `events`; প্রতিটা `/api/...`-তেও, তাই panel/স্ক্রিপ্ট দুটোই পড়তে পারে।

## ৪. যা বাকি (প্রভাব অনুযায়ী সাজানো)

**core lane (~৩ দিন, তারপর "প্ল্যাটফর্ম" শেষ):**
- ২৪.x-এর শেষ ধাপ: চেকপয়েন্ট পেজ (এই ফাইল) + panel-এ review।

**পরের batch-গুলোর সুপারিশ (আমার ক্রম):**
1. **Standing orders** — বারবার বলা কথা ("প্রতি শুক্রবার রিপোর্ট") একবার সেট করে রাখা; automation ৪০% → উপরে।
2. **Image/media generation + document extraction** — ফোন থেকে "ছবিটা বানাও / PDF থেকে বের করো"।
3. **Auth profiles + provider breadth** — একাধিক key/model প্রোফাইল, switch সস্তা।
4. **Storage: migration plan** — এখন schema বদলালে পুরোনো ডেটা কী হবে তার নিয়ম লেখা নেই।
5. **Surfaces: TUI-র ছোট ছোট ফাঁক + native-ness** — সবচেয়ে কম অগ্রাধিকার, কারণ panel+telegram আসল চাহিদা মেটায়।

**যা এখনো বাদ রাখছি (আপনি না বললে):** plugin API/lifecycle (plugins lane ০%), ২৫+ চ্যানেল, cloud/fleet/workboard, macOS/Windows app, native GUI। এগুলোতে ঢুকলে বছর পার হবে, ফোনে লাভ প্রায় শূন্য।

## ৫. যা আপনাকে করতেই হবে (আমি পারব না)

- **ফোনে আসল পরীক্ষা**: Termux-এ ইনস্টল করে `termcrab gateway` চালানো, telegram বট টোকেন দিয়ে একবার মেসেজ পাঠানো। টেস্ট আমার দিক থেকে সবুজ; বাস্তব ফোন আর টোকেন আপনার হাতে।
- **কোনটা আগে চান** তা বলা — উপরের ১–৫ ক্রম আমার সুপারিশ, আপনার অগ্রাধিকার আলাদা হলে বলুন, আমি সেই ক্রমে এগোব।
- বাকিটা আমি করে যাচ্ছি: প্রতি batch = কোড + টেস্ট + docs + census + WORKLOG + release, কোনো PR ছাড়া, সরাসরি branch-এ।

## ৬. এখন দাঁড়ানো অবস্থায় এক লাইনে

> ফোনে চলে, ইন্টারনেট ছাড়াই চলে, ব্যর্থ হলে বোঝায়, আর অপ্স চোখে দেখা যায় — যা এখনো নেই তার বেশিরভাগ হয় ইচ্ছাকৃতভাবে বাদ, নয়তো plugins/providers-এর চওড়া কাজ; প্রতিটার সংখ্যা আর প্রমাণ উপরে।
