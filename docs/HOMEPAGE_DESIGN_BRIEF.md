# TermCrab — Homepage Redesign Brief (compact)

A self-contained brief for a designer (human or AI) redesigning TermCrab's homepage (the chat
screen). Copy this whole document in — no other context is needed.

## 1. The product

TermCrab is a personal, always-on AI agent that runs on a phone (Termux terminal) and is used
through a local web page in the mobile browser: a chat screen where the agent answers (rich
markdown), uses tools, remembers past conversations, learns in the background ("dreams"), and
switches between AI models/providers. Single-user, self-hosted, everything stays on the device,
must work fully offline. Primary device: Android Chrome, 360–430 px wide; desktop should look good
too, but mobile is the source of truth.

## 2. Direction

- **True black dark theme** (established, deliberate): canvas pure `#000000`, surfaces barely
  lifted, subtle borders. No light theme, no bluish-grey canvas.
- Level of craft: the owner's benchmark is "OpenClaw" — smooth, visually stunning. Aim there:
  confident type, clear hierarchy, whitespace, calm micro-motion.
- No emojis anywhere. All copy plain, non-technical English.
- Personality: a minimal line-art crab mascot — warm but grown-up, not cartoonish.

Current tokens (starting point, refine if you want, stay on-brand):
bg `#000000` · elevated/card `#0e0e0e` · fill `#171717` · borders `#222222`/`#303030`/`#444444`
· text `#e9e9e9` · strong `#ffffff` · muted `#939393` · accent blue `#58a6ff` (hover `#79c0ff`)
· primary green `#238636`/`#2ea043` · success `#3fb950` · warning `#d29922` · danger `#f85149`
· stop fill `#da3633` · focus ring `rgba(88,166,255,.8)` · radii 6/10/14/20 px, composer 18 px,
pills 999 px · body `15px/1.5 system-ui…` · code `ui-monospace/Menlo/Consolas`.
**Typography is deliberately undecided — see section 6.**

## 3. Layout frame (fixed)

Full-height flex row: left SIDEBAR + right column (TOP BAR / scrollable MAIN / sticky COMPOSER).
Mobile: sidebar is an off-canvas drawer behind a hamburger with a tap-to-close scrim; only the
message list scrolls. Desktop: permanent ~260 px sidebar. Respect safe-area insets.

## 4. Element inventory (all must survive)

**A. Top bar:** hamburger (opens drawer, mobile only) · line-art crab logo (~30 px, accent blue) ·
"TermCrab" title · muted status line under it (`Chat: web:main`) · right-side kebab menu with:
"Talk as" agent dropdown, Reset, Check in, Dream.

**B. Sidebar:** six nav rows = stroke icon + label (Status, Providers, Models, Memory, Tools,
Settings); active row brighter with a thin accent bar on the left · New-chat `+` button · scrollable
chat-history list, current session highlighted, tap to open, names truncate.

**C. Message list (homepage core):**
- User messages: right-aligned blue-tinted bubble (bg `rgba(56,139,253,.10)`), asymmetric radius
  (square bottom-right), max ~46ch/88%, plain wrapped text.
- AI replies: **not bubbles** — full-width transparent content column rendering Markdown live
  while streaming: small headings, lists, quotes (left rail), inline-code pills, code blocks (dark
  card, language label, Copy button, horizontal scroll), tables (scroll wrapper), links. Keep the
  "answer is the content" idea — it's a deliberate mobile-chat pattern.
- System notes: small muted lines (e.g. `Stopped.`).
- First-run welcome card (empty state): accent-left-border card, short explanation of what to do
  first, button "Or open the Providers page". First thing a new user sees — your chance to shine.
- Streaming: live markdown re-render, subtle typing placeholder, new messages fade+rise in ~0.18 s,
  auto-scroll to bottom, errors shown in red.

**D. Composer (rounded 18 px box, two layers):**
- Layer 1: auto-growing textarea, "Type a message…"; Enter sends, Shift+Enter newlines.
- Layer 2: Attach (round paperclip; picks text-like files ≤200 KB and inserts them into the
  textarea as a quoted block; other file types get a small system note) · Model pill (sparkle icon
  + current model name; opens picker) · spacer · Send (round green primary, paper-plane).
- Send ⇄ Stop morph: while replying the same button becomes a red stop square; one click aborts
  (partial bubble removed, system note `Stopped.`). No separate stop button exists.

**E. Model picker popup** (bottom-sheet, dimmed backdrop): title with sparkle icon "Chat with a
model", helper line, provider dropdown, scrollable saved-model rows (sparkle icon + id); tapping a
row switches the live model instantly and closes; Close button + error line; friendly empty state.

**F. First-visit token gate** (full-screen overlay before the app): centered card — crab mark,
"TermCrab", one instruction sentence, password input, Connect (Enter submits), inline error on
wrong token. Part of the first flow; design it too.

**G. Shared modal** (used by other pages): title, inputs, Cancel (ghost) + Save (green), inline
error line — must match your visual language.

## 5. Hard constraints

1. No element removed, no behavior changed — you change looks and placement only.
2. Mobile-first: one-handed at 360 px, touch targets ≥40 px, safe areas respected.
3. Streaming + auto-scroll keep working; don't fight a user who scrolled up.
4. Send ⇄ Stop stays one button; visible keyboard focus stays accessible.
5. Enter/Shift+Enter behavior, deep links (`/chat/<id>`), drawer+scrim, token gate all stay.
6. Canvas stays true black; code stays monospaced and legible.
7. Icons are drawn (stroke-line system or your refined rule) — never emoji/clipart.
8. One static HTML file, inline CSS/JS, no frameworks; must work with zero internet.

## 6. What YOU decide (state each choice + one-line why)

1. **Fonts:** family (or UI + mono pairing), weights, full fallback stack, license. App runs
   offline — a non-system font must be bundled, or recommend a system stack.
2. **Type scale:** sizes/weights/line-heights for title, headings, message text, AI reply, code,
   buttons, labels, captions.
3. **Spacing system:** base unit + steps for cards, rows, sections, composer, page gutters.
4. **Component language:** radii, borders, surfaces/elevation; button variants (primary, ghost,
   icon, pill, destructive) and input states (idle, focus, error, disabled).
5. **Icon rule:** grid size, stroke width, caps — one rule for all icons.
6. **Welcome/empty state:** redesign it — this is the first impression.
7. **Motion:** entrance, streaming, drawer, sheet — short (150–250 ms), reduced-motion aware.
8. **Palette refinements** allowed (subtle glow/gradients) but canvas stays `#000000` and text
   keeps WCAG-AA contrast.

## 7. Deliverables

Annotated layouts (mobile 390 px + desktop 1280 px) placing every element above · design tokens as
CSS custom properties (colors, type, spacing, radii, motion) · component state list (idle / hover /
focus / active / disabled / error) · font spec · optional copy pass for welcome/empty states ·
short do/don't list so later pages match.

## 8. Out of scope

Other pages (Status, Providers, Models, Memory, Tools, Settings) come later — don't paint into a
corner. Backend unchanged. No light theme.

*If anything here seems missing or wrong, list it — don't invent new features.*
