'use client';

// One question of the Client Interview, dressed as an Apple-style card: a
// gradient squircle in the question's own tone, the question as it is asked
// out loud, and a writing surface that grows with the answer.
//
// The tone is decoration. Whether the question is answered is the only state
// on the card, and it is shown in emerald with a word as well as a mark.

import { useId } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { FormField, TextArea } from '@/components/ui/form';
import { semantic, rgba } from '@/lib/palette';
import { gradient, tones } from '@/components/profile/profileTheme';
import type { InterviewQuestion } from './questions';

const inkClass = 'text-[var(--tone-ink)] dark:text-[var(--tone-ink-dark)]';

export function InterviewSection({
  question, index, value, onChange,
}: {
  question: InterviewQuestion;
  index: number;
  value: string;
  onChange: (next: string) => void;
}) {
  const reduce = useReducedMotion();
  const hintId = useId();
  const tone = tones[question.tone];
  const Icon = question.icon;
  const answered = value.trim().length > 0;
  const nearLimit = value.length >= question.max * 0.9;

  return (
    <m.section
      id={`q-${question.key}`}
      aria-labelledby={`${hintId}-title`}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : Math.min(index, 3) * 0.04 }}
      // scroll-mt clears the top bar when a pill jumps here.
      className="group relative scroll-mt-20 overflow-hidden rounded-[24px] p-4 transition-shadow duration-300 sm:p-5"
      style={{
        background: 'var(--bg-card, var(--bg-elevated))',
        border: '1px solid var(--border)',
        boxShadow: answered
          ? `0 14px 34px -20px ${tone.glow}, 0 1px 0 rgba(255,255,255,0.04) inset`
          : '0 1px 2px rgba(15,23,42,0.04)',
        ['--tone-ink' as string]: tone.ink,
        ['--tone-ink-dark' as string]: tone.inkDark,
      }}
    >
      {/* A wash of the tone from the top corner — the card's colour without
          putting colour behind the text the trainer is writing. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
        style={{ background: `radial-gradient(120% 100% at 0% 0%, ${tone.wash}, transparent 70%)` }} />

      <div className="relative flex items-start gap-3.5">
        <span aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white transition-transform duration-300 group-focus-within:scale-105"
          style={{ background: gradient(tone), boxShadow: `0 8px 18px -6px ${tone.glow}, inset 0 1px 0 rgba(255,255,255,0.35)` }}>
          <Icon size={20} strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10.5px] font-[800] uppercase tracking-[0.12em] ${inkClass}`}>
              {String(index + 1).padStart(2, '0')} · {question.label}
            </span>
            {answered && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-[750]"
                style={{ background: rgba(semantic.success, 0.12), color: semantic.successLo }}>
                <Check size={11} strokeWidth={3} aria-hidden /> Answered
              </span>
            )}
          </div>
          <h2 id={`${hintId}-title`} className="mt-1 text-[17px] font-[780] leading-snug tracking-[-0.015em] sm:text-[18px]"
            style={{ color: 'var(--text-primary)' }}>
            {question.prompt}
          </h2>
          <p id={hintId} className="mt-0.5 text-[12.5px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
            {question.hint}
          </p>
        </div>
      </div>

      <div className="relative mt-3.5">
        <FormField label={question.label} labelHidden>
          <TextArea
            rows={3}
            maxLength={question.max}
            value={value}
            aria-describedby={hintId}
            placeholder="Type their answer…"
            onChange={(e) => onChange(e.target.value)}
            // Grows with the answer instead of scrolling inside a 3-line box.
            className="min-h-[92px] [field-sizing:content]"
          />
        </FormField>
        <div className="mt-1.5 flex justify-end">
          <span className="text-[11px] tabular-nums"
            style={{ color: nearLimit ? semantic.warningLo : 'var(--text-muted)' }}>
            {value.length.toLocaleString()} / {question.max.toLocaleString()}
          </span>
        </div>
      </div>
    </m.section>
  );
}
