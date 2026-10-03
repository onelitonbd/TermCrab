import { Usage } from '../providers/types.js';

/**
 * Approximate list prices, per 1,000,000 tokens.
 *
 * These are a *snapshot*, not a live quote: providers change prices, add
 * discounts and route models differently. That is why every surface that shows
 * a cost also shows `PRICING_AS_OF` (or says "price unknown"), and why a
 * configured price always wins over this table. No number is ever invented —
 * when nothing matches and nothing is configured, `computeCost` returns
 * `undefined` and the caller reports tokens only.
 */
export const PRICING_AS_OF = '2025-06';

export interface PriceOverride {
  priceInPerM?: number;
  priceOutPerM?: number;
}

interface Price {
  inPerM: number;
  outPerM: number;
}

/** `[^\d]`-safe matchers, most specific first. */
const TABLE: { match: RegExp; price: Price }[] = [
  { match: /gpt-4o-mini/i, price: { inPerM: 0.15, outPerM: 0.6 } },
  { match: /gpt-4\.1-mini/i, price: { inPerM: 0.4, outPerM: 1.6 } },
  { match: /gpt-4\.1-nano/i, price: { inPerM: 0.1, outPerM: 0.4 } },
  { match: /gpt-4\.1/i, price: { inPerM: 2, outPerM: 8 } },
  { match: /gpt-4o/i, price: { inPerM: 2.5, outPerM: 10 } },
  { match: /o3-mini/i, price: { inPerM: 1.1, outPerM: 4.4 } },
  { match: /o4-mini/i, price: { inPerM: 1.1, outPerM: 4.4 } },
  { match: /claude.*opus/i, price: { inPerM: 15, outPerM: 75 } },
  { match: /claude.*sonnet/i, price: { inPerM: 3, outPerM: 15 } },
  { match: /claude.*haiku/i, price: { inPerM: 0.8, outPerM: 4 } },
  { match: /gemini-2\.5-pro/i, price: { inPerM: 1.25, outPerM: 10 } },
  { match: /gemini-2\.5-flash/i, price: { inPerM: 0.3, outPerM: 2.5 } },
  { match: /deepseek-reasoner/i, price: { inPerM: 0.55, outPerM: 2.19 } },
  { match: /deepseek-chat/i, price: { inPerM: 0.27, outPerM: 1.1 } },
  { match: /llama-3\.3-70b/i, price: { inPerM: 0.59, outPerM: 0.79 } },
];

/** The price used for a model, or null when this client has no idea. */
export function priceFor(model: string, override: PriceOverride = {}): Price | null {
  if (typeof override.priceInPerM === 'number' || typeof override.priceOutPerM === 'number') {
    return { inPerM: override.priceInPerM ?? 0, outPerM: override.priceOutPerM ?? 0 };
  }
  const hit = TABLE.find((t) => t.match.test(model));
  return hit ? hit.price : null;
}

/**
 * Cost in USD for one usage record, or `undefined` when the model is neither in
 * the snapshot nor priced in config. Rounded to 6 decimals (a fraction of a
 * cent is the smallest unit anyone can act on).
 */
export function computeCost(model: string, usage: Usage, override: PriceOverride = {}): number | undefined {
  const price = priceFor(model, override);
  if (!price) return undefined;
  const cost = (usage.promptTokens / 1_000_000) * price.inPerM + (usage.completionTokens / 1_000_000) * price.outPerM;
  return Number(cost.toFixed(6));
}
