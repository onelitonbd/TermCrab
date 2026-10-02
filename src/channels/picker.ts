/**
 * Telegram provider/model picker (v0.29.0).
 *
 * Lets you choose the provider endpoint and the model from inside the chat:
 *   /provider           - list saved endpoints, mark the one in use
 *   /provider 2         - switch (also accepts the name or id)
 *   /model              - list models of the active endpoint (saved + live catalog)
 *   /model 1            - switch (picks by number, exact id, or unique substring)
 *
 * Replies are markdown - the telegram channel translates them for delivery.
 * Every switch persists through saveConfig, so it survives restarts.
 *
 * All endpoints speak the OpenAI Chat Completions API (OpenAI, OpenRouter,
 * Groq, DeepSeek, xAI, Mistral, Ollama /v1, vLLM, llama.cpp, …).
 */
import { Config, ProviderEntry, saveConfig, DEFAULT_MODEL_HINTS } from '../core/config.js';
import { activeBaseUrl, activeLabel, fetchProviderModels, providerOutboundKey } from '../gateway/provider-helpers.js';

/** True when no provider has been configured yet (setup needed). */
function isUnconfigured(cfg: Config): boolean {
  if (cfg.providers.some((p) => p.keys.length)) return false;
  return !cfg.provider.apiKey;
}

/** The saved provider the gateway is currently talking to (null when no saved entry matches). */
export function matchActiveEntry(cfg: Config): ProviderEntry | null {
  const activeBase = activeBaseUrl(cfg.provider);
  if (!activeBase || isUnconfigured(cfg)) return null;
  const activeKey = cfg.provider.apiKey || '';
  const keyed = cfg.providers.filter(
    (p) => p.baseUrl === activeBase && activeKey && p.keys.some((k) => k.key === activeKey),
  );
  if (keyed.length) return keyed[0]!;
  return cfg.providers.find((p) => p.baseUrl === activeBase) ?? null;
}

function usingLine(cfg: Config): string {
  if (isUnconfigured(cfg)) return 'No provider configured yet - add one in the web panel, or run `termcrab onboard`.';
  const base = activeBaseUrl(cfg.provider);
  const entry = matchActiveEntry(cfg);
  const name = entry ? entry.name : activeLabel(cfg.provider, base);
  return `Using: **${name}**${base ? ` (${base})` : ''}`;
}

export function providerMenu(cfg: Config): string {
  const lines: string[] = ['**Provider endpoint**', '', usingLine(cfg), ''];
  if (!cfg.providers.length) {
    lines.push('No endpoints saved yet - add one in the web panel, then run `/provider` again.');
    return lines.join('\n');
  }
  const active = matchActiveEntry(cfg);
  cfg.providers.forEach((p, i) => {
    const keys = p.keys.length ? `${p.keys.length} key${p.keys.length > 1 ? 's' : ''}` : 'no key saved';
    const n = (p.models || []).length;
    const models = n ? `${n} model${n > 1 ? 's' : ''}` : 'no models yet';
    const now = active && active.id === p.id ? ' - current' : '';
    lines.push(`${i + 1}. **${p.name}** - ${keys}, ${models}${now}`);
  });
  lines.push('', 'Reply `/provider 2` or `/provider OpenRouter` to switch.');
  return lines.join('\n');
}

function resolveEntry(cfg: Config, arg: string): ProviderEntry | { error: string } {
  const a = arg.trim();
  if (!a) return { error: 'Tell me which one: a number, a name, or an id.' };
  if (/^\d+$/.test(a)) {
    const p = cfg.providers[Number(a) - 1];
    if (!p) return { error: `There is no endpoint #${a} - the list has ${cfg.providers.length}.` };
    return p;
  }
  const byId = cfg.providers.find((p) => p.id === a);
  if (byId) return byId;
  const lower = a.toLowerCase();
  const exact = cfg.providers.filter((p) => p.name.toLowerCase() === lower);
  if (exact.length === 1) return exact[0]!;
  const partial = cfg.providers.filter((p) => p.name.toLowerCase().includes(lower));
  if (partial.length === 1) return partial[0]!;
  if (partial.length > 1) {
    return { error: `Several endpoints match "${a}": ${partial.map((p) => p.name).join(', ')}. Use the number instead.` };
  }
  return { error: `No endpoint matches "${a}".` };
}

export function providerSelect(cfg: Config, arg: string): string {
  const got = resolveEntry(cfg, arg);
  if ('error' in got) return `${got.error}\n\n${providerMenu(cfg)}`;
  const p = got;
  const key = providerOutboundKey(p, cfg);
  if (!key && activeBaseUrl(cfg.provider) !== p.baseUrl) {
    return `**${p.name}** has no API key saved.\n\nAdd one in the web panel (Providers page), then try again.`;
  }
  const current = cfg.provider.model || '';
  const saved = p.models || [];
  const keepCurrent = saved.includes(current);
  const model = keepCurrent
    ? current
    : saved[0] || DEFAULT_MODEL_HINTS.openai || current;
  cfg.provider = { type: 'openai', baseUrl: p.baseUrl, apiKey: key || cfg.provider.apiKey || '', model };
  saveConfig(cfg);
  const modelLine = saved.length
    ? `Model: \`${model || 'none'}\``
    : 'No models saved on this endpoint yet - run `/model` to fetch its catalog.';
  return `Switched to **${p.name}** (${p.baseUrl}).\n\n${modelLine}\n\nChange the model any time with \`/model\`.`;
}

