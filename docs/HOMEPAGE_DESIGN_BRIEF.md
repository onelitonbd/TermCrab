# TermCrab — Homepage (Chat Screen) Redesign Brief

**What this document is:** a complete, self-contained brief for a designer (human or AI) to redesign
the homepage of TermCrab. It lists every element that exists today, how it behaves, and the rules of
the design. Everything the designer must decide (fonts, spacing, visual language) is listed at the end.
Copy this whole document into your designer — no other context is needed.

---

## 1. What the product is

TermCrab is a personal, always-on AI agent that runs on a phone (Termux, the Android terminal).
The user opens a local web page in their mobile browser and talks to the agent there — like a chat
app, but the agent can use tools, remember things across conversations ("memory"), dream/learn in
the background, and switch between AI models/providers.

- Single-user, self-hosted, private. Everything stays on the device.
- MIT licensed, no external services required.
- **Primary device: Android phone, Chrome, screen widths 360–430 px.** Desktop should look good too,
  but mobile is the source of truth.
- The homepage is the chat screen — the first and most-used screen.

## 2. Design direction (what the owner wants)

- **True black dark theme.** The canvas is pure black `#000000`; surfaces are barely-lifted greys;
  borders are subtle. This is an established, deliberate direction — do not suggest light themes or
  bluish-grey "dark grey" canvases.
- Visually modern and polished — the owner's benchmark is a product called OpenClaw whose Memory
  page he finds "smooth and visually stunning." Aim for that level of craft: confident typography,
  clear hierarchy, generous whitespace, tasteful micro-motion.
- No emojis anywhere — in the interface or in any copy.
- All user-facing text is plain, non-technical English.
- Product personality: a friendly crab (the mascot is a minimal line-art crab). The tone can be
  warm, but the layout should stay clean and grown-up — not cartoonish.

### Current design tokens (starting point — you may refine, but stay on-brand)

| Token | Current value | Role |
|---|---|---|
| Background | `#000000` | page canvas |
| Elevated surfaces | `#0e0e0e` | cards, popups |
| Card | `#0e0e0e` | message cards, rows |
| Fill | `#171717` | inputs, active nav row |
| Border subtle / strong / hover | `#222222` / `#303030` / `#444444` | dividers, outlines |
| Text | `#e9e9e9` | body copy |
| Strong text | `#ffffff` | headings, emphasis |
| Muted text | `#939393` | secondary copy |
| Accent (blue) | `#58a6ff` (hover `#79c0ff`) | links, active states, highlights |
| Primary (green) | `#238636` (hover `#2ea043`) | main action buttons (Send, Save) |
| Success / Warning / Danger | `#3fb950` / `#d29922` / `#f85149` | status dots, destructive actions |
| Stop / destructive fill | `#da3633` | stop-reply button state |
| Focus ring | `rgba(88, 166, 255, 0.8)` | keyboard focus |
| Corner radii | 6 / 10 / 14 / 20 px (sm/md/lg/xl), composer 18 px, pills 999 px | rhythm |
| Body type (current) | `15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | — |
| Code type (current) | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | — |

**Typography is undecided on purpose.** The current stack is the browser default system stack. The
owner wants YOU to choose the typeface(s), sizes, weights and scale — see "What you decide" below.

---

## 3. Layout frame (fixed structure)

One page, full viewport height (`100dvh`), horizontal flex:

```
┌─────────────┬──────────────────────────────────────────┐
│  SIDEBAR    │  TOP BAR                                 │
│  (left)     ├──────────────────────────────────────────┤
│             │                                          │
│  nav items  │   MAIN AREA (this view)                  │
│  chat       │   → on homepage: scrollable message list │
│  history    │                                          │
│             ├──────────────────────────────────────────┤
│             │  COMPOSER (bottom, sticky)               │
└─────────────┴──────────────────────────────────────────┘
```

- **Mobile:** sidebar becomes an off-canvas drawer opened by the hamburger in the top bar; a dimmed
  scrim closes it on tap. The top bar and composer stay fixed; only the message list scrolls.
- **Desktop:** sidebar is a permanent left column (~260 px).
- Safe-area insets must be respected (notches/home bars on phones).

---

## 4. Complete element inventory (what exists today)

### A. Top bar

| # | Element | What it is / does |
|---|---|---|
| A1 | Hamburger button (left) | Opens the sidebar drawer (mobile only; hidden on desktop where the sidebar is always visible). 18 px line icon. |
| A2 | Crab logo | Minimal line-art crab, stroke style, accent blue `#58a6ff`, ~30 px. |
| A3 | Product title | "TermCrab" — bold heading next to the logo. |
| A4 | Status line | Small muted text under the title showing the current chat id, e.g. `Chat: web:main`. This is the only live info in the top bar — design how to make it read as a quiet status, not clutter. |
| A5 | Kebab menu (right) | Vertical three-dot button opening a dropdown with: a **"Talk as"** agent selector (native dropdown: `default` + any configured agents), **Reset** (clears this chat), **Check in** (runs an immediate heartbeat), **Dream** (runs a learning cycle now). |

