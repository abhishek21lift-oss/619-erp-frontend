'use client';

// The Client Interview — step five of the intake journey:
//
//   Welcome & Gym Tour → PT Enrolment → Informed Consent → PAR-Q →
//   Client Interview → Goals → Fitness Assessment → Program Design
//
// The conversation in which the trainer learns the client's work, training
// history, what gets in the way, and what should be remembered. It is
// optional — it never blocks enrolment or a plan — but it is a step: once
// completed, the next one is read from the server.
//
// ── The flow ────────────────────────────────────────────────────────────────
//
// One section per screen, in the order the conversation happens, then a review
// before the record is completed. The stepper is a map, not a gate: every
// section stays reachable, and Back / Continue never discard an answer.
// Completion is separate from saving, so a trainer can put the tablet down
// mid-interview and continue the draft later.
//
// ── What this screen writes ─────────────────────────────────────────────────
//
// Only the fields the controls own, and only the ones that changed: a legacy
// column this form does not ask (pain and injuries, for instance) survives a
// save. A conditional detail that no longer applies is cleared rather than
// orphaned; a legacy detail with no current category is left alone.
//
// The local draft is scoped to the signed-in trainer and studio and purged at
// logout (useAutoSaveDraft); its key matches the purge pattern.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, ClipboardCheck,
  Loader2, MessagesSquare, Pencil, Plus, User,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, HeroChip, PageContainer, PageHero } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { InterviewSection } from '@/components/pt-os/interview/InterviewSection';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';
import {
  EMPTY_ANSWERS as EMPTY, INTERVIEW_FIELDS, INTERVIEW_SECTIONS, LEGACY_ANSWERS,
  answerText, answersFrom, answeredCount, controlAnswered, firstIncompleteSection,
  sectionAnswered, visibleControls,
  type Answers, type InterviewField,
} from '@/components/pt-os/interview/questions';
import { rgba, semantic } from '@/lib/palette';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { errorMessage } from '@/lib/forms/errors';
import { type ClientInterview } from '@/lib/journey';

type Mode = 'edit' | 'view';
type SaveIntent = 'draft' | 'completed' | 'changes';

