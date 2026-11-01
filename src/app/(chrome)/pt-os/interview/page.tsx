'use client';

// The Client Interview — step four of the intake journey:
//
//   Registration → Informed Consent → PAR-Q → Client Interview →
//   Fitness Assessment → Goals → PT Enrolment → Workout Plan
//
// The conversation in which the trainer learns the client's work, training
// history, what gets in the way, and what should be remembered. It is
// optional — it never blocks enrolment or a plan — but it is a step: once
// completed, the next one is read from the server.
//
// ── What this screen owns ───────────────────────────────────────────────────
//
// Four sections: Work & lifestyle, Training background, Training challenges,
// Interview summary. Occupation, screen time and activity are read-only here
// because the Lifestyle Assessment owns them (a single source per fact); the
// rest is written by this form.
//
// A saved completed interview is readable, and editable — correcting a typo or
// adding what the client mentioned on the way out should not mean starting a
// new record. "Start new interview" is separate and keeps the old one.
//
// The local draft is scoped to the signed-in trainer and studio and purged at
// logout (useAutoSaveDraft); its key matches the purge pattern.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, MessagesSquare, Pencil, Plus, User } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, HeroChip, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { InterviewSection, SourceFactsCard, type LifestyleFacts } from '@/components/pt-os/interview/InterviewSection';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';
import {
  EMPTY_ANSWERS as EMPTY, INTERVIEW_FIELDS, INTERVIEW_SECTIONS,
  answersFrom, answeredCount, controlAnswered, isControlVisible, sectionAnswered, challengeLabels,
  type Answers, type InterviewControl, type InterviewField,
} from '@/components/pt-os/interview/questions';
import { rgba, semantic } from '@/lib/palette';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { errorMessage } from '@/lib/forms/errors';
import { type ClientInterview } from '@/lib/journey';