### B. Sidebar

| # | Element | What it is / does |
|---|---|---|
| B1 | Nav section | Vertical list of six rows, each = **line icon + label**: Status, Providers, Models, Memory, Tools, Settings. Active row: brighter text + thin accent bar on the left edge. Icons are 24-grid stroke icons rendered at ~16–17 px, `stroke-width` 1.8, rounded caps. |
| B2 | New chat button | Round-ish ghost button with a `+` icon; starts a fresh conversation. |
| B3 | Chat history | Scrollable list of past conversations (session rows). Current session is highlighted; tapping one opens it. Rows show the session id/name, truncated with ellipsis. |

### C. Main area — the chat message list (homepage core)

| # | Element | What it is / does |
|---|---|---|
| C1 | User message | Right-aligned bubble, blue-tinted background `rgba(56,139,253,0.10)` with a blue-ish border, asymmetric radius (round except bottom-right corner), max width ~46ch / 88%. Plain text, wrapped. |
| C2 | AI reply | **Not a bubble** — full-width content column, transparent background. Renders rich Markdown while streaming: headings (kept deliberately small for mobile), bold/italic, lists, blockquotes (left rail), inline code (pill), code blocks (dark card, language label bar + **Copy** button, horizontal scroll), tables (scroll wrapper), links (underlined). Code font is monospace. This full-width treatment is a deliberate 2026 mobile-chat pattern — keep the "answer is the content" idea. |
| C3 | System note | Small, muted, low-key line (e.g. `Stopped.` after aborting a reply, memory confirmations). |
| C4 | First-run welcome card | Shown once when no real model is configured: a card with a 3 px accent-blue left border, short plain-English explanation of what to do first, and a button **"Or open the Providers page"**. This is the empty state of the homepage — its presentation is yours to redesign (it is the first thing a new user sees). |
| C5 | Streaming behaviour | AI replies render progressively (markdown re-renders live, throttled). While waiting, a subtle typing/placeholder area shows under the list. New messages animate in with a short 0.18 s fade + 4 px rise. The list auto-scrolls to the bottom during streaming. Errors render in danger red inside the reply area. |

### D. Composer (bottom of the homepage)

| # | Element | What it is / does |
|---|---|---|
| D1 | Composer box | Rounded rectangle (radius 18 px) containing two layers. Sits above the safe area, always visible. |
| D2 | Text area (layer 1) | Auto-growing multiline input, placeholder `Type a message…`. Enter sends, Shift+Enter makes a newline. |
| D3 | Button row (layer 2) | Left to right: **Attach** (round icon button, paperclip — opens a file picker; accepts text-like files up to 200 KB and inserts the file's name+content into the textarea as a quoted block; images/PDFs produce a small system note saying they're not supported), **Model button** (rounded pill: sparkle icon + current model name, e.g. `mock-1` — opens the model picker, see E), flexible spacer, **Send** (round green primary button, paper-plane icon). |
| D4 | Send ⇄ Stop morph | While the AI is replying, the green send button turns into a **red stop square** (same button, different icon/state). One click aborts the reply; the partial bubble is removed and a system note `Stopped.` appears. When idle it returns to the paper plane. There is no separate stop button — this morph IS the stop control. |
| D5 | Disabled/idle states | Sending is guarded (no double sends); button states must stay legible on black. |

### E. Model picker popup (opens from D3)

Bottom-sheet style popup (rounded top corners, dimmed backdrop): title row with sparkle icon +
**"Chat with a model"**, one-line helper text, a **provider dropdown** (all saved providers), then a
scrollable list of **saved model rows** (small sparkle icon + model id). Tapping a row switches the
live model instantly (no save/confirm step, no restart) and closes the popup. A **Close** button and
an error line sit at the bottom. Empty state: a short hint that no models are saved yet.

### F. First-visit token gate (full-screen overlay)

