'use client';

// Professional Information — designation, how you coach, where you have
// coached, and when you are available.
//
// ── One authoritative answer to "where do you coach now" ────────────────────
//
// The studio a person actually belongs to is already in the database
// (`users.organization_id → organizations.name`) and is shown in the hero. A
// second, self-typed "current gym" beside it would produce two answers the day
// someone transfers. So this section presents its list as employment HISTORY,
// with an empty end month meaning "still there" — one authored history, one
// authoritative present.

import React from 'react';
import { Plus, XCircle, Clock } from 'lucide-react';
import type { CoachingMode, ProfileGym, TimeRange, WorkingHours } from '@/lib/api';
import {
  FieldSurface, TextField, MonthFieldControl, TimeFieldControl, useStandaloneField,
} from '@/components/ui/form';
import { PROFILE_LIMITS, PROFILE_MAX, type ProfileIssueMap } from '@/lib/forms/schemas/profile';

const MODE_LABELS: Record<CoachingMode, { label: string; hint: string }> = {
  offline: { label: 'In person', hint: 'At a gym or studio' },
  online: { label: 'Online', hint: 'Programming and check-ins' },
  hybrid: { label: 'Hybrid', hint: 'A mix of both' },
  home: { label: 'Home visits', hint: "At the client's home" },
  video: { label: 'Video calls', hint: 'Live coaching on a call' },
};
/** Canonical order, matching the server, so ticking a box never reorders the row. */
const MODE_ORDER: CoachingMode[] = ['offline', 'online', 'hybrid', 'home', 'video'];

const DAYS: { key: keyof WorkingHours; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

const MAX_RANGES_PER_DAY = PROFILE_MAX.hoursPerDay;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
      {children}
    </span>
  );
}

