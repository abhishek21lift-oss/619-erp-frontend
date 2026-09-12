'use client';

/**
 * Canonical date-range controls for Insights — the ONE date/filter component.
 *
 * Replaces five hand-rolled twins (insights/traffic DateField,
 * insights/sessions HeroDate, insights/revenue year+range, leaderboard
 * presets, attendance single-day). All canonical Insights pages must use
 * <CanonicalDateRange /> (or <CanonicalHeroDateRange /> on dark heroes) so
 * date handling, clamping and presets stay identical.
 */

import { useMemo } from 'react';

export type InsightsPreset = '7d' | '30d' | '90d' | 'month' | 'custom';

export const PRESETS: Array<{ id: Exclude<InsightsPreset, 'custom'>; label: string; days: number | 'month' }> = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
  { id: 'month', label: 'Month', days: 'month' },
];

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d.toISOString().slice(0, 10);
}

export function rangeFor(preset: Exclude<InsightsPreset, 'custom'>): { from: string; to: string } {
  const to = isoToday();
  if (preset === 'month') {
    const d = new Date();
    return { from: `${d.toISOString().slice(0, 7)}-01`, to };
  }
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
  return { from: isoDaysAgo(days), to };
}

function inputClass(dark: boolean): string {
  return dark
    ? 'h-[44px] w-full min-w-0 rounded-[12px] px-3 text-[13px] font-[600] text-white outline-none'
    : 'h-9 w-full min-w-0 rounded-[10px] border px-2.5 text-[13px] font-medium outline-none';
}

function inputStyle(dark: boolean): React.CSSProperties {
  return dark
    ? { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', colorScheme: 'dark' }
    : { background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)', colorScheme: 'light' };
}

export function DateField({
  label,
  value,
  min,
  max,
  onChange,
  dark = false,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
  dark?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span
        className="mb-1 block text-[10.5px] font-[800] uppercase tracking-wider"
        style={dark ? { color: 'rgba(255,255,255,0.66)' } : { color: 'var(--text-muted)' }}
      >
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(dark)}
        style={inputStyle(dark)}
      />
    </label>
  );
}

/** Two-column range that cannot outgrow its hero (the bug the twins fixed five times). */
export function CanonicalDateRange({
  from,
  to,
  onFrom,
  onTo,
  dark = false,
  max,
}: {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  dark?: boolean;
  max?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <DateField label="From" value={from} max={to} onChange={onFrom} dark={dark} />
      <DateField label="To" value={to} min={from} max={max} onChange={onTo} dark={dark} />
    </div>
  );
}

/** Range + presets in one row. Preset selection writes both dates (custom when hand-edited). */
export function CanonicalRangeWithPresets({
  from,
  to,
  preset,
  onPreset,
  onFrom,
  onTo,
  dark = false,
}: {
  from: string;
  to: string;
  preset: InsightsPreset;
  onPreset: (p: InsightsPreset) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  dark?: boolean;
}) {
  const presets = useMemo(() => PRESETS, []);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Date range presets">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={preset === p.id}
            onClick={() => onPreset(p.id)}
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={
              preset === p.id
                ? { background: 'var(--brand)', color: '#fff' }
                : dark
                  ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      <CanonicalDateRange from={from} to={to} onFrom={(v) => { onFrom(v); onPreset('custom'); }} onTo={(v) => { onTo(v); onPreset('custom'); }} dark={dark} />
    </div>
  );
}
