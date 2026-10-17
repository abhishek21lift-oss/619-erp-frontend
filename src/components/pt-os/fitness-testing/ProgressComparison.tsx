'use client';

import { ArrowDown, ArrowUp, Minus, GitCompare } from 'lucide-react';
import { gradient, sweep, tones, type Tone } from './fitnessTheme';

interface MetricConfig {
  key: string;
  label: string;
  unit?: string;
  higherIsBetter: boolean;
  /** The domain hue, for the rows that map to one of the six scores. */
  tone?: Tone;
}

const METRICS: MetricConfig[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', higherIsBetter: false },
  { key: 'bmi', label: 'BMI', higherIsBetter: false },
  { key: 'body_fat_pct', label: 'Body Fat', unit: '%', higherIsBetter: false },
  { key: 'waist_cm', label: 'Waist', unit: 'cm', higherIsBetter: false },
  { key: 'vo2_max', label: 'VO₂ Max', unit: 'mL/kg/min', higherIsBetter: true, tone: tones.berry },
  { key: 'strength_score_computed', label: 'Strength Score', higherIsBetter: true, tone: tones.sunset },
  { key: 'cardio_score_computed', label: 'Cardio Score', higherIsBetter: true, tone: tones.berry },
  { key: 'endurance_score_computed', label: 'Endurance Score', higherIsBetter: true, tone: tones.aqua },
  { key: 'mobility_score_computed', label: 'Mobility Score', higherIsBetter: true, tone: tones.gold },
  { key: 'overall_fitness_score', label: 'Overall Fitness Score', higherIsBetter: true, tone: tones.violet },
];

interface ProgressComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

function num(v: unknown): number | null {
  const f = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(f) ? f : null;
}

export function ProgressComparison({ initial, latest }: ProgressComparisonProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1.5 w-full" style={{ background: sweep }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px] text-white" style={{ background: gradient(tones.aqua), boxShadow: `0 14px 30px -14px ${tones.aqua.glow}` }}>
            <GitCompare size={20} />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] leading-none" style={{ color: 'var(--text-primary)' }}>Progress Comparison</h2>
            <p className="text-[13px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Initial ({String(initial.assessment_date ?? '—')}) vs. Latest ({String(latest.assessment_date ?? '—')})
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {METRICS.map((m) => {
            const a = num(initial[m.key]);
            const b = num(latest[m.key]);
            if (a == null && b == null) return null;
            const delta = a != null && b != null ? Math.round((b - a) * 100) / 100 : null;
            const improved = delta != null && delta !== 0 ? (delta > 0) === m.higherIsBetter : null;
            return (
              <div key={m.key} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
                <span className="flex items-center gap-2 text-[13px] font-[640]" style={{ color: 'var(--text-secondary)' }}>
                  {m.tone && <span aria-hidden className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: gradient(m.tone) }} />}
                  {m.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                    {a ?? '—'} {m.unit || ''} <span className="mx-1">→</span> {b ?? '—'} {m.unit || ''}
                  </span>
                  {delta != null && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-[700]"
                      style={{
                        background: improved == null ? 'rgba(148,163,184,0.14)' : improved ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: improved == null ? 'var(--text-muted)' : improved ? '#059669' : '#dc2626',
                      }}
                    >
                      {delta === 0 ? <Minus size={11} /> : delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProgressComparison;
