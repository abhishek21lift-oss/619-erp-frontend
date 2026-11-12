'use client';

/**
 * What the trainer knows that the studio's record does not.
 *
 * ── Why this is separate from every other input on the page ────────────────
 *
 * The rest of this card sends nothing about the client: the server resolves
 * age, goal, experience and the rest from their own record, because a browser
 * that could supply those is a browser that can invent a person — which is
 * exactly what this card used to do, posting height 175, weight 75, male,
 * beginner and four training days for anyone whose record was thin.
 *
 * But a trainer genuinely does know things the database has not been told. The
 * rack is booked. The client mentioned a sore shoulder on the way in. They have
 * forty minutes today, not ninety. Refusing to hear that would be its own kind
 * of dishonesty — the system pretending the record is the whole truth.
 *
 * So these are accepted, and they are labelled for the rest of their life:
 *
 *   · the server marks them `origin: 'stated'`, never `recorded`
 *   · the prompt says "stated by the trainer for this session, not on file"
 *   · the generation ledger freezes them as the trainer's statement
 *   · they are NOT written to the client record
 *
 * The last point is the one to hold on to. A value typed here is true for this
 * generation, not for this person. Making it permanent is a deliberate act
 * somewhere else — the client's own profile — and doing it silently from here
 * would turn "the rack is booked today" into a fact about a human being.
 *
 * ── Precedence ─────────────────────────────────────────────────────────────
 *
 * A recorded value wins over everything typed here, with ONE exception the
 * server owns: equipment, where a statement narrows the studio's list rather
 * than losing to it. See STATED_SUPERSEDES in modules/pt-os/client-facts.js —
 * preferring the fuller list there would ungate exercises the trainer has just
 * said cannot be done.
 */

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, PencilLine } from 'lucide-react';
import type { AiClientFactField, AiWorkoutContext } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

/** What a trainer may state. Deliberately short. */
export type StatedValues = Partial<Record<
  Extract<AiClientFactField, 'goal' | 'experience_level' | 'training_days' | 'equipment'>,
  string
>> & {
  injuries?: string;
  /** Diet fields the resolver reads; none of them is an `AiClientFactField`. */
  target_weight_kg?: string;
  workout_time?: string;
  workout_duration_minutes?: string;
  food_culture?: string;
  dietary_pattern?: string;
  meal_timing_preference?: string;
};

const FIELDS: Array<{
  key: keyof StatedValues;
  label: string;
  numeric?: boolean;
  diet?: true;
}> = [
  { key: 'goal', label: 'Goal' },
  { key: 'experience_level', label: 'Experience' },
  { key: 'training_days', label: 'Days / week', numeric: true },
  { key: 'equipment', label: 'Equipment today' },
  { key: 'injuries', label: 'Constraint today' },
  { key: 'target_weight_kg', label: 'Target weight', numeric: true, diet: true },
  { key: 'workout_time', label: 'Workout time', diet: true },
  { key: 'workout_duration_minutes', label: 'Session min', numeric: true, diet: true },
  { key: 'food_culture', label: 'Food culture', diet: true },
  { key: 'dietary_pattern', label: 'Diet pattern', diet: true },
  { key: 'meal_timing_preference', label: 'Meal timing', diet: true },
];

export default function TrainerStatedFields({
  context, values, onChange, clientId,
}: {
  context: AiWorkoutContext | null;
  values: StatedValues;
  onChange: (next: StatedValues) => void;
  /** Whose record to point at. Absent on read-only uses; no links then. */
  clientId?: string;
}) {
  const blocking = context?.data_quality.blocking ?? [];

  // ── Opens itself when the trainer is going to need it ────────────────────
  //
  // Derived at render, not driven by an effect. Two wrong versions preceded
  // this one and both are worth remembering:
  //
  //   `useState(blocking.length > 0)` never opened at all. The context is
  //   fetched, so the first render always has no blocking fields, and a
  //   useState initialiser runs only that once — the panel stayed shut for
  //   exactly the client it exists for.
  //
  //   An effect that called setOpen(true) when blocking fields arrived opened
  //   it, but only on a SECOND render pass. That passed locally and failed in
  //   CI, where a test asserting on the panel could run between the two
  //   commits. A visual state that is a pure function of the props should not
  //   need a render to catch up with itself.
  //
  // So: null means "the trainer has not said", and the default follows the
  // data. Toggling records their choice and it wins from then on.
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const open = userToggled ?? blocking.length > 0;
  const setOpen = (next: boolean) => setUserToggled(next);

  const set = (key: keyof StatedValues, v: string) => {
    const next = { ...values };
    if (v.trim() === '') delete next[key];
    else next[key] = v;
    onChange(next);
  };

  const count = Object.keys(values).length;

  const renderField = (f: (typeof FIELDS)[number]) => {
    // Diet keys are not in `AiClientFactField`, so there is no recorded row to
    // defer to; the server still prefers its own record where it has one.
    const recorded = !f.diet && f.key !== 'injuries'
      && context?.facts[f.key as AiClientFactField]?.origin === 'recorded';
    return (
      <label key={f.key} className="flex items-center gap-2 text-[11.5px]">
        <span className="w-[104px] shrink-0 font-[650]" style={{ color: 'var(--text-secondary)' }}>
          {f.label}
        </span>
        <input
          type="text"
          inputMode={f.numeric ? 'numeric' : undefined}
          value={values[f.key] ?? ''}
          onChange={(e) => set(f.key, e.target.value)}
          className="min-w-0 flex-1 rounded-[9px] px-2 py-1 text-[11.5px] outline-none"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            opacity: recorded && f.key !== 'equipment' ? 0.55 : 1,
          }}
        />
      </label>
    );
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11.5px] font-[700] transition-opacity hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <PencilLine size={12} />
        Add what you know for this generation
        {count > 0 && (
          <span
            className="rounded-full px-1.5 py-px text-[10px] font-[750]"
            style={{ background: rgba(palette.indigo[500], 0.12), color: palette.indigo[500] }}
          >
            {count}
          </span>
        )}
        <ChevronDown
          size={12}
          className="ml-auto transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div
          className="mt-1.5 rounded-[12px] px-3 py-2.5"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <p className="mb-2 text-[10.5px] font-[750] uppercase tracking-[0.07em]" style={{ color: palette.indigo[500] }}>
            Trainer-stated for this generation
          </p>
          {/* Said on the screen, not only in the code. A trainer who thinks
              this updates the client will stop recording things properly. */}
          <p className="mb-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Used for this programme only and recorded as your statement. It is not saved to the
            client&rsquo;s record, and anything already on file is used instead &mdash; except
            equipment, where what you type here narrows the list.
          </p>
          {clientId && (
            <p className="mb-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              To make these part of the client&rsquo;s record, set the goal in{' '}
              <Link
                href={`/pt-os/goals?client_id=${encodeURIComponent(clientId)}`}
                className="font-[700] underline underline-offset-2"
              >
                Goals
              </Link>
              {' '}and experience and sessions in{' '}
              <Link
                href={`/pt-os/clients/${encodeURIComponent(clientId)}/enroll`}
                className="font-[700] underline underline-offset-2"
              >
                PT Enrolment
              </Link>.
            </p>
          )}

          <div className="space-y-1.5">
            {FIELDS.filter((f) => !f.diet).map(renderField)}
            <p className="pt-1.5 text-[10.5px] font-[750] uppercase tracking-[0.07em]" style={{ color: palette.indigo[500] }}>
              Diet for this generation
            </p>
            {FIELDS.filter((f) => f.diet).map(renderField)}
          </div>
        </div>
      )}
    </div>
  );
}
