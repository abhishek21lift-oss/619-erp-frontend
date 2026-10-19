'use client';

import { Flame, Frown, Laugh, Meh, Smile } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Slider } from '@/components/ui';
import { amber, emerald, gray, red } from '@/lib/palette';
import GoalStepCard from './GoalStepCard';
import type { GoalFormData } from './types';

/**
 * The motivation face. Was 😐 🙂 😃 🤩 — which is four different drawings
 * depending on the device, and on some platforms 😃 and 🤩 are barely
 * distinguishable at 26px. Lucide's face set is one drawing style at one
 * stroke weight, so the four steps actually read as a scale.
 */
function motivationFace(level: number): LucideIcon {
  if (level <= 3) return Frown;
  if (level <= 6) return Meh;
  if (level <= 8) return Smile;
  return Laugh;
}

// Red / amber / green, and it stays that way. The brand recolour turned the
// middle band blue, which broke the scale — a traffic light with a brand
// colour in it no longer reads as a warning, and this drives the motivation
// face as well as the bar.
function commitmentColor(level: number): string {
  if (level <= 3) return red[500];
  if (level <= 7) return amber[500];
  return emerald[500];
}

interface StepMotivationCommitmentProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
}

export function StepMotivationCommitment({ form, set, step }: StepMotivationCommitmentProps) {
  const motivation = parseInt(form.motivationLevel, 10) || 1;
  const commitment = parseInt(form.commitmentLevel, 10) || 1;
  // Confidence is asked separately from motivation on purpose: a client can
  // badly want the result and still not believe they can get it, and that
  // gap is what the plan has to close rather than the desire.
  const confidence = parseInt(form.confidenceLevel, 10) || 1;

  const gap = motivation - confidence;

  return (
    <GoalStepCard icon={Flame} title="Motivation & Confidence" step={step} hint="how ready is this client, really?">
      <div className="space-y-8">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Motivation Level</p>
            {(() => {
              const Face = motivationFace(motivation);
              return <Face size={24} strokeWidth={1.75} style={{ color: commitmentColor(motivation) }} />;
            })()}
          </div>
          <Slider label="" ariaLabel="Motivation Level" value={motivation} min={1} max={10} onChange={(v) => set('motivationLevel', String(v))}
            scaleLabels={['1 · Not Motivated', '5 · Moderately Motivated', '10 · Extremely Motivated']} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Confidence Level</p>
            <span className="text-[12px] font-[760]" style={{ color: commitmentColor(confidence) }}>{confidence} / 10</span>
          </div>
          <Slider label="" ariaLabel="Confidence Level" value={confidence} min={1} max={10} onChange={(v) => set('confidenceLevel', String(v))}
            scaleLabels={['1 · Not Confident', '5 · Fairly Confident', '10 · Certain']} />
          {gap >= 3 && (
            <p className="mt-3 rounded-[12px] px-3.5 py-2.5 text-[12.5px]" role="status"
              style={{ background: 'rgba(217,119,6,0.10)', color: gray[800], border: '1px solid rgba(217,119,6,0.35)' }}>
              Wants this a lot, but is not sure they can do it. The barrier plans on the next step are where that gap gets closed.
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Commitment Level</p>
            <span className="h-3 w-3 rounded-full" style={{ background: commitmentColor(commitment) }} />
          </div>
          <Slider label="" ariaLabel="Commitment Level" value={commitment} min={1} max={10} onChange={(v) => set('commitmentLevel', String(v))}
            scaleLabels={['1 · Low', '5 · Moderate', '10 · Fully Committed']} />
        </div>
      </div>
    </GoalStepCard>
  );
}

export default StepMotivationCommitment;
