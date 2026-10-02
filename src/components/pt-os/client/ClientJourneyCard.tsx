'use client';

// The client's intake journey, on their profile.
//
// Registration → Informed Consent → PAR-Q → Client Interview → Fitness
// Assessment → Goals → PT Enrolment → Workout Plan, each with the state the
// server read from the record that step produces (GET …/journey), and one
// button for the next thing to do. A blocked step says why, in the server's
// words, and the button never offers a step the server would refuse.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, CheckCircle2, CircleDashed, Clock3, FileSignature, Gauge, ListChecks, Lock,
  MessagesSquare, RefreshCw, ShieldCheck, Target, UserPlus, Dumbbell,
} from 'lucide-react';
import { api } from '@/lib/api';
import { STEP_LABEL, stepHref, type ClientJourney, type JourneyStep, type JourneyStepKey } from '@/lib/journey';

const STEP_ICON: Record<JourneyStepKey, React.ReactNode> = {
  registration: <UserPlus size={14} />,
  consent: <FileSignature size={14} />,
  parq: <ShieldCheck size={14} />,
  interview: <MessagesSquare size={14} />,
  assessment: <Gauge size={14} />,
  goals: <Target size={14} />,
  enrolment: <ListChecks size={14} />,
  workout_plan: <Dumbbell size={14} />,
};

const STEP_COLOR: Record<JourneyStepKey, string> = {
  registration: '#0067E0', consent: '#7FB4FF', parq: '#0050AD', interview: '#64748B',
  assessment: '#3B8DF5', goals: '#94A3B8', enrolment: '#002D61', workout_plan: '#0059CE',
};

const STATE_CHIP: Record<JourneyStep['state'], { label: string; fg: string; bg: string; icon: React.ReactNode }> = {
  done: { label: 'Done', fg: '#047857', bg: 'rgba(48,209,88,0.14)', icon: <CheckCircle2 size={12} /> },
  in_progress: { label: 'In progress', fg: '#B45309', bg: 'rgba(255,159,10,0.16)', icon: <Clock3 size={12} /> },
  todo: { label: 'To do', fg: 'var(--text-muted)', bg: 'var(--bg-subtle)', icon: <CircleDashed size={12} /> },
  blocked: { label: 'Blocked', fg: '#B91C1C', bg: 'rgba(255,69,58,0.14)', icon: <Lock size={12} /> },
  renew: { label: 'Renew', fg: '#B45309', bg: 'rgba(255,159,10,0.16)', icon: <RefreshCw size={12} /> },
};

export default function ClientJourneyCard({ clientId }: { clientId: string }) {
  const router = useRouter();
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
            style={{ width: `${(done / journey.steps.length) * 100}%`, background: 'linear-gradient(90deg,#0067E0,#10B981)' }} />
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
            <li key={step.key} aria-current={isNext ? 'step' : undefined}>
              <button type="button" onClick={() => router.push(stepHref(step.key, clientId, step.state))}
                className="flex min-h-[48px] w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left transition active:scale-[0.99]"
                style={{ background: isNext ? 'rgba(10,132,255,0.08)' : 'var(--bg-subtle)', outline: isNext ? '1.5px solid rgba(10,132,255,0.35)' : 'none' }}>
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
              </button>
            </li>
          );
        })}
      </ol>

      {next && (
        nextAllowed ? (
          <button type="button" onClick={() => router.push(stepHref(next.key, clientId, next.state))}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white transition active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg,#0067E0,#0059CE)' }}>
            {next.state === 'renew' ? 'Renew PT' : `Next: ${STEP_LABEL[next.key]}`}
            <ArrowRight size={16} />
          </button>
        ) : (
          <p role="status" className="rounded-[14px] px-3 py-2.5 text-[12.5px] leading-snug" style={{ background: 'rgba(255,69,58,0.10)', color: 'var(--text-primary)' }}>
            {next.detail || `${STEP_LABEL[next.key]} is blocked.`}
          </p>
        )
      )}
    </div>
  );
}