Before anything is usable, a centered card over a dimmed backdrop: crab mark, **"TermCrab"** heading,
one sentence of instruction (paste the gateway token printed in the terminal), a password input, and
a **Connect** button (Enter also submits). On success the overlay disappears. Wrong token shows an
inline error. This screen is seen before the homepage — design it as part of the flow.

### G. Generic modal (used from other pages, style it consistently)

Centered card: title, one or more text/password inputs, Cancel (ghost) + Save (primary green) row,
and an inline error line. Used for "Add provider" and "Add API key". Not part of the homepage itself,
but its visual language must match whatever you design.

---

## 5. Behaviours that must survive the redesign (hard constraints)

1. Every element above must remain — no removals, no functionality changes. You are changing how it
   looks and where it sits, not what it does.
2. Mobile-first: usable one-handed at 360 px width; touch targets ≥ 40 px; respects safe areas.
3. Streaming replies keep rendering live; auto-scroll must keep working and must not fight the user
   when they scroll up.
4. Send ⇄ Stop morph stays a single button.
5. Keyboard: Enter sends, Shift+Enter newlines; visible focus rings (currently a blue glow) must
   remain accessible.
6. Deep links work (sessions are addressable, e.g. `/chat/<id>`), the sidebar drawer + scrim pattern
   stays, and the token overlay still gates first use.
7. Pure black canvas stays; code blocks and inline code must stay monospaced and legible.
8. No emojis in any icon, label, or empty state. Icons are drawn (stroke line style or your refined
   version of it) — not emoji, not clipart.
9. All copy stays plain English; you may rewrite any text for clarity, keeping the meaning.
10. The implementation is one static HTML file with inline CSS/JS — no frameworks, no web fonts
    downloads required at runtime unless you specify a font strategy that degrades gracefully
    offline (this app must work with no internet).

---

## 6. What YOU (the designer) must decide

The owner explicitly wants your judgment on these — make concrete, opinionated choices and justify
each in one line:

1. **Typeface(s):** pick the font family (or family + mono pairing) for UI text and for code.
   Must include: exact font names, weights used, full fallback stack, and the reasoning
   (legibility on Android, character, license — fonts must be open/permittable or system fonts).
   Note the app must work fully offline — if you pick a non-system font, state how it loads
   (bundled file, not a CDN) or recommend a system-stack alternative.
2. **Type scale:** sizes/weights/line-heights for: product title, section headings, message text,
   AI reply text, code, buttons, labels, captions — as a numbered scale.
3. **Spacing system:** a base unit and the spacing steps (padding/margins/gaps) for cards, rows,
   sections, the composer, and the page gutters.
4. **Component language:** refine radii, borders, elevation/surfaces; define button variants
   (primary / ghost / icon / pill / destructive) and input states (idle, focus, error, disabled).
5. **Icon style:** keep the current stroke-line system or propose a refinement — but state it as a
   rule (grid size, stroke width, cap style) so all icons stay consistent.
6. **Empty state / welcome:** redesign the first-run welcome (C4) — this is your chance to make the
   first impression strong.
7. **Motion:** message entrance, streaming shimmer or cursor, drawer, popup sheet — short, calm,
   150–250 ms, with reduced-motion respect.
8. **Refinements to the black palette** if you want (subtle gradients, glow accents) — must stay
   true black at the canvas and keep WCAG-AA contrast for text.

## 7. Deliverables we expect back

1. **Annotated layouts** for (a) mobile 390 px and (b) desktop 1280 px — showing where each element
   from Section 4 sits.
2. **Design tokens file** (plain CSS custom properties is ideal): colors, type scale, spacing,
   radii, shadows, motion durations.
3. **Component states** list: every button/input/row in idle / hover / focus / active / disabled /
   error.
4. **Font spec**: families, weights, fallback stack, and where each is used.
5. **Copy pass**: rewritten microcopy for the welcome card and empty states (plain English, no
   emojis), if you improve it.
6. A short **do / don't** list for future screens so the rest of the app can match the homepage.

## 8. Out of scope

- Other pages (Status, Providers, Models, Memory, Tools, Settings) — they will follow the same
  language later; design the homepage first, but don't paint yourself into a corner.
- Backend, APIs, agent behaviour — unchanged.
- Light theme — not requested.

---

*Prepared for the TermCrab homepage redesign. Source of truth for current behaviour: the app
repository. If any element here seems missing or wrong, list it rather than inventing new features.*
