'use client';

import { ArrowDown, ArrowUp, Dumbbell, Plus, Trash2, Wind, Zap } from 'lucide-react';
import { Button, FloatInput } from '@/components/ui';
import { emptyPlanExercise } from './types';
import type { CorrectivePlan, PlanExercise, PlanSection, PostureFormData } from './types';

interface StepCorrectivePlanProps {
  form: PostureFormData;
  set: <K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => void;
}

const SECTION_META: Record<PlanSection, { title: string; subtitle: string; icon: typeof Wind }> = {
  mobility: { title: 'Mobility & Flexibility', subtitle: 'Restore range where the screen suggests restriction.', icon: Wind },
  activation: { title: 'Muscle Activation', subtitle: 'Wake up the muscles the client is not recruiting.', icon: Zap },
  strengthening: { title: 'Strengthening', subtitle: 'Build capacity in the new range.', icon: Dumbbell },
};

const FIELDS: Record<PlanSection, { key: keyof PlanExercise; label: string }[]> = {
  mobility: [
    { key: 'exercise', label: 'Exercise' },
    { key: 'targetMuscle', label: 'Target muscle' },
    { key: 'region', label: 'Body region' },
    { key: 'duration', label: 'Duration' },
    { key: 'sets', label: 'Sets' },
    { key: 'reps', label: 'Repetitions' },
    { key: 'frequency', label: 'Frequency' },
  ],
  activation: [
    { key: 'exercise', label: 'Activation exercise' },
    { key: 'targetMuscle', label: 'Target muscle' },
    { key: 'sets', label: 'Sets' },
    { key: 'reps', label: 'Repetitions' },
    { key: 'hold', label: 'Hold duration' },
    { key: 'frequency', label: 'Frequency' },
  ],
  strengthening: [
    { key: 'exercise', label: 'Exercise' },
    { key: 'targetMuscle', label: 'Target muscle' },
    { key: 'sets', label: 'Sets' },
    { key: 'reps', label: 'Repetitions' },
    { key: 'resistance', label: 'Resistance' },
    { key: 'tempo', label: 'Tempo' },
    { key: 'rest', label: 'Rest' },
    { key: 'frequency', label: 'Weekly frequency' },
  ],
};

const RECOMMENDATION_FIELDS: { key: keyof CorrectivePlan['recommendations']; label: string }[] = [
  { key: 'general', label: 'General recommendations' },
  { key: 'modifications', label: 'Movement modifications' },
  { key: 'precautions', label: 'Exercise precautions' },
  { key: 'follow_up', label: 'Follow-up recommendations' },
  { key: 'additional', label: 'Additional comments' },
];

function updateList(plan: CorrectivePlan, section: PlanSection, list: PlanExercise[]): CorrectivePlan {
  return { ...plan, [section]: list };
}

function ExerciseSection({
  section, plan, onChange,
}: { section: PlanSection; plan: CorrectivePlan; onChange: (plan: CorrectivePlan) => void }) {
  const meta = SECTION_META[section];
  const Icon = meta.icon;
  const list = plan[section];

  const patch = (id: string, key: keyof PlanExercise, value: string) => {
    onChange(updateList(plan, section, list.map((e) => (e.id === id ? { ...e, [key]: value } : e))));
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...list];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(updateList(plan, section, next));
  };

  return (
    <section className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'rgba(163,55,87,0.10)', color: '#A33757' }}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>{meta.title}</h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{meta.subtitle}</p>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-[750]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          {list.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {list.map((entry, index) => (
          <div key={entry.id} className="rounded-[13px] p-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-[750] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                {index + 1}. {entry.exercise || 'New entry'}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-30"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }} aria-label={`Move ${entry.exercise || 'entry'} up`}>
                  <ArrowUp size={12} />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] disabled:opacity-30"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }} aria-label={`Move ${entry.exercise || 'entry'} down`}>
                  <ArrowDown size={12} />
                </button>
                <button type="button" onClick={() => onChange(updateList(plan, section, list.filter((e) => e.id !== entry.id)))}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px]"
                  style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }} aria-label={`Remove ${entry.exercise || 'entry'}`}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {FIELDS[section].map((field) => (
                <FloatInput
                  key={field.key}
                  label={field.label}
                  maxLength={field.key === 'instructions' ? 1000 : 120}
                  value={String(entry[field.key] ?? '')}
                  onChange={(v) => patch(entry.id, field.key, v)}
                />
              ))}
            </div>
            <div className="mt-2.5">
              <FloatInput
                label="Trainer instructions"
                multiline
                autoGrow
                maxLength={1000}
                value={entry.instructions}
                onChange={(v) => patch(entry.id, 'instructions', v)}
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2.5"
        iconLeft={<Plus size={13} />}
        onClick={() => onChange(updateList(plan, section, [...list, emptyPlanExercise()]))}
      >
        Add {section === 'mobility' ? 'mobility' : section === 'activation' ? 'activation' : 'strengthening'} exercise
      </Button>
    </section>
  );
}

export function StepCorrectivePlan({ form, set }: StepCorrectivePlanProps) {
  const plan = form.correctivePlan;
  return (
    <div className="space-y-4">
      <section className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <h3 className="text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>Assessment Summary</h3>
        <p className="mb-3 mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          The trainer's read of what was recorded. This is the narrative the report leads with.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <FloatInput label="Primary concern" maxLength={1000} value={form.summary.primaryConcern}
            onChange={(v) => set('summary', { ...form.summary, primaryConcern: v })} />
          <FloatInput label="Secondary concern" maxLength={1000} value={form.summary.secondaryConcern}
            onChange={(v) => set('summary', { ...form.summary, secondaryConcern: v })} />
        </div>
        <div className="mt-2.5 space-y-2.5">
          <FloatInput label="Trainer's overall assessment" multiline autoGrow maxLength={3000}
            value={form.summary.trainerAssessment}
            onChange={(v) => set('summary', { ...form.summary, trainerAssessment: v })} />
          <FloatInput label="Client-specific recommendations" multiline autoGrow maxLength={3000}
            value={form.summary.clientRecommendations}
            onChange={(v) => set('summary', { ...form.summary, clientRecommendations: v })} />
        </div>
      </section>

      {(['mobility', 'activation', 'strengthening'] as PlanSection[]).map((section) => (
        <ExerciseSection
          key={section}
          section={section}
          plan={plan}
          onChange={(next) => set('correctivePlan', next)}
        />
      ))}

      <section className="rounded-[18px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <h3 className="mb-0.5 text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>Trainer Recommendations</h3>
        <p className="mb-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>Carried into the client report and the next programme review.</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {RECOMMENDATION_FIELDS.map((field) => (
            <FloatInput
              key={field.key}
              label={field.label}
              multiline
              autoGrow
              maxLength={2000}
              value={plan.recommendations[field.key]}
              onChange={(v) => set('correctivePlan', { ...plan, recommendations: { ...plan.recommendations, [field.key]: v } })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default StepCorrectivePlan;
