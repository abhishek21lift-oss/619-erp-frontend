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
import { ClipboardCheck, TrendingDown, TrendingUp, Minus, ChevronRight } from 'lucide-react';
import type { ClientRecovery } from '@/lib/api';

const EASE = [0.16, 1, 0.3, 1] as const;

const BAND: Record<string, { label: string; colour: string }> = {
  good: { label: 'Good', colour: '#059669' },
  fair: { label: 'Fair', colour: '#0891b2' },
  low: { label: 'Low', colour: '#d97706' },
  poor: { label: 'Poor', colour: '#dc2626' },
};

const TREND: Record<string, { label: string; icon: React.ReactNode; colour: string }> = {
  improving: { label: 'Improving', icon: <TrendingUp size={13} />, colour: '#059669' },
  steady: { label: 'Steady', icon: <Minus size={13} />, colour: '#64748b' },
  declining: { label: 'Declining', icon: <TrendingDown size={13} />, colour: '#d97706' },
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
}

export default function RecoveryPanel({ recovery, clientId }: RecoveryPanelProps) {
  const reduce = useReducedMotion();
  const checkinHref = `/pt-os/weekly-checkin?client_id=${clientId}`;

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
                style={{ color: band?.colour ?? 'var(--text-primary)' }}>
                {score}
                <span className="text-[16px] font-[700]" style={{ color: 'var(--text-muted)' }}>/100</span>
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {band && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-[800] uppercase tracking-wider"
                    style={{ background: `${band.colour}18`, color: band.colour }}>{band.label}</span>
                )}
                {trend && (
                  <span className="flex items-center gap-1 text-[11px] font-[720]" style={{ color: trend.colour }}>
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
              <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
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
                  <p className="text-[9.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
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
                          style={{ background: band?.colour ?? 'var(--brand)' }}
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
              <p className="mb-2 text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
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
                      style={{ background: BAND[bandOf(w.score)].colour, opacity: 0.85 }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[9.5px] font-[620]" style={{ color: 'var(--text-muted)' }}>
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
    <div className="rounded-[22px] bg-white p-4 sm:p-5"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="mb-3.5 flex items-center gap-2.5 pb-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)', boxShadow: '0 3px 12px #0891b245' }}>
          <ClipboardCheck size={16} className="text-white" />
        </div>
        <h3 className="text-[13.5px] font-[740]" style={{ color: 'var(--text-primary)' }}>Recovery &amp; readiness</h3>
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
        style={{ background: 'var(--brand)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
        Record a check-in <ChevronRight size={13} />
      </a>
    </div>
  );
}
