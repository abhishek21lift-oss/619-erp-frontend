'use client';

// The Client Interview, summarised on the profile's Documents tab.
//
// The full conversation lives on its own screen; this card carries only what a
// trainer needs before writing a session — training history, the barriers the
// client named, and the trainer's own summary. The two are labelled apart
// because one is what the client said and the other is what the trainer
// concluded, and the AI prompts read them apart too.
//
// A missing answer says "Not recorded", never "none": an interview nobody has
// had yet is unknown, not a client with no barriers.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, MessagesSquare } from 'lucide-react';
import { cardSurface } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { fmtDateMedium } from '@/lib/format';
import type { ClientInterview } from '@/lib/journey';
import { challengeLabels } from '@/components/pt-os/interview/questions';
import { indigo, rgba, semantic } from '@/lib/palette';

const EXPERIENCE_LABEL: Record<string, string> = {
  never: 'Never trained',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function InterviewSnapshotCard({ clientId }: { clientId: string }) {
  const [interview, setInterview] = useState<ClientInterview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setLoaded(false);
    api.pt.interviews.list(clientId)
      .then((res) => {
        if (cancelled) return;
        const rows = (res?.data ?? []) as ClientInterview[];
        // Same rule the interview screen uses: an unfinished draft is the
        // record being worked on; otherwise the newest completed one.
        setInterview(rows.find((row) => row.status === 'draft') ?? rows[0] ?? null);
      })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [clientId]);

  if (failed) {
    return (
      <p className="rounded-[14px] px-3 py-2.5 text-[12.5px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
        The client interview could not be loaded.
      </p>
    );
  }

  const completed = interview?.status === 'completed';
  const href = `/pt-os/interview?client_id=${encodeURIComponent(clientId)}`;

  return (
    <div className="rounded-[24px] p-4 sm:p-5" style={{ ...cardSurface }}>
      <div className="mb-3.5 flex items-center gap-2.5 pb-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white"
          style={{ background: `linear-gradient(135deg, ${indigo[500]}, ${indigo[500]}cc)`, boxShadow: `0 3px 10px ${rgba(indigo[500], 0.25)}` }}>
          <MessagesSquare size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13.5px] font-[740]" style={{ color: 'var(--text-primary)' }}>Client interview</h2>
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {!loaded
              ? 'Loading…'
              : !interview
                ? 'Not recorded yet'
                : completed
                  ? `Completed ${fmtDateMedium(interview.completed_at)}`
                  : `Draft · updated ${fmtDateMedium(interview.updated_at)}`}
          </p>
        </div>
        {completed && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-[700]"
            style={{ background: rgba(semantic.success, 0.12), color: semantic.successLo }}>
            <CheckCircle2 size={11} aria-hidden /> Completed
          </span>
        )}
        {interview?.status === 'draft' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-[700]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <Clock3 size={11} aria-hidden /> Draft
          </span>
        )}
      </div>

      {interview ? (
        <dl className="space-y-2.5">
          <Fact label="Training history" value={historyText(interview)} />
          <Fact label="Barriers they named" value={barriersText(interview)} />
          <Fact label="Trainer summary" value={interview.notes} clamp />
        </dl>
      ) : (
        <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          No interview recorded yet. Work, training history and what gets in the way are all still unknown.
        </p>
      )}

      <Link href={href}
        className="mt-3.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-[720] transition hover:bg-[var(--bg-subtle)]"
        style={{ color: indigo[600] }}>
        {!interview ? 'Start the interview' : completed ? 'Review and edit' : 'Continue draft'}
        <ArrowRight size={13} aria-hidden />
      </Link>
    </div>
  );
}

function Fact({ label, value, clamp }: { label: string; value: string | null | undefined; clamp?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] font-[760] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className={`mt-0.5 text-[13px] leading-snug ${clamp && value ? 'line-clamp-2' : ''}`}
        style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value || 'Not recorded'}
      </dd>
    </div>
  );
}

function historyText(interview: ClientInterview): string {
  const level = interview.previous_workout_experience
    ? EXPERIENCE_LABEL[interview.previous_workout_experience] ?? interview.previous_workout_experience
    : '';
  const detail = interview.training_history?.trim();
  if (level && detail) return `${level} · ${detail}`;
  return level || detail || '';
}

function barriersText(interview: ClientInterview): string {
  const labels = challengeLabels(interview.training_challenges ?? []);
  const other = interview.challenge_other?.trim();
  if (other) labels.push(other);
  return labels.join(', ');
}
