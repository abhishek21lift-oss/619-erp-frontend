'use client';

import type { LucideIcon } from 'lucide-react';
import { Activity, Dumbbell, HeartPulse, Move, Repeat, Ruler } from 'lucide-react';
import { m } from 'framer-motion';
import FitnessRadarChart, { type RadarDatum } from '@/components/pt-os/FitnessRadarChart';
import {
  assessVitalsSafety, classifyBmi, classifyBp, classifyRhr, classifySpo2,
  scoreCoverage, formatCoverage, STEP_MAX, tierForScore,
} from '@/lib/fitness-calculations';
import { bandFill, bmiPill, bpPill, domain, gradient, rhrPill, spo2Pill, type Tone } from './fitnessTheme';

type StepKey = 'bp' | 'anthropometric' | 'bodyComposition' | 'cardio' | 'strength' | 'endurance' | 'flexibility';
type PointKey = 'bpPoints' | 'anthropometricPoints' | 'bodyCompositionScore' | 'cardioScore' | 'strengthScore' | 'enduranceScore' | 'mobilityScore';

export interface FitnessScores {
  bpPoints: number | null;
  anthropometricPoints: number | null;
  bodyCompositionScore: number | null;
  cardioScore: number | null;
  strengthScore: number | null;
  enduranceScore: number | null;
  mobilityScore: number | null;
  /** The 0-100 headline, scaled over `overallMax`; partial by design. */
  overallScore: number | null;
  overallPoints: number | null;
  overallMax: number | null;
  /** What each step actually measured. A battery can measure less than the
   *  step's fixed max (one strength slot, three ROM tests), so the tile divides
   *  by this — otherwise a perfect step reads as a failing one. Absent on rows
   *  read back from storage, which fall back to `STEP_MAX`. */
  stepMax?: Partial<Record<StepKey, number>>;
}

/** The resting vitals behind the BP step. Optional: the dashboard still
 *  renders for callers that only have the step scores. */
export interface FitnessVitals {
  bpSystolic: number | null;
  bpDiastolic: number | null;
  bpCategory: string | null;
  restingHeartRate: number | null;
  rhrCategory: string | null;
  restingSpo2: number | null;
  spo2Category: string | null;
}

/** The anthropometric measurements and their norm labels, when the caller has
 *  them. Old saved rows have no stored label, so the caller may supply a
 *  classification derived from the raw measurements. */
export interface FitnessAnthropometric {
  bmi: number | null;
  bmiCategory: string | null;
  waistCm: number | null;
  waistRisk: string | null;
  waistHipRatio: number | null;
  whrRisk: string | null;
}

// Order is load-bearing: these seven are the framework's steps, in order, and
// the radar plots them in this order. `max` is the step's fixed denominator;
// a caller that knows the measured denominator passes it in `stepMax`.
const CATEGORY_META: { key: PointKey; step: StepKey; label: string; max: number; tone: Tone; Icon: LucideIcon }[] = [
  { key: 'bpPoints', step: 'bp', label: 'Blood Pressure', max: STEP_MAX.bp, tone: domain.healthRisk, Icon: HeartPulse },
  { key: 'anthropometricPoints', step: 'anthropometric', label: 'Anthropometrics', max: STEP_MAX.anthropometric, tone: domain.anthropometric, Icon: Ruler },
  { key: 'bodyCompositionScore', step: 'bodyComposition', label: 'Body Comp.', max: STEP_MAX.bodyComposition, tone: domain.bodyComposition, Icon: Activity },
  { key: 'cardioScore', step: 'cardio', label: 'Cardio', max: STEP_MAX.cardio, tone: domain.cardio, Icon: HeartPulse },
  { key: 'strengthScore', step: 'strength', label: 'Strength', max: STEP_MAX.strength, tone: domain.strength, Icon: Dumbbell },
  { key: 'enduranceScore', step: 'endurance', label: 'Endurance', max: STEP_MAX.endurance, tone: domain.endurance, Icon: Repeat },
  // The stored column is still `mobility_score_computed` (backward compat), but
  // the value is the flexibility step, so the card reads "Flexibility".
  { key: 'mobilityScore', step: 'flexibility', label: 'Flexibility', max: STEP_MAX.flexibility, tone: domain.mobility, Icon: Move },
];

