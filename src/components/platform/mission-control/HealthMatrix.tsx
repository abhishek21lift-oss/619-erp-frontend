'use client';
/**
 * Every signal the platform has, worst first, in one screen.
 *
 * ── Why a matrix and not a grid of cards ───────────────────────────────────
 *
 * The old console rendered eight equal tiles in registration order, each an
 * expandable panel. That has two costs an operations screen cannot pay:
 *
 *   1. Registration order is arbitrary. The failing card could be last.
 *   2. Equal visual weight means the eye has to read all eight to find the
 *      one that matters, every time.
 *
 * Here rows are sorted worst-first and the severity is carried by position,
 * a rail, a glyph and a colour — four channels, so it survives a colour-blind
 * operator and a bad monitor. A healthy platform collapses to a quiet block of
 * green rails you can skip in one saccade; a sick one puts the problem at the
 * top with its reason already visible, no click required.
 */

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { CommandCenterCard, CommandCenterSnapshot } from '@/lib/api';
import { Card as CardDetail } from '@/components/platform/Card';
import { toneFor, bySeverity, metaFor, surface } from './tokens';

/** A number worth putting on the row itself, per card. */
function headlineMetric(card: CommandCenterCard): { label: string; value: string } | null {
  const d = card.data as Record<string, unknown> | null;
  if (!d) return null;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  switch (card.name) {
    case 'database': {
      const ms = n((d as { latency_ms?: number }).latency_ms);
      return ms == null ? null : { label: 'latency', value: `${Math.round(ms)} ms` };
    }
    case 'redis': {
      const ms = n((d as { latency_ms?: number }).latency_ms);
      return ms == null ? null : { label: 'latency', value: `${Math.round(ms)} ms` };
    }
    case 'queues': {
      const t = (d as { totals?: { waiting?: number; failed?: number } }).totals;
      if (!t) return null;
      return { label: 'waiting / failed', value: `${t.waiting ?? 0} / ${t.failed ?? 0}` };
    }
    case 'http': {
      const lat = (d as { latency_ms?: { p95?: number } | null }).latency_ms;
      const p95 = n(lat?.p95);
      return p95 == null ? null : { label: 'p95', value: `${Math.round(p95)} ms` };
    }
    case 'runtime': {
      const mem = (d as { memory?: { heap_used_ratio?: number } }).memory;
      const r = n(mem?.heap_used_ratio);
      return r == null ? null : { label: 'heap', value: `${Math.round(r * 100)}%` };
    }
    case 'ai': {
      const hour = (d as { last_hour?: { fallback_rate?: number } | null }).last_hour;
      const r = n(hour?.fallback_rate);
      return r == null ? null : { label: 'fallback 1h', value: `${Math.round(r * 100)}%` };
    }
    case 'security': {
      const auth = (d as { auth?: { failed_1h?: number } }).auth;
      const f = n(auth?.failed_1h);
      return f == null ? null : { label: 'failed logins 1h', value: String(f) };
    }
    case 'smtp': {
      const del = (d as { delivery?: { invitations_sent?: number; invitations_total?: number } }).delivery;
      if (!del) return null;
      return { label: 'delivered', value: `${del.invitations_sent ?? 0}/${del.invitations_total ?? 0}` };
    }
    default: return null;
  }
}

const Row: React.FC<{
  card: CommandCenterCard;
  index: number;
  onOpen: (name: string) => void;
}> = ({ card, index, onOpen }) => {
  const tone = toneFor(card.status);
  const meta = metaFor(card.name);
  const metric = headlineMetric(card);
  const isProcess = card.scope === 'process';

  return (
    <m.button
      type="button"
      onClick={() => onOpen(card.name)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.18) }}
      className="group flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-left transition-colors"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      aria-label={`${meta.title} — ${tone.label}`}
    >
      {/* The rail. Severity as position and weight, not only hue. */}
      <span className="h-9 w-[3px] shrink-0 rounded-full" style={{ background: tone.color }} aria-hidden />

      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: tone.bg }}>
        <meta.Icon size={14} style={{ color: tone.color }} aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <b className="truncate text-[12.5px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            {meta.title}
          </b>
          {isProcess && (
            <span className="rounded px-1 py-px text-[8px] font-[850] uppercase tracking-wide"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}
              title="Measures the one API process that answered this request, not the platform">
              this process
            </span>
          )}
          {card.cached && (
            <span className="rounded px-1 py-px text-[8px] font-[750] tabular-nums"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}
              title="Served from the collector's TTL cache rather than freshly probed">
              {typeof card.age_ms === 'number' ? `${Math.max(1, Math.round(card.age_ms / 1000))}s old` : 'cached'}
            </span>
          )}
        </span>
        {/* The reason, always visible. An operator should never have to click
            to find out WHY a row is not green. */}
        <span className="mt-0.5 block truncate text-[10.5px] leading-snug"
          style={{ color: card.reason ? tone.text : 'var(--text-tertiary)' }}>
          {card.reason ?? meta.blurb}
        </span>
      </span>

      {metric && (
        <span className="hidden shrink-0 text-right sm:block">
          <span className="block text-[13px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {metric.value}
          </span>
          <span className="block text-[9px] font-[750] uppercase tracking-wide"
            style={{ color: 'var(--text-tertiary)' }}>
            {metric.label}
          </span>
        </span>
      )}

      <span className="flex shrink-0 items-center gap-1.5">
        <span className="hidden rounded-full px-2 py-0.5 text-[9.5px] font-[850] md:inline"
          style={{ background: tone.bg, color: tone.text }}>
          {tone.label}
        </span>
        <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--text-disabled)' }} aria-hidden />
      </span>
    </m.button>
  );
};

export const HealthMatrix: React.FC<{
  snap: CommandCenterSnapshot;
  /** Every snapshot this session has seen, for the drill-down's sparkline. */
  history?: CommandCenterSnapshot[];
  onOpen?: (name: string) => void;
}> = ({ snap, history = [], onOpen }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const cards = bySeverity(Object.values(snap.cards ?? {}), (c) => c.status);
  const open = (name: string) => {
    setExpanded((prev) => (prev === name ? null : name));
    onOpen?.(name);
  };

  return (
    <section style={surface.panel} className="p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[9.5px] font-[900] uppercase tracking-[.18em]"
            style={{ color: 'var(--text-tertiary)' }}>
            Health matrix
          </div>
          <h3 className="mt-0.5 text-[15px] font-[900] tracking-[-.02em]"
            style={{ color: 'var(--text-primary)' }}>
            Every signal, worst first
          </h3>
        </div>
        <span className="shrink-0 text-[10px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          collected in {snap.duration_ms ?? 0} ms
        </span>
      </header>

      <div className="space-y-1.5">
        {cards.map((c, i) => (
          <React.Fragment key={c.name}>
            <Row card={c} index={i} onOpen={open} />
            {/* The drill-down. Card.tsx renders the full per-collector body —
                pool counts, slow queries, endpoint latencies, posture checks —
                and it already knows how to render all eight. Reusing it keeps
                the detail an operator needs without a second renderer that can
                drift from the first. */}
            {expanded === c.name && (
              <div className="pb-1 pl-2 pr-1 pt-0.5">
                <CardDetail card={c} index={0} history={history} />
              </div>
            )}
          </React.Fragment>
        ))}
        {!cards.length && (
          <p className="rounded-[12px] p-4 text-center text-[11px]"
            style={{ ...surface.inset, color: 'var(--text-tertiary)' }}>
            No collectors registered on this build.
          </p>
        )}
      </div>
    </section>
  );
};
