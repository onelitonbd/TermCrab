/**
 * Telegram markdown rendering (zero dependencies).
 *
 * The agent writes markdown the way the web panel renders it, but Telegram's
 * HTML parse mode only understands a tiny tag set (b, i, u, s, code, pre, a,
 * blockquote...). This module translates markdown into exactly those tags,
 * escaping all literal text so a reply can never fail Telegram's entity parser.
 */

/** Escape for Telegram HTML parse mode (moved here so the converter and the
 *  channel share one definition; re-exported from telegram.ts for callers). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Quotes are not escaped by escapeHtml; attribute values need them too. */
function escapeQuoted(s: string): string {
  return s.replace(/"/g, '&quot;');
}

/** Inline markdown -> Telegram HTML (input is raw text; output is escaped). */
function inlineToHtml(src: string): string {
  let s = escapeHtml(src);
  const store: string[] = [];
  const keep = (html: string): string => {
    store.push(html);
    return `\u0000${store.length - 1}\u0000`;
  };
  const emph = (t: string): string =>
    t
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, '<i>$1</i>')
      .replace(/(?<![\w])__([^_]+)__(?![\w])/g, '<b>$1</b>')
      .replace(/(?<![\w])_([^_\n]+)_(?![\w])/g, '<i>$1</i>')
      .replace(/~~([^~]+)~~/g, '<s>$1</s>');

  // inline code first - its content stays literal for every later rule
  s = s.replace(/`([^`]+)`/g, (_m, c: string) => keep(`<code>${c}</code>`));

  // [text](http(s)://...) - only safe schemes become links
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, t: string, url: string) =>
    keep(`<a href="${escapeQuoted(url)}">${emph(t)}</a>`),
  );

  // bare urls (placeholders above keep earlier links/code untouched)
  s = s.replace(/https?:\/\/[^\s<>"`]+/g, (m) => {
    const trail = m.match(/[.,;!?)\]}'"]+$/)?.[0] ?? '';
    const core = trail ? m.slice(0, -trail.length) : m;
    if (!core.includes('://')) return m;
    return keep(`<a href="${core}">${core}</a>`) + trail;
  });

  return emph(s).replace(/\u0000(\d+)\u0000/g, (_m, i: string) => store[Number(i)] ?? '');
}

/**
 * Translate markdown into Telegram-HTML. Line-based and forgiving:
 * unclosed fences close, unknown syntax passes through as escaped text.
 */
export function mdToTelegramHtml(md: string): string {
  const text = String(md ?? '')
    .replace(/\r\n?/g, '\n')
    // strip control chars so the \u0000 placeholder channel can never collide
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // fenced code block
    const fence = line.match(/^\s*(```+|~~~+)\s*([A-Za-z0-9_+#.-]*)\s*$/);
    if (fence) {
      const kind = fence[1]![0] === '`' ? '```' : '~~~';
      const lang = fence[2] || '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trimStart().startsWith(kind)) {
        body.push(lines[i]!);
        i++;
      }
      if (i < lines.length) i++; // consume closing fence (or run off the end)
      const inner = escapeHtml(body.join('\n'));
      out.push(
        lang ? `<pre><code class="language-${escapeHtml(lang)}">${inner}</code></pre>` : `<pre>${inner}</pre>`,
      );
      continue;
    }

    // heading -> bold line (Telegram has no heading tags)
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      out.push(`<b>${inlineToHtml(h[2]!.trim())}</b>`);
      i++;
      continue;
    }

    // horizontal rule -> drawn bar
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('\u2015\u2015\u2015\u2015\u2015\u2015\u2015\u2015\u2015\u2015\u2015\u2015');
      i++;
      continue;
    }

    // blockquote block
    if (/^\s*>\s?/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i]!)) {
        inner.push(lines[i]!.replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inner.map(inlineToHtml).join('\n')}</blockquote>`);
      continue;
    }

    // table block -> monospace pre (Telegram cannot render tables)
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1]!)) {
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]!)) {
        rows.push(lines[i]!);
        i++;
      }
      out.push(`<pre>${escapeHtml(rows.join('\n'))}</pre>`);
      continue;
    }

    // unordered list
    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ul) {
      out.push(`\u2022 ${inlineToHtml(ul[1]!)}`);
      i++;
      continue;
    }

    // ordered list
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ol) {
      out.push(`${ol[1]}. ${inlineToHtml(ol[2]!)}`);
      i++;
      continue;
    }

    // blank line (collapsed to a single separator)
    if (!line.trim()) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      i++;
      continue;
    }

    out.push(inlineToHtml(line));
    i++;
  }

  while (out.length && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}
