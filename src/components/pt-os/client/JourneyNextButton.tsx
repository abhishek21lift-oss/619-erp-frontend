'use client';

// "Continue to …" after finishing a journey step.
//
// Asks the server where the client is (GET …/journey) and offers its `next`
// step, so the button after the PAR-Q, the assessment, the goals or the
// enrolment always points at the step that is actually outstanding — never
// a fixed page that may already be done, and never a step the server's gates
// would refuse (a blocked next step shows its reason instead).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { STEP_LABEL, stepHref, type ClientJourney, type JourneyStepKey } from '@/lib/journey';

export default function JourneyNextButton({ clientId, current, className = '' }: {
  clientId: string;
  /** The step this screen is; never offered as "next". */
  current: JourneyStepKey;
  className?: string;
}) {
  const router = useRouter();
  const [journey, setJourney] = useState<ClientJourney | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.pt.journey(clientId)
      .then((r) => { if (!cancelled) setJourney(r?.data ?? null); })
      .catch((err: unknown) => {
        // Without the journey the button cannot know the next step; fall back
        // to the profile, whose journey card shows the same failure.
        console.warn('[journey] next step unavailable', err);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [clientId]);

  if (failed) {
    return (
      <button type="button" onClick={() => router.push(`/pt-os/clients/${clientId}`)}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] px-5 text-[13.5px] font-[720] ${className}`}
        style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
        Back to profile <ArrowRight size={15} />
      </button>
    );
  }
  if (!journey) return null;
  // The first outstanding step other than this one.
  const next = journey.steps.find((s) => s.state !== 'done' && s.key !== current);
  if (!next) {
    return (
      <button type="button" onClick={() => router.push(`/pt-os/clients/${clientId}`)}
        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] px-5 text-[13.5px] font-[720] text-white ${className}`}
        style={{ background: 'linear-gradient(135deg,#10B981,#047857)' }}>
        Journey complete — back to profile <ArrowRight size={15} />
      </button>
    );
  }
  if (next.state === 'blocked') {
    return (
      <p role="status" className={`rounded-[14px] px-3 py-2.5 text-[12.5px] ${className}`}
        style={{ background: 'rgba(255,69,58,0.10)', color: 'var(--text-primary)' }}>
        Next is {STEP_LABEL[next.key]}: {next.detail || 'it is blocked.'}
      </p>
    );
  }
  return (
    <button type="button" onClick={() => router.push(stepHref(next.key, clientId, next.state))}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] px-5 text-[13.5px] font-[720] text-white transition active:scale-[0.99] ${className}`}
      style={{ background: 'linear-gradient(135deg,#0067E0,#0059CE)' }}>
      {next.state === 'renew' ? 'Renew PT' : `Continue to ${STEP_LABEL[next.key]}`} <ArrowRight size={15} />
    </button>
  );
}
