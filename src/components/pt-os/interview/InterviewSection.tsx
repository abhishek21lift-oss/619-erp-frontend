'use client';

// One topic of the Client Interview, dressed as an Apple-style card: a
// gradient squircle in the topic's own tone, the question as it is asked out
// loud, and a select for every answer it takes.
//
// The tone is decoration. Whether the topic is answered is the only state on
// the card, and it is shown in emerald with a word as well as a mark. The
// colour lives in the card's wash and edge, never behind the answer itself,
// so a select stays the figure and the decoration stays the ground.

import { useId } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SelectField, useStandaloneField } from '@/components/ui/form';
import { semantic, rgba } from '@/lib/palette';
import { gradient, tones } from '@/components/profile/profileTheme';
import { topicComplete, type Answers, type InterviewControl, type InterviewField, type InterviewQuestion } from './questions';

const inkClass = 'text-[var(--tone-ink)] dark:text-[var(--tone-ink-dark)]';

export function InterviewSection({
  question, index, answers, onChange,
}: {
  question: InterviewQuestion;
  index: number;
  answers: Answers;
  onChange: (field: InterviewField, next: string) => void;
}) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const tone = tones[question.tone];
  const Icon = question.icon;
  const answered = topicComplete(question, answers);

  return (
    <m.section
      id={`q-${question.id}`}
      aria-labelledby={titleId}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : Math.min(index, 3) * 0.04 }}
      // scroll-mt clears the top bar when a pill jumps here.
      className="group relative scroll-mt-20 overflow-hidden rounded-[26px] p-4 transition-[box-shadow,border-color] duration-300 sm:p-[22px]"
      style={{
        background: `linear-gradient(158deg, ${tone.wash} 0%, transparent 46%), var(--bg-card, var(--bg-elevated))`,
        border: `1px solid ${answered ? rgba(tone.from, 0.30) : 'var(--border)'}`,
        boxShadow: answered
          ? `0 18px 38px -24px ${tone.glow}, inset 0 1px 0 rgba(255,255,255,0.16)`
          : '0 1px 2px rgba(15,23,42,0.04)',
        ['--tone-ink' as string]: tone.ink,
        ['--tone-ink-dark' as string]: tone.inkDark,
      }}
    >
      {/* A wash of the tone from the top corner — the card's colour without
          putting colour behind the answers. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-90"
        style={{ background: `radial-gradient(120% 100% at 0% 0%, ${tone.wash}, transparent 72%)` }} />
      {/* A hairline of the tone along the top edge: the card gains colour
          without gaining another border. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-[2px] rounded-b-full"
        style={{ background: gradient(tone, 90), opacity: answered ? 0.9 : 0.45 }} />

      <div className="relative flex items-start gap-3.5">
        <span aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] text-white transition-transform duration-300 group-focus-within:scale-105 group-hover:scale-[1.03]"
          style={{ background: gradient(tone), boxShadow: `0 10px 20px -8px ${tone.glow}, inset 0 1px 0 rgba(255,255,255,0.35)` }}>
          <Icon size={21} strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10.5px] font-[800] uppercase tracking-[0.12em] ${inkClass}`}>
              {String(index + 1).padStart(2, '0')} · {question.label}
            </span>
            {answered && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-[750]"
                style={{ background: rgba(semantic.success, 0.12), border: `1px solid ${rgba(semantic.success, 0.18)}`, color: semantic.successLo }}>
                <Check size={11} strokeWidth={3} aria-hidden /> Answered
              </span>
            )}
          </div>
          <h2 id={titleId} className="mt-1 text-[17px] font-[780] leading-snug tracking-[-0.018em] sm:text-[19px]"
            style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
            {question.prompt}
          </h2>
        </div>
      </div>

      <div className="relative mt-4 grid gap-3.5"
        style={question.controls.length > 1 ? { gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' } : undefined}>
        {question.controls.map((control) => (
          <Control key={control.key} control={control} value={answers[control.key] ?? ''} onChange={onChange} />
        ))}
      </div>
    </m.section>
  );
}

/**
 * One answer, as a platform select. Its own component because the field hook
 * is one-per-control: the smoking card holds two, and a hook cannot be called
 * in a loop.
 */
function Control({
  control, value, onChange,
}: {
  control: InterviewControl;
  value: string;
  onChange: (field: InterviewField, next: string) => void;
}) {
  const field = useStandaloneField<string>(control.key, value, (next) => onChange(control.key, next));
  return (
    <SelectField
      field={field}
      label={control.label}
      description={control.hint}
      options={control.options}
      placeholderOption="Not provided"
    />
  );
}
