'use client';

// The Client Interview — step four of the intake journey:
//
//   Registration → Informed Consent → PAR-Q → Client Interview →
//   Fitness Assessment → Goals → PT Enrolment → Workout Plan
//
// The conversation in which the trainer learns the client's training history,
// what hurts, how they live, why they came and when they can train, written
// down (backend migration 227). It is optional — it never blocks enrolment —
// but it is a step: once completed, the next one is Fitness Assessment.
//
// The local draft is scoped to the signed-in trainer and studio and purged at
// logout (useAutoSaveDraft); its key matches the purge pattern.

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { m, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Loader2, MessagesSquare, Save } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { InterviewSection } from '@/components/pt-os/interview/InterviewSection';
import { InterviewHero, SectionNav } from '@/components/pt-os/interview/InterviewChrome';
import {
  INTERVIEW_QUESTIONS, EMPTY_ANSWERS as EMPTY, answeredCount, type Answers,
} from '@/components/pt-os/interview/questions';
import { semantic, rgba } from '@/lib/palette';
import { gradient, tones } from '@/components/profile/profileTheme';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { errorMessage } from '@/lib/forms/errors';
import { STEP_LABEL, stepHref, type ClientInterview } from '@/lib/journey';

function answersFrom(row: ClientInterview | null): Answers {
  if (!row) return { ...EMPTY };
  return Object.fromEntries(INTERVIEW_QUESTIONS.map(({ key }) => [key, String(row[key] ?? '')])) as Answers;
}

