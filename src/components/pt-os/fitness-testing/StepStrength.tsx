'use client';

import { useMemo } from 'react';
import { Dumbbell, Info } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { calc1RM, classifyStrengthDetail, scoreCategory, scoreTestBattery } from '@/lib/fitness-calculations';
import type { Gender, FitnessCategory, StrengthPercentile } from '@/lib/fitness-calculations';
import type { AssessmentFormData, StrengthExercise } from './types';
import { n } from './types';
import { StepHeader } from './StepHeader';
import { categoryPill, gradient, stepTones } from './fitnessTheme';
import { strengthCategoryGap } from './strengthGuidance';

const EXERCISES: StrengthExercise[] = ['Bench Press', 'Leg Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Custom Exercise'];

const TONE = stepTones[5];

interface StepStrengthProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  gender: Gender | null;
  /** Age at the time of testing — the K11 norms are age-banded. */
  age: number | null;
  error?: string;
  /** True when the client's workout experience is 'beginner' — a 1RM test
   *  isn't expected at that stage, so this step becomes optional. */
  isBeginner?: boolean;
}

interface TestResult {
  oneRM: number | null;
  category: FitnessCategory | null;
  percentile: StrengthPercentile | null;
}

function useTestResult(
  exercise: StrengthExercise | '', mode: 'direct' | 'estimated',
  weightKg: string, reps: string, formula: 'brzycki' | 'epley', direct1RM: string,
  bodyWeight: number | null, gender: Gender | null, age: number | null,
): TestResult {
  const estimated = calc1RM(n(weightKg), n(reps), formula);
  const oneRM = mode === 'direct' ? n(direct1RM) : estimated;
  const detail = classifyStrengthDetail(oneRM, bodyWeight, exercise || null, gender, age);
  return { oneRM, category: detail?.category ?? null, percentile: detail?.percentile ?? null };
}

const percentileLabel = (percentile: StrengthPercentile): string => `${percentile}th percentile`;

export function StepStrength({ form, set, gender, age, error, isBeginner }: StepStrengthProps) {
  const bodyWeight = n(form.weight);
  const t1 = useTestResult(form.strengthExercise, form.strengthMode, form.strengthWeightKg, form.strengthReps, form.strengthFormula, form.strengthDirect1RM, bodyWeight, gender, age);
  const t2 = useTestResult(form.strengthExercise2, form.strengthMode2, form.strengthWeightKg2, form.strengthReps2, form.strengthFormula2, form.strengthDirect1RM2, bodyWeight, gender, age);
  const combinedScore = useMemo(
    () => scoreTestBattery(scoreCategory(t1.category), scoreCategory(t2.category)),
    [t1.category, t2.category],
  );
  const p1 = t1.category ? categoryPill(t1.category) : null;
  const p2 = t2.category ? categoryPill(t2.category) : null;

  // Each test picks from the full list minus whatever the other test
  // already has selected — structurally prevents picking the same exercise
  // twice, same guard Muscular Endurance already uses.
  const options1 = EXERCISES.filter((e) => e !== form.strengthExercise2);
  const options2 = EXERCISES.filter((e) => e !== form.strengthExercise);
  // Why a lift that has a 1RM and a body weight still has no category: the K11
  // tables need an age 20+, a supported sex, and Bench Press or Leg Press.
  // One reason per test, deduplicated, so a classified test never hides why
  // the other one is unclassified.
  const categoryGaps = [...new Set([
    strengthCategoryGap(form.strengthExercise || null, t1.oneRM, t1.category, bodyWeight, gender, age),
    strengthCategoryGap(form.strengthExercise2 || null, t2.oneRM, t2.category, bodyWeight, gender, age),
  ].filter((gap): gap is string => gap != null))];

  return (
    <div>
      <StepHeader
        icon={Dumbbell}
        tone={TONE}
        title="Muscular Strength"
        subtitle={`Step 5 of 7 — ${isBeginner ? 'optional; two one-rep max tests.' : 'two one-rep max tests, e.g. an upper-body lift plus a lower-body lift.'}`}
      />

      {isBeginner && (
        <div className="mb-6 flex items-start gap-2.5 rounded-[14px] p-4" style={{ background: 'rgba(163,55,87,0.06)', border: '1px solid rgba(163,55,87,0.18)' }}>
          <Info size={15} style={{ color: '#852E4E', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            This client&apos;s workout experience is set to <strong>Beginner</strong>. K11 guidance is that beginners should not undergo an initial maximal 1RM test — the priority is learning movement patterns and technique. Skip this step with Next and use the technique-focused alternative: log a comfortable submaximal set (8–12 reps) in <strong>Strength Tracking</strong> instead.
          </p>
        </div>
      )}

      <div className="space-y-5">
        <StrengthTestBlock
          label="Test 1" options={options1} isBeginner={isBeginner}
          exercise={form.strengthExercise} onExercise={(v) => set('strengthExercise', v as StrengthExercise)}
          customExercise={form.strengthCustomExercise} onCustomExercise={(v) => set('strengthCustomExercise', v)}
          mode={form.strengthMode} onMode={(v) => set('strengthMode', v)}
          weightKg={form.strengthWeightKg} onWeightKg={(v) => set('strengthWeightKg', v)}
          reps={form.strengthReps} onReps={(v) => set('strengthReps', v)}
          formula={form.strengthFormula} onFormula={(v) => set('strengthFormula', v)}
          direct1RM={form.strengthDirect1RM} onDirect1RM={(v) => set('strengthDirect1RM', v)}
          result={t1}
        />
        <StrengthTestBlock
          label="Test 2" options={options2} isBeginner={isBeginner}
          exercise={form.strengthExercise2} onExercise={(v) => set('strengthExercise2', v as StrengthExercise)}
          customExercise={form.strengthCustomExercise2} onCustomExercise={(v) => set('strengthCustomExercise2', v)}
          mode={form.strengthMode2} onMode={(v) => set('strengthMode2', v)}
          weightKg={form.strengthWeightKg2} onWeightKg={(v) => set('strengthWeightKg2', v)}
          reps={form.strengthReps2} onReps={(v) => set('strengthReps2', v)}
          formula={form.strengthFormula2} onFormula={(v) => set('strengthFormula2', v)}
          direct1RM={form.strengthDirect1RM2} onDirect1RM={(v) => set('strengthDirect1RM2', v)}
          result={t2}
        />
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      {combinedScore != null && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-[18px] p-5" style={{ background: TONE.wash, border: '1px solid var(--border)' }}>
          <div>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Combined Strength Score</p>
            <p className="mt-1 text-[24px] font-[820] leading-none tabular-nums tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{combinedScore}</p>
          </div>
          {t1.category && p1 && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: p1.bg, color: p1.color }}>
              {form.strengthExercise}: {t1.category}{t1.percentile != null ? ` · ${percentileLabel(t1.percentile)}` : ''}
            </span>
          )}
          {t2.category && p2 && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: p2.bg, color: p2.color }}>
              {form.strengthExercise2}: {t2.category}{t2.percentile != null ? ` · ${percentileLabel(t2.percentile)}` : ''}
            </span>
          )}
          {!t1.category && !t2.category && !bodyWeight && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Enter weight in the Anthropometric step to classify strength level.</p>
          )}
          {categoryGaps.map((gap) => (
            <p key={gap} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{gap}</p>
          ))}
        </div>
      )}
    </div>
  );
}

