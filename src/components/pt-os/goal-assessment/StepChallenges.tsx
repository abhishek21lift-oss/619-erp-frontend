'use client';

import {
  AlarmClock, BatteryLow, BedDouble, Beer, Building2, CalendarX, Candy,
  Dumbbell, HelpCircle, Pizza, Users, Wind,
} from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import GoalStepCard from './GoalStepCard';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import { indigo, gray } from '@/lib/palette';
import type { BarrierPlan } from '@/lib/goal-plan';
import type { GoalFormData } from './types';

export const CHALLENGE_OPTIONS = [
  { value: 'Poor Diet',             label: 'Poor Diet',             icon: <Pizza size={14} /> },
  { value: 'Lack of Sleep',         label: 'Lack of Sleep',         icon: <BedDouble size={14} /> },
  { value: 'No Time',               label: 'No Time',               icon: <AlarmClock size={14} /> },
  { value: 'Office Work',           label: 'Office Work',           icon: <Building2 size={14} /> },
  { value: 'Alcohol',               label: 'Alcohol',               icon: <Beer size={14} /> },
  { value: 'Sugar Cravings',        label: 'Sugar Cravings',        icon: <Candy size={14} /> },
  { value: 'Lack of Strength',      label: 'Lack of Strength',      icon: <Dumbbell size={14} /> },
  { value: 'Low Stamina',           label: 'Low Stamina',           icon: <Wind size={14} /> },
  { value: 'Motivation',            label: 'Motivation',            icon: <BatteryLow size={14} /> },
  // Was 🏋️, the same picture as 'Lack of Strength' — this one is about other
  // people being present, not about the weight.
  { value: 'Gym Anxiety',           label: 'Gym Anxiety',           icon: <Users size={14} /> },
  { value: 'Inconsistent Routine',  label: 'Inconsistent Routine',  icon: <CalendarX size={14} /> },
];

interface StepChallengesProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  error?: string;
}

/** The challenges the client named, including a typed "other". */
export function selectedChallenges(challenges: Pick<GoalFormData, 'biggestChallenges' | 'challengeOther'>): string[] {
  const other = challenges.challengeOther.trim();
  return other ? [...challenges.biggestChallenges, other] : [...challenges.biggestChallenges];
}

export function StepChallenges({ form, set, step, error }: StepChallengesProps) {
  const challenges = selectedChallenges(form);

  const planFor = (challenge: string) => form.barrierPlans.find((p) => p.challenge === challenge)?.plan ?? '';
  const setPlan = (challenge: string, plan: string) => {
    const rest = form.barrierPlans.filter((p) => p.challenge !== challenge);
    const next: BarrierPlan[] = plan ? [...rest, { challenge, plan }] : rest;
    set('barrierPlans', next);
  };

  return (
    <GoalStepCard icon={HelpCircle} title="Challenges & Barriers" step={step} hint="what gets in the way, and the plan for it">
      <div className="space-y-7">
        <FloatInput
          label="Why do you want to achieve this goal?" multiline autoGrow maxLength={2000}
          value={form.motivationReason} onChange={(v) => set('motivationReason', v)}
          placeholder="Wedding, competition, health, confidence, doctor recommendation, lifestyle, vacation..."
        />

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Biggest Challenge</p>
          <MultiSelectChips value={form.biggestChallenges} onChange={(v) => set('biggestChallenges', v)} options={CHALLENGE_OPTIONS} />
          <div className="mt-3 max-w-sm">
            <FloatInput label="Other" maxLength={200} value={form.challengeOther} onChange={(v) => set('challengeOther', v)} />
          </div>
          {error && <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
        </div>

        {/* A named barrier with no plan is the same plan as last time. One
            line per challenge, optional — but if it is written, it is saved. */}
        {challenges.length > 0 && (
          <div className="rounded-[18px] p-5" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
            <div className="mb-4">
              <p className="text-[13px] font-[760]" style={{ color: gray[800] }}>Mitigation plan</p>
              <p className="text-[12px] mt-1" style={{ color: gray[500] }}>
                What will the client actually do when this gets in the way? One line each.
              </p>
            </div>
            <div className="space-y-4">
              {challenges.map((c) => (
                <div key={c}>
                  {/* The challenge name is a heading, not a <label>: the field
                      below already has its own accessible name, and a label
                      pointing at an id that does not exist names nothing. */}
                  <p className="mb-1.5 text-[12px] font-[700]" style={{ color: indigo[700] }}>{c}</p>
                  <FloatInput
                    label="" ariaLabel={`Plan for ${c}`} maxLength={300}
                    value={planFor(c)} onChange={(v) => setPlan(c, v)}
                    placeholder="e.g. two 30-minute walks on office days"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GoalStepCard>
  );
}

export default StepChallenges;
