import pathlib

p = pathlib.Path('ui/index.html')
s = p.read_text()

# --- new OpenClaw-token style block ---
new_css = """
  :root {
    color-scheme: dark;
    /* OpenClaw control-UI token family (their ui/docs/design-system/color-tokens.md) */
    --bg: #0e1015;
    --bg-accent: #13151b;
    --elevated: #191c24;
    --card: #161920;
    --fill: #1f2330;
    --line: #1e2028;
    --line-strong: #2e3040;
    --line-hover: #3e4050;
    --text: #bcbcc0;
    --strong: #f4f4f5;
    --muted: #8b8b94;
    --accent: #ff5c5c;
    --accent-hover: #ff7070;
    --primary: #d13c3c;
    --teal: #14b8a6;
    --ok: #22c55e;
    --warn: #f59e0b;
    --danger: #f87171;
    --info: #60a5fa;
    --destructive: #d32f2f;
    --r-sm: 6px;
    --r-md: 10px;
    --r-lg: 14px;
    --r-xl: 20px;
    --ring: 0 0 0 2px var(--bg), 0 0 0 3px rgba(255, 92, 92, 0.8);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--text);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
    max-width: 640px;
    margin: 0 auto;
    border-left: 1px solid var(--line);
    border-right: 1px solid var(--line);
  }
  [hidden] { display: none !important; }

  /* ---- gateway topbar (OpenClaw shell: 58 px mobile chrome) ---- */
  header {
    background: var(--bg-accent);
    color: var(--strong);
    padding: 10px 14px;
    min-height: 58px;
    display: flex;
    align-items: center;
    gap: 11px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--line);
  }
  header svg { flex-shrink: 0; }
  .plate { min-width: 0; flex: 1; }
  .plate h1 { margin: 0; font-size: 16px; font-weight: 650; letter-spacing: -0.01em; color: var(--strong); }
  #health {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
  }
  #pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    background: var(--fill);
    border: 1px solid var(--line-strong);
    border-radius: 9999px;
    padding: 5px 11px 5px 9px;
    white-space: nowrap;
  }
  #pill::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--muted);
  }
  #pill.ok { color: var(--strong); border-color: rgba(34, 197, 94, 0.4); }
  #pill.ok::before { background: var(--ok); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18); }

  /* ---- screens ---- */
  #views { flex: 1; min-height: 0; }
  .view {
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 12px 12px 18px;
  }
  #view-chat:not([hidden]) { display: flex; flex-direction: column; padding: 0; overflow: hidden; }

  #chatBar {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 9px 10px;
    background: var(--bg-accent);
    border-bottom: 1px solid var(--line);
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  #chatBar .sp { flex: 1; }
  #chatBar button { min-height: 34px; padding: 0 11px; font-size: 12.5px; border-radius: var(--r-sm); }
  #session, #agentSel {
    height: 34px;
    max-width: 34%;
    background: var(--fill);
    color: var(--text);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-sm);
    padding: 0 6px;
    font-size: 13px;
    min-width: 0;
  }

  #log {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 12px 6px;
    scroll-behavior: smooth;
  }
  .msg {
    max-width: min(46ch, 88%);
    padding: 9px 13px;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    font-size: 15px;
    animation: settle 0.18s ease-out;
  }
  .msg.user {
    align-self: flex-end;
    background: rgba(255, 92, 92, 0.12);
    border: 1px solid rgba(255, 92, 92, 0.3);
    color: var(--strong);
    border-radius: 16px 16px 5px 16px;
  }
  .msg.bot {
    align-self: flex-start;
    background: var(--card);
    border: 1px solid var(--line);
    color: var(--text);
    border-radius: 16px 16px 16px 5px;
  }
  .msg.sys {
    align-self: center;
    text-align: center;
    color: var(--muted);
    font-size: 12.5px;
    background: transparent;
    max-width: 92%;
  }
  .msg.welcome {
    align-self: stretch;
    max-width: 100%;
    background: var(--card);
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: 4px var(--r-lg) var(--r-lg) 4px;
    text-align: left;
    color: var(--text);
    font-size: 14px;
  }
  .tools { align-self: flex-start; color: var(--muted); font-size: 12.5px; padding: 0 4px; }
  .err { color: var(--danger) !important; }
  #typing {
    min-height: 20px;
    padding: 0 14px 4px;
    font-size: 12.5px;
    color: var(--muted);
    flex-shrink: 0;
  }

  /* ---- composer ---- */
  #composer {
    display: none;
    gap: 8px;
    padding: 9px 10px 10px;
    background: var(--card);
    border-top: 1px solid var(--line);
    align-items: flex-end;
    flex-shrink: 0;
  }
  body[data-view="chat"] #composer { display: flex; }
  #composer textarea {
    flex: 1;
    resize: none;
    min-height: 46px;
    max-height: 132px;
    border-radius: var(--r-lg);
    background: var(--fill);
    border: 1px solid var(--line-strong);
    color: var(--strong);
    padding: 12px 13px;
    font-size: 16px;
    line-height: 1.4;
    outline: none;
  }
  #composer textarea:focus { border-color: var(--line-hover); box-shadow: var(--ring); }
  #send {
    background: var(--primary);
    color: #fafafa;
    font-weight: 600;
    border: 0;
    border-radius: var(--r-lg);
    padding: 0 18px;
    min-height: 46px;
    font-size: 15px;
    cursor: pointer;
  }
  #send:active { background: var(--accent); color: #1a0b0b; }

  /* ---- controls ---- */
  button {
    background: var(--primary);
    color: #fafafa;
    font-weight: 600;
    border: 0;
    border-radius: var(--r-md);
    padding: 0 15px;
    min-height: 44px;
    cursor: pointer;
    font-size: 14.5px;
    font-family: inherit;
  }
  button:hover { background: var(--accent); color: #1a0b0b; }
  button.ghost {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--line-strong);
    font-weight: 500;
  }
  button.ghost:hover { background: var(--fill); color: var(--strong); border-color: var(--line-hover); }
  button:disabled { opacity: 0.5; cursor: default; }
  button:disabled:hover { background: var(--primary); color: #fafafa; }
  button.ghost:disabled:hover { background: transparent; color: var(--text); }
  button.danger { color: var(--danger); }
  button.danger:hover { background: rgba(248, 113, 113, 0.12); color: var(--danger); }
  :focus-visible { outline: none; box-shadow: var(--ring); }
  header :focus-visible, .rail button.on:focus-visible { box-shadow: 0 0 0 2px var(--bg-accent), 0 0 0 3px rgba(255, 112, 112, 0.9); }

  input[type="text"], input[type="password"], input[type="search"], select, textarea {
    font-size: 16px;
    font-family: inherit;
    color: var(--strong);
    background: var(--fill);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-md);
    padding: 10px 11px;
    min-width: 0;
  }
  input::placeholder, textarea::placeholder { color: var(--muted); }
  input:focus, select:focus, textarea:focus { outline: none; border-color: var(--line-hover); box-shadow: var(--ring); }
  select { -webkit-appearance: none; appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--muted) 50%), linear-gradient(135deg, var(--muted) 50%, transparent 50%); background-position: calc(100% - 15px) 55%, calc(100% - 10px) 55%; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; padding-right: 26px; }

  /* ---- panels ---- */
  details.panel {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    margin-bottom: 10px;
    overflow: hidden;
  }
  details.panel > summary {
    list-style: none;
    cursor: pointer;
    padding: 14px 15px;
    font-size: 15px;
    font-weight: 600;
    color: var(--strong);
    letter-spacing: -0.01em;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 48px;
  }
  details.panel > summary::-webkit-details-marker { display: none; }
  details.panel > summary::after {
    content: "";
    width: 7px;
    height: 7px;
    border-right: 1.8px solid var(--muted);
    border-bottom: 1.8px solid var(--muted);
    transform: rotate(45deg);
    transition: transform 0.15s ease;
    flex-shrink: 0;
    margin-right: 3px;
  }
  details.panel[open] > summary { border-bottom: 1px solid var(--line); }
  details.panel[open] > summary::after { transform: rotate(-135deg); margin-top: -4px; }
  details.panel > summary:hover { background: rgba(255, 255, 255, 0.02); }
  .pBody { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 9px; }
  #cronList, #cronForm { padding-left: 14px; padding-right: 14px; }
  #cronList { display: flex; flex-direction: column; gap: 8px; padding-bottom: 8px; }
  #cronForm { display: flex; gap: 7px; flex-wrap: wrap; padding-bottom: 14px; }
  #cronForm input[name="name"] { width: 110px; flex-shrink: 0; }
  #cronForm input[name="schedule"] { width: 128px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
  #cronForm input[name="prompt"] { flex: 1; min-width: 150px; }

  .pRow {
    background: var(--bg-accent);
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    padding: 9px 10px;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .pRow .k { font-weight: 600; font-size: 13.5px; min-width: 150px; flex-shrink: 0; color: var(--strong); }
  .pRow .nx, .nx { color: var(--muted); font-size: 12.5px; line-height: 1.45; }
  .pRow .sp, .sp { flex: 1; }
  .pRow.stack { flex-direction: column; align-items: stretch; gap: 5px; }
  .pRow.stack .line { display: flex; gap: 7px; align-items: center; }
  .pRow.stack .line input { flex: 1; }
  .pRow button, .pBody button { min-height: 36px; padding: 0 12px; font-size: 13px; border-radius: var(--r-sm); }
  .pBody > input[type="text"], .pBody > input[type="search"] { width: 100%; }
  .pBar { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
  .pBar input[type="text"], .pBar input[type="search"] { flex: 1; }
  .pNote { color: var(--muted); font-size: 12.5px; line-height: 1.5; }
  .pBody textarea {
    width: 100%;
    min-height: 110px;
    max-height: 300px;
    background: var(--fill);
    font-size: 13.5px;
    line-height: 1.55;
    resize: vertical;
  }
  .pBody pre {
    background: var(--fill);
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    padding: 10px 11px;
    overflow-x: auto;
    white-space: pre-wrap;
    font-size: 12.5px;
    max-height: 260px;
    overflow-y: auto;
    margin: 0;
    color: var(--text);
  }
  .how { margin: 0; font-size: 13.5px; line-height: 1.65; color: var(--muted); }
  .how b { color: var(--strong); }

  .cronRow, .sessRow {
    background: var(--bg-accent);
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    padding: 9px 10px;
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 13px;
  }
  .cronRow .nm, .sessRow .id { font-weight: 600; color: var(--strong); }
  .cronRow .sc { font-variant-numeric: tabular-nums; color: var(--teal); font-weight: 600; font-size: 12.5px; }
  .cronRow .nx, .sessRow .meta { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
  .cronRow button, .sessRow button { min-height: 34px; padding: 0 10px; font-size: 12.5px; border-radius: var(--r-sm); }
  .cronRow.off { opacity: 0.55; }
  .hit {
    background: var(--bg-accent);
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: 3px var(--r-md) var(--r-md) 3px;
    padding: 8px 10px;
    font-size: 13px;
    margin-bottom: 7px;
  }
  .hit .f { color: var(--accent); font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; margin-bottom: 2px; }
  .dreamRow {
    background: var(--bg-accent);
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    padding: 8px 10px;
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 7px;
  }
  .dreamRow .d { color: var(--teal); font-weight: 600; font-size: 12px; margin-right: 8px; font-variant-numeric: tabular-nums; }
  .st { font-size: 11.5px; font-weight: 700; border-radius: var(--r-sm); padding: 2px 7px; flex-shrink: 0; }
  .doc-ok { color: var(--ok); background: rgba(34, 197, 94, 0.1); }
  .doc-warn { color: var(--warn); background: rgba(245, 158, 11, 0.1); }
  .doc-fail { color: var(--danger); background: rgba(248, 113, 113, 0.1); }
  .doc-info { color: var(--info); background: rgba(96, 165, 250, 0.1); }
  .okc { color: var(--ok); } .warnc { color: var(--warn); } .failc { color: var(--danger); } .infoc { color: var(--muted); }
  .hidden { display: none !important; }

  /* ---- bottom rail (mobile stand-in for the OpenClaw sidebar) ---- */
  .rail {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: var(--bg-accent);
    border-top: 1px solid var(--line);
    flex-shrink: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .rail button {
    background: transparent;
    border: 0;
    border-radius: 0;
    color: var(--muted);
    font-size: 11.5px;
    font-weight: 600;
    min-height: 54px;
    padding: 6px 2px 7px;
    letter-spacing: -0.01em;
    position: relative;
  }
  .rail button.on { color: var(--strong); }
  .rail button.on::before {
    content: "";
    position: absolute;
    top: 0;
    left: 22%;
    right: 22%;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: var(--accent);
  }
  .rail button:hover { color: var(--text); }
  .rail button.on:hover { color: var(--strong); }
  .rail button:active { background: var(--fill); }

  /* ---- sheets (token gate + wizard) ---- */
  #overlay, #wiz {
    position: fixed;
    inset: 0;
    background: rgba(5, 7, 10, 0.78);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 20;
    padding: 0;
    animation: fade 0.15s ease-out;
  }
  #overlay .card, #wiz .card {
    background: var(--elevated);
    border-radius: var(--r-xl) var(--r-xl) 0 0;
    padding: 22px 20px calc(24px + env(safe-area-inset-bottom));
    width: 100%;
    max-width: 640px;
    border-top: 1px solid var(--line-strong);
  }
  #overlay h2 { margin: 6px 0 4px; font-size: 20px; letter-spacing: -0.01em; color: var(--strong); }
  #overlay p, #wiz p { color: var(--muted); font-size: 13.5px; margin: 6px 0 0; line-height: 1.55; }
  #overlay input, #wiz input, #wiz select { width: 100%; margin: 12px 0; }
  #overlay button { width: 100%; min-height: 48px; }
  #wiz .card { max-height: 92vh; overflow-y: auto; }
  #wiz h3 { margin: 2px 0 4px; font-size: 17px; letter-spacing: -0.01em; color: var(--strong); }
  #wiz label.pNote { display: block; margin: 4px 0; }
  #wiz .pBar { margin-top: 14px; }
  #wiz .pBar .sp { flex: 1; }
  #wiz #wizErr { color: var(--danger) !important; }

  @keyframes settle { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    #log { scroll-behavior: auto; }
    .msg, #overlay, #wiz, details.panel > summary::after { animation: none; transition: none; }
  }
  @media (max-width: 380px) {
    #chatBar button { padding: 0 8px; }
    .pRow .k { min-width: 110px; }
  }
"""

import re
m = re.search(r'<style>\n([\s\S]*?)</style>', s)
assert m, 'style block not found'
s = s[: m.start(1)] + new_css.strip() + '\n' + s[m.end(1) :]

# theme-color matches the new page root
old_meta = '<meta name="theme-color" content="#12302f" />'
assert s.count(old_meta) == 1
s = s.replace(old_meta, '<meta name="theme-color" content="#0e1015" />')

# SVG art: strokes follow the coral accent (their brand color)
s = s.replace('stroke="#f2f7f5"', 'stroke="#ff5c5c"')
s = s.replace('fill="#f2f7f5"', 'fill="#ff5c5c"')
s = s.replace('stroke="#12302f"', 'stroke="#ff5c5c"')
s = s.replace('fill="#12302f"', 'fill="#ff5c5c"')

p.write_text(s)
print('style swapped:', len(s), 'bytes')

# sanity: required tokens present, old light tokens gone
for tok in ['#0e1015', '#ff5c5c', '#d13c3c', '#14b8a6', 'var(--ring)', '--bg-accent: #13151b']:
    assert tok in s, tok
for gone in ['#eef2f0', '#0e6a5f', 'var(--tide)']:
    assert gone not in s, gone
print('token checks OK')
