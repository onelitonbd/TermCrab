/**
 * Minimal, dependency-free YAML frontmatter parser.
 * Supports: scalar values, quoted strings, numbers, booleans, inline arrays,
 * and simple block lists ("- item"). Enough for SKILL.md / SOUL.md documents.
 */

export interface Frontmatter {
  data: Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(raw: string): Frontmatter {
  const text = raw.replace(/^﻿/, '');
  if (!text.startsWith('---')) return { data: {}, content: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: {}, content: text };
  const header = text.slice(3, end).replace(/^\r?\n/, '');
  let content = text.slice(end + 4);
  if (content.startsWith('\r')) content = content.slice(1);
  if (content.startsWith('\n')) content = content.slice(1);

  const data: Record<string, unknown> = {};
  let currentListKey: string | null = null;
  for (const rawLine of header.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const listMatch = rawLine.match(/^\s+-\s+(.*)$/);
    if (listMatch && currentListKey) {
      const arr = data[currentListKey] as unknown[];
      if (Array.isArray(arr)) arr.push(parseScalar(listMatch[1] ?? ''));
      continue;
    }
    const m = rawLine.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    const rest = (m[2] ?? '').trim();
    if (rest === '') {
      data[key] = [];
      currentListKey = key;
    } else {
      currentListKey = null;
      data[key] = parseScalar(rest);
    }
  }
  return { data, content };
}

function parseScalar(value: string): unknown {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((s) => parseScalar(s));
  }
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  return v;
}
