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

const MAX_RANGES_PER_DAY = 4;

function fieldStyle() {
  return { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
}

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
function GymRow({ gym, onChange, onRemove }: {
  gym: ProfileGym; onChange: (g: ProfileGym) => void; onRemove: () => void;
}) {
  const current = !gym.to;
  return (
    <div className="rounded-2xl p-3.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <div className="mb-2.5 flex items-start gap-2">
        <input
          value={gym.name}
          onChange={(e) => onChange({ ...gym, name: e.target.value })}
          placeholder="Gym or studio"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] font-[760] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {current && gym.name && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[750]"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#047857' }}
          >
            Current
          </span>
        )}
        <button
          onClick={onRemove} aria-label={`Remove ${gym.name || 'entry'}`}
          className="shrink-0 rounded-lg p-1 transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-disabled)' }}
        >
          <XCircle size={15} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <Label>Role</Label>
          <input
            value={gym.role}
            onChange={(e) => onChange({ ...gym, role: e.target.value })}
            placeholder="Head Coach"
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
            style={fieldStyle()}
          />
        </label>
        {/* Month inputs, not dates: nobody remembers the day they started a job,
            and a date field people fake to the 1st is worse than a month. */}
        <label className="block">
          <Label>From</Label>
          <input
            type="month" value={gym.from || ''}
            onChange={(e) => onChange({ ...gym, from: e.target.value || null })}
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
            style={fieldStyle()}
          />
        </label>
        <label className="block">
          <Label>To</Label>
          <input
            type="month" value={gym.to || ''}
            onChange={(e) => onChange({ ...gym, to: e.target.value || null })}
            className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
            style={fieldStyle()}
          />
        </label>
        <p className="self-end pb-2 text-[11px] sm:col-span-1" style={{ color: 'var(--text-disabled)' }}>
          Leave “To” empty if you still coach here.
        </p>
      </div>
    </div>
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
function DayRow({ day, label, ranges, onChange }: {
  day: keyof WorkingHours; label: string; ranges: TimeRange[]; onChange: (r: TimeRange[]) => void;
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
            <div key={i} className="flex items-center gap-2">
              <input
                type="time" value={r.from} aria-label={`${label} start`}
                onChange={(e) => set(i, { from: e.target.value })}
                className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-[12.5px] font-[560] outline-none"
                style={fieldStyle()}
              />
              <span aria-hidden className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>–</span>
              <input
                type="time" value={r.to} aria-label={`${label} end`}
                onChange={(e) => set(i, { to: e.target.value })}
                className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-[12.5px] font-[560] outline-none"
                style={fieldStyle()}
              />
              <button
                onClick={() => onChange(ranges.filter((_, j) => j !== i))}
                aria-label={`Remove ${label} hours`}
                className="shrink-0 rounded-lg p-1 transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-disabled)' }}
              >
                <XCircle size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkingHoursEditor({ value, onChange, weeklyMinutes }: {
  value: WorkingHours; onChange: (v: WorkingHours) => void; weeklyMinutes: number;
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
          key={d.key} day={d.key} label={d.label}
          ranges={value[d.key] || []}
          onChange={(r) => setDay(d.key, r)}
        />
      ))}
    </div>
  );
}

/* ── The section ─────────────────────────────────────────────────────────── */
export function ProfessionalSection({
  designation, coachingModes, previousGyms, set,
}: {
  designation: string;
  coachingModes: CoachingMode[];
  previousGyms: ProfileGym[];
  set: (patch: { designation?: string; coachingModes?: CoachingMode[]; previousGyms?: ProfileGym[] }) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <label className="block">
        <Label>Designation</Label>
        <input
          value={designation}
          onChange={(e) => set({ designation: e.target.value })}
          placeholder="Head Coach"
          className="w-full rounded-xl px-3.5 py-3 text-[13px] font-[560] outline-none"
          style={fieldStyle()}
        />
      </label>

      <div>
        <Label>How you coach</Label>
        <CoachingModes value={coachingModes} onChange={(v) => set({ coachingModes: v })} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Label>Where you&apos;ve coached</Label>
          <button
            onClick={() => set({
              previousGyms: [...previousGyms, {
                id: `gym_${Date.now().toString(36)}`, name: '', role: '', from: null, to: null,
              }],
            })}
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-[700] text-white transition-transform hover:scale-[1.03]"
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
                key={g.id} gym={g}
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
