'use client';
/**
 * The first thing an operator looks at, and the hardest one to get honest.
 *
 * ── Why the ring has two arcs ──────────────────────────────────────────────
 *
 * A single "87% healthy" donut answers the wrong question. It says how many
 * cards came back green; it does not say how many came back at all. A platform
 * where six of eight probes failed and two are green reads as 100% healthy on
 * that donut, which is the exact misreading this console exists to prevent.
 *
 * So there are two arcs. The OUTER one is health — how the measured cards
 * graded. The INNER one is coverage — how much of the platform was measured at
 * all. When coverage is below 1 the ring says so in the middle, because a
 * health figure computed over half the platform is a different claim from one
 * computed over all of it, and the number alone cannot carry that.
 */

import React from 'react';
import { m } from 'framer-motion';
import type { CommandCenterSnapshot } from '@/lib/api';
import { toneFor, surface } from './tokens';

const R_OUTER = 52;
const R_INNER = 38;
const C_OUTER = 2 * Math.PI * R_OUTER;
const C_INNER = 2 * Math.PI * R_INNER;

function Arc({
  r, circumference, fraction, color, width, opacity = 1, delay = 0,
}: {
  r: number; circumference: number; fraction: number;
  color: string; width: number; opacity?: number; delay?: number;
}) {
  const len = Math.max(0, Math.min(1, fraction)) * circumference;
  return (
    <m.circle
      cx="60" cy="60" r={r} fill="none"
      stroke={color} strokeWidth={width} strokeLinecap="round"
      strokeDasharray={`${len} ${circumference}`}
      initial={{ strokeDasharray: `0 ${circumference}` }}
      animate={{ strokeDasharray: `${len} ${circumference}` }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      opacity={opacity}
    />
  );
}

export const GlobalStatus: React.FC<{ snap: CommandCenterSnapshot }> = ({ snap }) => {
  const tone = toneFor(snap.status);
  const obs = snap.observability;
  const cards = Object.values(snap.cards ?? {});

  const measured = cards.filter(
    (c) => c.status !== 'unavailable' && c.status !== 'timeout',
  );
  const healthy = measured.filter((c) => c.status === 'healthy').length;
  const healthFraction = measured.length ? healthy / measured.length : 0;
  const coverage = obs?.coverage ?? 1;
  const partiallyBlind = coverage < 1;

  return (
    <section style={surface.panel} className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      <div className="relative mx-auto h-[168px] w-[168px] shrink-0 sm:mx-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          {/* Tracks. Drawn first so the arcs sit on top of them. */}
          <circle cx="60" cy="60" r={R_OUTER} fill="none" stroke="var(--border)" strokeWidth="9" opacity={0.5} />
          <circle cx="60" cy="60" r={R_INNER} fill="none" stroke="var(--border)" strokeWidth="5" opacity={0.35} />

          {/* Outer: how the MEASURED cards graded. */}
          <Arc r={R_OUTER} circumference={C_OUTER} fraction={healthFraction}
            color={tone.color} width={9} />

          {/* Inner: how much was measured at all. Dimmer, because it is
              context for the number above rather than a competing metric. */}
          <Arc r={R_INNER} circumference={C_INNER} fraction={coverage}
            color={partiallyBlind ? toneFor('degraded').color : 'var(--text-disabled)'}
            width={5} opacity={partiallyBlind ? 0.95 : 0.4} delay={0.12} />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <tone.Icon size={17} style={{ color: tone.color }} aria-hidden />
          <b className="mt-1 text-[15px] font-[900] leading-none tracking-[-.02em]"
            style={{ color: 'var(--text-primary)' }}>
            {tone.label}
          </b>
          <span className="mt-1.5 text-[9px] font-[800] uppercase tracking-[.14em] tabular-nums"
            style={{ color: 'var(--text-tertiary)' }}>
            {healthy}/{measured.length} measured ok
          </span>
          {partiallyBlind && (
            <span className="mt-0.5 text-[9px] font-[800] tabular-nums"
              style={{ color: toneFor('degraded').color }}>
              {Math.round(coverage * 100)}% coverage
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[9.5px] font-[900] uppercase tracking-[.18em]"
          style={{ color: 'var(--text-tertiary)' }}>
          Platform status
        </div>
        <h2 className="mt-1 text-[19px] font-[900] leading-tight tracking-[-.03em]"
          style={{ color: 'var(--text-primary)' }}>
          {headline(snap)}
        </h2>

        {/* WHY it is not green, before anyone opens a card. */}
        {snap.degraded_reasons?.length ? (
          <ul className="mt-3 space-y-1.5">
            {snap.degraded_reasons.slice(0, 4).map((r) => {
              const t = toneFor(r.status);
              return (
                <li key={r.card} className="flex items-start gap-2 text-[11px] leading-snug">
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: t.color }} aria-hidden />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <b style={{ color: 'var(--text-primary)' }}>{r.card}</b>
                    {r.scope === 'process' && (
                      <span className="ml-1 rounded px-1 py-px text-[9px] font-[800] uppercase"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        this process
                      </span>
                    )}
                    {' — '}{r.reason ?? t.meaning}
                  </span>
                </li>
              );
            })}
            {snap.degraded_reasons.length > 4 && (
              <li className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>
                and {snap.degraded_reasons.length - 4} more
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Every probe answered and every reading is within its thresholds.
          </p>
        )}
      </div>
    </section>
  );
};

/**
 * The sentence at the top.
 *
 * It leads with coverage when coverage is the problem, because "critical"
 * over a platform we can only half see is a claim about the half we saw.
 */
function headline(snap: CommandCenterSnapshot): string {
  const obs = snap.observability;
  if (obs && obs.unavailable > 0 && snap.status === 'degraded') {
    return `${obs.unavailable} probe${obs.unavailable === 1 ? '' : 's'} could not run — `
      + 'this reading covers part of the platform.';
  }
  switch (snap.status) {
    case 'critical': return 'Something is failing now.';
    case 'timeout': return 'A probe hung. What is behind it is usually sick.';
    case 'warning': return 'Past a threshold, not failing yet.';
    case 'degraded': return 'Working, in a reduced mode.';
    default: return 'All measured systems nominal.';
  }
}
