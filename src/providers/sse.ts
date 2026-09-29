/** Incremental Server-Sent Events parser (shared by provider streaming). */

/**
 * Iterate SSE `data:` payloads from a fetch Response body.
 * Handles chunk boundaries, \r\n normalization, comment/field lines.
 */
export async function* sseData(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const data = extractData(block);
        if (data !== null) yield data;
      }
    }
    buf = buf.replace(/\r\n/g, '\n');
    if (buf.trim()) {
      const data = extractData(buf);
      if (data !== null) yield data;
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

function extractData(block: string): string | null {
  const dataLines: string[] = [];
  for (const rawLine of block.split('\n')) {
    if (!rawLine.startsWith('data:')) continue;
    let payload = rawLine.slice(5);
    if (payload.startsWith(' ')) payload = payload.slice(1);
    dataLines.push(payload);
  }
  if (!dataLines.length) return null;
  return dataLines.join('\n');
}

/** Parse a single SSE-encoded body (tests / non-incremental use). */
export function parseSseText(text: string): string[] {
  const out: string[] = [];
  const normalized = text.replace(/\r\n/g, '\n');
  for (const block of normalized.split('\n\n')) {
    const data = extractData(block);
    if (data !== null) out.push(data);
  }
  return out;
}