/** The step's denominator: what it actually measured when the caller knows,
 *  the framework max otherwise. */
function stepDenom(scores: FitnessScores, step: StepKey, fixed: number): number {
  const measured = scores.stepMax?.[step];
  return measured != null && measured > 0 ? measured : fixed;
}

/** Step points as radar data, each axis plotted as points / fixed max × 100.
 *  A missing step stays null all the way into the radar — never 0, so a
 *  skipped test is a gap, not a measured zero. */
export function radarDataFromScores(scores: FitnessScores): RadarDatum[] {
  return CATEGORY_META.map((c) => {
    const points = scores[c.key];
    return {
      category: c.label,
      score: points == null ? null : Math.round((points / stepDenom(scores, c.step, c.max)) * 1000) / 10,
    };
  });
}

interface FitnessDashboardProps {
  scores: FitnessScores;
  vitals?: FitnessVitals;
  anthropometric?: FitnessAnthropometric;
  /** Athlete context for the resting-heart-rate safety decision only. */
  athlete?: boolean;
}

function VitalTile({ label, value, category, pill }: { label: string; value: string; category: string | null; pill?: { bg: string; color: string } }) {
  return (
    <div className="rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 text-[15px] font-[760] tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {category && (
        <p
          className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-[700]"
          style={pill ?? { color: 'var(--text-secondary)' }}
        >
          {category}
        </p>
      )}
    </div>
  );
}

/** The exercise-safety decision, in the screen where the trainer reads the
 *  numbers. A stage-1 reading used to sit in the same grey as "Normal". */
function VitalsSafetyNotice({ level, reasons }: { level: 'caution' | 'stop'; reasons: string[] }) {
  return (
    <div
      role="status"
      className="rounded-[14px] px-4 py-3"
      style={{ background: level === 'stop' ? 'var(--danger-bg)' : 'var(--warning-bg)' }}
    >
      <p className="text-[12px] font-[760]" style={{ color: level === 'stop' ? 'var(--danger-text)' : 'var(--warning-text)' }}>
        {level === 'stop' ? 'Medical review required before testing' : 'Recheck before testing'}
      </p>
      <ul className="mt-1 space-y-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
        {reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>
    </div>
  );
}

/** The overall score as an activity ring. The ring's length is the score and
 *  its colour is the same band the step bars use, so 40 cannot read green
 *  here and red three cards below. */
function ScoreRing({ score, size = 208 }: { score: number | null; size?: number }) {
  const stroke = 18;
  const r = (size - stroke) / 2;
  const center = size / 2;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={score == null ? 'Overall fitness score not available' : `Overall fitness score ${score} of 100`}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} opacity={0.5} />
        <m.circle
          cx={center} cy={center} r={r} fill="none" stroke={score == null ? 'var(--border)' : bandFill(score)} strokeWidth={stroke}
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
        <span className="mt-2 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Overall Fitness</span>
      </div>
    </div>
  );
}

