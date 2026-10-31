'use client';

// The Client Interview — step four of the intake journey:
//
//   Registration → Informed Consent → PAR-Q → Client Interview →
//   Fitness Assessment → Goals → PT Enrolment → Workout Plan
//
// The conversation in which the trainer learns the client's training history,
// what hurts, how they live, why they came and when they can train, written
// down (backend migration 227). It is optional — it never blocks enrolment or
// a plan — but it is a step: once completed, the next one is read from the
// server.
//
// The local draft is scoped to the signed-in trainer and studio and purged at
// logout (useAutoSaveDraft); its key matches the purge pattern.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, MessagesSquare, Save } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { InterviewSection } from '@/components/pt-os/interview/InterviewSection';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';
import {
  EMPTY_ANSWERS as EMPTY, INTERVIEW_FIELDS, INTERVIEW_QUESTIONS, answeredCount, topicAnswered,
  type Answers, type InterviewField,
} from '@/components/pt-os/interview/questions';
import { rgba, semantic } from '@/lib/palette';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { errorMessage } from '@/lib/forms/errors';
import { type ClientInterview } from '@/lib/journey';

/**
 * The saved answers, as the strings the selects hold. Numeric columns come
 * back from Postgres with a scale — NUMERIC(4,1) reads '7.0' for the 7 that
 * was stored — and a select matches its option's value exactly, so the
 * trailing zeros are trimmed. Without that, a client who sits seven hours a
 * day would show "Under 2 hours".
 */
function answersFrom(row: ClientInterview | null): Answers {
  const base = { ...EMPTY };
  if (!row) return base;
  for (const field of INTERVIEW_FIELDS) {
    const raw = row[field as keyof ClientInterview];
    base[field] = raw == null ? '' : String(raw).replace(/\.0+$/, '');
  }
  return base;
}

export default function InterviewPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-muted)' }} /></div>}>
        <InterviewContent />
      </Suspense>
    </Guard>
  );
}

function InterviewContent() {
  const sp = useSearchParams();
  const clientId = sp.get('client_id') || '';
  if (!clientId) return <ClientPicker title="Client Interview" icon={<MessagesSquare size={20} color="#fff" />} basePath="/pt-os/interview" />;
  return <InterviewForm key={clientId} clientId={clientId} />;
}