export default function InterviewPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: semantic.primary }} /></div>}>
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
  const router = useRouter();
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<ClientInterview | null>(null);
  const [answers, setAnswers] = useState<Answers>({ ...EMPTY });
  const [saving, setSaving] = useState<'draft' | 'completed' | null>(null);
  const [completed, setCompleted] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const bar = useColumnRect(formRef, !loading && !completed);

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
        const restored = restore({ notBefore: draft ? Date.parse(draft.updated_at) : undefined });
        setAnswers(restored ? { ...answersFrom(draft), ...restored } : answersFrom(draft));
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

  const hasAnyAnswer = INTERVIEW_QUESTIONS.some(({ key }) => answers[key].trim());

  const save = async (status: 'draft' | 'completed') => {
    if (status === 'completed' && !hasAnyAnswer) {
      toast.error('Write down at least one answer before completing the interview.');
      return;
    }
    setSaving(status);
    try {
      const body = { ...answers, status };
      const res = current
        ? await api.pt.interviews.update(current.id, body)
        : await api.pt.interviews.create(clientId, body);
      clear();
      setCurrent(res.data);
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

  return (
    <PageContainer>
      <InterviewHero clientName={clientName} answers={answers} answered={answered} resumed={current !== null} />
      <form ref={formRef} id="interview-form" className="mx-auto mt-4 max-w-3xl space-y-3 pb-32 sm:space-y-4"
        onSubmit={(e) => { e.preventDefault(); save('completed'); }}>
        <SectionNav answers={answers} />
        {INTERVIEW_QUESTIONS.map((q, i) => (
          <InterviewSection key={q.key} question={q} index={i} value={answers[q.key]}
            onChange={(next) => setAnswers((a) => ({ ...a, [q.key]: next }))} />
        ))}

      </form>

      {/* The action bar: glass, fixed above the bottom nav and laid over the
          form's own column. Fixed rather than sticky — see SectionNav. */}
      <div className="fixed above-bottom-nav z-40 flex items-center gap-2 rounded-[22px] p-2.5"
        style={{
          left: bar.left, width: bar.width,
          background: 'color-mix(in srgb, var(--bg-elevated, var(--bg-base)) 82%, transparent)',
          border: '1px solid var(--border)',
          backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          boxShadow: '0 18px 40px -18px rgba(15,23,42,0.35)',
        }}>
        <p className="hidden min-w-0 flex-1 pl-2 text-[12.5px] font-[650] sm:block" style={{ color: 'var(--text-muted)' }}
          aria-live="polite">
          <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{answered}</span> of {INTERVIEW_QUESTIONS.length} answered
        </p>
        <div className="flex flex-1 gap-2 sm:flex-none">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" iconLeft={<Save size={14} />}
            disabled={saving !== null} loading={saving === 'draft'} onClick={() => save('draft')}>
            Save draft
          </Button>
          <Button type="submit" form="interview-form" className="flex-1 sm:flex-none" iconLeft={<CheckCircle2 size={14} />}
            disabled={saving !== null || !hasAnyAnswer} loading={saving === 'completed'}
            style={{ background: `linear-gradient(135deg, ${semantic.success}, ${semantic.successLo})`, color: '#fff' }}>
            Complete
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

/**
 * Where the form's column is on screen, so a fixed bar can sit over it. It
 * moves when the sidebar collapses or the window resizes; a viewport-centred
 * bar would sit half over the sidebar on desktop.
 */
function useColumnRect(ref: React.RefObject<HTMLElement | null>, mounted: boolean) {
  const [rect, setRect] = useState<{ left: number | string; width: number | string }>({ left: 16, width: 'calc(100% - 32px)' });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) setRect({ left: r.left, width: r.width });
    };
    measure();
    // The sidebar collapsing resizes the column without resizing the window.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [ref, mounted]);
  return rect;
}

/** The finish line: a celebration, what was captured, and the next step. */
function InterviewComplete({ clientName, clientId, answers }: { clientName: string; clientId: string; answers: Answers }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const covered = INTERVIEW_QUESTIONS.filter((q) => answers[q.key].trim());
  return (
    <PageContainer>
      <m.div
        initial={reduce ? false : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <div className="relative">
          <div aria-hidden className="absolute -inset-6 rounded-full blur-2xl"
            style={{ background: `radial-gradient(circle, ${rgba(semantic.success, 0.35)}, transparent 70%)` }} />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] text-white"
            style={{ background: `linear-gradient(135deg, ${semantic.success}, ${semantic.successLo})`, boxShadow: `0 16px 34px -12px ${rgba(semantic.success, 0.6)}` }}>
            <CheckCircle2 size={38} strokeWidth={2.2} />
          </div>
        </div>
        <h1 className="mt-6 text-[26px] font-[860] tracking-[-0.025em]" style={{ color: 'var(--text-primary)' }}>Interview complete</h1>
        <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          {clientName}&apos;s interview has been recorded — {covered.length} of {INTERVIEW_QUESTIONS.length} topics covered.
        </p>
        {/* What was captured, in each topic's own tone. */}
        <ul className="mt-5 flex flex-wrap justify-center gap-1.5" aria-label="Topics covered">
          {covered.map((q) => {
            const Icon = q.icon;
            return (
              <li key={q.key} className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[11.5px] font-[700]"
                style={{ background: 'var(--bg-card, var(--bg-elevated))', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                  style={{ background: gradient(tones[q.tone]) }}>
                  <Icon size={11} strokeWidth={2.4} />
                </span>
                {q.label}
              </li>
            );
          })}
        </ul>
        <Button className="mt-8" iconLeft={<ArrowRight size={14} />}
          onClick={() => router.push(stepHref('assessment', clientId))}
          style={{ background: `linear-gradient(135deg, ${semantic.primaryHi}, ${semantic.primaryLo})`, color: '#fff' }}>
          Continue to {STEP_LABEL.assessment}
        </Button>
        <button type="button" className="mt-3 text-[13px] font-[650]" style={{ color: 'var(--text-muted)' }}
          onClick={() => router.push(`/pt-os/clients/${clientId}`)}>
          Back to profile
        </button>
      </m.div>
    </PageContainer>
  );
}

/** The page's own shape while the client loads: hero, pills, two cards. */
function InterviewSkeleton() {
  const block = (h: string, r = 'rounded-[24px]') => (
    <div className={`${h} ${r} animate-pulse`} style={{ background: 'var(--bg-subtle)' }} />
  );
  return (
    <PageContainer>
      <div role="status" aria-label="Loading the interview" className="space-y-4">
        {block('h-[188px]', 'rounded-[28px]')}
        <div className="mx-auto max-w-2xl space-y-3">
          {block('h-9', 'rounded-full')}
          {block('h-[196px]')}
          {block('h-[196px]')}
        </div>
      </div>
    </PageContainer>
  );
}