export function FitnessDashboard({ scores, vitals, anthropometric, athlete = false }: FitnessDashboardProps) {
  const coverage = scoreCoverage(scores);
  const radarData = radarDataFromScores(scores);
  const overall = scores.overallScore;
  const overallPoints = scores.overallPoints;
  const overallMax = scores.overallMax;
  // Seven non-null steps are not a complete battery: a step whose norm is
  // unavailable (unknown sex, no age table) still scores points but adds no
  // max. Only a full 100-point denominator earns an overall tier.
  const isComplete = coverage.isComplete && overallMax === 100;
  const bp = vitals?.bpSystolic != null || vitals?.bpDiastolic != null
    ? `${vitals?.bpSystolic ?? '—'}/${vitals?.bpDiastolic ?? '—'} mmHg` : '—';
  const rhr = vitals?.restingHeartRate != null ? `${vitals.restingHeartRate} bpm` : '—';
  const spo2 = vitals?.restingSpo2 != null ? `${vitals.restingSpo2}%` : '—';
  const bmi = anthropometric?.bmi != null ? String(anthropometric.bmi) : '—';
  const waist = anthropometric?.waistCm != null ? `${anthropometric.waistCm} cm` : '—';
  const whr = anthropometric?.waistHipRatio != null ? String(anthropometric.waistHipRatio) : '—';
  const showAnthropometric = anthropometric != null
    && (anthropometric.bmi != null || anthropometric.waistCm != null || anthropometric.waistHipRatio != null);

  const bpCat = vitals ? classifyBp(vitals.bpSystolic, vitals.bpDiastolic) : null;
  const rhrCat = vitals ? classifyRhr(vitals.restingHeartRate) : null;
  const spo2Cat = vitals ? classifySpo2(vitals.restingSpo2) : null;
  const bmiCat = anthropometric ? classifyBmi(anthropometric.bmi) : null;
  const safety = vitals
    ? assessVitalsSafety({
      systolic: vitals.bpSystolic, diastolic: vitals.bpDiastolic,
      restingHeartRate: vitals.restingHeartRate, restingSpo2: vitals.restingSpo2, athlete,
    })
    : null;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 18px 44px -18px rgba(15,23,42,0.30)' }}>
      <div className="p-7 sm:p-10">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-center">
            <ScoreRing score={overall} />
            {isComplete ? (
              overall != null && (
                <p className="mt-4 text-center text-[15px] font-[780]" style={{ color: 'var(--text-primary)' }}>
                  {tierForScore(overall)}
                </p>
              )
            ) : (
              <p className="mt-4 text-center text-[11px] font-[700] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
                No overall tier
              </p>
            )}
            <p className="mt-1.5 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {coverage.available === 0 || overallMax == null || overallPoints == null
                ? 'No steps scored yet — no overall score.'
                : `${formatCoverage(coverage)} · ${overallPoints} of ${overallMax} points`}
            </p>
          </div>
          <FitnessRadarChart data={radarData} height={250} variant="onCard" />
        </div>

        {safety && safety.level !== 'safe' && (
          <div className="mt-6"><VitalsSafetyNotice level={safety.level} reasons={safety.reasons} /></div>
        )}

        {vitals && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <VitalTile label="Blood Pressure" value={bp} category={vitals.bpCategory} pill={bpCat ? bpPill(bpCat) : undefined} />
            <VitalTile label="Resting Heart Rate" value={rhr} category={vitals.rhrCategory} pill={rhrCat ? rhrPill(rhrCat) : undefined} />
            <VitalTile label="Resting SpO₂" value={spo2} category={vitals.spo2Category} pill={spo2Cat ? spo2Pill(spo2Cat) : undefined} />
          </div>
        )}

        {showAnthropometric && anthropometric && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <VitalTile label="BMI" value={bmi} category={anthropometric.bmiCategory} pill={bmiCat ? bmiPill(bmiCat) : undefined} />
            <VitalTile label="Waist (Iliac)" value={waist} category={anthropometric.waistRisk} />
            <VitalTile label="Waist-Hip Ratio" value={whr} category={anthropometric.whrRisk} />
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORY_META.map(({ key, step, label, max: fixedMax, tone, Icon }) => {
            const points = scores[key];
            const max = stepDenom(scores, step, fixedMax);
            const pct = points == null ? null : (points / max) * 100;
            const tier = pct == null ? null : tierForScore(pct);
            return (
              <div
                key={key}
                className="min-w-0 rounded-[18px] p-3.5 last:col-span-2 min-[380px]:p-4 sm:last:col-span-1"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[11px] text-white" style={{ background: gradient(tone) }}>
                  <Icon size={16} />
                </span>
                <p className="mt-2.5 truncate text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                <p className="mt-1.5 whitespace-nowrap text-[20px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: points == null ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {points == null ? '—' : `${points} / ${max}`}
                </p>
                <p className="mt-1 text-[11px] font-[600] leading-tight" style={{ color: 'var(--text-secondary)' }}>
                  {tier ?? 'Not measured'}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" aria-hidden="true" style={{ background: 'var(--border)' }}>
                  {pct != null && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%`, minWidth: points != null && points > 0 ? 4 : undefined, background: bandFill(pct) }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Optimal 85+ · Fit 70–84 · Moderate 50–69 · Needs attention below 50.
        </p>
      </div>
    </div>
  );
}

export default FitnessDashboard;