type Mode = 'edit' | 'view';
type SaveIntent = 'draft' | 'completed' | 'changes';

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
  const router = useRouter();
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [lifestyle, setLifestyle] = useState<LifestyleFacts | null>(null);
  const [lifestyleFailed, setLifestyleFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<ClientInterview | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const [answers, setAnswers] = useState<Answers>({ ...EMPTY });
  const [saving, setSaving] = useState<SaveIntent | 'new' | null>(null);

  /**
   * The interview as the record holds it, and the baseline the save diffs
   * against. A field equal to its baseline is left out of the request body
   * entirely: the API reads an empty string as "clear this column", so a
   * value this form has no control for (an interview written before these
   * fields existed) must not be sent at all, rather than sent blank.
   */
  const savedRef = useRef<Answers>({ ...EMPTY });

  // v2: the answer shape gained arrays (training_challenges); an old v1 draft
  // is discarded rather than merged into it.
  const draftKey = `client-interview-draft.v2:${clientId}`;
  const occupationType = String(lifestyle?.occupation_type ?? '');

  const initial = useMemo(
    () => answersFrom(current as unknown as Record<string, unknown> | null),
    [current],
  );
  const isDirty = useMemo(() => JSON.stringify(answers) !== JSON.stringify(initial), [answers, initial]);
  const { restore, clear } = useAutoSaveDraft({
    key: draftKey,
    data: answers,
    isDirty: isDirty && mode === 'edit',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // A missing Lifestyle Assessment must not stop the interview being
        // recorded; the read-only block says "not recorded". A FAILED read is
        // not the same thing, so it is logged and shown as unavailable rather
        // than as an empty assessment.
        const lifestyleRead = api.progress.lifestyleAssessments.list({ client_id: clientId })
          .catch((err: unknown) => { console.warn('[interview] lifestyle facts unavailable', err); return null; });

        const [clientRes, listRes, lifestyleRes] = await Promise.all([
          api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
          api.pt.interviews.list(clientId),
          lifestyleRead,
        ]);
        if (cancelled) return;
        setClientName(String(clientRes?.data?.name ?? 'Client'));

        setLifestyleFailed(lifestyleRes === null);
        const lifestyleRows = (lifestyleRes?.data ?? []) as LifestyleFacts[];
        setLifestyle(lifestyleRows[0] ?? null);

        // Resume an unfinished interview; otherwise show the newest one. A
        // completed interview opens as a summary and can be edited from there.
        const interviews = (listRes?.data ?? []) as ClientInterview[];
        const draft = interviews.find((row) => row.status === 'draft') ?? null;
        const active = draft ?? interviews[0] ?? null;
        setCurrent(active);
        setMode(active?.status === 'completed' ? 'view' : 'edit');

        const loaded = answersFrom(active as unknown as Record<string, unknown> | null);
        savedRef.current = loaded;
        if (active?.status === 'draft') {
          const restored = restore({ notBefore: Date.parse(active.updated_at) });
          setAnswers(restored ? { ...loaded, ...restored } : loaded);
          if (restored) toast.info('Restored your unsaved draft.');
        } else {
          setAnswers(loaded);
        }
      } catch (err: unknown) {
        if (!cancelled) toast.error(errorMessage(err, 'Could not load this client.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const progress = answeredCount(answers, occupationType);
  const percent = progress.total ? (progress.answered / progress.total) * 100 : 0;

  const setField = (field: InterviewField, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [field]: value } as Answers));
  };

  const save = async (intent: SaveIntent) => {
    if (intent === 'completed' && progress.answered === 0) {
      toast.error('Answer at least one question before completing the interview.');
      return;
    }

    // Diff, not overwrite: only what the trainer actually changed is sent, so
    // columns this form does not ask (legacy pain/injury text, for instance)
    // survive a save from this screen.
    const body: Record<string, unknown> = {};
    for (const key of INTERVIEW_FIELDS) {
      if (key === 'training_challenges') {
        if (JSON.stringify(answers.training_challenges) !== JSON.stringify(savedRef.current.training_challenges)) {
          body[key] = answers.training_challenges;
        }
        continue;
      }
      if (answers[key] !== savedRef.current[key]) body[key] = answers[key];
    }

    // A conditional answer that no longer applies is cleared, not orphaned.
    // Only when the source fact is known: with no Lifestyle row, a legacy
    // value is left exactly as the record holds it.
    if (occupationType && occupationType !== 'other' && savedRef.current.occupation_other_details) {
      body.occupation_other_details = '';
    }
    if (!answers.training_challenges.includes('other') && savedRef.current.challenge_other) {
      body.challenge_other = '';
    }

    if (intent !== 'changes') body.status = intent;
    // A status-only request is a real save when it completes the interview: a
    // draft that already holds answers must be completable without editing one
    // just to give the button something to send.
    if (intent !== 'completed' && !Object.keys(body).some((key) => key !== 'status')) {
      toast.info('Nothing to save yet.');
      return;
    }

    setSaving(intent);
    try {
      const res = current
        ? await api.pt.interviews.update(current.id, body)
        : await api.pt.interviews.create(clientId, body);
      const next = answersFrom(res.data as unknown as Record<string, unknown>);
      clear();
      setCurrent(res.data);
      savedRef.current = next;
      setAnswers(next);
      if (res.data.status === 'completed') {
        setMode('view');
        toast.success(intent === 'completed' ? 'Interview completed.' : 'Changes saved.');
      } else {
        toast.success('Interview saved as a draft.');
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not save the interview.'));
    } finally {
      setSaving(null);
    }
  };

  const startNew = async () => {
    setSaving('new');
    try {
      const res = await api.pt.interviews.create(clientId, { status: 'draft' });
      const next = answersFrom(res.data as unknown as Record<string, unknown>);
      clear();
      setCurrent(res.data);
      savedRef.current = next;
      setAnswers(next);
      setMode('edit');
      toast.success('New interview started.');
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not start a new interview.'));
    } finally {
      setSaving(null);
    }
  };

  const cancelEdit = () => {
    clear();
    setAnswers(answersFrom(current as unknown as Record<string, unknown> | null));
    setMode('view');
  };

  if (loading) return <InterviewSkeleton />;

  return (
    <PageContainer>
      <PageHero
        icon={<MessagesSquare size={18} />}
        title={`${clientName}'s Interview`}
        subtitle="Client interview · step 4"
      >
        <div className="mt-1 flex items-center gap-3">
          <div role="progressbar" aria-valuemin={0} aria-valuenow={progress.answered} aria-valuemax={progress.total}
            aria-label="Interview progress" className="h-[6px] flex-1 overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.22)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%`, background: '#fff' }} />
          </div>
          <span className="shrink-0 text-[12px] font-[700] tabular-nums text-white">
            {progress.answered}/{progress.total}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <HeroChip icon={<User size={12} aria-hidden />}>{clientName}</HeroChip>
          <HeroChip icon={<Clock3 size={12} aria-hidden />}>
            {current ? `Updated ${when(current.updated_at)}` : 'Not started'}
          </HeroChip>
          {mode === 'view' && <HeroChip icon={<CheckCircle2 size={12} aria-hidden />}>Completed</HeroChip>}
        </div>
      </PageHero>

      {mode === 'view' && current ? (
        <InterviewSummary
          clientId={clientId}
          current={current}
          answers={answers}
          lifestyle={lifestyle}
          lifestyleUnavailable={lifestyleFailed}
          occupationType={occupationType}
          answered={progress.answered}
          starting={saving === 'new'}
          onEdit={() => setMode('edit')}
          onStartNew={startNew}
          onBack={() => router.push(`/pt-os/clients/${clientId}`)}
        />
      ) : (
        <>
          <SectionNav answers={answers} occupationType={occupationType} />

          <form id="interview-form" className="mx-auto w-full max-w-3xl space-y-3 pb-32"
            onSubmit={(e) => { e.preventDefault(); save(current?.status === 'completed' ? 'changes' : 'completed'); }}>
            <SourceFactsCard clientId={clientId} lifestyle={lifestyle} unavailable={lifestyleFailed} />
            {INTERVIEW_SECTIONS.map((section, i) => (
              <InterviewSection key={section.id} section={section} index={i} answers={answers}
                occupationType={occupationType} onChange={setField} />
            ))}
          </form>

          <div className="page-action-bar" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
            <div className="mx-auto max-w-3xl px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-[12.5px] font-[650]" style={{ color: 'var(--text-muted)' }} aria-live="polite">
                <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{progress.answered}</span> of {progress.total} answered
              </p>
              <div className="flex shrink-0 items-center gap-3">
                {current?.status === 'completed' ? (
                  <>
                    <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving !== null}>
                      Cancel
                    </Button>
                    <Button type="submit" form="interview-form" disabled={saving !== null} loading={saving === 'changes'}
                      style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}>
                      Save changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="ghost" onClick={() => save('draft')} disabled={saving !== null} loading={saving === 'draft'}>
                      Save draft
                    </Button>
                    <Button type="submit" form="interview-form" disabled={saving !== null || progress.answered === 0} loading={saving === 'completed'}
                      style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}>
                      Complete interview
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

/** The section anchors, with how much of each section is answered. */
function SectionNav({ answers, occupationType }: { answers: Answers; occupationType: string }) {
  return (
    <nav aria-label="Interview sections" className="mx-auto w-full max-w-3xl">
      <ul className="flex gap-2 overflow-x-auto pb-0.5">
        {INTERVIEW_SECTIONS.map((section) => {
          const Icon = section.icon;
          const progress = sectionAnswered(section, answers, occupationType);
          return (
            <li key={section.id} className="shrink-0">
              <a href={`#section-${section.id}`}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-[700] transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <Icon size={13} aria-hidden style={{ color: 'var(--text-muted)' }} />
                <span className="whitespace-nowrap">{section.label}</span>
                <span className="tabular-nums" style={{ color: progress.answered === progress.total ? semantic.successLo : 'var(--text-muted)' }}>
                  {progress.answered}/{progress.total}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The completed interview as a record: what was asked, and what was said. */
function InterviewSummary({
  clientId, current, answers, lifestyle, lifestyleUnavailable, occupationType, answered, starting, onEdit, onStartNew, onBack,
}: {
  clientId: string;
  current: ClientInterview;
  answers: Answers;
  lifestyle: LifestyleFacts | null;
  lifestyleUnavailable: boolean;
  occupationType: string;
  answered: number;
  starting: boolean;
  onEdit: () => void;
  onStartNew: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div role="status" className="flex items-center gap-3 rounded-[18px] p-4"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(16,185,129,0.04))', border: `1px solid ${rgba(semantic.success, 0.22)}` }}>
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
          style={{ background: rgba(semantic.success, 0.14) }}>
          <CheckCircle2 size={20} style={{ color: semantic.success }} />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-[760]" style={{ color: 'var(--text-primary)' }}>
            Interview completed
          </p>
          <p className="text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            {current.completed_at ? `Completed ${when(current.completed_at)} · ` : ''}
            {answered} {answered === 1 ? 'answer' : 'answers'} recorded
          </p>
        </div>
      </div>

      <SourceFactsCard clientId={clientId} lifestyle={lifestyle} unavailable={lifestyleUnavailable} />

      {INTERVIEW_SECTIONS.map((section, i) => {
        const Icon = section.icon;
        const controls = section.controls.filter(
          (control) => isControlVisible(control, answers, occupationType) || controlAnswered(answers[control.key]),
        );
        return (
          <section key={section.id} aria-labelledby={`summary-${section.id}`}
            className="rounded-[20px] p-4 sm:p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                style={{ background: 'var(--bg-subtle)' }}>
                <Icon size={17} style={{ color: 'var(--text-muted)' }} />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  {String(i + 1).padStart(2, '0')} · {section.label}
                </p>
                <h2 id={`summary-${section.id}`} className="mt-0.5 text-[16px] font-[780] tracking-[-0.015em]"
                  style={{ color: 'var(--text-primary)' }}>
                  {section.prompt}
                </h2>
              </div>
            </div>

            <dl className="mt-3 divide-y" style={{ borderColor: 'var(--border)' }}>
              {controls.map((control) => {
                const value = answerText(control, answers[control.key]);
                return (
                  <div key={control.key} className="py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-[10.5px] font-[760] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                      {control.label}
                    </dt>
                    <dd className={`mt-0.5 text-[13.5px] leading-relaxed ${value ? 'whitespace-pre-line' : ''}`}
                      style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {value || 'Not recorded'}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button type="button" onClick={onEdit} iconLeft={<Pencil size={14} aria-hidden />}
          style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}>
          Edit answers
        </Button>
        <Button type="button" variant="outline" onClick={onStartNew} loading={starting} disabled={starting}
          iconLeft={<Plus size={14} aria-hidden />}>
          Start new interview
        </Button>
        <JourneyNextButton clientId={clientId} current="interview" />
      </div>

      <button type="button" onClick={onBack}
        className="rounded-full px-3 py-1.5 text-[12.5px] font-[650] transition-colors hover:bg-[var(--bg-subtle)]"
        style={{ color: 'var(--text-muted)' }}>
        Back to profile
      </button>
    </div>
  );
}

function answerText(control: InterviewControl, value: string | string[]): string {
  if (control.kind === 'chips') return challengeLabels(Array.isArray(value) ? value : []).join(', ');
  if (control.kind === 'select') {
    return control.options.find((option) => option.value === value)?.label ?? String(value);
  }
  return String(value);
}

function when(iso: string | null): string {
  if (!iso) return 'Not saved';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not saved';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/** The page's own shape while the client loads: hero, source facts, sections. */
function InterviewSkeleton() {
  const block = (h: string, r = 'rounded-[20px]') => (
    <div className={`${h} ${r} animate-pulse`} style={{ background: 'var(--bg-subtle)' }} />
  );
  return (
    <PageContainer>
      <div role="status" aria-label="Loading the interview" className="space-y-4">
        {block('h-[148px]', 'rounded-[24px]')}
        <div className="mx-auto max-w-3xl space-y-3">
          {block('h-[168px]')}
          {block('h-[240px]')}
          {block('h-[180px]')}
        </div>
      </div>
    </PageContainer>
  );
}
