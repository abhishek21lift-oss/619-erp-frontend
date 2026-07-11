'use client';

import { HelpCircle } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import type { GoalFormData } from './types';

export const CHALLENGE_OPTIONS = [
  { value: 'Poor Diet', label: 'Poor Diet', icon: '🍔' },
  { value: 'Lack of Sleep', label: 'Lack of Sleep', icon: '😴' },
  { value: 'No Time', label: 'No Time', icon: '⏰' },
  { value: 'Office Work', label: 'Office Work', icon: '🏢' },
  { value: 'Alcohol', label: 'Alcohol', icon: '🍺' },
  { value: 'Sugar Cravings', label: 'Sugar Cravings', icon: '🍬' },
  { value: 'Lack of Strength', label: 'Lack of Strength', icon: '💪' },
  { value: 'Low Stamina', label: 'Low Stamina', icon: '🏃' },
  { value: 'Motivation', label: 'Motivation', icon: '😔' },
  { value: 'Gym Anxiety', label: 'Gym Anxiety', icon: '🏋️' },
  { value: 'Inconsistent Routine', label: 'Inconsistent Routine', icon: '📱' },
];

interface StepChallengesProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  error?: string;
}

export function StepChallenges({ form, set, error }: StepChallengesProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <HelpCircle size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Goal Importance &amp; Challenges</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 7 of 8 — the psychology behind the plan.</p>
          </div>
        </div>

        <FloatInput
          label="Why do you want to achieve this goal?" multiline autoGrow
          value={form.motivationReason} onChange={(v) => set('motivationReason', v)}
          placeholder="Wedding, competition, health, confidence, doctor recommendation, lifestyle, vacation..."
        />

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Biggest Challenge</p>
          <MultiSelectChips value={form.biggestChallenges} onChange={(v) => set('biggestChallenges', v)} options={CHALLENGE_OPTIONS} />
          <div className="mt-3 max-w-sm">
            <FloatInput label="Other" value={form.challengeOther} onChange={(v) => set('challengeOther', v)} />
          </div>
          {error && <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default StepChallenges;