const REVIEW_STEP = INTERVIEW_SECTIONS.length;

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
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<ClientInterview | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const [step, setStep] = useState(0);
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

  // v3: the answer shape gained selections and arrays beyond
  // training_challenges; an old v2 draft is discarded rather than merged.
  const draftKey = `client-interview-draft.v3:${clientId}`;

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
        const [clientRes, listRes] = await Promise.all([
          api.pt.client(clientId) as Promise<{ data?: Record<string, unknown> }>,
          api.pt.interviews.list(clientId),
        ]);
        if (cancelled) return;
        setClientName(String(clientRes?.data?.name ?? 'Client'));

        // Resume an unfinished interview; otherwise show the newest one. A
        // completed interview opens as a summary and can be edited from there.
        const interviews = (listRes?.data ?? []) as ClientInterview[];
        const draft = interviews.find((row) => row.status === 'draft') ?? null;
        const active = draft ?? interviews[0] ?? null;
        setCurrent(active);
        setMode(active?.status === 'completed' ? 'view' : 'edit');

        const loaded = answersFrom(active as unknown as Record<string, unknown> | null);
        savedRef.current = loaded;
        // Always look for a local draft — the record may be completed, or not
        // exist yet, and the unsaved answers are still newer than it. `notBefore`
        // keeps a draft written BEFORE the server copy from overwriting it.
        const restored = restore(active ? { notBefore: Date.parse(active.updated_at) } : undefined);
        const merged = restored ? { ...loaded, ...restored } : loaded;
        setAnswers(merged);
        if (restored) {
          // A restored draft is an edit in progress, even when the server copy
          // is completed: showing it in the read-only summary would imply it
          // had been saved.
          setMode('edit');
          setStep(firstIncompleteSection(merged));
          toast.info('Restored your unsaved draft.');
        } else if (active?.status !== 'completed') {
          setStep(firstIncompleteSection(merged));
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

  const progress = answeredCount(answers);
  const percent = progress.total ? (progress.answered / progress.total) * 100 : 0;

  const setField = (field: InterviewField, value: string | string[]) => {
    setAnswers((prev) => {
      const next = { ...prev, [field]: value } as Answers;
      // "No sport" means the sport list no longer describes them. The list is
      // not hidden, so its total stays stable, but a stale selection must not
      // outlive the answer that contradicted it.
      if (field === 'sports_participation' && value === 'never') next.sports_played = [];
      return next;
    });
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
      const before = savedRef.current[key];
      const after = answers[key];
      const changed = Array.isArray(after) || Array.isArray(before)
        ? JSON.stringify(after) !== JSON.stringify(before)
        : after !== before;
      if (changed) body[key] = after;
    }

    // A conditional answer that no longer applies is cleared, not orphaned.
    // A legacy row can hold a detail with no occupation_type (the old screen
    // keyed it off the Lifestyle occupation); never delete that history when
    // no occupation is chosen now.
    const wasOther = savedRef.current.occupation_type === 'other';
    if (
      savedRef.current.occupation_other_details
      && answers.occupation_type !== 'other'
      && (wasOther || answers.occupation_type)
    ) {
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
        setStep(0);
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
      setStep(0);
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
    setStep(0);
  };

  const goTo = (next: number) => {
    setStep(next);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (step === 0) {
      router.push(`/pt-os/clients/${clientId}`);
      return;
    }
    goTo(step - 1);
  };

  const goForward = () => {
    if (step < REVIEW_STEP) {
      goTo(step + 1);
      return;
    }
    void save(current?.status === 'completed' ? 'changes' : 'completed');
  };

  if (loading) return <InterviewSkeleton />;

  const editingCompleted = mode === 'edit' && current?.status === 'completed';
  const onReview = step === REVIEW_STEP;
  const primaryDisabled = saving !== null || (!editingCompleted && onReview && progress.answered === 0);

  return (
    <PageContainer>
      <PageHero
        icon={<MessagesSquare size={18} />}
        title={`${clientName}'s Interview`}
        subtitle="Client interview · step 5"
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
          answered={progress.answered}
          starting={saving === 'new'}
          onEdit={() => { setMode('edit'); setStep(0); }}
          onStartNew={startNew}
          onBack={() => router.push(`/pt-os/clients/${clientId}`)}
        />
      ) : (
        <>
          <InterviewStepper step={step} answers={answers} onSelect={goTo} />

          <div className="mx-auto w-full max-w-3xl pb-28">
            {onReview ? (
              <InterviewReview answers={answers} onEdit={goTo} />
            ) : (
              <InterviewSection
                key={INTERVIEW_SECTIONS[step].id}
                section={INTERVIEW_SECTIONS[step]}
                index={step}
                answers={answers}
                onChange={setField}
              />
            )}
          </div>

          <div className="page-action-bar" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
            <div className="mx-auto max-w-3xl px-4 py-3 sm:px-8">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={goBack} disabled={saving !== null}
                  aria-label={step === 0 ? 'Back to client profile' : 'Back to the previous section'}
                  iconLeft={<ArrowLeft size={14} aria-hidden />}>
                  <span className="hidden min-[380px]:inline">Back</span>
                </Button>
                <p className="hidden min-w-0 flex-1 truncate text-[11.5px] font-[650] min-[420px]:block"
                  style={{ color: 'var(--text-muted)' }} aria-live="polite">
                  <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{progress.answered}</span> of {progress.total} answered
                </p>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {editingCompleted ? (
                    <>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={saving !== null}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" onClick={() => void save('changes')}
                        disabled={saving !== null || !isDirty} loading={saving === 'changes'}
                        style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}>
                        Save changes
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void save('draft')}
                        disabled={saving !== null} loading={saving === 'draft'}>
                        Save draft
                      </Button>
                      <Button type="button" size="sm" onClick={goForward} disabled={primaryDisabled}
                        loading={saving === 'completed'}
                        iconRight={<ArrowRight size={14} aria-hidden />}
                        style={{ background: 'linear-gradient(135deg, #A33757, #852E4E)', color: '#fff' }}>
                        {onReview ? 'Complete' : 'Continue'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

/** The section map. Every step stays reachable; progress is per section. */
function InterviewStepper({
  step, answers, onSelect,
}: {
  step: number;
  answers: Answers;
  onSelect: (step: number) => void;
}) {
  const total = INTERVIEW_SECTIONS.length + 1;
  const currentLabel = step === REVIEW_STEP ? 'Review' : INTERVIEW_SECTIONS[step].label;

  return (
    <nav aria-label="Interview steps" className="mx-auto w-full max-w-3xl">
      <ol className="grid grid-cols-5 gap-1.5 rounded-[20px] p-2 sm:p-2.5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
        {INTERVIEW_SECTIONS.map((section, i) => {
          const progress = sectionAnswered(section, answers);
          const done = progress.total > 0 && progress.answered === progress.total;
          const active = step === i;
          return (
            <li key={section.id}>
              <button type="button" onClick={() => onSelect(i)} aria-current={active ? 'step' : undefined}
                className="flex w-full flex-col items-center gap-1.5 rounded-[14px] px-1 py-2 transition hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33757]/35">
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full text-[11.5px] font-[800] tabular-nums transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg, #A33757, #852E4E)' : done ? 'rgba(163,55,87,0.10)' : 'var(--bg-subtle)',
                    color: active ? '#fff' : done ? '#A33757' : 'var(--text-muted)',
                    border: active ? '1px solid transparent' : done ? '1px solid rgba(163,55,87,0.20)' : '1px solid var(--border)',
                    boxShadow: active ? '0 5px 14px -8px rgba(163,55,87,0.7)' : 'none',
                  }}>
                  {done && !active ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span className="hidden w-full truncate text-center text-[10.5px] font-[700] sm:block"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {section.label}
                </span>
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => onSelect(REVIEW_STEP)} aria-current={step === REVIEW_STEP ? 'step' : undefined}
            className="flex w-full flex-col items-center gap-1.5 rounded-[14px] px-1 py-2 transition hover:bg-[var(--bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33757]/35">
            <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full text-[11.5px] font-[800]"
              style={{
                background: step === REVIEW_STEP ? 'linear-gradient(135deg, #A33757, #852E4E)' : 'var(--bg-subtle)',
                color: step === REVIEW_STEP ? '#fff' : 'var(--text-muted)',
                border: step === REVIEW_STEP ? '1px solid transparent' : '1px solid var(--border)',
                boxShadow: step === REVIEW_STEP ? '0 5px 14px -8px rgba(163,55,87,0.7)' : 'none',
              }}>
              <ClipboardCheck size={13} strokeWidth={2.4} />
            </span>
            <span className="hidden w-full text-center text-[10.5px] font-[700] sm:block"
              style={{ color: step === REVIEW_STEP ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Review
            </span>
          </button>
        </li>
      </ol>
      <p className="mt-2 px-1 text-[11.5px] font-[650] sm:hidden" style={{ color: 'var(--text-muted)' }}>
        Step {step + 1} of {total} · <span style={{ color: 'var(--text-primary)' }}>{currentLabel}</span>
      </p>
    </nav>
  );
}

/** The last step: everything recorded, grouped as it was asked. */
function InterviewReview({ answers, onEdit }: { answers: Answers; onEdit: (step: number) => void }) {
  const progress = answeredCount(answers);
  const missing = progress.total - progress.answered;

  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-[26px] sm:rounded-[30px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -38px rgba(15,23,42,0.32)' }}>
        <div aria-hidden className="h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, #A33757 0%, #FFBB94 42%, transparent 100%)' }} />
        <div className="p-5 sm:p-8">
          <header className="flex items-start gap-3.5 sm:gap-4">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] sm:h-12 sm:w-12 sm:rounded-[16px]"
              style={{ background: 'rgba(163,55,87,0.09)', border: '1px solid rgba(163,55,87,0.16)' }}>
              <ClipboardCheck size={19} strokeWidth={1.75} style={{ color: '#A33757' }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-[760] uppercase leading-none tracking-[0.14em]" style={{ color: '#A33757' }}>
                Review · {progress.answered} of {progress.total} answered
              </p>
              <h2 className="mt-1.5 text-[21px] font-[820] leading-[1.15] tracking-[-0.03em] sm:text-[23px]"
                style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
                Does this sound like them?
              </h2>
              <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed sm:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Check what was recorded. Tap a section to correct it, then save.
              </p>
            </div>
          </header>

          {missing > 0 && (
            <p role="status" className="mt-4 rounded-[13px] px-3.5 py-2.5 text-[12px] leading-relaxed"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', color: 'var(--text-secondary)' }}>
              {missing} counted {missing === 1 ? 'question is' : 'questions are'} still unanswered. They stay
              “not recorded”.
            </p>
          )}

          <div className="mt-4 space-y-2.5">
            {INTERVIEW_SECTIONS.map((section, i) => {
              const sectionProgress = sectionAnswered(section, answers);
              const controls = visibleControls(section, answers)
                .filter((control) => control.counted !== false || controlAnswered(answers[control.key]));
              const Icon = section.icon;
              return (
                <div key={section.id} className="rounded-[16px] p-3.5"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => onEdit(i)}
                    className="flex w-full items-center gap-2.5 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A33757]/35">
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <Icon size={14} style={{ color: '#A33757' }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-[740]" style={{ color: 'var(--text-primary)' }}>{section.label}</span>
                      <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {sectionProgress.answered}/{sectionProgress.total} answered · Edit
                      </span>
                    </span>
                    <Pencil size={13} aria-hidden style={{ color: 'var(--text-muted)' }} />
                  </button>

                  <dl className="mt-2.5 space-y-1.5 border-t pt-2.5" style={{ borderColor: 'var(--border)' }}>
                    {controls.map((control) => {
                      const value = answerText(control, answers[control.key], answers);
                      return (
                        <div key={control.key} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2.5 text-[12px]">
                          <dt className="leading-snug" style={{ color: 'var(--text-muted)' }}>{control.label}</dt>
                          <dd className={`leading-snug ${value ? 'whitespace-pre-line' : ''}`}
                            style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: value ? 620 : 500 }}>
                            {value || 'Not answered'}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {LEGACY_ANSWERS.some(({ key }) => controlAnswered(answers[key])) && (
        <section aria-labelledby="summary-earlier"
          className="rounded-[22px] p-4 sm:p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 id="summary-earlier" className="text-[15px] font-[780] tracking-[-0.015em]"
            style={{ color: 'var(--text-primary)' }}>
            Earlier interview answers
          </h2>
          <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Kept from the first interview; this form does not change them.
          </p>
          <dl className="mt-3 divide-y" style={{ borderColor: 'var(--border)' }}>
            {LEGACY_ANSWERS.filter(({ key }) => controlAnswered(answers[key])).map(({ key, label }) => (
              <div key={key} className="py-2.5 first:pt-0 last:pb-0">
                <dt className="text-[10.5px] font-[760] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {answers[key]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

/** The completed interview as a record: what was asked, and what was said. */
function InterviewSummary({
  clientId, current, answers, answered, starting, onEdit, onStartNew, onBack,
}: {
  clientId: string;
  current: ClientInterview;
  answers: Answers;
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

      {INTERVIEW_SECTIONS.map((section) => {
        const Icon = section.icon;
        const progress = sectionAnswered(section, answers);
        const controls = visibleControls(section, answers)
          .filter((control) => control.counted !== false || controlAnswered(answers[control.key]));
        return (
          <section key={section.id} aria-labelledby={`summary-${section.id}`}
            className="rounded-[22px] p-4 sm:p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-start gap-3">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]"
                style={{ background: 'var(--bg-subtle)' }}>
                <Icon size={17} style={{ color: 'var(--text-muted)' }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  {section.label} · {progress.answered}/{progress.total}
                </p>
                <h2 id={`summary-${section.id}`} className="mt-0.5 text-[16px] font-[780] tracking-[-0.015em]"
                  style={{ color: 'var(--text-primary)' }}>
                  {section.prompt}
                </h2>
              </div>
            </div>

            <dl className="mt-3 divide-y" style={{ borderColor: 'var(--border)' }}>
              {controls.map((control) => {
                const value = answerText(control, answers[control.key], answers);
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

      {LEGACY_ANSWERS.some(({ key }) => controlAnswered(answers[key])) && (
        <section aria-labelledby="summary-earlier"
          className="rounded-[22px] p-4 sm:p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 id="summary-earlier" className="text-[16px] font-[780] tracking-[-0.015em]"
            style={{ color: 'var(--text-primary)' }}>
            Earlier interview answers
          </h2>
          <dl className="mt-3 divide-y" style={{ borderColor: 'var(--border)' }}>
            {LEGACY_ANSWERS.filter(({ key }) => controlAnswered(answers[key])).map(({ key, label }) => (
              <div key={key} className="py-2.5 first:pt-0 last:pb-0">
                <dt className="text-[10.5px] font-[760] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </dt>
                <dd className="mt-0.5 text-[13.5px] leading-relaxed whitespace-pre-line"
                  style={{ color: 'var(--text-primary)' }}>
                  {answers[key]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

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

function when(iso: string | null): string {
  if (!iso) return 'Not saved';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not saved';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/** The page's own shape while the client loads: hero and section card. */
function InterviewSkeleton() {
  const block = (h: string, r = 'rounded-[22px]') => (
    <div className={`${h} ${r} animate-pulse`} style={{ background: 'var(--bg-subtle)' }} />
  );
  return (
    <PageContainer>
      <div role="status" aria-label="Loading the interview" className="space-y-4">
        {block('h-[148px]', 'rounded-[24px]')}
        <div className="mx-auto max-w-3xl space-y-3">
          {block('h-[64px]')}
          {block('h-[420px]', 'rounded-[26px]')}
        </div>
      </div>
    </PageContainer>
  );
}
