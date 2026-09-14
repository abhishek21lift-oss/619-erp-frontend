'use client';
/**
 * What depends on what, and what a failure takes down with it.
 *
 * ── Why this is not decoration ─────────────────────────────────────────────
 *
 * "WHAT IS AFFECTED" is a question no list of cards can answer, because the
 * answer is in the EDGES. A red Redis tile tells an operator Redis is down; it
 * does not tell them that renewals have stopped, that WhatsApp messages are
 * accumulating undelivered, and that email is fine but slower. Those three
 * facts are the actual incident, and they live in the dependency graph.
 *
 * So the edges here are real. The queue lane reads its per-queue degradation
 * from the backend's redis-degradation.js — which is itself pinned to the
 * producer code by a test — rather than from anything drawn by hand. If
 * somebody changes what a queue does when Redis is down, this diagram changes
 * with it or the backend test fails.
 *
 * ── Why SVG and not boxes ──────────────────────────────────────────────────
 *
 * The lanes need to show FLOW and the edges need to dim when a dependency is
 * gone. That is a drawing, not a layout, and faking it with borders produces
 * something that looks like a diagram without behaving like one.
 */

import React from 'react';
import { m } from 'framer-motion';
import type { CommandCenterSnapshot, QueuesTelemetry, QueueDegradationMode } from '@/lib/api';
import { toneFor, surface } from './tokens';

const MODE_COPY: Record<QueueDegradationMode, { label: string; tone: 'critical' | 'warning' | 'degraded' }> = {
  stopped: { label: 'STOPPED', tone: 'critical' },
  deferred: { label: 'Deferred', tone: 'warning' },
  inline: { label: 'Inline', tone: 'degraded' },
};

const Node: React.FC<{
  label: string; sub: string; status: string; wide?: boolean;
}> = ({ label, sub, status, wide }) => {
  const tone = toneFor(status);
  return (
    <div
      className={`rounded-[14px] px-3 py-2.5 ${wide ? 'min-w-[136px]' : 'min-w-[104px]'}`}
      style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} aria-hidden />
        <b className="truncate text-[11px] font-[850]" style={{ color: 'var(--text-primary)' }}>{label}</b>
      </div>
      <div className="mt-0.5 truncate text-[9.5px]" style={{ color: tone.text }}>{sub}</div>
    </div>
  );
};

/** A dependency edge. Dashed and dim when the thing it depends on is gone. */
const Edge: React.FC<{ live: boolean; label?: string }> = ({ live, label }) => (
  <div className="flex min-w-[34px] flex-1 flex-col items-center justify-center">
    <svg viewBox="0 0 60 10" className="h-2.5 w-full" preserveAspectRatio="none" aria-hidden>
      <line
        x1="0" y1="5" x2="60" y2="5"
        stroke={live ? 'var(--text-disabled)' : toneFor('critical').color}
        strokeWidth="1.5"
        strokeDasharray={live ? undefined : '4 3'}
        opacity={live ? 0.5 : 0.9}
      />
    </svg>
    {label && (
      <span className="mt-0.5 whitespace-nowrap text-[8px] font-[750] uppercase tracking-wide"
        style={{ color: live ? 'var(--text-disabled)' : toneFor('critical').color }}>
        {label}
      </span>
    )}
  </div>
);

export const Topology: React.FC<{ snap: CommandCenterSnapshot }> = ({ snap }) => {
  const cards = snap.cards ?? {};
  const redis = cards.redis;
  const queues = cards.queues;
  const db = cards.database;
  const http = cards.http;

  const qData = (queues?.data ?? null) as QueuesTelemetry | null;
  const degradation = qData?.degradation ?? null;
  const redisLive = redis?.status === 'healthy' || redis?.status === 'warning';

  return (
    <section style={surface.panel} className="p-4">
      <header className="mb-4">
        <div className="text-[9.5px] font-[900] uppercase tracking-[.18em]"
          style={{ color: 'var(--text-tertiary)' }}>
          Infrastructure topology
        </div>
        <h3 className="mt-0.5 text-[15px] font-[900] tracking-[-.02em]"
          style={{ color: 'var(--text-primary)' }}>
          What depends on what
        </h3>
      </header>

      {/* The request path. */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        <Node label="API" sub={http?.reason ? 'degraded' : 'serving'} status={http?.status ?? 'unavailable'} />
        <Edge live />
        <Node label="PostgreSQL" sub={db?.reason ?? 'primary store'} status={db?.status ?? 'unavailable'} wide />
        <Edge live={redisLive} label={redisLive ? undefined : 'broken'} />
        <Node label="Redis" sub={redis?.reason ?? 'queue backbone'} status={redis?.status ?? 'unavailable'} />
      </div>

      {/* The queue lanes — the part that actually answers "what is affected". */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-[900] uppercase tracking-[.16em]"
            style={{ color: 'var(--text-tertiary)' }}>
            Queues
          </span>
          {degradation?.active && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-[850]"
              style={{ background: toneFor('critical').bg, color: toneFor('critical').text }}>
              fallback active
            </span>
          )}
        </div>

        {degradation ? (
          <div className="space-y-1.5">
            {degradation.queues.map((q, i) => {
              const copy = MODE_COPY[q.mode];
              const t = toneFor(copy.tone);
              return (
                <m.div
                  key={q.queue}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.2) }}
                  className="flex items-start gap-2.5 rounded-[11px] px-2.5 py-2"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: t.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <b className="truncate text-[10.5px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                        {q.queue}
                      </b>
                      <span className="shrink-0 rounded px-1.5 py-px text-[8px] font-[850] uppercase tracking-wide"
                        style={{ background: t.bg, color: t.text }}>
                        {copy.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                      {q.impact}
                    </p>
                  </div>
                </m.div>
              );
            })}
          </div>
        ) : (
          <QueueLanes data={qData} />
        )}
      </div>
    </section>
  );
};

/** Live queue depths, when Redis is up and there is no degradation to explain. */
const QueueLanes: React.FC<{ data: QueuesTelemetry | null }> = ({ data }) => {
  const lanes = data?.queues ?? [];
  if (!lanes.length) {
    return (
      <p className="rounded-[11px] p-3 text-[10.5px]"
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
        No queue readings in this snapshot.
      </p>
    );
  }
  const max = Math.max(1, ...lanes.map((q) => (q.waiting ?? 0) + (q.active ?? 0)));
  return (
    <div className="space-y-1.5">
      {lanes.map((q) => {
        const waiting = q.waiting ?? 0;
        const active = q.active ?? 0;
        const failed = q.failed ?? 0;
        const bad = q.starved || failed > 0 || q.paused;
        const t = toneFor(bad ? 'warning' : 'healthy');
        return (
          <div key={q.name} className="rounded-[11px] px-2.5 py-2" style={{ background: 'var(--bg-subtle)' }}>
            <div className="flex items-center justify-between gap-2">
              <b className="truncate text-[10.5px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                {q.name}
                {q.paused && <span className="ml-1.5 text-[9px] font-[750]" style={{ color: t.text }}>paused</span>}
                {q.starved && <span className="ml-1.5 text-[9px] font-[750]" style={{ color: t.text }}>no worker</span>}
              </b>
              <span className="shrink-0 text-[9.5px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                {waiting} waiting · {active} active{failed ? ` · ${failed} failed` : ''}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.round(((waiting + active) / max) * 100)}%`, background: t.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
