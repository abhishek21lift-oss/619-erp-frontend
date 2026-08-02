'use client';

import { Flame, Frown, Laugh, Meh, Smile } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Slider } from '@/components/ui';
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
  if (level <= 3) return '#ef4444';
  if (level <= 7) return '#F59E0B';
  return '#10b981';
}

interface StepMotivationCommitmentProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
}

export function StepMotivationCommitment({ form, set }: StepMotivationCommitmentProps) {
  const motivation = parseInt(form.motivationLevel, 10) || 1;
  const commitment = parseInt(form.commitmentLevel, 10) || 1;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Flame size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Motivation &amp; Commitment</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 6 of 8 — how ready is this client, really?</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Motivation Level</p>
            {(() => {
              const Face = motivationFace(motivation);
              return <Face size={24} strokeWidth={1.75} style={{ color: commitmentColor(motivation) }} />;
            })()}
          </div>
          <Slider label="" value={motivation} min={1} max={10} onChange={(v) => set('motivationLevel', String(v))}
            scaleLabels={['1 · Not Motivated', '5 · Moderately Motivated', '10 · Extremely Motivated']} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Commitment Level</p>
            <span className="h-3 w-3 rounded-full" style={{ background: commitmentColor(commitment) }} />
          </div>
          <Slider label="" value={commitment} min={1} max={10} onChange={(v) => set('commitmentLevel', String(v))}
            scaleLabels={['1 · Low', '5 · Moderate', '10 · Fully Committed']} />
        </div>
      </div>
    </div>
  );
}

export default StepMotivationCommitment;
