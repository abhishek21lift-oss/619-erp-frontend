'use client';

// Education — formal qualifications, as opposed to the certifications section
// next to it, which is about credentials that expire.
//
// Years, not dates. Nobody knows the day they started a degree, and a date
// field people fake to the 1st of January is worse than an honest year.
//
// ── What the rows used to do ────────────────────────────────────────────────
//
// The institution input had no label at all — a placeholder that vanishes the
// moment you type, which names nothing for a screen reader and nothing for
// anyone who looks away mid-entry. The year accepted `Number(digits)` with no
// bound, so `0001` and `9999` were both storable and the server refused the
// ENTIRE profile save over either, from a sticky bar at the bottom of a page
// several screens long. And nothing capped the text, so a pasted institution
// name came back silently cut at 140 characters.
//
// Now every control is a field: label, `htmlFor`, `aria-describedby`,
// `aria-invalid`, and the message from the shared profile schema on the input
// that caused it.

import React from 'react';
import { Plus, XCircle, GraduationCap } from 'lucide-react';
import type { ProfileEducation } from '@/lib/api';
import { FieldSurface, TextField, NumberField, useStandaloneField } from '@/components/ui/form';
import {
  PROFILE_LIMITS, PROFILE_MAX, maxProfileYear, type ProfileIssueMap,
} from '@/lib/forms/schemas/profile';

const MAX_ENTRIES = PROFILE_MAX.education;

function EducationRow({ entry, index, issues, onChange, onRemove }: {
  entry: ProfileEducation;
  index: number;
  issues: ProfileIssueMap;
  onChange: (e: ProfileEducation) => void;
  onRemove: () => void;
}) {
  const at = (key: string) => issues[`education.${index}.${key}`];

  const institution = useStandaloneField(
    `education-${entry.id}-institution`, entry.institution,
    (v: string) => onChange({ ...entry, institution: v }),
    { error: at('institution') },
  );
  const degree = useStandaloneField(
    `education-${entry.id}-degree`, entry.degree,
    (v: string) => onChange({ ...entry, degree: v }),
    { error: at('degree') },
  );
  const field = useStandaloneField(
    `education-${entry.id}-field`, entry.field,
    (v: string) => onChange({ ...entry, field: v }),
    { error: at('field') },
  );
  // The year is held as a STRING in the control and converted once, here —
  // the same rule the rest of the platform follows, so an in-progress "20"
  // is never `Number('20')` on its way to becoming a stored year.
  const year = useStandaloneField(
    `education-${entry.id}-year`,
    entry.year == null ? '' : String(entry.year),
    (v: string) => {
      const digits = v.replace(/\D/g, '').slice(0, 4);
      onChange({ ...entry, year: digits ? Number(digits) : null });
    },
    { error: at('year') },
  );

  return (
    <FieldSurface surface="nested">
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <div className="mb-3 flex items-end gap-2">
          <TextField
            field={institution}
            label="Institution"
            density="compact"
            className="min-w-0 flex-1"
            placeholder="School, college or academy"
            maxLength={PROFILE_LIMITS.institution}
            showCount={entry.institution.length > PROFILE_LIMITS.institution - 20}
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${entry.institution || 'entry'}`}
            className="mb-[3px] flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-disabled)' }}
          >
            <XCircle size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <TextField
            field={degree} label="Qualification" density="compact"
            placeholder="B.Sc, Diploma…" maxLength={PROFILE_LIMITS.degree}
          />
          <TextField
            field={field} label="Field" density="compact"
            placeholder="Sports Science" maxLength={PROFILE_LIMITS.field}
          />
          {/* `integer` gives the numeric keypad through inputMode rather than
              type=number, so a scroll wheel over a focused year cannot change
              it and a partial "20" is not fought by a spinner. */}
          <NumberField
            field={year} label="Year" density="compact" mode="integer"
            placeholder="2016" min={1900} max={maxProfileYear()}
          />
        </div>
      </div>
    </FieldSurface>
  );
}

export function EducationSection({ value, onChange, issues = {} }: {
  value: ProfileEducation[];
  onChange: (v: ProfileEducation[]) => void;
  /** Messages from the profile schema, keyed `education.<i>.<field>`. */
  issues?: ProfileIssueMap;
}) {
  const full = value.length >= MAX_ENTRIES;
  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          disabled={full}
          onClick={() => onChange([...value, {
            id: `edu_${Date.now().toString(36)}`, institution: '', degree: '', field: '', year: null,
          }])}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-[700] text-white transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
          style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', boxShadow: '0 4px 14px rgba(0,103,224,0.32)' }}
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-2xl px-4 py-10 text-center"
          style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}>
          <GraduationCap size={26} className="mx-auto mb-2.5" style={{ color: 'var(--text-disabled)' }} />
          <p className="text-[13px] font-[680]" style={{ color: 'var(--text-primary)' }}>No education added</p>
          <p className="mx-auto mt-1 max-w-[380px] text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Degrees, diplomas and academy courses. Only the institution is
            required — fill in the rest when you have it.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {value.map((e, i) => (
            <EducationRow
              key={e.id} entry={e} index={i} issues={issues}
              onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
