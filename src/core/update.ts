/** Release-channel update check (GitHub "latest release" tag). */

export interface UpdateCheck {
  ok: boolean;
  error?: string;
  current: string;
  latest?: string;
  updateAvailable?: boolean;
  url?: string;
}

/** Strict-ish semver compare: is a > b? (ignores pre-release tags) */
export function semverGt(a: string, b: string): boolean {
  const parse = (v: string): number[] =>
    v.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

type FetchLike = (url: string, init?: Record<string, unknown>) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/**
 * Check the repo's latest GitHub release against the running version.
 * Never throws — returns { ok:false, error } when offline/unreachable.
 */
export async function checkForUpdate(
  current: string,
  opts: { repo?: string; fetchImpl?: FetchLike; api?: string } = {},
): Promise<UpdateCheck> {
  const repo = opts.repo ?? 'onelitonbd/claw';
  const f: FetchLike = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  // 34.6: the API base is overridable for two real reasons — a mirror (GitHub
  // is not reachable everywhere) and the test suite, which points this at a
  // local server so `termcrab update` is covered end-to-end like every other
  // command instead of being the one thing nobody dares run in CI.
  const api = (opts.api ?? process.env.TCRAB_UPDATE_API ?? 'https://api.github.com').replace(/\/+$/, '');
  try {
    const res = await f(`${api}/repos/${repo}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': `termcrab/${current}` },
    });
    if (!res.ok) {
      return { ok: false, error: `GitHub answered ${res.status}`, current };
    }
    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    const latest = (data.tag_name || '').replace(/^v/, '');
    if (!latest) return { ok: false, error: 'no release tag found', current };
    return {
      ok: true,
      current,
      latest,
      updateAvailable: semverGt(latest, current),
      url: data.html_url,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      // Node's raw message means nothing to a human — say what actually happened.
      error: msg === 'fetch failed' ? 'no internet connection' : msg,
      current,
    };
  }
}

/** Plain-English CLI output for `termcrab update`. */
export function renderUpdate(check: UpdateCheck): string {
  if (!check.ok) {
    return [
      `Couldn't check for updates (${check.error}).`,
      `  → That's usually just no internet — you're fine running v${check.current}.`,
      `  → Try again later: termcrab update`,
    ].join('\n');
  }
  if (!check.updateAvailable) {
    return `✅ You're on the latest version (v${check.current}).`;
  }
  return [
    `⬆️  Version ${check.latest} is available (you have ${check.current}).`,
    `  → Upgrade: click Auto update in the web Status screen (it installs and restarts by itself),`,
    `     or by hand: git pull && npm install`,
    check.url ? `  → Details: ${check.url}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
