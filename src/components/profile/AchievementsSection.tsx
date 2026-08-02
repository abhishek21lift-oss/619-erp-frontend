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

import React from 'react';
import {
  Plus, XCircle, Trophy, Medal, Award, Mic, Newspaper, BookOpen, BadgeCheck, Star,
} from 'lucide-react';
import type { AchievementKind, ProfileAchievement } from '@/lib/api';

const MAX_ENTRIES = 40;

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

function AchievementRow({ entry, onChange, onRemove, last }: {
  entry: ProfileAchievement;
  onChange: (a: ProfileAchievement) => void;
  onRemove: () => void;
  last: boolean;
}) {
  const kind = KIND_MAP[entry.kind] || KIND_MAP.other;

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

      <div className="mb-3 min-w-0 flex-1 rounded-2xl p-4"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <div className="mb-3 flex items-start gap-2">
          <input
            value={entry.title}
            onChange={(e) => onChange({ ...entry, title: e.target.value })}
            placeholder="What you achieved"
            /* A long title is cut at 360px by the timeline rail beside it.
               The input scrolls when focused; the tooltip makes it readable
               without one. */
            title={entry.title || undefined}
            className="min-w-0 flex-1 bg-transparent text-[14px] font-[780] tracking-[-0.01em] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={onRemove}
            aria-label={`Remove ${entry.title || 'achievement'}`}
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-disabled)' }}
          >
            <XCircle size={15} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <label className="block">
            <Label>Kind</Label>
            <select
              value={entry.kind}
              onChange={(e) => onChange({ ...entry, kind: e.target.value as AchievementKind })}
              className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
              style={fieldStyle()}
            >
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>
          <label className="block">
            <Label>Awarded by</Label>
            <input
              value={entry.issuer}
              onChange={(e) => onChange({ ...entry, issuer: e.target.value })}
              placeholder="Federation, publication…"
              className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
              style={fieldStyle()}
            />
          </label>
          <label className="block">
            <Label>Year</Label>
            <input
              type="text" inputMode="numeric" maxLength={4}
              value={entry.year == null ? '' : String(entry.year)}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                onChange({ ...entry, year: digits ? Number(digits) : null });
              }}
              placeholder="2023"
              className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] tabular-nums outline-none"
              style={fieldStyle()}
            />
          </label>
          <label className="block sm:col-span-3">
            <Label>Detail</Label>
            <textarea
              value={entry.detail} rows={2} maxLength={600}
              onChange={(e) => onChange({ ...entry, detail: e.target.value })}
              placeholder="Optional — the lift, the placing, the title."
              className="w-full resize-y rounded-xl px-3 py-2 text-[12.5px] font-[560] leading-relaxed outline-none"
              style={fieldStyle()}
            />
          </label>
        </div>
        {entry.year == null && entry.title.trim() !== '' && (
          // Undated entries sort to the bottom, which looks like a bug unless
          // the reason is stated where the decision is made.
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            No year set — this will sit at the end of the timeline.
          </p>
        )}
      </div>
    </div>
  );
}

export function AchievementsSection({ value, onChange }: {
  value: ProfileAchievement[]; onChange: (v: ProfileAchievement[]) => void;
}) {
  const full = value.length >= MAX_ENTRIES;
  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
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
              key={a.id} entry={a} last={i === value.length - 1}
              onChange={(next) => onChange(value.map((x, j) => (j === i ? next : x)))}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
