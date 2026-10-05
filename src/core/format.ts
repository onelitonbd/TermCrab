/**
 * Small shared formatters. They live here so "12 min ago" is written once:
 * `docs/site.ts` (the docs page's freshness) and `core/perf.ts` (the last
 * performance measurement) both ask this function instead of each inventing a
 * slightly different phrasing for the same idea.
 */

/** `just now` / `12 min ago` / `3 h ago` / `2 d ago`. Negative or NaN: `unknown`. */
export function humanAgeMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return 'unknown';
  const s = Math.round(ms / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
