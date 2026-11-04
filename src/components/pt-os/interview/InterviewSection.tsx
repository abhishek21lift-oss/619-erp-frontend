'use client';

// One section of the Client Interview: the premium card the trainer works in.
//
// The frame follows the Training Availability step — white rounded card, a
// burgundy accent hairline, a tinted icon tile and a step label — so the
// interview reads as part of the same product as the rest of intake.
//
// Every counted answer is a selection control (see InterviewControls). The
// only textareas are optional context and the trainer's observation; they are
// marked "Optional" and never count towards the section's progress.

import { useId } from 'react';
import { Check } from 'lucide-react';
import { rgba, semantic } from '@/lib/palette';
import {
  INTERVIEW_SECTIONS, sectionAnswered, visibleControls,
  type Answers, type InterviewField, type InterviewSection as Section,
} from './questions';
import { InterviewControlField } from './InterviewControls';

export function InterviewSection({
  section, index, answers, onChange,
}: {
  section: Section;
  index: number;
  answers: Answers;
  onChange: (field: InterviewField, next: string | string[]) => void;
}) {
  const titleId = useId();
  const Icon = section.icon;
  const progress = sectionAnswered(section, answers);
  const complete = progress.total > 0 && progress.answered === progress.total;

  return (
    <section
      id={`section-${section.id}`}
      aria-labelledby={titleId}
      className="relative overflow-hidden rounded-[26px] sm:rounded-[30px]"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${complete ? rgba(semantic.success, 0.28) : 'var(--border)'}`,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 24px 60px -38px rgba(15,23,42,0.32)',
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[140px]"
        style={{ background: 'radial-gradient(120% 140% at 12% 0%, rgba(255,187,148,0.24) 0%, transparent 62%)' }} />
      <div aria-hidden className="relative h-[2px] w-full"
        style={{ background: 'linear-gradient(90deg, #A33757 0%, #FFBB94 42%, transparent 100%)' }} />

      <div className="relative p-5 sm:p-8">
        <header className="flex items-start gap-3.5 sm:gap-4">
          <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] sm:h-12 sm:w-12 sm:rounded-[16px]"
            style={{ background: 'rgba(163,55,87,0.09)', border: '1px solid rgba(163,55,87,0.16)' }}>
            <Icon size={19} strokeWidth={1.75} style={{ color: '#A33757' }} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-[760] uppercase leading-none tracking-[0.14em]" style={{ color: '#A33757' }}>
                Section {index + 1} of {INTERVIEW_SECTIONS.length}
              </p>
              {complete ? (
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-[750]"
                  style={{ background: rgba(semantic.success, 0.12), border: `1px solid ${rgba(semantic.success, 0.18)}`, color: semantic.successLo }}>
                  <Check size={11} strokeWidth={3} aria-hidden /> Answered
                </span>
              ) : (
                <span className="ml-auto shrink-0 text-[11px] font-[750] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {progress.answered}/{progress.total}
                </span>
              )}
            </div>
            <h2 id={titleId} className="mt-1.5 text-[21px] font-[820] leading-[1.15] tracking-[-0.03em] sm:text-[23px]"
              style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
              {section.prompt}
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed sm:text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {section.hint}
            </p>
          </div>
        </header>

        <div className="mt-6 space-y-5">
          {visibleControls(section, answers).map((control, i) => (
            <div key={control.key} className={i > 0 ? 'border-t pt-5' : ''} style={{ borderColor: 'var(--border)' }}>
              <InterviewControlField
                control={control}
                value={answers[control.key]}
                answers={answers}
                onChange={onChange}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default InterviewSection;
