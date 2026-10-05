/**
 * "When this happens, do that" (24.2)
 *
 * OpenClaw's event triggers are part of its protocol: something happens in the
 * system and agents are woken without anyone calling an endpoint. We already
 * had the opposite direction — inbound webhooks, where an *external* service
 * POSTs to `/api/hooks/:id` — and we already emit everything interesting onto
 * the in-process bus. What was missing was the wiring: a hook may now name the
 * events it listens for, and the gateway turns those bus events into the same
 * queued turn a webhook would have produced.
 *
 * The rule is deliberately small and readable:
 *
 *   `on: ['run.failed']`     exactly that event
 *   `on: ['device.*']`       anything in the device family
 *   `on: ['*']`              everything (think twice)
 *   no `on`                  never fires by itself (webhook only, as before)
 *
 * Two safety rules come with it, because an agent that can wake itself is a
 * loop waiting to happen: a hook is never woken by an event its own session
 * produced, and each hook has a cooldown. Both live here so the gateway and
 * any future surface decide the same way.
 */

/** Every event the gateway can fire today, with what it means. */
export const KNOWN_EVENTS: { name: string; what: string }[] = [
  { name: 'run.failed', what: 'a turn ended with an error (the provider failed, a tool blew up)' },
  { name: 'run.start', what: 'a turn started (lifecycle: after the fact, a hook cannot block the turn)' },
  { name: 'run.end', what: 'a turn finished (payload has iterations; costUsd when a price is known)' },
  { name: 'session.reset', what: 'a conversation started over (the transcript is archived, not deleted)' },
  { name: 'device.paired', what: 'a phone or tablet redeemed a pairing code and now has its own token' },
  { name: 'file.received', what: 'a file, photo or voice note arrived in the inbox' },
  { name: 'file.changed', what: 'a watched file or folder changed (see config watchers)' },
  { name: 'cron.finished', what: 'a scheduled job finished (payload has ok: true/false)' },
];

export interface TriggerHook {
  id: string;
  prompt: string;
  /** Event names or patterns; absent/empty means the hook is webhook-only. */
  on?: string[];
}

/**
 * A folder (or file) the gateway watches: when something under it changes, the
 * `file.changed` event fires and any hook listening for it wakes. This is the
 * watcher a phone needs — "when a file lands here, look at it" — without a
 * rule language: the path is the rule.
 */
export interface WatcherConfig {
  id: string;
  /** Absolute path, or `~/…`; a relative path is resolved against the workspace. */
  path: string;
  /** Optional glob-ish suffix filter, e.g. `.pdf` or `.jpg,.png`. */
  match?: string;
  /** Debounce in milliseconds (default 1500) so one save is not five events. */
  debounceMs?: number;
}

export interface TriggerPayload {
  event: string;
  /** Session that caused the event, when known (used for the self-loop guard). */
  fromSession?: string;
  data?: Record<string, unknown>;
}

/** Does one pattern match this event? `*` and `family.*` are the only magic. */
export function patternMatches(pattern: string, event: string): boolean {
  const p = (pattern ?? '').trim();
  if (!p) return false;
  if (p === '*') return true;
  if (p === event) return true;
  if (p.endsWith('.*')) return event.startsWith(p.slice(0, -1));
  return false;
}

export function matchesEvent(patterns: string[], event: string): boolean {
  return (patterns ?? []).some((p) => patternMatches(p, event));
}

/** The session id an event-triggered turn runs in (same lane as its webhook). */
export function triggerSession(hookId: string): string {
  return `hook:${hookId}`;
}

export interface TriggerDecision {
  hook: TriggerHook;
  /** Why it did not fire, when it did not. */
  skipped?: 'self' | 'cooldown';
}

/**
 * Which hooks should fire for this event, and why the others should not.
 * Pure: the caller supplies the last-fired stamps and does the submitting, so
 * a test can check the rules without a running gateway.
 */
export function planTriggers(
  hooks: TriggerHook[],
  payload: TriggerPayload,
  opts: { now?: number; lastFired?: Map<string, number>; cooldownMs?: number } = {},
): TriggerDecision[] {
  const now = opts.now ?? Date.now();
  const cooldownMs = opts.cooldownMs ?? 60_000;
  const lastFired = opts.lastFired ?? new Map<string, number>();
  const out: TriggerDecision[] = [];
  for (const hook of hooks ?? []) {
    if (!hook?.id || !hook.on?.length) continue;
    if (!matchesEvent(hook.on, payload.event)) continue;
    // An agent that failed and would be woken by its own failure runs forever.
    if (payload.fromSession === triggerSession(hook.id)) {
      out.push({ hook, skipped: 'self' });
      continue;
    }
    const last = lastFired.get(hook.id);
    if (last !== undefined && now - last < cooldownMs) {
      out.push({ hook, skipped: 'cooldown' });
      continue;
    }
    out.push({ hook });
  }
  return out;
}

/** Does a changed path interest this watcher? (`match` is a comma list of suffixes.) */
export function watcherMatches(watcher: WatcherConfig, changedPath: string): boolean {
  const match = (watcher.match ?? '').trim();
  if (!match) return true;
  const name = changedPath.slice(changedPath.lastIndexOf('/') + 1).toLowerCase();
  return match
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean)
    .some((suffix) => name.endsWith(suffix.startsWith('.') ? suffix : `.${suffix}`));
}

/** The message an event-triggered turn carries — the same shape as a webhook. */
export function triggerMessage(hook: TriggerHook, payload: TriggerPayload): string {
  const body = JSON.stringify(payload.data ?? {}).slice(0, 4000);
  return `[event:${payload.event}] ${hook.prompt}\n\nEvent: ${payload.event}\nPayload: ${body}`;
}

/** One line for the log and for `termcrab events`. */
export function describeTrigger(hook: TriggerHook, payload: TriggerPayload, skipped?: string): string {
  return skipped
    ? `event ${payload.event} -> hook ${hook.id} skipped (${skipped})`
    : `event ${payload.event} -> hook ${hook.id} queued`;
}