/** Saved-model choices, then live catalog extras (only fetched when nothing is saved). */
function modelChoices(cfg: Config, fetched: string[] | null): { choices: string[]; fresh: string[] } {
  const entry = matchActiveEntry(cfg);
  const saved = entry ? entry.models || [] : [];
  const fresh = (fetched || []).filter((m) => !saved.includes(m));
  return { choices: [...saved, ...fresh], fresh };
}

export function modelMenu(cfg: Config, fetched: string[] | null): string {
  const lines: string[] = ['**Model**', ''];
  if (isUnconfigured(cfg)) {
    lines.push('No provider configured yet - add one with `/provider` or in the web panel to pick a model.');
    return lines.join('\n');
  }
  const entry = matchActiveEntry(cfg);
  const current = cfg.provider.model || '';
  const { choices, fresh } = modelChoices(cfg, fetched);
  lines.push(`Using: \`${current || 'none'}\``, '');
  if (!choices.length) {
    lines.push(
      entry
        ? `No models saved for **${entry.name}** yet, and the live catalog could not be fetched.`
        : 'No models available for the current setup.',
      '',
      'Reply with `/model <model-id>` directly, or save models in the web panel.',
    );
    return lines.join('\n');
  }
  const cap = 30;
  choices.slice(0, cap).forEach((m, i) => {
    const marks = [m === current ? ' - current' : '', fresh.includes(m) ? ' - new' : ''].join('');
    lines.push(`${i + 1}. \`${m}\`${marks}`);
  });
  if (choices.length > cap) lines.push(`... and ${choices.length - cap} more - use the exact id.`);
  if (fresh.length) lines.push('', 'Models marked new come from the live catalog and get saved when you pick them.');
  lines.push('', choices.length > 1 ? 'Reply `/model 2` or `/model <model-id>` to switch.' : 'Reply `/model <model-id>` to switch.');
  return lines.join('\n');
}

export function modelSelect(cfg: Config, arg: string, fetched: string[] | null): string {
  if (isUnconfigured(cfg)) {
    return 'No provider configured - run `/provider` first.';
  }
  const entry = matchActiveEntry(cfg);
  const { choices } = modelChoices(cfg, fetched);
  const a = arg.trim();
  let model = '';
  if (/^\d+$/.test(a)) {
    model = choices[Number(a) - 1] || '';
    if (!model) return `No model #${a} - the list has ${choices.length}.\n\n${modelMenu(cfg, fetched)}`;
  } else {
    model =
      choices.find((m) => m === a) ||
      choices.find((m) => m.toLowerCase() === a.toLowerCase()) ||
      '';
    if (!model) {
      const partial = choices.filter((m) => m.toLowerCase().includes(a.toLowerCase()));
      if (partial.length === 1) model = partial[0]!;
      else if (partial.length > 1) {
        return `Several models match "${a}": ${partial.slice(0, 5).map((m) => '`' + m + '`').join(', ')}. Use the number or the exact id.`;
      }
    }
    // built-in endpoint (no saved entry): accept any exact id the user types
    if (!model && !entry && a.length <= 200) model = a;
    if (!model) return `No model matches "${a}".\n\n${modelMenu(cfg, fetched)}`;
  }

  if (entry) {
    if (!(entry.models || []).includes(model)) {
      entry.models ||= [];
      entry.models.push(model);
      entry.models.sort();
    }
    const key = providerOutboundKey(entry, cfg);
    cfg.provider = { type: 'openai', baseUrl: entry.baseUrl, apiKey: key || cfg.provider.apiKey || '', model };
    saveConfig(cfg);
    return `Now chatting with **${entry.name}** on \`${model}\`.\n\nYour next message will use it.`;
  }
  // Built-in endpoint wired directly (no saved entry) - switch the model only.
  cfg.provider.model = model;
  saveConfig(cfg);
  return `Model set to \`${model}\` on **${activeLabel(cfg.provider, activeBaseUrl(cfg.provider))}**.`;
}

/**
 * Catalog for the active endpoint. Returns [] fast when models are already
 * saved (no remote call), the live catalog when nothing is saved, or null when
 * it cannot be fetched (no key, offline).
 */
export async function liveCatalog(cfg: Config): Promise<string[] | null> {
  const entry = matchActiveEntry(cfg);
  if (entry) {
    if ((entry.models || []).length) return [];
    const key = providerOutboundKey(entry, cfg);
    if (!key) return null;
    try {
      return await fetchProviderModels(entry, key);
    } catch {
      return null;
    }
  }
  if (isUnconfigured(cfg)) return null;
  const base = activeBaseUrl(cfg.provider);
  if (!base) return null;
  try {
    return await fetchProviderModels(
      {
        id: '_live',
        name: 'active',
        baseUrl: base,
        keys: [{ id: 'k', name: 'active', key: cfg.provider.apiKey || '', created: 0 }],
        models: [],
        created: 0,
      },
      cfg.provider.apiKey || '',
    );
  } catch {
    return null;
  }
}
