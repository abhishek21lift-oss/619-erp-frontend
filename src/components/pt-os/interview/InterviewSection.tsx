'use client';

// One topic of the Client Interview, in the same card as every other intake
// step: a navy tile with a peach mark, the question, and a select for every
// answer it takes. Whether the topic is answered is the card's only state,
// and it is shown in emerald with a word as well as a mark.

import { useId } from 'react';
import { Check } from 'lucide-react';
import { SelectField, useStandaloneField } from '@/components/ui/form';
import { gray, indigo, rgba, semantic } from '@/lib/palette';
import { topicComplete, type Answers, type InterviewControl, type InterviewField, type InterviewQuestion } from './questions';

export function InterviewSection({
  question, index, answers, onChange,
}: {
  question: InterviewQuestion;
  index: number;
  answers: Answers;
  onChange: (field: InterviewField, next: string) => void;
}) {
  const titleId = useId();
  const Icon = question.icon;
  const answered = topicComplete(question, answers);

  return (
    <section
      id={`q-${question.id}`}
      aria-labelledby={titleId}
      className="scroll-mt-20 rounded-[20px] p-4 sm:p-5"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${answered ? rgba(semantic.success, 0.30) : 'var(--border)'}`,
      }}
    >
      <div className="flex items-start gap-3.5">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]"
          style={{ background: gray[900] }}>
          <Icon size={20} color={indigo[300]} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
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

      <div className="mt-4 grid gap-3.5"
        style={question.controls.length > 1 ? { gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' } : undefined}>
        {question.controls.map((control) => (
          <Control key={control.key} control={control} value={answers[control.key] ?? ''} onChange={onChange} />
        ))}
      </div>
    </section>
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
