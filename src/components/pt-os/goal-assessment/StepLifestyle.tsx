'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import FloatInput from '@/components/ui/FloatInput';
import { ArrowUpRight, HeartHandshake } from 'lucide-react';
import GoalStepCard from './GoalStepCard';
import { amber, emerald, gray, red, tint, indigo } from '@/lib/palette';
import { calcLifestyleReadinessScore } from '@/lib/goal-calculations';
import type { ClientContext, GoalFormData, LifestyleAnswers } from './types';

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
  context: ClientContext;
  clientId: string;
  error?: string;
}

const SCREEN_TIME: Record<string, string> = {
  '<2': 'under 2 h/day', '2_4': '2–4 h/day', '4_6': '4–6 h/day', '6_8': '6–8 h/day', '8_plus': '8+ h/day',
};
const MEAL_REGULARITY: Record<string, string> = {
  regular: 'Regular', irregular: 'Irregular', inconsistent: 'Frequently skipped',
};
const SMOKING: Record<string, string> = { never: 'Never', occasionally: 'Occasionally', daily: 'Daily', former: 'Former' };
const ALCOHOL: Record<string, string> = { never: 'Never', occasionally: 'Occasionally', weekly: 'Weekly', frequently: 'Frequently' };

/** The records the panel above reads — one link per owner, not one per row. */
const SOURCES = [
  { label: 'Interview', path: 'interview' },
  { label: 'Lifestyle', path: 'lifestyle-assessment' },
  { label: 'Nutrition', path: 'nutrition-assessment' },
];

function contextRows(c: ClientContext): { label: string; value: string }[] {
  return [
    { label: 'Occupation', value: c.occupation || '—' },
    { label: 'Sitting / day', value: c.sittingHours != null ? `${c.sittingHours} h` : '—' },
    { label: 'Sedentary risk', value: c.sedentaryRisk || '—' },
    { label: 'Screen time', value: c.screenTime ? (SCREEN_TIME[c.screenTime] || c.screenTime) : '—' },
    { label: 'Sleep / night', value: c.sleepHours != null ? `${c.sleepHours} h` : '—' },
    { label: 'Stress level', value: c.stressLevel != null ? `${c.stressLevel} / 10` : '—' },
    { label: 'Meal timing', value: c.mealRegularity ? (MEAL_REGULARITY[c.mealRegularity] || c.mealRegularity) : '—' },
    { label: 'Diet preferences', value: c.dietPreferences.length ? c.dietPreferences.join(', ') : '—' },
    { label: 'Allergies / restrictions', value: c.foodAllergies.length ? c.foodAllergies.join(', ') : '—' },
    { label: 'Smoking / alcohol', value: [c.smoking ? SMOKING[c.smoking] || c.smoking : null, c.alcohol ? ALCOHOL[c.alcohol] || c.alcohol : null].filter(Boolean).join(' · ') || '—' },
  ];
}

export function StepLifestyle({ form, set, step, context, clientId, error }: StepLifestyleProps) {
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
        <div className="rounded-[18px] p-5" style={{ background: tint(indigo[500], 0.05), border: `1px solid ${tint(indigo[500], 0.18)}` }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-[760]" style={{ color: gray[800] }}>Client context</p>
              <p className="mt-1 text-[12px]" style={{ color: gray[500] }}>
                K11 lifestyle screening, read from the records that already own it.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <Link
                  key={s.path}
                  href={`/pt-os/${s.path}?client_id=${encodeURIComponent(clientId)}`}
                  className="inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-[700]"
                  style={{ background: 'var(--bg-card)', color: indigo[700], border: `1px solid ${tint(indigo[500], 0.25)}` }}
                >
                  {s.label} <ArrowUpRight size={11} />
                </Link>
              ))}
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {contextRows(context).map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 border-b py-1.5" style={{ borderColor: gray[100] }}>
                <dt className="text-[11.5px] font-[600]" style={{ color: gray[500] }}>{row.label}</dt>
                <dd className="text-right text-[12px] font-[700]" style={{ color: row.value === '—' ? gray[400] : gray[700] }}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

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
