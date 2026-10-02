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

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2, MessagesSquare, Save } from 'lucide-react';
import Guard from '@/components/Guard';
import { Button, PageContainer, PageHero } from '@/components/ui';
import { FormField, TextArea } from '@/components/ui/form';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import { errorMessage } from '@/lib/forms/errors';
import { STEP_LABEL, stepHref, type ClientInterview } from '@/lib/journey';

type Answers = Record<InterviewField, string>;
type InterviewField =
  | 'training_history' | 'pain_and_injuries' | 'lifestyle' | 'motivation' | 'availability' | 'preferences' | 'notes';

/** The questions, in the order a trainer asks them. Limits match the server. */
const INTERVIEW_QUESTIONS: { key: InterviewField; label: string; hint: string; max: number; color: string }[] = [
  { key: 'training_history', label: 'Training history', hint: 'What have they done before? How long, how often, what stopped them?', max: 2000, color: '#0067E0' },
  { key: 'pain_and_injuries', label: 'Pain & injuries', hint: 'Anything that hurts now, past injuries, surgeries, what aggravates it.', max: 2000, color: '#0050AD' },
  { key: 'lifestyle', label: 'Lifestyle', hint: 'Work, sleep, stress, steps, food routine.', max: 2000, color: '#3B8DF5' },
  { key: 'motivation', label: 'Motivation & goals', hint: 'Why now? What would success look like, in their words?', max: 2000, color: '#002D61' },
  { key: 'availability', label: 'Availability', hint: 'Days and times they can train; travel or shifts.', max: 1000, color: '#7FB4FF' },
  { key: 'preferences', label: 'Preferences', hint: 'Training style, likes, dislikes, equipment at home.', max: 1000, color: '#64748B' },
  { key: 'notes', label: 'Trainer notes', hint: 'Anything else worth remembering.', max: 2000, color: '#94A3B8' },
];

const EMPTY: Answers = {
  training_history: '', pain_and_injuries: '', lifestyle: '', motivation: '', availability: '', preferences: '', notes: '',
};

function answersFrom(row: ClientInterview | null): Answers {
  if (!row) return { ...EMPTY };
  return Object.fromEntries(INTERVIEW_QUESTIONS.map(({ key }) => [key, String(row[key] ?? '')])) as Answers;
}

export default function InterviewPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>}>
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
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#0067E0' }} /></div>;
  }

  if (completed) {
    return (
      <PageContainer>
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'rgba(48,209,88,0.14)' }}>
            <CheckCircle2 size={32} style={{ color: '#10B981' }} />
          </div>
          <h1 className="mt-5 text-[24px] font-[860] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>Interview complete</h1>
          <p className="mt-2 text-[13.5px]" style={{ color: 'var(--text-muted)' }}>{clientName}&apos;s interview has been recorded.</p>
          <Button className="mt-8" iconLeft={<ArrowRight size={14} />}
            onClick={() => router.push(stepHref('assessment', clientId))}
            style={{ background: 'linear-gradient(135deg, #0067E0, #0059CE)', color: '#fff' }}>
            Continue to {STEP_LABEL.assessment}
          </Button>
          <button type="button" className="mt-3 text-[13px] font-[650]" style={{ color: 'var(--text-muted)' }}
            onClick={() => router.push(`/pt-os/clients/${clientId}`)}>
            Back to profile
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHero icon={<MessagesSquare size={20} />} title={`${clientName} — Client Interview`}
        subtitle="Step 4 of the intake journey · optional" />
      <form className="mx-auto mt-5 max-w-2xl space-y-3 pb-28" onSubmit={(e) => { e.preventDefault(); save('completed'); }}>
        {INTERVIEW_QUESTIONS.map(({ key, label, hint, max, color }) => (
          <div key={key} className="rounded-[18px] p-4"
            style={{ background: 'var(--bg-card, var(--bg-subtle))', border: '1px solid var(--border)', borderLeft: `3px solid ${color}` }}>
            <FormField label={label} description={hint}
              labelAside={<span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{answers[key].length}/{max}</span>}>
              <TextArea maxLength={max} rows={3} value={answers[key]}
                onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))} />
            </FormField>
          </div>
        ))}

        <div className="sticky bottom-3 flex flex-col gap-2 rounded-[18px] p-3 sm:flex-row sm:justify-end"
          style={{ background: 'var(--bg-elevated, var(--bg-subtle))', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
          <Button type="button" variant="outline" iconLeft={<Save size={14} />} disabled={saving !== null}
            loading={saving === 'draft'} onClick={() => save('draft')}>
            Save draft
          </Button>
          <Button type="submit" iconLeft={<CheckCircle2 size={14} />} disabled={saving !== null || !hasAnyAnswer}
            loading={saving === 'completed'}
            style={{ background: 'linear-gradient(135deg, #10B981, #047857)', color: '#fff' }}>
            Complete interview
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
