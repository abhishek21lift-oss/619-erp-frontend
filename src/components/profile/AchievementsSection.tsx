'use client';

// Achievements — competitions, records, awards, media, speaking.
//
// Rendered as a timeline rather than a list of cards, because these are the
// one part of a profile where WHEN is half the claim. A coach with three
// titles across ten years reads differently from one with three last season,
// and a flat list hides that entirely.
//
// The server sorts newest-first and puts undated entries last, so the order
// here is not a client concern — it will not rearrange on save.
//
// Every control is a field: a real label with `htmlFor`, `aria-describedby`,
// `aria-invalid`, and the message from the shared profile schema on the input
// that caused it. Before, the title had only a placeholder — which names
// nothing and disappears the moment you type — the year took any four digits
// including `0001`, and the detail box let a coach type past the 600-character
// column, which the server then cut mid-sentence without saying so.

import React from 'react';
import {
  Plus, XCircle, Trophy, Medal, Award, Mic, Newspaper, BookOpen, BadgeCheck, Star,
} from 'lucide-react';
import type { AchievementKind, ProfileAchievement } from '@/lib/api';
import {
  FieldSurface, TextField, TextAreaField, NumberField, SelectField, useStandaloneField,
} from '@/components/ui/form';
import {
  PROFILE_LIMITS, PROFILE_MAX, maxProfileYear, type ProfileIssueMap,
} from '@/lib/forms/schemas/profile';

const MAX_ENTRIES = PROFILE_MAX.achievements;

/**
 * The kinds the server accepts. Each carries an icon and a word — an unknown
 * kind is stored as 'other' rather than rejected, so this map is total.
 */
const KINDS: { value: AchievementKind; label: string; icon: React.ReactNode; tint: string }[] = [
  { value: 'competition', label: 'Competition', icon: <Trophy size={13} />, tint: '#d97706' },
  { value: 'record', label: 'Record', icon: <Medal size={13} />, tint: '#dc2626' },
  { value: 'award', label: 'Award', icon: <Award size={13} />, tint: '#0067e0' },
  { value: 'certification', label: 'Certification', icon: <BadgeCheck size={13} />, tint: '#047857' },
  { value: 'speaking', label: 'Speaking', icon: <Mic size={13} />, tint: '#0059ce' },
  { value: 'media', label: 'Media', icon: <Newspaper size={13} />, tint: '#475569' },
  { value: 'publication', label: 'Publication', icon: <BookOpen size={13} />, tint: '#0059ce' },
  { value: 'other', label: 'Other', icon: <Star size={13} />, tint: '#0067e0' },
];
const KIND_MAP = Object.fromEntries(KINDS.map((k) => [k.value, k])) as Record<AchievementKind, typeof KINDS[number]>;

function AchievementRow({ entry, index, issues, onChange, onRemove, last }: {
  entry: ProfileAchievement;
  index: number;
  issues: ProfileIssueMap;
  onChange: (a: ProfileAchievement) => void;
  onRemove: () => void;
  last: boolean;
}) {
  const kind = KIND_MAP[entry.kind] || KIND_MAP.other;
  const at = (key: string) => issues[`achievements.${index}.${key}`];

  const title = useStandaloneField(
    `achievement-${entry.id}-title`, entry.title,
    (v: string) => onChange({ ...entry, title: v }),
    { error: at('title') },
  );
  const kindField = useStandaloneField<AchievementKind>(
    `achievement-${entry.id}-kind`, entry.kind,
    (v: AchievementKind) => onChange({ ...entry, kind: v }),
    { error: at('kind') },
  );
  const issuer = useStandaloneField(
    `achievement-${entry.id}-issuer`, entry.issuer,
    (v: string) => onChange({ ...entry, issuer: v }),
    { error: at('issuer') },
  );
  // Held as a string in the control and converted once, so a half-typed "20"
  // never becomes a stored year.
  const year = useStandaloneField(
    `achievement-${entry.id}-year`,
    entry.year == null ? '' : String(entry.year),
    (v: string) => {
      const digits = v.replace(/\D/g, '').slice(0, 4);
      onChange({ ...entry, year: digits ? Number(digits) : null });
    },
    { error: at('year') },
  );
  const detail = useStandaloneField(
    `achievement-${entry.id}-detail`, entry.detail,
    (v: string) => onChange({ ...entry, detail: v }),
    { error: at('detail') },
  );

  return (
    <div className="relative flex gap-3">
      {/* The timeline rail. Hidden on the last row so the line stops at the
          final entry instead of trailing into empty space. */}
      <div className="flex shrink-0 flex-col items-center">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full text-white"
          style={{ background: kind.tint, boxShadow: `0 3px 10px ${kind.tint}55` }}
        >
          {kind.icon}
        </span>
        {!last && <span aria-hidden className="mt-1 w-px flex-1" style={{ background: 'var(--border)' }} />}
      </div>

      <FieldSurface surface="nested">
        <div className="mb-3 min-w-0 flex-1 rounded-2xl p-4"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <div className="mb-3 flex items-end gap-2">
            <TextField
              field={title}
              label="Achievement"
              density="compact"
              className="min-w-0 flex-1"
              placeholder="What you achieved"
              maxLength={PROFILE_LIMITS.title}
              showCount={entry.title.length > PROFILE_LIMITS.title - 20}
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${entry.title || 'achievement'}`}
              className="mb-[3px] flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: 'var(--text-disabled)' }}
            >
              <XCircle size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <SelectField
              field={kindField} label="Kind" density="compact"
              options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
            />
            <TextField
              field={issuer} label="Awarded by" density="compact"
              placeholder="Federation, publication…" maxLength={PROFILE_LIMITS.issuer}
            />
            <NumberField
              field={year} label="Year" density="compact" mode="integer"
              placeholder="2023" min={1900} max={maxProfileYear()}
            />
            <TextAreaField
              field={detail} label="Detail" density="compact" className="sm:col-span-3"
              rows={2} maxLength={PROFILE_LIMITS.detail}
              showCount={entry.detail.length > PROFILE_LIMITS.detail - 60}
              placeholder="Optional — the lift, the placing, the title."
            />
          </div>
          {entry.year == null && entry.title.trim() !== '' && (
            // Undated entries sort to the bottom, which looks like a bug unless
            // the reason is stated where the decision is made.
            <p className="mt-2 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              No year set — this will sit at the end of the timeline.
            </p>
          )}
        </div>
      </FieldSurface>
    </div>
  );
}

export function AchievementsSection({ value, onChange, issues = {} }: {
  value: ProfileAchievement[];
  onChange: (v: ProfileAchievement[]) => void;
  /** Messages from the profile schema, keyed `achievements.<i>.<field>`. */
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
            id: `ach_${Date.now().toString(36)}`, title: '', kind: 'competition',
            issuer: '', year: null, detail: '',
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
          <Trophy size={26} className="mx-auto mb-2.5" style={{ color: 'var(--text-disabled)' }} />
          <p className="text-[13px] font-[680]" style={{ color: 'var(--text-primary)' }}>Nothing added yet</p>
          <p className="mx-auto mt-1 max-w-[400px] text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Competition placings, lifting records, awards, articles you were in,
            seminars you spoke at. Newest appears first.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {value.map((a, i) => (
            <AchievementRow
              key={a.id} entry={a} index={i} issues={issues} last={i === value.length - 1}
              onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