interface StrengthTestBlockProps {
  label: string;
  options: StrengthExercise[];
  isBeginner?: boolean;
  exercise: StrengthExercise | '';
  onExercise: (v: string) => void;
  customExercise: string;
  onCustomExercise: (v: string) => void;
  mode: 'direct' | 'estimated';
  onMode: (v: 'direct' | 'estimated') => void;
  weightKg: string; onWeightKg: (v: string) => void;
  reps: string; onReps: (v: string) => void;
  formula: 'brzycki' | 'epley'; onFormula: (v: 'brzycki' | 'epley') => void;
  direct1RM: string; onDirect1RM: (v: string) => void;
  result: TestResult;
}

function StrengthTestBlock({
  label, options, isBeginner, exercise, onExercise, customExercise, onCustomExercise,
  mode, onMode, weightKg, onWeightKg, reps, onReps, formula, onFormula, direct1RM, onDirect1RM, result,
}: StrengthTestBlockProps) {
  const pill = result.category ? categoryPill(result.category) : null;

  return (
    <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-[4px]" style={{ background: gradient(TONE) }} aria-hidden />
        <p className="text-[11.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>

      <div className="mb-4">
        <SearchableSelect label="Exercise" required={!isBeginner} allowCustom={false} value={exercise} onChange={onExercise} options={options} />
        {exercise === 'Custom Exercise' && (
          <div className="mt-3">
            <FloatInput label="Custom Exercise Name" maxLength={100} value={customExercise} onChange={onCustomExercise} />
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {(['estimated', 'direct'] as const).map((m) => (
          <button
            key={m} type="button"
            onClick={() => onMode(m)}
            className="rounded-[11px] px-4 py-2.5 text-[13px] font-[660] transition-all duration-200"
            style={{
              background: mode === m ? 'var(--text-primary)' : 'var(--bg-card)',
              color: mode === m ? 'var(--bg-card)' : 'var(--text-muted)',
              border: mode === m ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
            }}
          >
            {m === 'estimated' ? 'Estimated 1RM' : 'Direct 1RM'}
          </button>
        ))}
      </div>

      {mode === 'estimated' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatInput label="Weight Lifted (kg)" numeric="decimal" value={weightKg} onChange={onWeightKg} />
            <FloatInput label="Repetitions" numeric="integer" value={reps} onChange={onReps} />
          </div>
          <div className="mt-4">
            <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Formula</p>
            <div className="flex gap-2">
              {(['epley', 'brzycki'] as const).map((f) => (
                <button
                  key={f} type="button"
                  onClick={() => onFormula(f)}
                  className="rounded-[10px] px-3.5 py-2 text-[12px] font-[640] capitalize transition-all"
                  style={{
                    background: formula === f ? '#A33757' : 'var(--bg-card)',
                    color: formula === f ? 'var(--bg-card)' : 'var(--text-muted)',
                    border: formula === f ? '1.5px solid #A33757' : '1.5px solid var(--border)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <FloatInput label="Direct 1RM (kg)" numeric="decimal" value={direct1RM} onChange={onDirect1RM} />
      )}

      {result.oneRM != null && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] font-[700]" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'direct' ? 'Direct 1RM' : 'Estimated 1RM'}: {result.oneRM} kg
          </span>
          {result.category && pill && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: pill.bg, color: pill.color }}>
              {result.category}{result.percentile != null ? ` · ${percentileLabel(result.percentile)}` : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default StepStrength;
