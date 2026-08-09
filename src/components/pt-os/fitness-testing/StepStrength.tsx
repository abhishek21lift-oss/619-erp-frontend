'use client';

import { useMemo } from 'react';
import { Dumbbell, Info } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { calc1RM, classifyStrength, scoreCategory, scoreTestBattery } from '@/lib/fitness-calculations';
import type { Gender, FitnessCategory } from '@/lib/fitness-calculations';
import type { AssessmentFormData, StrengthExercise } from './types';
import { n } from './types';

const EXERCISES: StrengthExercise[] = ['Bench Press', 'Leg Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Custom Exercise'];

interface StepStrengthProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  gender: Gender | null;
  error?: string;
  /** True when the client's workout experience is 'beginner' — a 1RM test
   *  isn't expected at that stage, so this step becomes optional. */
  isBeginner?: boolean;
}

interface TestResult {
  oneRM: number | null;
  category: FitnessCategory | null;
}

function useTestResult(
  exercise: StrengthExercise | '', mode: 'direct' | 'estimated',
  weightKg: string, reps: string, formula: 'brzycki' | 'epley', direct1RM: string,
  bodyWeight: number | null, gender: Gender | null,
): TestResult {
  const estimated = calc1RM(n(weightKg), n(reps), formula);
  const oneRM = mode === 'direct' ? n(direct1RM) : estimated;
  const category = classifyStrength(oneRM, bodyWeight, exercise || null, gender);
  return { oneRM, category };
}

export function StepStrength({ form, set, gender, error, isBeginner }: StepStrengthProps) {
  const bodyWeight = n(form.weight);
  const t1 = useTestResult(form.strengthExercise, form.strengthMode, form.strengthWeightKg, form.strengthReps, form.strengthFormula, form.strengthDirect1RM, bodyWeight, gender);
  const t2 = useTestResult(form.strengthExercise2, form.strengthMode2, form.strengthWeightKg2, form.strengthReps2, form.strengthFormula2, form.strengthDirect1RM2, bodyWeight, gender);
  const combinedScore = useMemo(
    () => scoreTestBattery(scoreCategory(t1.category), scoreCategory(t2.category)),
    [t1.category, t2.category],
  );

  // Each test picks from the full list minus whatever the other test
  // already has selected — structurally prevents picking the same exercise
  // twice, same guard Muscular Endurance already uses.
  const options1 = EXERCISES.filter((e) => e !== form.strengthExercise2);
  const options2 = EXERCISES.filter((e) => e !== form.strengthExercise);

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Dumbbell size={20} color="#1CA3F9" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Muscular Strength</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">
            Step 5 of 7 — {isBeginner ? 'optional; two one-rep max tests.' : 'two one-rep max tests, e.g. an upper-body lift plus a lower-body lift.'}
          </p>
        </div>
      </div>

      {isBeginner && (
        <div className="mb-6 flex items-start gap-2.5 rounded-[14px] p-4" style={{ background: 'rgba(0,103,224,0.06)', border: '1px solid rgba(0,103,224,0.18)' }}>
          <Info size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: '#92400e' }}>
            This client&apos;s workout experience is set to <strong>Beginner</strong> — 1RM strength tests aren&apos;t required at this stage. Skip ahead with Next, or record a baseline anyway if you&apos;d like one.
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
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
          <div>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider text-slate-400">Combined Strength Score</p>
            <p className="text-[18px] font-[800] text-slate-900">{combinedScore}</p>
          </div>
          {t1.category && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
              {form.strengthExercise}: {t1.category}
            </span>
          )}
          {t2.category && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
              {form.strengthExercise2}: {t2.category}
            </span>
          )}
          {!t1.category && !t2.category && !bodyWeight && (
            <p className="text-[11px] text-slate-400">Enter weight in the Anthropometric step to classify strength level.</p>
          )}
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
  return (
    <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <p className="mb-3 text-[11.5px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>

      <div className="mb-4">
        <SearchableSelect label="Exercise" required={!isBeginner} allowCustom={false} value={exercise} onChange={onExercise} options={options} />
        {exercise === 'Custom Exercise' && (
          <div className="mt-3">
            <FloatInput label="Custom Exercise Name" value={customExercise} onChange={onCustomExercise} />
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
              background: mode === m ? '#0f172a' : '#fff',
              color: mode === m ? '#fff' : '#64748b',
              border: mode === m ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
            }}
          >
            {m === 'estimated' ? 'Estimated 1RM' : 'Direct 1RM'}
          </button>
        ))}
      </div>

      {mode === 'estimated' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatInput label="Weight Lifted (kg)" type="number" value={weightKg} onChange={onWeightKg} />
            <FloatInput label="Repetitions" type="number" value={reps} onChange={onReps} />
          </div>
          <div className="mt-4">
            <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Formula</p>
            <div className="flex gap-2">
              {(['epley', 'brzycki'] as const).map((f) => (
                <button
                  key={f} type="button"
                  onClick={() => onFormula(f)}
                  className="rounded-[10px] px-3.5 py-2 text-[12px] font-[640] capitalize transition-all"
                  style={{
                    background: formula === f ? '#0067E0' : '#fff',
                    color: formula === f ? '#fff' : '#64748b',
                    border: formula === f ? '1.5px solid #0067E0' : '1.5px solid #e2e8f0',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <FloatInput label="Direct 1RM (kg)" type="number" value={direct1RM} onChange={onDirect1RM} />
      )}

      {result.oneRM != null && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] font-[700] text-slate-700">
            {mode === 'direct' ? 'Direct 1RM' : 'Estimated 1RM'}: {result.oneRM} kg
          </span>
          {result.category && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>{result.category}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default StepStrength;
