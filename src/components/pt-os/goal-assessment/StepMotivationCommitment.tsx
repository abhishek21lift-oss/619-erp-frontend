'use client';

import Link from 'next/link';
import { ArrowUpRight, Flame, Frown, Laugh, Meh, Smile } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Slider } from '@/components/ui';
import { amber, emerald, gray, indigo, red, tint } from '@/lib/palette';
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
  clientId: string;
}

export function StepMotivationCommitment({ form, set, step, clientId }: StepMotivationCommitmentProps) {
  const motivation = parseInt(form.motivationLevel, 10) || 1;
  const commitment = parseInt(form.commitmentLevel, 10) || 1;
  // Confidence is asked separately from motivation on purpose: a client can
  // badly want the result and still not believe they can get it, and that
  // gap is what the plan has to close rather than the desire.
  const confidence = parseInt(form.confidenceLevel, 10) || 1;

  const gap = motivation - confidence;
  const interviewHref = `/pt-os/interview?client_id=${encodeURIComponent(clientId)}`;

  return (
    <GoalStepCard icon={Flame} title="Motivation & Confidence" step={step} hint="how ready is this client, really?">
      <div className="space-y-8">
        {/* Motivation is owned by the Client Interview. Asking it again here
            created two answers to one question, and the later copy always won. */}
        <div className="rounded-[18px] p-5" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: tint(indigo[500], 0.10), color: indigo[700] }}
              >
                <Flame size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-[760] uppercase tracking-[0.14em]" style={{ color: gray[500] }}>
                  Why they want this
                </p>
                <p className="text-[11.5px] font-[600]" style={{ color: gray[500] }}>
                  From the Client Interview · read-only
                </p>
              </div>
            </div>
            <Link
              href={interviewHref}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[700] transition-colors"
              style={{ background: 'var(--bg-card)', border: `1px solid ${gray[200]}`, color: indigo[700] }}
            >
              Edit in Client Interview <ArrowUpRight size={12} />
            </Link>
          </div>

          <p className="mt-3.5 text-[13.5px] leading-relaxed" style={{ color: gray[800] }}>
            {form.motivationReason
              ? `“${form.motivationReason}”`
              : 'Not recorded yet. Capture the client’s own words in the Client Interview so the plan can refer back to them.'}
          </p>
        </div>

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
