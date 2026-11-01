'use client';

// One section of the Client Interview: a light card, the question the trainer
// is about to ask, and the controls that record the answer.
//
// Text controls are textareas, not one-line inputs: these are answers to a
// conversation, and the trainer is writing down what was said. The chip list
// is the shared MultiSelectChips so a barrier is toggled the same way the rest
// of the product toggles a set of choices.
//
// Whether a section is answered is shown in emerald with a word as well as a
// mark, so it does not rely on colour alone.

import { useId } from 'react';
import Link from 'next/link';
import { Check, HeartPulse, Pencil } from 'lucide-react';
import { MultiSelectChips } from '@/components/pt-os/MultiSelectChips';
import { SelectField, TextAreaField, useStandaloneField } from '@/components/ui/form';
import { classifyActivity } from '@/lib/lifestyle-calculations';
import type { OccupationType, DailyStepsBracket } from '@/lib/lifestyle-calculations';
import { gray, indigo, rgba, semantic } from '@/lib/palette';
import {
  sectionAnswered, visibleControls,
  type Answers, type InterviewControl, type InterviewField, type InterviewSection as Section,
} from './questions';

export function InterviewSection({
  section, index, answers, occupationType, onChange,
}: {
  section: Section;
  index: number;
  answers: Answers;
  occupationType: string;
  onChange: (field: InterviewField, next: string | string[]) => void;
}) {
  const titleId = useId();
  const Icon = section.icon;
  const progress = sectionAnswered(section, answers, occupationType);
  const complete = progress.total > 0 && progress.answered === progress.total;

  return (
    <section
      id={`section-${section.id}`}
      aria-labelledby={titleId}
      className="scroll-mt-20 rounded-[20px] p-4 sm:p-5"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${complete ? rgba(semantic.success, 0.30) : 'var(--border)'}`,
        boxShadow: complete ? `0 10px 30px -24px ${rgba(semantic.success, 0.55)}` : 'none',
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
              {String(index + 1).padStart(2, '0')} · {section.label}
            </span>
            {complete && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-[750]"
                style={{ background: rgba(semantic.success, 0.12), border: `1px solid ${rgba(semantic.success, 0.18)}`, color: semantic.successLo }}>
                <Check size={11} strokeWidth={3} aria-hidden /> Answered
              </span>
            )}
            {!complete && progress.answered > 0 && (
              <span className="ml-auto shrink-0 text-[10.5px] font-[750] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {progress.answered}/{progress.total}
              </span>
            )}
          </div>
          <h2 id={titleId} className="mt-1 text-[17px] font-[780] leading-snug tracking-[-0.018em] sm:text-[19px]"
            style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
            {section.prompt}
          </h2>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {visibleControls(section, answers, occupationType).map((control) => (
          <Control key={control.key} control={control} value={answers[control.key]} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

/** One answer. Its own component because the field hook is one per control. */
function Control({
  control, value, onChange,
}: {
  control: InterviewControl;
  value: string | string[];
  onChange: (field: InterviewField, next: string | string[]) => void;
}) {
  if (control.kind === 'chips') {
    return (
      <ChipsControl control={control} value={Array.isArray(value) ? value : []}
        onChange={(next) => onChange(control.key, next)} />
    );
  }
  if (control.kind === 'select') {
    return (
      <SelectControl control={control} value={typeof value === 'string' ? value : ''}
        onChange={(next) => onChange(control.key, next)} />
    );
  }
  return (
    <TextControl control={control} value={typeof value === 'string' ? value : ''}
      onChange={(next) => onChange(control.key, next)} />
  );
}

function TextControl({
  control, value, onChange,
}: {
  control: Extract<InterviewControl, { kind: 'text' }>;
  value: string;
  onChange: (next: string) => void;
}) {
  const field = useStandaloneField<string>(control.key, value, onChange);
  return (
    <TextAreaField
      field={field}
      label={control.label}
      description={control.hint}
      placeholder={control.placeholder}
      rows={control.rows ?? 3}
      maxLength={control.maxLength}
      showCount={Boolean(control.maxLength)}
    />
  );
}

function SelectControl({
  control, value, onChange,
}: {
  control: Extract<InterviewControl, { kind: 'select' }>;
  value: string;
  onChange: (next: string) => void;
}) {
  const field = useStandaloneField<string>(control.key, value, onChange);
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

function ChipsControl({
  control, value, onChange,
}: {
  control: Extract<InterviewControl, { kind: 'chips' }>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const labelId = useId();
  const hintId = useId();
  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hintId}>
      <p id={labelId} className="text-[13px] font-[720]" style={{ color: 'var(--text-primary)' }}>
        {control.label}
      </p>
      <p id={hintId} className="mb-2.5 mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
        {control.hint}
      </p>
      <MultiSelectChips value={value} onChange={onChange} options={control.options} />
    </div>
  );
}

// ── Read-only lifestyle facts ───────────────────────────────────────────────

export interface LifestyleFacts {
  occupation_type?: string | null;
  screen_time_bracket?: string | null;
  activity_level?: string | null;
  daily_steps_bracket?: string | null;
}

const OCCUPATION_LABEL: Record<string, string> = {
  desk_job: 'Desk job',
  active_job: 'Active job',
  physical_labor: 'Physical labour',
  student: 'Student',
  homemaker: 'Homemaker',
  driver: 'Driver',
  healthcare: 'Healthcare',
  police: 'Police',
  fitness_professional: 'Fitness professional',
  retired: 'Retired',
  other: 'Other',
};

const SCREEN_LABEL: Record<string, string> = {
  '<2': 'Under 2 hours',
  '2_4': '2 – 4 hours',
  '4_6': '4 – 6 hours',
  '6_8': '6 – 8 hours',
  '8_plus': '8+ hours',
};

/**
 * Occupation, screen time and activity are owned by the Lifestyle Assessment.
 * They are shown here because they belong in the interview conversation, and
 * read-only because a second editable copy is how two answers start to
 * disagree. The link is the way to change them.
 */
export function SourceFactsCard({ clientId, lifestyle, unavailable = false }: {
  clientId: string;
  lifestyle: LifestyleFacts | null;
  /** The read failed — different from "no assessment yet". */
  unavailable?: boolean;
}) {
  const titleId = useId();
  const derived = lifestyle?.activity_level
    ?? classifyActivity(
      (lifestyle?.daily_steps_bracket ?? null) as DailyStepsBracket | null,
      (lifestyle?.occupation_type ?? null) as OccupationType | null,
    ).level;

  const facts = [
    { label: 'Occupation', value: labelOf(OCCUPATION_LABEL, lifestyle?.occupation_type) },
    { label: 'Screen time', value: labelOf(SCREEN_LABEL, lifestyle?.screen_time_bracket) },
    { label: 'Activity level', value: labelOf(null, derived) },
  ];

  return (
    <section
      id="section-source"
      aria-labelledby={titleId}
      className="scroll-mt-20 overflow-hidden rounded-[20px]"
      style={{
        background: 'linear-gradient(155deg, var(--bg-card) 0%, var(--bg-subtle) 100%)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: rgba(indigo[500], 0.10), border: `1px solid ${rgba(indigo[500], 0.14)}` }}>
          <HeartPulse size={19} color={indigo[600]} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            From the Lifestyle Assessment
          </p>
          <h2 id={titleId} className="mt-0.5 text-[16px] font-[780] tracking-[-0.015em]"
            style={{ color: 'var(--text-primary)' }}>
            Work profile
          </h2>
          <p className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            Read-only here, so one answer has one owner.
          </p>
        </div>
        <Link href={`/pt-os/lifestyle-assessment?client_id=${clientId}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-[720] transition-colors hover:bg-[var(--bg-subtle)]"
          style={{ color: indigo[600] }}>
          <Pencil size={11} aria-hidden /> Edit
        </Link>
      </div>

      <dl className="grid grid-cols-1 gap-px sm:grid-cols-3" style={{ background: 'var(--border)' }}>
        {facts.map((fact) => (
          <div key={fact.label} className="px-4 py-3 sm:px-5" style={{ background: 'var(--bg-card)' }}>
            <dt className="text-[10.5px] font-[760] uppercase tracking-[0.10em]" style={{ color: 'var(--text-muted)' }}>
              {fact.label}
            </dt>
            <dd className="mt-0.5 text-[13.5px] font-[700]" style={{ color: fact.value && !unavailable ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {unavailable ? 'Unavailable' : fact.value || 'Not recorded'}
            </dd>
          </div>
        ))}
      </dl>

      {unavailable ? (
        <p className="px-4 pb-4 text-[12px] leading-snug sm:px-5" style={{ color: 'var(--text-muted)' }}>
          The Lifestyle Assessment could not be loaded.{' '}
          <Link href={`/pt-os/lifestyle-assessment?client_id=${clientId}`} className="font-[720]" style={{ color: indigo[600] }}>
            Open it
          </Link>{' '}
          to check.
        </p>
      ) : !lifestyle && (
        <p className="px-4 pb-4 text-[12px] leading-snug sm:px-5" style={{ color: 'var(--text-muted)' }}>
          No Lifestyle Assessment yet.{' '}
          <Link href={`/pt-os/lifestyle-assessment?client_id=${clientId}`} className="font-[720]" style={{ color: indigo[600] }}>
            Record one
          </Link>{' '}
          and these facts will fill in.
        </p>
      )}
    </section>
  );
}

function labelOf(map: Record<string, string> | null, value: string | null | undefined): string {
  if (!value) return '';
  return map?.[value] ?? value;
}
