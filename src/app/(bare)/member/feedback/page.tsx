'use client';
/**
 * Member — Session feedback.
 *
 * After the trainer marks a session completed, it waits here until the client
 * answers. Four tap-only questions and an overall star rating, plus one
 * optional note. The server computes the weighted score and stores it; this
 * page only sends the answers.
 *
 * The same request can be answered once. A second submit is refused by the
 * server, and the row moves to "Your ratings" in place.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Star } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, longDate,
} from '@/components/member/MemberUI';
import { Button, FormField, TextArea } from '@/components/ui';
import { api } from '@/lib/api';
import type { SessionFeedback, SessionFeedbackInput } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';

type AnswerKey = 'trainer_behaviour' | 'form_technique' | 'workout_intensity' | 'motivation_guidance';

type Question = {
  key: AnswerKey;
  label: string;
  options: Array<{ value: string; label: string }>;
};

const QUESTIONS: Question[] = [
  {
    key: 'trainer_behaviour',
    label: 'How was your trainer today?',
    options: [
      { value: 'excellent', label: 'Excellent' },
      { value: 'good', label: 'Good' },
      { value: 'average', label: 'Average' },
      { value: 'poor', label: 'Poor' },
    ],
  },
  {
    key: 'form_technique',
    label: 'Did your trainer check your form and technique?',
    options: [
      { value: 'always', label: 'Always' },
      { value: 'mostly', label: 'Mostly' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    key: 'workout_intensity',
    label: 'How did the workout feel?',
    options: [
      { value: 'perfect', label: 'Perfect' },
      { value: 'too_easy', label: 'Too easy' },
      { value: 'too_hard', label: 'Too hard' },
    ],
  },
  {
    key: 'motivation_guidance',
    label: 'Did your trainer keep you motivated?',
    options: [
      { value: 'absolutely', label: 'Absolutely' },
      { value: 'somewhat', label: 'Somewhat' },
      { value: 'not_really', label: 'Not really' },
    ],
  },
];

const scoreOf = (f: SessionFeedback): number | null =>
  f.score == null ? null : Number(f.score);

const scoreText = (f: SessionFeedback): string => {
  const s = scoreOf(f);
  return s == null ? '—' : s.toFixed(2);
};

export default function MemberFeedbackPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <FeedbackBody />
      </MemberShell>
    </Guard>
  );
}

function FeedbackBody() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SessionFeedback[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<AnswerKey, string>>>({});
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.me.feedback('all')
      .then((r) => { setRows(r.data); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const reset = () => {
    setAnswers({});
    setStars(0);
    setText('');
  };

  const open = (row: SessionFeedback) => {
    if (openId === row.id) { setOpenId(null); return; }
    reset();
    setOpenId(row.id);
  };

  const submit = async (id: string) => {
    const missing = QUESTIONS.find((q) => !answers[q.key]);
    if (missing) return toast.error('Answer every question first.');
    if (!stars) return toast.error('Choose an overall rating from 1 to 5.');
    if (text.trim().length > 2000) return toast.error('Keep the note to 2000 characters.');

    setBusy(true);
    try {
      await api.me.submitFeedback(id, {
        trainer_behaviour: answers.trainer_behaviour as SessionFeedbackInput['trainer_behaviour'],
        form_technique: answers.form_technique as SessionFeedbackInput['form_technique'],
        workout_intensity: answers.workout_intensity as SessionFeedbackInput['workout_intensity'],
        motivation_guidance: answers.motivation_guidance as SessionFeedbackInput['motivation_guidance'],
        overall_stars: stars,
        additional_feedback: text.trim() || undefined,
      });
      toast.success('Thanks — your trainer will see this');
      setOpenId(null);
      reset();
      load();
    } catch (err) {
      toast.error(errorMessage(err, 'The feedback did not save. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const title = <PageTitle accent="progress" icon={<Star size={20} />} title="Session feedback"
    sub="Four taps after each session. Your trainer reads every answer." />;

  if (failed) return <>{title}<LoadError what="your feedback" /></>;
  if (rows === null) return <PageSkeleton />;

  const pending = rows.filter((r) => r.status === 'pending');
  const submitted = rows.filter((r) => r.status === 'submitted');

  return (
    <>
      {title}

      {pending.length === 0 && submitted.length === 0 && (
        <EmptyState
          icon={<Star size={20} />}
          title="Nothing to rate yet"
          body="After your trainer marks a session completed, it appears here for a quick rating."
        />
      )}

      {pending.length > 0 && (
        <Section title={`Waiting for you (${pending.length})`}>
          <div className="space-y-3">
            {pending.map((row) => {
              const isOpen = openId === row.id;
              return (
                <Card key={row.id} className="p-4">
                  <button
                    type="button"
                    onClick={() => open(row)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]"
                      style={{ background: 'var(--bg-subtle)', color: MC.primary }}>
                      <Star size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-[800]" style={{ color: MC.ink }}>
                        {row.session_title || 'PT session'}
                      </span>
                      <span className="mt-0.5 block text-[11.5px]" style={{ color: MC.muted }}>
                        {longDate(row.completed_at) || row.completed_at}
                      </span>
                    </span>
                    <ChevronDown size={16} aria-hidden
                      style={{ color: MC.muted, transform: isOpen ? 'rotate(180deg)' : undefined }} />
                  </button>

                  {isOpen && (
                    <div className="mt-4 space-y-4">
                      {QUESTIONS.map((q, qi) => (
                        <fieldset key={q.key}>
                          <legend className="mb-2 text-[12px] font-[750]" style={{ color: MC.ink }}>
                            {qi + 1}. {q.label}
                          </legend>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt) => {
                              const selected = answers[q.key] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt.value }))}
                                  className="rounded-[11px] px-2.5 py-2.5 text-[12px] font-[700]"
                                  style={selected
                                    ? { background: 'var(--gradient-brand)', color: 'white' }
                                    : { background: 'var(--bg-subtle)', color: MC.ink, border: '1px solid var(--border)' }}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      ))}

                      <fieldset>
                        <legend className="mb-2 text-[12px] font-[750]" style={{ color: MC.ink }}>
                          5. Overall, how was the session?
                        </legend>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              aria-pressed={stars === n}
                              aria-label={`${n} star${n === 1 ? '' : 's'}`}
                              onClick={() => setStars(n)}
                              className="grid h-11 w-11 place-items-center rounded-[11px]"
                              style={{ background: 'var(--bg-subtle)' }}
                            >
                              <Star
                                size={22}
                                style={{
                                  color: n <= stars ? '#f59e0b' : MC.muted,
                                  fill: n <= stars ? '#f59e0b' : 'transparent',
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <FormField label="Anything else? (optional)" id={`note-${row.id}`}>
                        <TextArea
                          value={text}
                          maxLength={2000}
                          rows={3}
                          onChange={(e) => setText(e.target.value)}
                        />
                      </FormField>

                      <Button className="w-full" onClick={() => void submit(row.id)} disabled={busy}>
                        {busy ? 'Sending…' : 'Send feedback'}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </Section>
      )}

      {submitted.length > 0 && (
        <Section title={`Your ratings (${submitted.length})`}>
          <div className="space-y-2">
            {submitted.map((row) => {
              const low = (scoreOf(row) ?? 5) <= 3;
              return (
                <Card key={row.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                      style={{ background: low ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: low ? MC.danger : MC.success }}>
                      <CheckCircle2 size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-[750]" style={{ color: MC.ink }}>
                        {row.session_title || 'PT session'}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: MC.muted }}>
                        {longDate(row.completed_at) || row.completed_at}
                      </p>
                      {row.additional_feedback && (
                        <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: MC.muted }}>
                          “{row.additional_feedback}”
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-[850]" style={{ color: low ? MC.danger : MC.ink }}>
                        {scoreText(row)}<span className="text-[10px] font-[650]" style={{ color: MC.muted }}>/5</span>
                      </p>
                      <p className="mt-0.5 text-[10.5px]" style={{ color: MC.muted }}>
                        {row.overall_stars}★
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>
      )}
    </>
  );
}
