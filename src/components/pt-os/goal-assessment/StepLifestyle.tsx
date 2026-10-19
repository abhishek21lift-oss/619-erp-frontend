'use client';

import { useMemo } from 'react';
import FloatInput from '@/components/ui/FloatInput';
import { HeartHandshake } from 'lucide-react';
import GoalStepCard from './GoalStepCard';
import { amber, emerald, gray, red } from '@/lib/palette';
import { calcLifestyleReadinessScore } from '@/lib/goal-calculations';
import type { GoalFormData, LifestyleAnswers } from './types';

const READINESS: { key: keyof LifestyleAnswers; label: string; hint: string }[] = [
  { key: 'can_train_4_6_days', label: 'Can train 4–6 days/week', hint: 'Enough free days to hit the target frequency' },
  { key: 'meal_prep_possible', label: 'Meal prep possible', hint: 'Can prepare food ahead of the training week' },
  { key: 'sleep_7_8_hours', label: 'Sleep 7–8 hours', hint: 'Nightly sleep on a normal week' },
  { key: 'drink_enough_water', label: 'Drink enough water', hint: 'Around 2.5 L a day' },
  { key: 'family_support', label: 'Family support', hint: 'People at home back the plan' },
  { key: 'medical_restrictions', label: 'Medical restrictions', hint: 'Doctor-restricted activity — answer Yes if any' },
];

// Shaping only: the readiness score is computed from the six questions above
// and their backend twin, so adding keys here cannot move a stored score.
const ROUTINE: { key: keyof LifestyleAnswers; label: string; hint: string }[] = [
  { key: 'consistent_schedule', label: 'Same routine most days', hint: 'Work, meals and sleep follow a repeatable shape' },
  { key: 'regular_training_time', label: 'Has a regular time to train', hint: 'A slot that survives a busy week' },
  { key: 'stress_managed', label: 'Stress under control', hint: 'Current load is manageable' },
  { key: 'willing_to_track', label: 'Willing to log food / workouts', hint: 'Will record what they eat and train' },
];

function scoreColor(score: number): string {
  if (score >= 70) return emerald[500];
  if (score >= 40) return amber[500];
  return red[500];
}

interface StepLifestyleProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  error?: string;
}

export function StepLifestyle({ form, set, step, error }: StepLifestyleProps) {
  const score = useMemo(() => calcLifestyleReadinessScore(form.lifestyle), [form.lifestyle]);

  const setAnswer = (key: keyof LifestyleAnswers, value: boolean) => {
    set('lifestyle', { ...form.lifestyle, [key]: value });
  };

  const group = (questions: typeof READINESS, title: string, hint: string) => (
    <div>
      <p className="text-[13px] font-[760]" style={{ color: gray[800] }}>{title}</p>
      <p className="mb-3 mt-1 text-[12px]" style={{ color: gray[500] }}>{hint}</p>
      <div className="space-y-3">
        {questions.map((q) => {
          const val = form.lifestyle[q.key];
          return (
            <div key={q.key} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3" style={{ background: gray[50] }}>
              <div className="min-w-0">
                <p className="text-[13.5px] font-[640]" style={{ color: 'var(--text-secondary)' }}>{q.label}</p>
                <p className="text-[11.5px]" style={{ color: gray[500] }}>{q.hint}</p>
              </div>
              <div className="flex gap-2">
                {(['Yes', 'No'] as const).map((opt) => {
                  const boolVal = opt === 'Yes';
                  const selected = val === boolVal;
                  return (
                    <button
                      key={opt} type="button"
                      onClick={() => setAnswer(q.key, boolVal)}
                      aria-pressed={selected}
                      className="rounded-[9px] px-4 py-1.5 text-[12.5px] font-[700] transition-all"
                      style={{
                        background: selected ? gray[900] : 'var(--bg-card)',
                        color: selected ? '#fff' : gray[500],
                        border: selected ? `1.5px solid ${gray[900]}` : `1.5px solid ${gray[200]}`,
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <GoalStepCard
      icon={HeartHandshake} title="Lifestyle & Daily Routine" step={step}
      hint="what the week actually looks like"
      badge={score != null ? (
        <div className="text-right">
          <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>Readiness</p>
          <p className="text-[20px] font-[900] leading-none" style={{ color: scoreColor(score) }}>{score}%</p>
        </div>
      ) : undefined}
    >
      <div className="space-y-6">
        {group(READINESS, 'Readiness', 'These six drive the readiness score and the risk factors in the review.')}
        {group(ROUTINE, 'Daily routine', 'These shape the plan. They do not change the readiness score.')}

        {/* Notes were saved with every goal but had no box to type in. */}
        <div>
          <FloatInput label="Notes (optional)" multiline autoGrow maxLength={2000} value={form.notes} onChange={(v) => set('notes', v)} />
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
      </div>
    </GoalStepCard>
  );
}

export default StepLifestyle;
