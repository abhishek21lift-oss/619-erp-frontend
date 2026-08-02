'use client';

// Education — formal qualifications, as opposed to the certifications section
// next to it, which is about credentials that expire.
//
// Years, not dates. Nobody knows the day they started a degree, and a date
// field people fake to the 1st of January is worse than an honest year.

import React from 'react';
import { Plus, XCircle, GraduationCap } from 'lucide-react';
import type { ProfileEducation } from '@/lib/api';

const MAX_ENTRIES = 15;

function fieldStyle() {
  return { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
      {children}
    </span>
  );
}

function EducationRow({ entry, onChange, onRemove }: {
  entry: ProfileEducation; onChange: (e: ProfileEducation) => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-start gap-2">
        <input
          value={entry.institution}
          onChange={(e) => onChange({ ...entry, institution: e.target.value })}
          placeholder="School, college or academy"
          /* Long names are cut at 360px; the input scrolls when focused and
             the tooltip makes it readable without one. */
          title={entry.institution || undefined}
          className="min-w-0 flex-1 bg-transparent text-[14px] font-[780] tracking-[-0.01em] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={onRemove}
          aria-label={`Remove ${entry.institution || 'entry'}`}
          className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-disabled)' }}
        >
          <XCircle size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <label className="block">
          <Label>Qualification</Label>
          <input
            value={entry.degree}
            onChange={(e) => onChange({ ...entry, degree: e.target.value })}
            placeholder="B.Sc, Diploma…"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
            style={fieldStyle()}
          />
        </label>
        <label className="block">
          <Label>Field</Label>
          <input
            value={entry.field}
            onChange={(e) => onChange({ ...entry, field: e.target.value })}
            placeholder="Sports Science"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
            style={fieldStyle()}
          />
        </label>
        <label className="block">
          <Label>Year</Label>
          {/* inputMode numeric so a phone shows digits, but type=text so an
              in-progress "20" is not fought by the browser's number spinner. */}
          <input
            type="text" inputMode="numeric" maxLength={4}
            value={entry.year == null ? '' : String(entry.year)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
              onChange({ ...entry, year: digits ? Number(digits) : null });
            }}
            placeholder="2016"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] tabular-nums outline-none"
            style={fieldStyle()}
          />
        </label>
      </div>
    </div>
  );
}

export function EducationSection({ value, onChange }: {
  value: ProfileEducation[]; onChange: (v: ProfileEducation[]) => void;
}) {
  const full = value.length >= MAX_ENTRIES;
  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
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
              key={e.id} entry={e}
              onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
