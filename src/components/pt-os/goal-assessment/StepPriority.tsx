'use client';

import { Check, ListChecks } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import GoalStepCard from './GoalStepCard';
import { PRIORITY_META } from './types';
import { blue, emerald, gray, tint } from '@/lib/palette';
import type { GoalFormData } from './types';

interface StepPriorityProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  error?: string;
}

export function StepPriority({ form, set, step, error }: StepPriorityProps) {
  return (
    <GoalStepCard icon={ListChecks} title="Priority & Agreement" step={step} hint="what matters most — and does the client agree?">
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PRIORITY_META.map((p) => {
            const selected = form.priorityGoal === p.value;
            return (
              <button
                key={p.value} type="button"
                onClick={() => set('priorityGoal', p.value)}
                aria-pressed={selected}
                className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                style={{
                  background: selected ? 'rgba(0,103,224,0.06)' : 'var(--bg-subtle)',
                  border: selected ? '2px solid #0067E0' : '2px solid var(--border)',
                  boxShadow: selected ? '0 4px 16px rgba(0,103,224,0.12)' : 'none',
                }}
              >
                <p.icon size={20} style={{ color: selected ? '#0059CE' : 'var(--text-muted)' }} />
                <span className="text-[12px] font-[700]" style={{ color: selected ? '#0059CE' : 'var(--text-secondary)' }}>{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-[16px] p-5" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
          <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>K11 — Relevant</p>
          <p className="mt-1 text-[12px]" style={{ color: gray[600] }}>
            The goal has to be the client&apos;s goal, not only the trainer&apos;s plan.
          </p>

          <button
            type="button" role="checkbox" aria-checked={form.clientAgreed}
            onClick={() => set('clientAgreed', !form.clientAgreed)}
            className="mt-4 flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left"
            style={{
              background: form.clientAgreed ? tint(emerald[500], 0.1) : 'var(--bg-card)',
              border: form.clientAgreed ? `1.5px solid ${tint(emerald[500], 0.5)}` : `1.5px solid ${gray[200]}`,
            }}
          >
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]"
              style={{ background: form.clientAgreed ? emerald[500] : 'transparent', border: form.clientAgreed ? 'none' : `1.5px solid ${gray[300]}` }}
            >
              {form.clientAgreed && <Check size={13} strokeWidth={3} color="#fff" />}
            </span>
            <span className="text-[13px] font-[700]" style={{ color: gray[800] }}>
              The client has seen this goal and agrees with it
            </span>
          </button>

          <div className="mt-4">
            <FloatInput
              label="What the client expects from this goal (optional)"
              multiline autoGrow maxLength={1000}
              value={form.clientExpectation} onChange={(v) => set('clientExpectation', v)}
              placeholder="In their own words — the outcome, timeline and effort they expect."
            />
          </div>
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

        <p className="text-[11.5px]" style={{ color: blue[700] }}>
          SMART&apos;s R stays unticked until both the priority and the client&apos;s agreement are recorded.
        </p>
      </div>
    </GoalStepCard>
  );
}

export default StepPriority;
