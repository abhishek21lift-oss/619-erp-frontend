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

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, PencilLine } from 'lucide-react';
import type { AiClientFactField, AiWorkoutContext } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

/** What a trainer may state. Deliberately short. */
export type StatedValues = Partial<Record<
  Extract<AiClientFactField, 'goal' | 'experience_level' | 'training_days' | 'equipment'>,
  string
>> & { injuries?: string };

const FIELDS: Array<{
  key: keyof StatedValues;
  label: string;
  placeholder: string;
  numeric?: boolean;
}> = [
  { key: 'goal', label: 'Goal', placeholder: 'e.g. muscle_gain' },
  { key: 'experience_level', label: 'Experience', placeholder: 'e.g. intermediate' },
  { key: 'training_days', label: 'Days / week', placeholder: '1–7', numeric: true },
  { key: 'equipment', label: 'Equipment today', placeholder: 'e.g. barbell, rack, bench, dumbbells' },
  { key: 'injuries', label: 'Constraint today', placeholder: 'e.g. left shoulder irritated' },
];

export default function TrainerStatedFields({
  context, values, onChange,
}: {
  context: AiWorkoutContext | null;
  values: StatedValues;
  onChange: (next: StatedValues) => void;
}) {
  const blocking = context?.data_quality.blocking ?? [];

  // ── Opens itself when the trainer is going to need it ────────────────────
  //
  // `useState(blocking.length > 0)` looks equivalent and is not: the context
  // is fetched, so the first render always has none, the initialiser runs only
  // that once, and the panel stayed shut for exactly the client it exists for.
  //
  // An effect that opens it when blocking fields appear, and a ref so it opens
  // ONCE — otherwise closing it would fight the next re-render.
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || blocking.length === 0) return;
    autoOpened.current = true;
    setOpen(true);
  }, [blocking.length]);

  const set = (key: keyof StatedValues, v: string) => {
    const next = { ...values };
    if (v.trim() === '') delete next[key];
    else next[key] = v;
    onChange(next);
  };

  const count = Object.keys(values).length;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11.5px] font-[700] transition-opacity hover:opacity-80"
        style={{ color: 'var(--text-secondary)' }}
      >
        <PencilLine size={12} />
        Add what you know for this generation
        {count > 0 && (
          <span
            className="rounded-full px-1.5 py-px text-[10px] font-[750]"
            style={{ background: rgba(palette.blue[500], 0.12), color: palette.blue[500] }}
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
          <p className="mb-2 text-[10.5px] font-[750] uppercase tracking-[0.07em]" style={{ color: palette.blue[500] }}>
            Trainer-stated for this generation
          </p>
          {/* Said on the screen, not only in the code. A trainer who thinks
              this updates the client will stop recording things properly. */}
          <p className="mb-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Used for this programme only and recorded as your statement. It is not saved to the
            client&rsquo;s record, and anything already on file is used instead &mdash; except
            equipment, where what you type here narrows the list.
          </p>

          <div className="space-y-1.5">
            {FIELDS.map((f) => {
              const recorded = f.key !== 'injuries'
                && context?.facts[f.key as AiClientFactField]?.origin === 'recorded';
              return (
                <label key={f.key} className="flex items-center gap-2 text-[11.5px]">
                  <span className="w-[104px] shrink-0 font-[650]" style={{ color: 'var(--text-secondary)' }}>
                    {f.label}
                  </span>
                  <input
                    type={f.numeric ? 'number' : 'text'}
                    inputMode={f.numeric ? 'numeric' : undefined}
                    value={values[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={recorded ? 'on file — this will be ignored' : f.placeholder}
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
            })}
          </div>
        </div>
      )}
    </div>
  );
}
