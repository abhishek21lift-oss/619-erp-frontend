'use client';
/**
 * What the screening gate will say about this client's PAR-Q, said here first.
 *
 * The backend gate (lib/screeningGate.js) warns — never blocks — when the
 * latest submitted PAR-Q is incomplete, over a year old, or medium risk and
 * unreviewed. Those warnings only ever surfaced when a trainer assigned a
 * workout. This is the same judgement on the one screen where it can be acted
 * on, with the action beside it.
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ParqForm } from '@/lib/api';

export const PARQ_QUESTION_COUNT = 10;
const STALE_MONTHS = 12;

export type ScreeningIssue =
  | { kind: 'incomplete'; answered: number }
  | { kind: 'review' }
  | { kind: 'stale' };

/** The latest form the gate reads: newest non-draft, by assessment date then creation. */
export function latestScreened(forms: ParqForm[]): ParqForm | null {
  const screened = forms.filter((f) => f.status !== 'draft');
  screened.sort((a, b) =>
    String(b.assessment_date ?? '').slice(0, 10).localeCompare(String(a.assessment_date ?? '').slice(0, 10))
    || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
  return screened[0] ?? null;
}

export function screeningIssues(form: ParqForm | null, now: Date = new Date()): ScreeningIssue[] {
  if (!form) return [];
  const out: ScreeningIssue[] = [];
  const answered = new Set(
    (form.parq_answers ?? [])
      .filter((a) => a && (a.answer === 'yes' || a.answer === 'no'))
      .map((a) => Number(a.question_id)),
  ).size;
  if (answered < PARQ_QUESTION_COUNT) out.push({ kind: 'incomplete', answered });
  if (form.risk_level === 'medium' && form.status !== 'reviewed') out.push({ kind: 'review' });
  const assessed = Date.parse(String(form.assessment_date ?? ''));
  if (Number.isFinite(assessed)) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - STALE_MONTHS);
    if (assessed < cutoff.getTime()) out.push({ kind: 'stale' });
  }
  return out;
}

interface ScreeningNoticeProps {
  form: ParqForm;
  issues: ScreeningIssue[];
  onOpen: () => void;
  onNewScreening: () => void;
  onMarkReviewed: () => Promise<void>;
}

export function ScreeningNotice({ form, issues, onOpen, onNewScreening, onMarkReviewed }: ScreeningNoticeProps) {
  const [busy, setBusy] = useState(false);
  if (issues.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {issues.map((issue) => {
        const { title, body, action } = describe(issue, form);
        return (
          <div
            key={issue.kind} role="status"
            className="flex flex-col gap-3 rounded-[16px] px-4 py-3.5 sm:flex-row sm:items-center"
            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.28)' }}
          >
            <div className="flex flex-1 items-start gap-2.5">
              <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>{body}</p>
              </div>
            </div>
            {action === 'open' && (
              <Button variant="outline" className="min-h-[44px]" iconLeft={<ClipboardCheck size={14} />} onClick={onOpen}>
                Complete screening
              </Button>
            )}
            {action === 'new' && (
              <Button variant="outline" className="min-h-[44px]" iconLeft={<RotateCcw size={14} />} onClick={onNewScreening}>
                Re-screen
              </Button>
            )}
            {action === 'review' && (
              <div className="flex gap-2">
                <Button variant="ghost" className="min-h-[44px]" onClick={onOpen}>Open</Button>
                <Button
                  className="min-h-[44px]" loading={busy} disabled={busy}
                  iconLeft={busy ? undefined : <CheckCircle2 size={14} />}
                  onClick={async () => { setBusy(true); try { await onMarkReviewed(); } finally { setBusy(false); } }}
                >
                  Mark reviewed
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function describe(issue: ScreeningIssue, form: ParqForm): { title: string; body: string; action: 'open' | 'new' | 'review' } {
  switch (issue.kind) {
    case 'incomplete':
      return {
        title: 'Screening incomplete',
        body: `Only ${issue.answered} of ${PARQ_QUESTION_COUNT} PAR-Q questions are answered, so this screening does not clear the client. Complete the questionnaire.`,
        action: 'open',
      };
    case 'review': {
      const yes = form.parq_yes_count ?? 0;
      return {
        title: 'Trainer review required',
        body: `The client answered "yes" to ${yes} question${yes === 1 ? '' : 's'}. Read the answers, then mark the screening reviewed.`,
        action: 'review',
      };
    }
    case 'stale':
    default:
      return {
        title: 'Re-screen due',
        body: `This screening is over ${STALE_MONTHS} months old. Health changes — take a new PAR-Q.`,
        action: 'new',
      };
  }
}

export default ScreeningNotice;