function InterviewForm({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<ClientInterview | null>(null);
  const [answers, setAnswers] = useState<Answers>({ ...EMPTY });
  const [saving, setSaving] = useState<'draft' | 'completed' | null>(null);
  const [completed, setCompleted] = useState(false);

  /**
   * The interview as the record holds it, and the baseline the save diffs
   * against. A field equal to its baseline is left out of the request body
   * entirely: the API reads an empty string as "clear this column", so a
   * value this form has no control for (an interview written before these
   * selects existed) must not be sent at all, rather than sent blank.
   */
  const savedRef = useRef<Answers>({ ...EMPTY });

  const draftKey = `client-interview-draft.v1:${clientId}`;
  const initial = useMemo(() => answersFrom(current), [current]);
  const isDirty = useMemo(() => JSON.stringify(answers) !== JSON.stringify(initial), [answers, initial]);
  const { restore, clear } = useAutoSaveDraft({ key: draftKey, data: answers, isDirty: isDirty && !completed });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientRes, listRes] = await Promise.all([
          api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
          api.pt.interviews.list(clientId),
        ]);
        if (cancelled) return;
        setClientName(String(clientRes?.data?.name ?? 'Client'));
        // Resume an unfinished interview; a completed one is shown as a fresh
        // start — a new interview is a new record, the old one is kept.
        const draft = (listRes?.data ?? []).find((r) => r.status === 'draft') ?? null;
        setCurrent(draft);
        // What the record holds, as the save's baseline: only fields that
        // differ from it are written, so a value this form cannot show is
        // never cleared by saving a field beside it.
        const loaded = answersFrom(draft);
        savedRef.current = loaded;
        const restored = restore({ notBefore: draft ? Date.parse(draft.updated_at) : undefined });
        setAnswers(restored ? { ...loaded, ...restored } : loaded);
        if (restored) toast.info('Restored your unsaved draft.');
      } catch (err: unknown) {
        if (!cancelled) toast.error(errorMessage(err, 'Could not load this client.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const hasAnyAnswer = answeredCount(answers) > 0;

  const save = async (status: 'draft' | 'completed') => {
    if (status === 'completed' && !hasAnyAnswer) {
      toast.error('Answer at least one question before completing the interview.');
      return;
    }
    setSaving(status);
    try {
      // Diff, not overwrite: the API treats an empty string as "clear this
      // column", so only what the trainer actually changed goes in the body.
      // The seven free-text columns are absent for the same reason — this
      // form never asks them, so sending them would erase what an earlier
      // interview recorded.
      const body: Record<string, unknown> = { status };
      for (const field of INTERVIEW_FIELDS) {
        const v = answers[field];
        if (v === savedRef.current[field]) continue;
        body[field] = v;
      }
      const res = current
        ? await api.pt.interviews.update(current.id, body)
        : await api.pt.interviews.create(clientId, body);
      clear();
      setCurrent(res.data);
      savedRef.current = answersFrom(res.data);
      if (status === 'completed') setCompleted(true);
      else toast.success('Interview saved as a draft.');
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not save the interview.'));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <InterviewSkeleton />;
  }

  if (completed) return <InterviewComplete clientName={clientName} clientId={clientId} answers={answers} />;

  const answered = answeredCount(answers);
  const total = INTERVIEW_FIELDS.length;
  const percent = total ? (answered / total) * 100 : 0;

  return (
    <PageContainer>
      <PageHero
        icon={<MessagesSquare size={20} />}
        title={`${clientName}'s Interview`}
        subtitle="Client interview · step 4"
      >
        <div className="mt-3 flex items-center gap-3">
          <div role="progressbar" aria-valuemin={0} aria-valuenow={answered} aria-valuemax={total}
            aria-label="Interview progress" className="h-[6px] flex-1 overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.22)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%`, background: '#fff' }} />
          </div>
          <span className="shrink-0 text-[12px] font-[700] tabular-nums text-white">{answered}/{total}</span>
        </div>
        {current && (
          <p className="mt-2 text-[11.5px] font-[600]" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Resumed from your draft
          </p>
        )}
      </PageHero>

      <form id="interview-form" className="mx-auto w-full max-w-3xl space-y-3 pb-32"
        onSubmit={(e) => { e.preventDefault(); save('completed'); }}>
        {INTERVIEW_QUESTIONS.map((q, i) => (
          <InterviewSection key={q.id} question={q} index={i} answers={answers}
            onChange={(field: InterviewField, next: string) => setAnswers((a) => ({ ...a, [field]: next }))} />
        ))}
      </form>

      <div className="page-action-bar" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-[12.5px] font-[650]" style={{ color: 'var(--text-muted)' }} aria-live="polite">
            <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{answered}</span> of {total} answered
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => save('draft')} disabled={saving !== null} loading={saving === 'draft'}>
              Save draft
            </Button>
            <Button type="submit" form="interview-form" disabled={saving !== null || !hasAnyAnswer} loading={saving === 'completed'}
              style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}>
              Complete interview
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

/** The finish line: what was captured, and the next step. */
function InterviewComplete({ clientName, clientId, answers }: { clientName: string; clientId: string; answers: Answers }) {
  const router = useRouter();
  const covered = INTERVIEW_QUESTIONS.filter((q) => topicAnswered(q, answers));
  return (
    <PageContainer>
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: rgba(semantic.success, 0.12) }}>
          <CheckCircle2 size={32} style={{ color: semantic.success }} />
        </div>
        <p className="mt-5 text-[10px] font-[820] uppercase tracking-[0.16em]" style={{ color: semantic.successLo }}>
          Intake step 4 complete
        </p>
        <h1 className="mt-1.5 text-[24px] font-[860] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          Interview complete
        </h1>
        <p className="mt-2 max-w-[38ch] text-[13.5px] leading-relaxed" style={{ color: 'var(--text-muted)', textWrap: 'pretty' }}>
          {clientName}&apos;s interview has been recorded — {covered.length} of {INTERVIEW_QUESTIONS.length} topics covered.
        </p>
        <ul className="mt-6 flex flex-wrap justify-center gap-1.5" aria-label="Topics covered">
          {covered.map((q) => {
            const Icon = q.icon;
            return (
              <li key={q.id} className="flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 text-[11.5px] font-[700]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <Icon size={12} aria-hidden style={{ color: 'var(--text-muted)' }} />
                {q.label}
              </li>
            );
          })}
        </ul>
        <JourneyNextButton clientId={clientId} current="interview" className="mt-8" />
        <button type="button" className="mt-3 rounded-full px-3 py-1.5 text-[12.5px] font-[650] transition-colors hover:bg-[var(--bg-subtle)]"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => router.push(`/pt-os/clients/${clientId}`)}>
          Back to profile
        </button>
      </div>
    </PageContainer>
  );
}

/** The page's own shape while the client loads: hero, two cards. */
function InterviewSkeleton() {
  const block = (h: string, r = 'rounded-[20px]') => (
    <div className={`${h} ${r} animate-pulse`} style={{ background: 'var(--bg-subtle)' }} />
  );
  return (
    <PageContainer>
      <div role="status" aria-label="Loading the interview" className="space-y-4">
        {block('h-[132px]', 'rounded-[24px]')}
        <div className="mx-auto max-w-3xl space-y-3">
          {block('h-[188px]')}
          {block('h-[188px]')}
        </div>
      </div>
    </PageContainer>
  );
}
