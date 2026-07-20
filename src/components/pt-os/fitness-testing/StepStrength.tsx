'use client';

import { useMemo } from 'react';
import { Dumbbell, Info } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { calc1RM, classifyStrength, scoreCategory } from '@/lib/fitness-calculations';
import type { Gender } from '@/lib/fitness-calculations';
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

export function StepStrength({ form, set, gender, error, isBeginner }: StepStrengthProps) {
  const estimated1RM = useMemo(
    () => calc1RM(n(form.strengthWeightKg), n(form.strengthReps), form.strengthFormula),
    [form.strengthWeightKg, form.strengthReps, form.strengthFormula],
  );
  const oneRM = form.strengthMode === 'direct' ? n(form.strengthDirect1RM) : estimated1RM;
  const strengthCategory = useMemo(
    () => classifyStrength(oneRM, n(form.weight), form.strengthExercise || null, gender),
    [oneRM, form.weight, form.strengthExercise, gender],
  );
  const strengthScore = scoreCategory(strengthCategory);

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Dumbbell size={20} color="#F59E0B" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Muscular Strength</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">
            Step 5 of 7 — {isBeginner ? 'optional one-rep max test.' : 'one-rep max test.'}
          </p>
        </div>
      </div>

      {isBeginner && (
        <div className="mb-6 flex items-start gap-2.5 rounded-[14px] p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <Info size={15} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: '#92400e' }}>
            This client&apos;s workout experience is set to <strong>Beginner</strong> — a 1RM strength test isn&apos;t required at this stage. Skip ahead with Next, or record a baseline anyway if you&apos;d like one.
          </p>
        </div>
      )}

      <div className="mb-5">
        <SearchableSelect
          label="Exercise" required={!isBeginner} allowCustom={false}
          value={form.strengthExercise}
          onChange={(v) => set('strengthExercise', v as StrengthExercise)}
          options={EXERCISES}
        />
        {form.strengthExercise === 'Custom Exercise' && (
          <div className="mt-3">
            <FloatInput label="Custom Exercise Name" value={form.strengthCustomExercise} onChange={(v) => set('strengthCustomExercise', v)} />
          </div>
        )}
      </div>

      <div className="mb-5 flex gap-2">
        {(['estimated', 'direct'] as const).map((mode) => (
          <button
            key={mode} type="button"
            onClick={() => set('strengthMode', mode)}
            className="rounded-[11px] px-4 py-2.5 text-[13px] font-[660] transition-all duration-200"
            style={{
              background: form.strengthMode === mode ? '#0f172a' : '#f8fafc',
              color: form.strengthMode === mode ? '#fff' : '#64748b',
              border: form.strengthMode === mode ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
            }}
          >
            {mode === 'estimated' ? 'Estimated 1RM' : 'Direct 1RM'}
          </button>
        ))}
      </div>

      {form.strengthMode === 'estimated' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatInput label="Weight Lifted (kg)" type="number" value={form.strengthWeightKg} onChange={(v) => set('strengthWeightKg', v)} />
            <FloatInput label="Repetitions" type="number" value={form.strengthReps} onChange={(v) => set('strengthReps', v)} />
          </div>
          <div className="mt-4">
            <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Formula</p>
            <div className="flex gap-2">
              {(['epley', 'brzycki'] as const).map((f) => (
                <button
                  key={f} type="button"
                  onClick={() => set('strengthFormula', f)}
                  className="rounded-[10px] px-3.5 py-2 text-[12px] font-[640] capitalize transition-all"
                  style={{
                    background: form.strengthFormula === f ? '#F59E0B' : '#f8fafc',
                    color: form.strengthFormula === f ? '#fff' : '#64748b',
                    border: form.strengthFormula === f ? '1.5px solid #F59E0B' : '1.5px solid #e2e8f0',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <FloatInput label="Direct 1RM (kg)" type="number" value={form.strengthDirect1RM} onChange={(v) => set('strengthDirect1RM', v)} />
      )}

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

      {oneRM != null && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
          <div>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider text-slate-400">
              {form.strengthMode === 'direct' ? 'Direct 1RM' : 'Estimated 1RM'}
            </p>
            <p className="text-[18px] font-[800] text-slate-900">{oneRM} kg</p>
          </div>
          {strengthCategory && (
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
              {strengthCategory} · Score {strengthScore}
            </span>
          )}
          {!strengthCategory && !n(form.weight) && (
            <p className="text-[11px] text-slate-400">Enter weight in the Anthropometric step to classify strength level.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default StepStrength;
