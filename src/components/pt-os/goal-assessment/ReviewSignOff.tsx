'use client';

import { Check, ClipboardCheck } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import GoalStepCard from './GoalStepCard';
import { emerald, gray, tint } from '@/lib/palette';
import type { GoalFormData } from './types';

interface ReviewSignOffProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  error?: string;
}

/**
 * K11's Relevant, confirmed where the goal is actually reviewed. Asking on the
 * priority step meant the client agreed before seeing the plan.
 */
export function ReviewSignOff({ form, set, error }: ReviewSignOffProps) {
  return (
    <GoalStepCard icon={ClipboardCheck} title="Client Sign-off" hint="the goal belongs to the client, not only the plan">
      <div className="space-y-5">
        <button
          type="button" role="checkbox" aria-checked={form.clientAgreed}
          onClick={() => set('clientAgreed', !form.clientAgreed)}
          className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left"
          style={{
            background: form.clientAgreed ? tint(emerald[500], 0.1) : 'var(--bg-subtle)',
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

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}

        <FloatInput
          label="What the client expects from this goal (optional)"
          multiline autoGrow maxLength={1000}
          value={form.clientExpectation} onChange={(v) => set('clientExpectation', v)}
          placeholder="In their own words — the outcome, timeline and effort they expect."
        />
      </div>
    </GoalStepCard>
  );
}

export default ReviewSignOff;
