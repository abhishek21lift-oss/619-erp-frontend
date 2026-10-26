'use client';

// Readiness, as the client reported it.
//
// ── What this is careful about ─────────────────────────────────────────────
//
// One number on a dial is the most persuasive thing on a screen, and this one
// is four opinions a tired person gave at the door. So the panel never shows
// the score alone: it shows how many of the four questions were answered, the
// four components that produced it, and the date it was taken. A trainer who
// thinks the number is wrong can see exactly why it says what it says.
//
// It also refuses to fill in. If fewer than two questions were answered there
// is no score, and the panel says the check-in was too sparse rather than
// drawing a ring at some default. If there are no check-ins at all it says so
// and offers the form — an empty recovery panel is not a broken feature, it is
// an instruction.

import { m, useReducedMotion } from 'framer-motion';
import { ClipboardCheck, TrendingDown, TrendingUp, Minus, ChevronRight, RefreshCw } from 'lucide-react';
import type { ClientRecovery } from '@/lib/api';
import { cardSurface } from '@/components/ui/Card';
import { blue, rgba } from '@/lib/palette';
import { stateTone, type StateToneStyle } from '@/lib/state-tone';

const EASE = [0.16, 1, 0.3, 1] as const;

const BAND: Record<string, { label: string } & StateToneStyle> = {
  good: { label: 'Good', ...stateTone.success },
  fair: { label: 'Fair', ...stateTone.info },
  low: { label: 'Low', ...stateTone.warning },
  poor: { label: 'Poor', ...stateTone.danger },
};

const TREND: Record<string, { label: string; icon: React.ReactNode } & StateToneStyle> = {
  improving: { label: 'Improving', icon: <TrendingUp size={13} />, ...stateTone.success },
  steady: { label: 'Steady', icon: <Minus size={13} />, ...stateTone.neutral },
  declining: { label: 'Declining', icon: <TrendingDown size={13} />, ...stateTone.warning },
};

const COMPONENTS: Array<{ key: keyof NonNullable<ClientRecovery['components']>; label: string }> = [
  { key: 'sleep', label: 'Sleep' },
  { key: 'stress', label: 'Stress' },
  { key: 'energy', label: 'Energy' },
  { key: 'soreness', label: 'Soreness' },
];

export interface RecoveryPanelProps {
  recovery?: ClientRecovery;
  clientId: string;
  /** Whether the summary that carries readiness is still loading or failed. */
  status?: 'loading' | 'error' | 'ready';
  error?: string;
  onRetry?: () => void;
}

