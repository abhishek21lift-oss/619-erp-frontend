'use client';

// The Client Interview's hero and its section navigator.
//
// The hero is the shared compact hero — the same header every other page in
// the studio uses — with the one thing this page needs on top of a title: a
// progress bar, one segment per answer, that also says how many are in. The
// navigator is a row of tone pills that jump to each topic and tick off in
// emerald once its answer is given.

import { m, useReducedMotion } from 'framer-motion';
import { Check, MessagesSquare } from 'lucide-react';
import { PageHero } from '@/components/ui';
import { rgba, semantic } from '@/lib/palette';
import { gradient, tones } from '@/components/profile/profileTheme';
import {
  INTERVIEW_FIELDS, INTERVIEW_QUESTIONS, topicAnswered, topicComplete, type Answers,
} from './questions';

export function InterviewHero({ clientName, answers, answered, resumed }: {
  clientName: string;
  answers: Answers;
  answered: number;
  /** A saved draft was picked up, rather than a fresh interview started. */
  resumed: boolean;
}) {
  const total = INTERVIEW_FIELDS.length;
  const done = answered === total;
  return (
    <PageHero
      compact
      icon={<MessagesSquare size={18} />}
      title={`${clientName} · Client Interview`}
      subtitle={resumed ? 'Resuming a saved draft — optional, it never blocks enrolment'
        : 'Seven topics, eight answers — optional, it never blocks enrolment'}
      actions={(
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-[750] tabular-nums"
          style={{
            background: done ? rgba(semantic.success, 0.12) : 'var(--bg-subtle)',
            border: `1px solid ${done ? rgba(semantic.success, 0.25) : 'var(--border)'}`,
            color: done ? semantic.successLo : 'var(--text-muted)',
          }}>
          {done && <Check size={12} strokeWidth={3} aria-hidden />}
          {answered} of {total} answered
        </span>
      )}
    >
      {/* Filled = answered, dimmed = open, so the trainer can see at a glance
          what is still missing. */}
      <div role="progressbar" aria-valuenow={answered} aria-valuemax={total} aria-label="Interview progress">
        <div aria-hidden className="flex gap-1">
          {INTERVIEW_QUESTIONS.flatMap((q) => q.controls.map((c) => {
            const filled = (answers[c.key] ?? '').trim() !== '';
            return (
              <span key={c.key} className="h-1.5 flex-1 rounded-full transition-opacity duration-300"
                style={{ background: filled ? gradient(tones[q.tone], 90) : 'var(--bg-subtle)' }} />
            );
          }))}
        </div>
      </div>
    </PageHero>
  );
}

/**
 * Tone pills that jump to each topic — a swipeable row on a phone, a
 * wrapping table of contents on wider screens. Not sticky: the shell's main
 * column is its own overflow container that never scrolls (the window does),
 * so `position: sticky` inside a page never engages.
 */
export function SectionNav({ answers }: { answers: Answers }) {
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Interview topics">
      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {INTERVIEW_QUESTIONS.map((q, i) => {
          const t = tones[q.tone];
          const done = topicComplete(q, answers);
          const started = topicAnswered(q, answers);
          return (
            <li key={q.id} className="shrink-0">
              <m.a href={`#q-${q.id}`}
                whileTap={reduce ? undefined : { scale: 0.96 }}
                onClick={(e) => {
                  // Smooth in-page scroll without pushing a history entry per tap.
                  e.preventDefault();
                  document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-[700] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: 'var(--bg-card, var(--bg-elevated))', border: '1px solid var(--border)', color: 'var(--text-primary)', outlineColor: t.from }}>
                <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                  style={{ background: done ? semantic.success : started ? gradient(t, 60) : gradient(t) }}>
                  {done ? <Check size={11} strokeWidth={3.2} /> : <span className="text-[9.5px] font-[800]">{i + 1}</span>}
                </span>
                {/* The visible label is the link's name — no aria-label, which
                    would also make each pill a match for getByLabel(control)
                    beside the select it points at. */}
                {q.label}
                {done && <span className="sr-only">, answered</span>}
              </m.a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
