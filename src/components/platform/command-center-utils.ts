// Shared utilities for the premium Command Center UI

import type { CommandCenterCard, CommandCenterSnapshot, CommandCenterStatus } from '@/lib/api';

// TONE and CARD_META moved to mission-control/tokens.ts, which is the one
// place the console reads status colour from. Re-exported here so existing
// imports keep working rather than being rewritten in a UI change — two
// definitions of what "warning" looks like is exactly the duplication this
// console is supposed to have stopped having.
export { TONE, toneFor, bySeverity, CARD_META, metaFor, surface } from './mission-control/tokens';
export type { StatusTone } from './mission-control/tokens';

export const fmtBytes = (n: unknown): string => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n; let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};
export const fmtMs = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n)} ms` : '—');
export const fmtNum = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-IN') : '—');
export const fmtPct = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—');
export const fmtDuration = (s: unknown) => {
  if (typeof s !== 'number' || !Number.isFinite(s)) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
};
export const fmtText = (v: unknown) => (typeof v === 'string' && v ? v : '—');

export function ratio(value: unknown, max: unknown) {
  const v = Number(value);
  const m = Number(max);
  if (!Number.isFinite(v) || !Number.isFinite(m) || m <= 0) return null;
  return { value: v, max: m };
}

export function pick(src: unknown, path: string): unknown {
  let cur = src;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function latencyTrend(history: CommandCenterSnapshot[], name: string) {
  return history
    .map((h) => ({ label: h.collected_at, value: h.cards[name]?.latency_ms }))
    .filter((p): p is { label: string; value: number } => typeof p.value === 'number' && Number.isFinite(p.value));
}
