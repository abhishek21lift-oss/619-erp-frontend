'use client';

import { useState } from 'react';
import { CalendarRange, Lightbulb, Plus, Trash2 } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { SelectInput } from '@/components/ui';
import { indigo, gray, tint } from '@/lib/palette';
import { MILESTONE_TIERS, defaultMilestones, validateMilestones, weeksFrom } from '@/lib/goal-plan';
import type { GoalMilestone, MilestoneTier } from '@/lib/goal-plan';
import GoalStepCard from './GoalStepCard';
import type { GoalFormData } from './types';

interface StepMilestonesProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  today: string;
  error?: string;
}

/**
 * Short / medium / long-term milestones. The wizard used to write three fixed
 * dates nobody chose; here they are prefilled from the goal window, then
 * edited — and what is saved is what the trainer confirmed.
 */
export function StepMilestones({ form, set, step, today, error }: StepMilestonesProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = defaultsFor(form, today);
  const localError = validateMilestones(form.milestones, today, form.targetDate || null);

  const update = (index: number, patch: Partial<GoalMilestone>) => {
    set('milestones', form.milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };
  const remove = (index: number) => set('milestones', form.milestones.filter((_, i) => i !== index));
  const add = () => {
    const last = form.milestones[form.milestones.length - 1];
    set('milestones', [...form.milestones, { type: 'short_term', label: '', date: last?.date || today, description: '' }]);
  };

  return (
    <GoalStepCard icon={CalendarRange} title="Time Horizons" step={step} hint="K11 short, medium and long-term checkpoints"
      badge={
        <span className="rounded-full px-3 py-1.5 text-[11.5px] font-[760]" style={{ background: gray[100], color: gray[600] }}>
          {form.milestones.length} set
        </span>
      }>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatInput label="Short-term checkpoint (weeks)" numeric="integer" value={form.shortTermWeeks} onChange={(v) => set('shortTermWeeks', v)} />
          <FloatInput label="Medium-term review (weeks)" numeric="integer" value={form.mediumTermWeeks} onChange={(v) => set('mediumTermWeeks', v)} />
        </div>

        {form.milestones.length === 0 && !showSuggestions && (
          <p className="text-[12.5px]" style={{ color: gray[500] }}>
            K11 breaks the goal into three horizons. Accept the suggested checkpoints, or add one per tier.
          </p>
        )}

        <ul className="space-y-3">
          {form.milestones.map((m, i) => (
            <li key={i} className="rounded-[18px] p-4" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
              <div className="flex items-start gap-3">
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-[11px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Tier</p>
                    <SelectInput
                      aria-label={`Milestone ${i + 1} tier`}
                      value={m.type}
                      onChange={(e) => update(i, { type: e.target.value as MilestoneTier })}
                    >
                      {MILESTONE_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </SelectInput>
                  </div>
                  <FloatInput label="Date" type="date" value={m.date} onChange={(v) => update(i, { date: v })} />
                  <FloatInput label="Title" maxLength={200} value={m.label} onChange={(v) => update(i, { label: v })} />
                  <FloatInput label="What is checked" maxLength={300} value={m.description} onChange={(v) => update(i, { description: v })} />
                </div>
                <button
                  type="button" onClick={() => remove(i)}
                  aria-label={`Remove milestone ${i + 1}`}
                  className="mt-6 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px] transition-colors"
                  style={{ background: gray[100], color: gray[500] }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          <button
            type="button" onClick={add}
            className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12.5px] font-[700]"
            style={{ background: gray[100], color: gray[700] }}
          >
            <Plus size={14} /> Add milestone
          </button>
          <button
            type="button" onClick={() => { set('milestones', suggestions); setShowSuggestions(true); }}
            className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12.5px] font-[700]"
            style={{ background: tint(indigo[500], 0.1), color: indigo[700] }}
          >
            <Lightbulb size={14} /> Suggest from goal window
          </button>
        </div>

        {showSuggestions && form.milestones.length > 0 && (
          <ul className="space-y-1.5">
            {form.milestones.map((m, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
                <span style={{ color: gray[700] }}>{m.label}</span>
                <span className="font-[600]" style={{ color: gray[500] }}>{m.date}</span>
              </li>
            ))}
          </ul>
        )}

        {(localError || error) && (
          <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{localError || error}</p>
        )}
      </div>
    </GoalStepCard>
  );
}

function defaultsFor(form: GoalFormData, today: string): GoalMilestone[] {
  const short = weeksFrom(form.shortTermWeeks, 8);
  const medium = weeksFrom(form.mediumTermWeeks, 12);
  return defaultMilestones(today, form.targetDate || null, short, medium);
}

export default StepMilestones;
