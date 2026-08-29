// Shared utilities for the premium Command Center UI

import type { CommandCenterCard, CommandCenterSnapshot, CommandCenterStatus } from '@/lib/api';
import { semantic, rgba } from '@/lib/palette';
import { CheckCircle2, AlertTriangle, XCircle, Timer, HelpCircle, Cpu, Database, Server, Layers, Gauge, Bot, ShieldAlert, Mail } from 'lucide-react';

export const TONE: Record<CommandCenterStatus, { color: string; bg: string; label: string; Icon: typeof CheckCircle2 }> = {
  healthy: { color: semantic.success, bg: rgba(semantic.success, 0.10), label: 'Healthy', Icon: CheckCircle2 },
  warning: { color: semantic.warning, bg: rgba(semantic.warning, 0.10), label: 'Warning', Icon: AlertTriangle },
  critical: { color: semantic.danger, bg: rgba(semantic.danger, 0.10), label: 'Critical', Icon: XCircle },
  timeout: { color: semantic.warningLo, bg: rgba(semantic.warningLo, 0.10), label: 'Timed out', Icon: Timer },
  unavailable: { color: semantic.muted, bg: rgba(semantic.muted, 0.08), label: 'Unavailable', Icon: HelpCircle },
};

export const CARD_META: Record<string, { title: string; Icon: typeof Cpu; blurb: string }> = {
  runtime: { title: 'Runtime', Icon: Cpu, blurb: 'Process memory, CPU and event-loop lag' },
  database: { title: 'Database', Icon: Database, blurb: 'PostgreSQL pool, connections and slow queries' },
  redis: { title: 'Redis', Icon: Server, blurb: 'Latency, memory and clients' },
  queues: { title: 'Queues', Icon: Layers, blurb: 'BullMQ depth, failures and workers' },
  http: { title: 'API', Icon: Gauge, blurb: 'Request latency and error rate' },
  ai: { title: 'AI', Icon: Bot, blurb: 'Routing, latency and fallback rate' },
  security: { title: 'Security', Icon: ShieldAlert, blurb: 'Auth pressure and configuration posture' },
  smtp: { title: 'Mail', Icon: Mail, blurb: 'SMTP configuration and delivery' },
};

export function metaFor(name: string) {
  return CARD_META[name] ?? { title: name, Icon: Server, blurb: '' };
}

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
