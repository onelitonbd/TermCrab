/**
 * Turn raw failures into sentences a non-coder can act on.
 * Rule: headline says WHAT happened, fix says WHAT TO DO.
 */

export interface Friendly {
  headline: string;
  fix: string;
}

export function friendlyError(err: unknown): Friendly {
  const raw = err instanceof Error ? `${err.message}` : String(err);
  const msg = err instanceof Error && err.stack ? err.stack : raw;
  // Node wraps network failures: the real reason often lives in err.cause.
  const cause = (err as { cause?: unknown } | null)?.cause;
  const causeCode =
    cause && typeof cause === 'object' && 'code' in cause
      ? String((cause as { code?: unknown }).code ?? '')
      : '';
  const causeMsg = cause instanceof Error ? cause.message : '';
  const all = `${msg} ${raw} ${causeCode} ${causeMsg}`;
  const e =
    (err as { code?: string } | null)?.code ||
    (/ECONNREFUSED/.test(causeCode) ? 'ECONNREFUSED' : '') ||
    (/ENOTFOUND|EAI_AGAIN/.test(causeCode) ? causeCode : '');

  if (e === 'ECONNREFUSED' || /ECONNREFUSED/.test(all)) {
    const where = all.match(/(https?:\/\/[^\s)]+|127\.0\.0\.1:\d+|localhost:\d+)/)?.[1];
    return {
      headline: where
        ? `Can't reach the service at ${where} — it's not running.`
        : "Can't reach the service — it's not running.",
      fix: 'If you use a local model, start it first (llama-server / ollama serve). Otherwise check your Brain address in Settings. `termcrab doctor` verifies this.',
    };
  }
  if (/bad port/i.test(all)) {
    return {
      headline: 'The Brain address has an invalid port number.',
      fix: 'Check the port in Settings → Brain address (ports like 22 or 9 are blocked). Common safe ports: 8080, 11434, 7788.',
    };
  }
  if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_VERIFY_LEAF|self.signed|SELF.SIGNED/.test(all)) {
    return {
      headline: "The connection isn't fully trusted (network security/proxy).",
      fix: 'A school/company Wi-Fi or VPN may be inspecting traffic. Try different network, or disable TLS inspection for api.github.com / your AI provider.',
    };
  }
  if (e === 'ENOTFOUND' || e === 'EAI_AGAIN' || /ENOTFOUND|EAI_AGAIN|getaddrinfo/.test(all)) {
    return {
      headline: 'No internet connection (the address could not be found).',
      fix: 'Check Wi-Fi/mobile data. To play offline: termcrab config set provider.type mock',
    };
  }
  if (/401|403|invalid.?api.?key|incorrect api key|authentication|unauthorized|invalid x-api-key/i.test(all)) {
    return {
      headline: 'The AI service rejected your password (API key).',
      fix: 'Update it: termcrab config set provider.apiKey <your key>  (or fix "Brain password" in Settings → Save)',
    };
  }
  if (/429|rate.?limit|too many requests/i.test(all)) {
    return {
      headline: 'The AI service is busy (rate limit).',
      fix: 'Wait a minute and try again. If it keeps happening, your plan may be out of quota.',
    };
  }
  if (e === 'EADDRINUSE' || /EADDRINUSE|port .* in use|already in use/i.test(all)) {
    return {
      headline: 'That network port is already in use.',
      fix: 'Another TermCrab may already be running — or pick a different port: termcrab gateway --port 7799',
    };
  }
  if (e === 'EACCES' || e === 'EPERM' || /EACCES|EPERM|permission denied/i.test(all)) {
    return {
      headline: 'Permission denied — a file or folder blocked us.',
      fix: 'Check the file permissions, or run from your own home folder.',
    };
  }
  if ((e === 'ENOENT' || /ENOENT/.test(causeCode)) && /termux-/.test(all)) {
    const tool = all.match(/termux-[\w-]+/)?.[0] ?? 'termux tool';
    return {
      headline: `Missing phone tool: ${tool}.`,
      fix: 'Install it: pkg install termux-api  (and the Termux:API app from F-Droid)',
    };
  }
  if (/Cannot find module/.test(all)) {
    const mod = all.match(/Cannot find module '([^']+)'/)?.[1] ?? 'a dependency';
    return {
      headline: `Something isn't installed: ${mod}.`,
      fix: 'Run: npm install   (inside the claw folder), then try again.',
    };
  }
  if (/out of memory|heap out of memory/i.test(all)) {
    return {
      headline: 'Ran out of memory.',
      fix: 'Close other apps / restart Termux. For very long chats, use: termcrab agent  then /new to start fresh.',
    };
  }
  if (/^fetch failed|\bfetch failed\b/i.test(all)) {
    return {
      headline: 'The connection to the service failed.',
      fix: 'Check your internet and the Brain address in Settings. If you use a local model, start it first. `termcrab doctor` verifies this.',
    };
  }
  return {
    headline: raw.split('\n')[0] || 'Something went wrong.',
    fix: 'Run: termcrab doctor   — it finds problems and tells you how to fix them.',
  };
}
