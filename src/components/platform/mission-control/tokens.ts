/**
 * The status system the whole Command Center reads colour from.
 *
 * ── Why hue stays semantic ─────────────────────────────────────────────────
 *
 * lib/palette.ts records that an earlier refactor cut this app from 226 hex
 * values to 47, because "three different blues could appear in one card, and
 * the same amber meant 'warning' in one place and 'this tile is the fourth
 * one' in another, so colour carried no information at all."
 *
 * On an operations console that argument is stronger, not weaker. The single
 * most important thing this UI does is let someone glance at it and know
 * whether anything is wrong. Every hue that means "decoration" is a hue an
 * operator has to learn to ignore — and the habit of ignoring colour is
 * exactly what you do not want at 3am.
 *
 * So the mission-control look is built from surface, depth, density, motion
 * and typography. Colour is reserved for state, and there are six states.
 *
 * ── Six states, visually distinct ──────────────────────────────────────────
 *
 * They must be distinguishable at a glance, in both themes, and to a
 * red/green colour-blind operator — which is why each tone carries a GLYPH and
 * a fill pattern as well as a hue. Colour is never the only channel.
 */

import {
  CheckCircle2, AlertTriangle, XCircle, Timer, HelpCircle, MinusCircle,
  Cpu, Gauge, Database, Server, Layers, Bot, ShieldAlert, Mail,
  type LucideIcon,
} from 'lucide-react';
import { palette, rgba } from '@/lib/palette';
import type { CommandCenterStatus } from '@/lib/api';

export interface StatusTone {
  /** The colour. Solid fills, rings, dots. */
  color: string;
  /** A wash for surfaces behind text — never a text colour itself. */
  bg: string;
  /** Border tint for a panel in this state. */
  border: string;
  /** Text on a `bg` wash. 600+ so it clears WCAG AA, per palette.ts. */
  text: string;
  label: string;
  /** The second channel. Colour alone is not a signal. */
  Icon: LucideIcon;
  /**
   * Rank for sorting worst-first. Matches the backend's SEVERITY_ORDER in
   * modules/command-center/registry.js — if these two ever disagree, the
   * console sorts an incident list differently from the way the server graded
   * it, which is a subtle way to bury the thing that matters.
   */
  rank: number;
  /** One line an operator can act on, when the card gives no reason. */
  meaning: string;
}

export const TONE: Record<CommandCenterStatus, StatusTone> = {
  healthy: {
    color: palette.emerald[500],
    bg: rgba(palette.emerald[500], 0.10),
    border: rgba(palette.emerald[500], 0.28),
    text: palette.emerald[600],
    label: 'Healthy',
    Icon: CheckCircle2,
    rank: 0,
    meaning: 'Measured, and within thresholds.',
  },
  unavailable: {
    // Grey, deliberately: an absence is not an alarm. It is the one state that
    // must not compete for attention with a real problem.
    color: palette.gray[500],
    bg: rgba(palette.gray[500], 0.08),
    border: rgba(palette.gray[500], 0.22),
    text: palette.gray[600],
    label: 'Not measured',
    Icon: MinusCircle,
    rank: 1,
    meaning: 'The probe could not run. This is a blind spot, not a reading.',
  },
  degraded: {
    // Blue rather than amber. Degraded means WORKING, in a reduced mode —
    // sharing amber with `warning` would lose the distinction at a glance,
    // and that distinction is the difference between "act now" and "know this".
    color: palette.blue[500],
    bg: rgba(palette.blue[500], 0.10),
    border: rgba(palette.blue[500], 0.28),
    text: palette.blue[600],
    label: 'Degraded',
    Icon: HelpCircle,
    rank: 2,
    meaning: 'Still working, in a reduced mode. Know what it costs.',
  },
  warning: {
    color: palette.amber[500],
    bg: rgba(palette.amber[500], 0.12),
    border: rgba(palette.amber[500], 0.30),
    text: palette.amber[600],
    label: 'Warning',
    Icon: AlertTriangle,
    rank: 3,
    meaning: 'Past a threshold. Not failing yet.',
  },
  timeout: {
    color: palette.amber[600],
    bg: rgba(palette.amber[600], 0.12),
    border: rgba(palette.amber[600], 0.30),
    text: palette.amber[700],
    label: 'Timed out',
    Icon: Timer,
    rank: 4,
    meaning: 'The probe hung. Usually the thing behind it is genuinely sick.',
  },
  critical: {
    color: palette.red[500],
    bg: rgba(palette.red[500], 0.12),
    border: rgba(palette.red[500], 0.32),
    text: palette.red[600],
    label: 'Critical',
    Icon: XCircle,
    rank: 5,
    meaning: 'Failing now.',
  },
};

/** Never throws on a status this build has not heard of. */
export function toneFor(status: string | null | undefined): StatusTone {
  return TONE[status as CommandCenterStatus] ?? TONE.unavailable;
}

/** Worst first. The order an operator needs things in. */
export function bySeverity<T>(items: T[], statusOf: (t: T) => string): T[] {
  return [...items].sort((a, b) => toneFor(statusOf(b)).rank - toneFor(statusOf(a)).rank);
}

/**
 * The glass surface every panel sits on.
 *
 * One definition rather than the inline gradient that was pasted into each
 * component — the old overview repeated a 300-character style string per card,
 * so no two panels were quite identical and none could be changed at once.
 */
export const surface = {
  panel: {
    border: '1px solid var(--border)',
    background:
      'linear-gradient(155deg, color-mix(in srgb, var(--surface) 97%, transparent), '
      + 'color-mix(in srgb, var(--bg-subtle) 92%, transparent))',
    boxShadow: '0 18px 50px rgba(15,23,42,.07), inset 0 1px 0 rgba(255,255,255,.55)',
    borderRadius: 20,
  } as const,
  inset: {
    background: 'var(--bg-subtle)',
    borderRadius: 12,
  } as const,
};

/** Card titles, icons and one-line descriptions, in one place. */
export interface CardMeta { title: string; blurb: string; Icon: LucideIcon }

export const CARD_META: Record<string, CardMeta> = {
  runtime: { title: 'Runtime', blurb: 'Heap, CPU and event-loop lag', Icon: Cpu },
  http: { title: 'API', blurb: 'Request latency and error rate', Icon: Gauge },
  database: { title: 'PostgreSQL', blurb: 'Pool, connections, slow queries', Icon: Database },
  redis: { title: 'Redis', blurb: 'Latency, memory, clients', Icon: Server },
  queues: { title: 'Queues', blurb: 'Depth, failures and workers', Icon: Layers },
  ai: { title: 'AI routing', blurb: 'Models, latency, fallback rate', Icon: Bot },
  security: { title: 'Security', blurb: 'Auth pressure and posture', Icon: ShieldAlert },
  smtp: { title: 'Email', blurb: 'SMTP config and delivery', Icon: Mail },
};

export const metaFor = (name: string): CardMeta =>
  CARD_META[name] ?? { title: name, blurb: '', Icon: Server };
