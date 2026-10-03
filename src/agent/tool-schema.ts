/**
 * Check a tool call's arguments before the tool runs (22.2).
 *
 * Tools used to hand-parse their arguments (`str(args, 'path')` and friends),
 * which meant a model that sent `{"path": 42}` or forgot `path` entirely found
 * out through a stack trace — or, worse, through a tool that quietly did
 * something else. Every tool already *declares* a JSON schema (the provider
 * needs it), so this module reads that declaration and answers with a sentence
 * a small model can act on: "expected `path` (string) — got number".
 *
 * Only the subset of JSON Schema the tools actually use is enforced:
 * `type`, `required`, `properties`, `items`, `enum` (and `integer` for
 * numbers). Unknown extra keys are allowed: the schema is about the shape of
 * what a tool needs, not a wall against a chatty model.
 */

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  description?: string;
  default?: unknown;
}

export interface ValidationOk {
  ok: true;
  value: Record<string, unknown>;
}
export interface ValidationFail {
  ok: false;
  errors: string[];
}
export type Validation = ValidationOk | ValidationFail;

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function checkValue(schema: JsonSchema, value: unknown, where: string, errors: string[]): void {
  if (value === undefined) return;
  const want = schema.type;
  if (want) {
    const got = typeName(value);
    const numberOk = want === 'number' && got === 'number';
    const integerOk = want === 'integer' && got === 'number' && Number.isInteger(value);
    if (got !== want && !numberOk && !integerOk) {
      errors.push(`${where} must be ${article(want)} ${want} — got ${got}`);
      return;
    }
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((v) => v === value)) {
    errors.push(`${where} must be one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')} — got ${JSON.stringify(value)}`);
    return;
  }
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, i) => checkValue(schema.items!, item, `${where}[${i}]`, errors));
  }
  if (schema.type === 'object' && schema.properties && value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (obj[key] !== undefined) checkValue(sub, obj[key], `${where}.\`${key}\``, errors);
    }
  }
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** The whole check: required fields first, then the type of everything sent. */
export function validateArgs(schema: unknown, args: unknown): Validation {
  if (!schema || typeof schema !== 'object') return { ok: true, value: (args ?? {}) as Record<string, unknown> };
  const s = schema as JsonSchema;
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return { ok: false, errors: [`arguments must be a JSON object — got ${typeName(args)}`] };
  }
  const value = args as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of s.required ?? []) {
    if (value[key] === undefined || value[key] === null || value[key] === '') {
      const sub = s.properties?.[key];
      errors.push(`missing required \`${key}\`${sub?.type ? ` (${sub.type})` : ''}`);
    }
  }
  for (const [key, sub] of Object.entries(s.properties ?? {})) {
    if (value[key] !== undefined) checkValue(sub, value[key], `\`${key}\``, errors);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** One line per problem, prefixed so the model knows what to do next. */
export function formatArgErrors(tool: string, errors: string[]): string {
  const lines = errors.length === 1 ? errors[0] : errors.join('; ');
  return `[bad arguments for ${tool}] ${lines}. Send the call again with the corrected arguments.`;
}

/**
 * Wrap a tool's `execute` so the schema is enforced once, for every caller:
 * the agent loop, the panel, a test, a future TUI. A failed call returns the
 * sentence as its result (the model sees it as tool output) instead of
 * throwing, because a stack trace teaches the model nothing.
 */
export function guardToolExecute<T extends { def: { name: string; schema?: unknown }; execute(args: Record<string, unknown>): Promise<string> }>(
  tool: T,
): T {
  const original = tool.execute.bind(tool);
  tool.execute = async (args: Record<string, unknown>): Promise<string> => {
    const checked = validateArgs(tool.def.schema, args ?? {});
    if (!checked.ok) return formatArgErrors(tool.def.name, checked.errors);
    return original(checked.value);
  };
  return tool;
}
