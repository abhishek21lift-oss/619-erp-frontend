'use client';

// About — the part of a profile a person writes about themselves.
//
// Deliberately separate from Personal Information (name, email, phone), which
// is contact data. These are claims about practice, and they are what turns a
// settings page into something a coach would show someone.

import React, { useState } from 'react';
import { XCircle } from 'lucide-react';

/** Character counts at which a field stops reading as a placeholder. */
export const ABOUT_MINIMUMS = { bio: 80, philosophy: 60 };

/**
 * A labelled textarea with a live count.
 *
 * The count is shown against a stated minimum rather than a maximum. A cap
 * ("0/2000") tells someone how much room they have left, which nobody wants to
 * know; a floor tells them when the field is doing its job, which is the thing
 * profile completion is about to score them on. Saying the number here is what
 * stops "why am I stuck at 92%" being unanswerable.
 */
function LongText({
  label, hint, value, onChange, minimum, rows = 4, maxLength = 2000,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  minimum?: number;
  rows?: number;
  maxLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const len = value.trim().length;
  const short = minimum !== undefined && len > 0 && len < minimum;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        {minimum !== undefined && (
          <span
            className="tabular-nums text-[10.5px] font-[600]"
            style={{ color: short ? '#b45309' : 'var(--text-disabled)' }}
          >
            {len}/{minimum} min
          </span>
        )}
      </div>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={hint}
        className="w-full resize-y rounded-xl px-3.5 py-3 text-[13px] font-[500] leading-relaxed outline-none transition-colors"
        style={{
          background: 'var(--bg-subtle)',
          border: `1px solid ${focused ? 'var(--brand)' : 'var(--border)'}`,
          color: 'var(--text-primary)',
          minHeight: 92,
        }}
      />
    </div>
  );
}

/**
 * A chip list with a free-text input. Enter or comma commits; backspace on an
 * empty box removes the last chip.
 *
 * De-duplicates case-insensitively and keeps the spelling typed first, exactly
 * as the server does — so the list does not visibly rearrange itself the
 * moment it is saved.
 */
export function ChipInput({
  value, onChange, placeholder, empty, max,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  empty: string;
  max: number;
}) {
  const [draft, setDraft] = useState('');
  const full = value.length >= max;

  const commit = (raw: string) => {
    const v = raw.replace(/\s+/g, ' ').trim();
    if (!v || full) { setDraft(''); return; }
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(''); return; }
    onChange([...value, v]);
    setDraft('');
  };

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap gap-2">
        {value.length === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>{empty}</p>
        )}
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-[12px] font-[680]"
            style={{ background: 'rgba(0,103,224,0.10)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.22)' }}
          >
            {v}
            <button
              onClick={() => onChange(value.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="rounded-full p-0.5 transition-opacity hover:opacity-70"
            >
              <XCircle size={13} />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        disabled={full}
        onChange={(e) => {
          // A comma is how people naturally separate these, so treat it as
          // Enter rather than letting it become part of the value.
          if (e.target.value.includes(',')) commit(e.target.value.replace(/,/g, ''));
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => commit(draft)}
        placeholder={full ? `That is the maximum of ${max}` : placeholder}
        className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] font-[560] outline-none disabled:opacity-60"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

export function AboutSection({
  bio, philosophy, trainingStyle, languages, set,
}: {
  bio: string;
  philosophy: string;
  trainingStyle: string;
  languages: string[];
  set: (patch: { bio?: string; philosophy?: string; trainingStyle?: string; languages?: string[] }) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <LongText
        label="Bio" minimum={ABOUT_MINIMUMS.bio}
        hint="Who you are and who you coach. A few sentences is plenty."
        value={bio} onChange={(v) => set({ bio: v })}
      />
      <LongText
        label="Coaching philosophy" minimum={ABOUT_MINIMUMS.philosophy}
        hint="What you believe about training, and how that shows up in a session."
        value={philosophy} onChange={(v) => set({ philosophy: v })}
      />
      <LongText
        label="Training style" rows={3} maxLength={600}
        hint="How a session with you actually runs."
        value={trainingStyle} onChange={(v) => set({ trainingStyle: v })}
      />
      <div>
        <span className="mb-1.5 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Languages you coach in
        </span>
        <ChipInput
          value={languages} onChange={(v) => set({ languages: v })} max={15}
          placeholder="Add a language and press Enter"
          empty="None added yet — try “English” or “Hindi”."
        />
      </div>
    </div>
  );
}
