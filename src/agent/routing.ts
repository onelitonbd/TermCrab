/**
 * Which agent answers on which surface (33.2).
 *
 * A named agent is a folder with a SOUL.md; addressing one was a prefix
 * (`@coder …`) or a flag (`--as coder`). That is fine when the owner is typing,
 * but a Telegram message, a cron job and a web chat had no way to say "this one
 * goes to the researcher" — so a multi-agent setup only worked if you typed the
 * prefix every single time.
 *
 * `agents.routes` is that missing sentence, in config where it can be read:
 *
 *   { "agents": { "routes": { "telegram": "crabby", "cli": "coder", "cron": "briefer" } } }
 *
 * Precedence is deliberately small and stated: an explicit `--as`/`@prefix`
 * wins, then the route for that surface, then the main agent. An unknown agent
 * name in config is *reported*, not silently ignored (the turn still runs as
 * the main agent, and the reason is in the log and in `termcrab agents routes`).
 */
import type { Config } from '../core/config.js';

/** Surfaces a route can name. Anything else falls back to the default agent. */
export const ROUTABLE_SURFACES = ['web', 'telegram', 'whatsapp', 'cli', 'cron', 'voice', 'wake', 'subagent'] as const;
export type RoutableSurface = (typeof ROUTABLE_SURFACES)[number];

const NAME_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;

export interface RouteEntry {
  surface: string;
  /** Agent the surface routes to, or null for the main agent. */
  agent: string | null;
  /** Where the decision came from. */
  source: 'config' | 'default';
  /** Set when config names something that is not a known agent. */
  problem?: string;
}

interface AgentsCfg {
  routes?: Record<string, string>;
}

function routes(cfg: Config): Record<string, string> {
  const agents = (cfg as { agents?: AgentsCfg }).agents;
  const raw = agents?.routes;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'string') continue;
    const name = v.trim().toLowerCase();
    if (name) out[k.trim().toLowerCase()] = name;
  }
  return out;
}

/**
 * The agent for a surface, with the reason. `known` is the list of agents that
 * actually exist on disk (`listAgents()`); pass it to have a route naming a
 * missing agent reported instead of applied.
 */
export function resolveRoute(
  cfg: Config,
  surface: string | undefined,
  opts: { explicit?: string | null; known?: string[] } = {},
): RouteEntry {
  const s = (surface ?? '').toLowerCase();
  const table = routes(cfg);
  const configured = s ? table[s] : undefined;
  const known = opts.known;

  const explicit = opts.explicit ? opts.explicit.trim().toLowerCase() : '';
  if (explicit && NAME_RE.test(explicit)) {
    if (known && known.length && !known.includes(explicit)) {
      return { surface: s || '(none)', agent: null, source: 'default', problem: `unknown agent "@${explicit}" — the main agent answered` };
    }
    return { surface: s || '(none)', agent: explicit, source: 'config' };
  }

  if (!configured) return { surface: s || '(none)', agent: null, source: 'default' };
  if (!NAME_RE.test(configured)) {
    return { surface: s || '(none)', agent: null, source: 'config', problem: `agents.routes.${s} is not a valid agent name: ${JSON.stringify(configured)}` };
  }
  if (known && known.length && !known.includes(configured)) {
    return {
      surface: s || '(none)',
      agent: null,
      source: 'config',
      problem: `agents.routes.${s} names "@${configured}", which has no workspace/agents/${configured}/SOUL.md — the main agent answered`,
    };
  }
  return { surface: s || '(none)', agent: configured, source: 'config' };
}

/** The whole table for `termcrab agents routes` and `GET /api/agents`. */
export function routeTable(cfg: Config, known: string[] = []): RouteEntry[] {
  const table = routes(cfg);
  const surfaces = [...new Set([...ROUTABLE_SURFACES, ...Object.keys(table)])];
  return surfaces.map((s) => resolveRoute(cfg, s, { known }));
}

/** Set or clear one route in the config object (the caller persists it). */
export function setRoute(cfg: Config, surface: string, agent: string | null): void {
  const s = surface.trim().toLowerCase();
  const agents = ((cfg as { agents?: AgentsCfg }).agents ??= {});
  const table = (agents.routes ??= {});
  if (agent === null || agent === '') delete table[s];
  else table[s] = agent.trim().toLowerCase();
}
