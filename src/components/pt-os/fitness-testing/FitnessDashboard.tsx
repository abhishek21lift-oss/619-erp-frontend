'use client';

import type { LucideIcon } from 'lucide-react';
import { Activity, Dumbbell, Gauge, HeartPulse, Move, Repeat, ShieldCheck } from 'lucide-react';
import { m } from 'framer-motion';
import FitnessRadarChart, { type RadarDatum } from '@/components/pt-os/FitnessRadarChart';
import { scoreCoverage, formatCoverage } from '@/lib/fitness-calculations';
import { bandFill, domain, gradient, ringStops, sweep, type Tone } from './fitnessTheme';

export interface FitnessScores {
  cardioScore: number | null;
  strengthScore: number | null;
  enduranceScore: number | null;
  mobilityScore: number | null;
  bodyCompositionScore: number | null;
  healthRiskScore: number | null;
  overallScore: number | null;
}

// Order is load-bearing: the radar plots these six in this order.
const CATEGORY_META: { key: keyof FitnessScores; label: string; tone: Tone; Icon: LucideIcon }[] = [
  { key: 'cardioScore', label: 'Cardio', tone: domain.cardio, Icon: HeartPulse },
  { key: 'strengthScore', label: 'Strength', tone: domain.strength, Icon: Dumbbell },
  { key: 'enduranceScore', label: 'Endurance', tone: domain.endurance, Icon: Repeat },
  { key: 'mobilityScore', label: 'Mobility', tone: domain.mobility, Icon: Move },
  { key: 'bodyCompositionScore', label: 'Body Comp.', tone: domain.bodyComposition, Icon: Activity },
  { key: 'healthRiskScore', label: 'Health Risk', tone: domain.healthRisk, Icon: ShieldCheck },
];

/** Scores as radar data, labels in the plotting order above. Missing
 *  categories stay null all the way into the radar — never 0, so a skipped
 *  test is a gap, not a measured zero. */
export function radarDataFromScores(scores: FitnessScores): RadarDatum[] {
  return CATEGORY_META.map((c) => ({ category: c.label, score: scores[c.key] }));
}

interface FitnessDashboardProps {
  scores: FitnessScores;
}

/** The overall score as an activity ring — the ring's length is the score,
 *  its gradient is the module's Move-ring decoration. */
function ScoreRing({ score, size = 208 }: { score: number | null; size?: number }) {
  const stroke = 18;
  const r = (size - stroke) / 2;
  const center = size / 2;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score == null ? 'Overall score not available' : `Overall score ${score} of 100`}>
        <defs>
          <linearGradient id="fitness-score-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ringStops[0]} />
            <stop offset="55%" stopColor={ringStops[1]} />
            <stop offset="100%" stopColor={ringStops[2]} />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} opacity={0.5} />
        <m.circle
          cx={center} cy={center} r={r} fill="none" stroke="url(#fitness-score-ring)" strokeWidth={stroke}
          strokeLinecap="round" pathLength={100} transform={`rotate(-90 ${center} ${center})`}
          initial={{ strokeDasharray: '0 100' }}
          animate={{ strokeDasharray: `${pct} 100` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[46px] font-[850] leading-none tabular-nums tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>
          {score ?? '—'}
        </span>
        <span className="mt-2 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Overall Score</span>
      </div>
    </div>
  );
}

export function FitnessDashboard({ scores }: FitnessDashboardProps) {
  const coverage = scoreCoverage(scores);
  const radarData = radarDataFromScores(scores);
  const overall = scores.overallScore;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 18px 44px -18px rgba(15,23,42,0.30)' }}>
      <div className="h-1.5 w-full" style={{ background: sweep }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px] text-white" style={{ background: gradient(domain.healthRisk), boxShadow: `0 14px 30px -14px ${domain.healthRisk.glow}` }}>
            <Gauge size={20} />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] leading-none" style={{ color: 'var(--text-primary)' }}>Fitness Dashboard</h2>
            <p className="text-[13px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {coverage.isComplete
                ? 'Overall performance across all 6 categories.'
                : `Partial assessment — ${formatCoverage(coverage)}.`}
            </p>
            <p
              className="mt-2 inline-block rounded-full px-3 py-1 text-[12px] font-[700]"
              style={coverage.isComplete
                ? { background: 'rgba(16,185,129,0.12)', color: '#059669' }
                : { background: 'rgba(245,158,11,0.12)', color: '#d97706' }}
            >
              {coverage.isComplete ? `Complete · ${formatCoverage(coverage)}` : `Partial · ${formatCoverage(coverage)}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-center">
            <ScoreRing score={overall} />
            {!coverage.isComplete && (
              <p className="mt-4 text-center text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                {coverage.available === 0
                  ? 'No categories scored yet — no overall score.'
                  : `Overall score based on ${formatCoverage(coverage)}.`}
              </p>
            )}
          </div>
          <FitnessRadarChart data={radarData} height={240} variant="onCard" accent={domain.bodyComposition.to} />
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORY_META.map(({ key, label, tone, Icon }) => {
            const score = scores[key];
            return (
              <div key={key} className="rounded-[18px] p-4" style={{ background: tone.wash, border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: gradient(tone) }}>
                    <Icon size={15} />
                  </span>
                  <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
                <p className="mt-2.5 text-[24px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: score == null ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {score ?? '—'}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                  {score != null && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, score))}%`, minWidth: score > 0 ? 4 : undefined, background: bandFill(score) }}
                    />
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

export default FitnessDashboard;