export default function RecoveryPanel({
  recovery, clientId, status = 'ready', error, onRetry,
}: RecoveryPanelProps) {
  const reduce = useReducedMotion();
  const checkinHref = `/pt-os/weekly-checkin?client_id=${clientId}`;

  // The tab can be deep-linked before the summary answers. Without these two
  // states it claimed "no check-ins recorded yet" while loading, and also when
  // the request had failed — the one case where that sentence is a lie.
  if (status === 'loading') {
    return (
      <Shell>
        <div aria-busy="true" aria-label="Loading readiness" className="space-y-2">
          <div className="h-12 w-40 animate-pulse rounded-[12px]" style={{ background: 'var(--bg-subtle)' }} />
          <div className="h-16 animate-pulse rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />
        </div>
      </Shell>
    );
  }

  if (status === 'error') {
    return (
      <Shell>
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[14px] px-3.5 py-3"
          style={{ background: stateTone.danger.bg, border: `1px solid ${stateTone.danger.border}` }}>
          <p className="min-w-0 flex-1 text-[12.5px] font-[650] leading-snug" style={{ color: stateTone.danger.fg }}>
            Could not load readiness. {error}
          </p>
          {onRetry && (
            <button type="button" onClick={onRetry}
              className="flex h-[44px] items-center gap-1.5 rounded-[12px] px-3.5 text-[12px] font-[750]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </div>
      </Shell>
    );
  }

  if (!recovery?.present) {
    return (
      <Shell>
        <Empty
          title="No check-ins recorded yet"
          body="Readiness comes from four questions asked weekly — sleep, stress, energy and soreness. Two answers are enough to produce a score, and it takes about thirty seconds at the door."
          href={checkinHref}
        />
      </Shell>
    );
  }

  const score = recovery.score;
  const band = score != null && recovery.band ? BAND[recovery.band] : null;
  const trend = recovery.trend ? TREND[recovery.trend] : null;
  const answered = recovery.inputs ?? 0;
  const total = recovery.max_inputs ?? 4;

  return (
    <Shell>
      {score == null ? (
        // A check-in exists but was too sparse to score. Said plainly rather
        // than drawn as a ring at some default value.
        <Empty
          title="Not enough answers to score readiness"
          body={`The last check-in${recovery.as_of ? ` (${recovery.as_of})` : ''} answered ${answered} of ${total} questions. Two are enough — sleep and any one of stress, energy or soreness.`}
          href={checkinHref}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div>
              <p className="text-[44px] font-[880] leading-none tabular-nums tracking-[-0.03em]"
                style={{ color: band?.fg ?? 'var(--text-primary)' }}>
                {score}
                <span className="text-[16px] font-[700]" style={{ color: 'var(--text-muted)' }}>/100</span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {band && (
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-[800] uppercase tracking-wider"
                    style={{ background: band.bg, color: band.fg }}>{band.label}</span>
                )}
                {trend && (
                  <span className="flex items-center gap-1 text-[11px] font-[720]" style={{ color: trend.fg }}>
                    {trend.icon}{trend.label}
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {/* Never the score alone. Both of these qualify it. */}
              <p className="text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                {answered} of {total} questions answered
                {recovery.as_of ? ` · week of ${recovery.as_of}` : ''}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Self-reported by the client. Not a physiological measurement.
              </p>
            </div>
          </div>

          {/* The components, so the score can be argued with. */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COMPONENTS.map(({ key, label }) => {
              const v = recovery.components?.[key] ?? null;
              return (
                <div key={key} className="rounded-[14px] px-3 py-2.5"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <p className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </p>
                  {v == null ? (
                    <p className="mt-1 text-[12px] font-[700]" style={{ color: 'var(--text-muted)' }}>Not asked</p>
                  ) : (
                    <>
                      <p className="mt-1 text-[15px] font-[820] tabular-nums" style={{ color: 'var(--text-primary)' }}>{v}</p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                        <m.div
                          initial={reduce ? false : { width: 0 }}
                          animate={{ width: `${v}%` }}
                          transition={{ duration: 0.5, ease: EASE }}
                          className="h-full rounded-full"
                          style={{ background: band?.fg ?? 'var(--brand)' }}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {recovery.weeks.length >= 2 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Last {recovery.weeks.length} scored weeks
              </p>
              {/* A sparkline of bars rather than a chart library: four to twelve
                  points, one number each, and nothing to interact with. */}
              <div className="flex items-end gap-1.5" style={{ height: 48 }}>
                {recovery.weeks.map((w) => (
                  <div key={w.week} className="flex-1" title={`${w.week}: ${w.score}`}>
                    <m.div
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: `${Math.max(6, (w.score / 100) * 48)}px` }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="w-full rounded-[4px]"
                      style={{ background: BAND[bandOf(w.score)].fg, opacity: 0.85 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] font-[620]" style={{ color: 'var(--text-muted)' }}>
                <span>{recovery.weeks[0]?.week}</span>
                <span>{recovery.weeks[recovery.weeks.length - 1]?.week}</span>
              </div>
            </div>
          )}

          <a href={checkinHref}
            className="mt-4 flex h-[44px] w-fit items-center gap-1.5 rounded-[12px] px-4 text-[12px] font-[750]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--brand)' }}>
            Record this week&apos;s check-in <ChevronRight size={13} />
          </a>
        </>
      )}
    </Shell>
  );
}

/** Same banding as the server, so a bar and the headline never disagree. */
function bandOf(score: number): keyof typeof BAND {
  if (score >= 80) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'low';
  return 'poor';
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] p-4 sm:p-5"
      style={{ ...cardSurface }}>
      <div className="mb-3.5 flex items-center gap-2.5 pb-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: `linear-gradient(135deg, ${blue[500]}, ${blue[600]})`, boxShadow: `0 3px 12px ${rgba(blue[500], 0.27)}` }}>
          <ClipboardCheck size={16} className="text-white" />
        </div>
        <h2 className="text-[13.5px] font-[740]" style={{ color: 'var(--text-primary)' }}>Recovery &amp; readiness</h2>
      </div>
      {children}
    </div>
  );
}

function Empty({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-6 text-center">
      <p className="text-[13px] font-[780]" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="max-w-[52ch] text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{body}</p>
      <a href={href}
        className="mt-1 flex h-[44px] items-center gap-1.5 rounded-[12px] px-4 text-[12px] font-[750] text-white"
        style={{ background: 'var(--brand)', boxShadow: `0 4px 14px ${rgba(blue[500], 0.35)}` }}>
        Record a check-in <ChevronRight size={13} />
      </a>
    </div>
  );
}
