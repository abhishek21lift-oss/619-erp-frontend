'use client';

// The client's intake journey, on their profile.
//
// Welcome & Gym Tour → PT Enrolment → Informed Consent → PAR-Q → Client
// Interview → Goals → Fitness Assessment → Program Design, each with the state
// the server read from the record that step produces (GET …/journey), and one
// button for the next thing to do. A blocked step says why, in the server's
// words, and the button never offers a step the server would refuse. Once the
// journey is complete, the card hands over to the ongoing tools.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, CircleDashed, Clock3, FileSignature, Gauge, ListChecks, Lock,
  MessagesSquare, RefreshCw, ShieldCheck, Sparkles, Target, Dumbbell,
} from 'lucide-react';
import { api } from '@/lib/api';
import { STEP_LABEL, stepHref, type ClientJourney, type JourneyStep, type JourneyStepKey } from '@/lib/journey';
import { indigo, emerald, gray, rgba } from '@/lib/palette';
import { stateTone, type StateToneStyle } from '@/lib/state-tone';

const STEP_ICON: Record<JourneyStepKey, React.ReactNode> = {
  welcome_tour: <Sparkles size={14} />,
  enrolment: <ListChecks size={14} />,
  consent: <FileSignature size={14} />,
  parq: <ShieldCheck size={14} />,
  interview: <MessagesSquare size={14} />,
  goals: <Target size={14} />,
  assessment: <Gauge size={14} />,
  program_design: <Dumbbell size={14} />,
};

const STEP_COLOR: Record<JourneyStepKey, string> = {
  welcome_tour: emerald[500], enrolment: indigo[900], consent: indigo[300], parq: indigo[700],
  interview: gray[500], goals: gray[400], assessment: indigo[400], program_design: indigo[600],
};

const STATE_CHIP: Record<JourneyStep['state'], { label: string; icon: React.ReactNode } & StateToneStyle> = {
  done: { label: 'Done', ...stateTone.success, icon: <CheckCircle2 size={12} /> },
  in_progress: { label: 'In progress', ...stateTone.warning, icon: <Clock3 size={12} /> },
  todo: { label: 'To do', ...stateTone.neutral, icon: <CircleDashed size={12} /> },
  blocked: { label: 'Blocked', ...stateTone.danger, icon: <Lock size={12} /> },
  renew: { label: 'Renew', ...stateTone.warning, icon: <RefreshCw size={12} /> },
};

export default function ClientJourneyCard({ clientId }: { clientId: string }) {
  const [journey, setJourney] = useState<ClientJourney | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    api.pt.journey(clientId)
      .then((res) => { if (!cancelled) setJourney(res?.data ?? null); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (failed) {
    return (
      <p className="rounded-[14px] px-3 py-2.5 text-[12.5px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
        The client journey could not be loaded.
      </p>
    );
  }
  if (!journey) {
    return <div aria-busy="true" className="h-40 animate-pulse rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />;
  }

  const done = journey.steps.filter((s) => s.state === 'done').length;
  const next = journey.steps.find((s) => s.key === journey.next) ?? null;
  // The button never offers a blocked step: it says what is in the way instead.
  const nextAllowed = next && next.state !== 'blocked';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}
          role="progressbar" aria-valuemin={0} aria-valuemax={journey.steps.length} aria-valuenow={done}
          aria-label="Client journey progress">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${(done / journey.steps.length) * 100}%`, background: `linear-gradient(90deg, ${indigo[500]}, ${emerald[500]})` }} />
        </div>
        <span className="shrink-0 text-[12px] font-[700] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {done}/{journey.steps.length}
        </span>
      </div>

      <ol className="space-y-1.5">
        {journey.steps.map((step) => {
          const chip = STATE_CHIP[step.state];
          const isNext = step.key === journey.next;
          return (
            <li key={step.key}>
              <Link href={stepHref(step.key, clientId, step.state)}
                aria-current={isNext ? 'step' : undefined}
                className="flex min-h-[48px] w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left transition active:scale-[0.99]"
                style={{ background: isNext ? rgba(indigo[500], 0.08) : 'var(--bg-subtle)', outline: isNext ? `1.5px solid ${rgba(indigo[500], 0.35)}` : 'none' }}>
                <span aria-hidden className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] text-white"
                  style={{ background: STEP_COLOR[step.key] }}>
                  {STEP_ICON[step.key]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                    {STEP_LABEL[step.key]}{step.optional ? <span className="font-[500]" style={{ color: 'var(--text-muted)' }}> · optional</span> : null}
                  </span>
                  {step.detail && (
                    <span className="block text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>{step.detail}</span>
                  )}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-[700]"
                  style={{ color: chip.fg, background: chip.bg }}>
                  {chip.icon}{chip.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {journey.next === null ? (
        <div className="space-y-2 rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
            Onboarding complete — client is active.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/pt-os/clients/${clientId}/workout-log`}
              className="flex min-h-[44px] items-center justify-center rounded-[12px] text-[12.5px] font-[700] text-white transition active:scale-[0.99]"
              style={{ background: `linear-gradient(135deg, ${indigo[500]}, ${indigo[600]})` }}>
              Workout Log
            </Link>
            <Link href={`/pt-os/progress?client_id=${encodeURIComponent(clientId)}`}
              className="flex min-h-[44px] items-center justify-center rounded-[12px] text-[12.5px] font-[700] transition active:scale-[0.99]"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              Progress &amp; Retest
            </Link>
          </div>
        </div>
      ) : next && (
        nextAllowed ? (
          <Link href={stepHref(next.key, clientId, next.state)}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white transition active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg, ${indigo[500]}, ${indigo[600]})` }}>
            {next.state === 'renew' ? 'Renew PT' : `Next: ${STEP_LABEL[next.key]}`}
            <ArrowRight size={16} />
          </Link>
        ) : (
          <p role="status" className="rounded-[14px] px-3 py-2.5 text-[12.5px] leading-snug" style={{ background: stateTone.danger.bg, color: 'var(--text-primary)' }}>
            {next.detail || `${STEP_LABEL[next.key]} is blocked.`}
          </p>
        )
      )}
    </div>
  );
}