/* ── How you coach ───────────────────────────────────────────────────────── */
function CoachingModes({ value, onChange }: { value: CoachingMode[]; onChange: (v: CoachingMode[]) => void }) {
  const toggle = (m: CoachingMode) => {
    const next = value.includes(m) ? value.filter((x) => x !== m) : [...value, m];
    // Canonical order, not click order — otherwise the chips shuffle as you tick.
    onChange(MODE_ORDER.filter((x) => next.includes(x)));
  };
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {MODE_ORDER.map((m) => {
        const on = value.includes(m);
        return (
          <button
            key={m} onClick={() => toggle(m)} aria-pressed={on}
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors"
            style={{
              background: on ? 'rgba(0,103,224,0.10)' : 'var(--bg-subtle)',
              border: `1px solid ${on ? 'rgba(0,103,224,0.30)' : 'var(--border)'}`,
            }}
          >
            <span
              aria-hidden
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-[800] text-white"
              style={{ background: on ? '#0067e0' : 'transparent', border: `1.5px solid ${on ? '#0067e0' : 'var(--border-3, var(--border))'}` }}
            >
              {on ? '✓' : ''}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {MODE_LABELS[m].label}
              </span>
              <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {MODE_LABELS[m].hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Where you have coached ──────────────────────────────────────────────── */
/**
 * A gym row.
 *
 * The name input used to be a placeholder and nothing else — no label, so a
 * screen reader announced an unnamed textbox, and the hint vanished the moment
 * anyone typed into it. The months were unlabelled `type="month"` inputs whose
 * only feedback was the server refusing the whole profile with "Gym 3 has an
 * invalid end month", printed at the bottom of a page several screens long.
 * The messages now arrive on the input that caused them, before anything is
 * sent.
 */
function GymRow({ gym, index, issues, onChange, onRemove }: {
  gym: ProfileGym;
  index: number;
  issues: ProfileIssueMap;
  onChange: (g: ProfileGym) => void;
  onRemove: () => void;
}) {
  const current = !gym.to;
  const at = (key: string) => issues[`previousGyms.${index}.${key}`];

  const name = useStandaloneField(
    `gym-${gym.id}-name`, gym.name,
    (v: string) => onChange({ ...gym, name: v }),
    { error: at('name') },
  );
  const role = useStandaloneField(
    `gym-${gym.id}-role`, gym.role,
    (v: string) => onChange({ ...gym, role: v }),
    { error: at('role') },
  );
  // '' and null mean the same thing to the server — "not set" — so the control
  // keeps the empty string and the payload keeps null, converted on the way
  // out rather than on every keystroke.
  const from = useStandaloneField(
    `gym-${gym.id}-from`, gym.from || '',
    (v: string) => onChange({ ...gym, from: v || null }),
    { error: at('from') },
  );
  const to = useStandaloneField(
    `gym-${gym.id}-to`, gym.to || '',
    (v: string) => onChange({ ...gym, to: v || null }),
    { error: at('to') },
  );

  return (
    <FieldSurface surface="nested">
      <div className="rounded-2xl p-3.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <div className="mb-2.5 flex items-end gap-2">
          <TextField
            field={name}
            label="Gym or studio"
            density="compact"
            className="min-w-0 flex-1"
            placeholder="Gym or studio"
            maxLength={PROFILE_LIMITS.gymName}
          />
          {current && gym.name && (
            <span
              className="mb-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[750]"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}
            >
              Current
            </span>
          )}
          <button
            type="button"
            onClick={onRemove} aria-label={`Remove ${gym.name || 'entry'}`}
            className="mb-[3px] flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-disabled)' }}
          >
            <XCircle size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <TextField
            field={role} label="Role" density="compact" className="sm:col-span-3"
            placeholder="Head Coach" maxLength={PROFILE_LIMITS.role}
          />
          {/* Month inputs, not dates: nobody remembers the day they started a
              job, and a date field people fake to the 1st is worse than a
              month. */}
          <MonthFieldControl field={from} label="From" density="compact" />
          <MonthFieldControl field={to} label="To" density="compact" />
          <p className="self-end pb-2 text-[11px] sm:col-span-1" style={{ color: 'var(--text-disabled)' }}>
            Leave “To” empty if you still coach here.
          </p>
        </div>
      </div>
    </FieldSurface>
  );
}

/* ── Weekly availability ─────────────────────────────────────────────────── */
/**
 * A day holds a LIST of ranges, because split shifts are the norm in this
 * trade — 06:00–10:00 and 17:00–21:00 is one coach's ordinary Tuesday, and a
 * single from/to per day cannot say that.
 *
 * Native `<input type="time">` rather than a custom picker: it is already
 * localised, already keyboard-accessible, and on a phone it opens the OS wheel,
 * which beats anything hand-rolled inside a scrolling form.
 */
function DayRow({ day, label, ranges, issues, onChange }: {
  day: keyof WorkingHours;
  label: string;
  ranges: TimeRange[];
  issues: ProfileIssueMap;
  onChange: (r: TimeRange[]) => void;
}) {
  const set = (i: number, patch: Partial<TimeRange>) =>
    onChange(ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-[720]" style={{ color: ranges.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {label}
        </span>
        {ranges.length < MAX_RANGES_PER_DAY && (
          <button
            type="button"
            onClick={() => onChange([...ranges, { from: '', to: '' }])}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-[700] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--brand)' }}
          >
            <Plus size={11} /> {ranges.length ? 'Add split' : 'Add hours'}
          </button>
        )}
      </div>
      {ranges.length === 0 ? (
        <p className="text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>Not available</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ranges.map((r, i) => (
            <TimeRangeRow
              key={i}
              day={day}
              label={label}
              range={r}
              fromError={issues[`workingHours.${day}.${i}.from`]}
              toError={issues[`workingHours.${day}.${i}.to`]}
              onFrom={(v) => set(i, { from: v })}
              onTo={(v) => set(i, { to: v })}
              onRemove={() => onChange(ranges.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One shift.
 *
 * The pair sits on a single line — a stacked caption per side would triple the
 * height of a seven-day grid — so the labels are real but hidden, which is
 * what `labelHidden` is for. The error is what changed: a half-filled range
 * used to be silently valid here and fatal at the server, which refused the
 * ENTIRE profile with "Invalid time on tue — use HH:MM" from a bar at the
 * bottom of the page. It now marks the side that is empty.
 */
function TimeRangeRow({
  day, label, range, fromError, toError, onFrom, onTo, onRemove,
}: {
  day: keyof WorkingHours;
  label: string;
  range: TimeRange;
  fromError?: string;
  toError?: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onRemove: () => void;
}) {
  const from = useStandaloneField(`hours-${day}-from`, range.from, onFrom, { error: fromError });
  const to = useStandaloneField(`hours-${day}-to`, range.to, onTo, { error: toError });

  return (
    <div>
      <div className="flex items-center gap-2">
        <TimeFieldControl
          field={from} label={`${label} start`} labelHidden className="min-w-0 flex-1"
        />
        <span aria-hidden className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>–</span>
        <TimeFieldControl
          field={to} label={`${label} end`} labelHidden className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label} hours`}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-disabled)' }}
        >
          <XCircle size={15} />
        </button>
      </div>
    </div>
  );
}

export function WorkingHoursEditor({ value, onChange, weeklyMinutes, issues = {} }: {
  value: WorkingHours;
  onChange: (v: WorkingHours) => void;
  weeklyMinutes: number;
  /** Messages from the profile schema, keyed `workingHours.<day>.<i>.<side>`. */
  issues?: ProfileIssueMap;
}) {
  const setDay = (day: keyof WorkingHours, ranges: TimeRange[]) => {
    const next = { ...value };
    if (ranges.length) next[day] = ranges; else delete next[day];
    onChange(next);
  };
  const hrs = Math.floor(weeklyMinutes / 60);
  const mins = weeklyMinutes % 60;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-[700]" style={{ color: 'var(--text-secondary)' }}>
          <Clock size={12} /> Weekly availability
        </span>
        {/* The total comes from the server, so this screen and any other that
            shows it can never add up the same week differently. */}
        <span className="tabular-nums text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          {weeklyMinutes > 0 ? `${hrs}h${mins ? ` ${mins}m` : ''} a week, as saved` : 'Nothing set yet'}
        </span>
      </div>
      {DAYS.map((d) => (
        <DayRow
          key={d.key} day={d.key} label={d.label} issues={issues}
          ranges={value[d.key] || []}
          onChange={(r) => setDay(d.key, r)}
        />
      ))}
    </div>
  );
}

/* ── The section ─────────────────────────────────────────────────────────── */
export function ProfessionalSection({
  designation, coachingModes, previousGyms, set, issues = {},
}: {
  designation: string;
  coachingModes: CoachingMode[];
  previousGyms: ProfileGym[];
  set: (patch: { designation?: string; coachingModes?: CoachingMode[]; previousGyms?: ProfileGym[] }) => void;
  /** Messages from the profile schema, keyed by field or `previousGyms.<i>.<field>`. */
  issues?: ProfileIssueMap;
}) {
  const designationField = useStandaloneField(
    'designation', designation,
    (v: string) => set({ designation: v }),
    { error: issues.designation },
  );

  return (
    <div className="flex flex-col gap-5">
      <TextField
        field={designationField}
        label="Designation"
        density="compact"
        placeholder="Head Coach"
        maxLength={PROFILE_LIMITS.designation}
      />

      <div>
        <Label>How you coach</Label>
        <CoachingModes value={coachingModes} onChange={(v) => set({ coachingModes: v })} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Label>Where you&apos;ve coached</Label>
          <button
            type="button"
            disabled={previousGyms.length >= PROFILE_MAX.previousGyms}
            onClick={() => set({
              previousGyms: [...previousGyms, {
                id: `gym_${Date.now().toString(36)}`, name: '', role: '', from: null, to: null,
              }],
            })}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-[700] text-white transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', boxShadow: '0 4px 14px rgba(0,103,224,0.32)' }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {previousGyms.length === 0 ? (
          <p className="rounded-2xl px-4 py-6 text-center text-[12px]"
            style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)', color: 'var(--text-disabled)' }}>
            Add the gyms and studios you&apos;ve worked at. Leave the end month
            empty for anywhere you still coach.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {previousGyms.map((g, i) => (
              <GymRow
                key={g.id} gym={g} index={i} issues={issues}
                onChange={(next) => set({ previousGyms: previousGyms.map((x, j) => (j === i ? next : x)) })}
                onRemove={() => set({ previousGyms: previousGyms.filter((_, j) => j !== i) })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
