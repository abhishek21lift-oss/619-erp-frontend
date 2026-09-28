'use client';

import * as React from 'react';
import { ChevronDown, RotateCcw, X } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import type { ExerciseFacet, ExerciseMeta } from '@/lib/api';
import type { ExerciseFilters } from './useExerciseLibrary';
import { regionTone, toneVars } from './libraryTheme';

/**
 * The filter rail.
 *
 * Every option carries its live count, and counts come from the same
 * visibility-scoped query the list uses — so the rail never advertises 12
 * results that turn out to be 0 because they belong to another studio.
 * Options that would return nothing are rendered disabled rather than hidden,
 * because a filter that silently disappears reads as a bug.
 */

export interface ExerciseFilterRailProps {
  meta: ExerciseMeta | null;
  filters: ExerciseFilters;
  activeCount: number;
  onChange: <K extends keyof ExerciseFilters>(key: K, value: ExerciseFilters[K]) => void;
  onReset: () => void;
  /** Mobile: the rail is a sheet rather than a column. */
  onClose?: () => void;
}

export function ExerciseFilterRail({
  meta, filters, activeCount, onChange, onReset, onClose,
}: ExerciseFilterRailProps) {
  return (
    <aside className="flex h-full flex-col gap-1">
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-[750] tracking-[-0.015em] text-[var(--text-primary)]">Filters</h2>
          {activeCount > 0 && <Badge tone="brand">{activeCount}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-[650] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] dark:bg-white/10"
            >
              <RotateCcw size={11} /> Clear
            </button>
          )}
          {onClose && (
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:bg-white/10 lg:hidden"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto pr-1">
        {/* The three switches as one inset group, the iOS Settings way. */}
        <div className="mb-1 divide-y divide-slate-200/70 overflow-hidden rounded-2xl bg-slate-50 dark:divide-white/[0.06] dark:bg-white/[0.04]">
        <ToggleRow
          label="Favorites only"
          checked={filters.favorites_only}
          onChange={(v) => onChange('favorites_only', v)}
        />
        <ToggleRow
          label="Custom exercises only"
          checked={filters.custom_only}
          onChange={(v) => onChange('custom_only', v)}
        />
        <ToggleRow
          label="Show archived"
          checked={filters.include_archived}
          onChange={(v) => onChange('include_archived', v)}
        />
        </div>

        <Section title="Muscle group" defaultOpen>
          <ChipGrid
            options={regionFacets(meta)}
            regionOf={(o) => o.slug}
            value={filters.body_region}
            onSelect={(v) => {
              onChange('body_region', v);
              // A region and a specific muscle inside a different region cannot
              // both be true; clearing avoids an empty result the user did not ask for.
              if (v && filters.muscle) onChange('muscle', '');
            }}
          />
        </Section>

        <Section title="Muscle" defaultOpen={false}>
          <div className="flex flex-col gap-2">
            <ChipGrid
              options={muscleFacets(meta, filters.body_region)}
              regionOf={(o) => o.body_region}
              value={filters.muscle}
              onSelect={(v) => onChange('muscle', v)}
            />
            {filters.muscle && (
              <div className="overflow-hidden rounded-2xl bg-slate-50 dark:bg-white/[0.04]">
              <ToggleRow
                label="Include as secondary mover"
                hint="Also match exercises where this muscle assists"
                checked={filters.include_secondary}
                onChange={(v) => onChange('include_secondary', v)}
              />
              </div>
            )}
          </div>
        </Section>

        <Section title="Equipment" defaultOpen>
          <ChipGrid
            options={meta?.equipment || []}
            value={filters.equipment}
            onSelect={(v) => onChange('equipment', v)}
          />
        </Section>

        <Section title="Category">
          <ChipGrid
            options={meta?.categories || []}
            value={filters.category}
            onSelect={(v) => onChange('category', v)}
          />
        </Section>

        <Section title="Difficulty" defaultOpen>
          <ChipGrid
            options={meta?.difficulties || []}
            value={filters.difficulty}
            onSelect={(v) => onChange('difficulty', v)}
            capitalize
          />
        </Section>

        <Section title="Mechanics" defaultOpen>
          <ChipGrid
            options={meta?.mechanics || []}
            value={filters.mechanic}
            onSelect={(v) => onChange('mechanic', v)}
          />
        </Section>

        <Section title="Force">
          <ChipGrid
            options={meta?.forces || []}
            value={filters.force}
            onSelect={(v) => onChange('force', v)}
          />
        </Section>

        <Section title="Movement pattern">
          <ChipGrid
            options={(meta?.movement_patterns || []).filter((p) => p.slug !== 'General')}
            value={filters.pattern}
            onSelect={(v) => onChange('pattern', v)}
          />
        </Section>
      </div>
    </aside>
  );
}

/** Collapses the muscle facets up into their body region, counts summed. */
export function regionFacets(meta: ExerciseMeta | null): ExerciseFacet[] {
  if (!meta) return [];
  return Object.entries(meta.muscles_by_region || {}).map(([region, muscles]) => ({
    slug: region,
    name: region,
    count: muscles.reduce((sum, m) => sum + (m.count || 0), 0),
  }));
}

function muscleFacets(meta: ExerciseMeta | null, region: string): ExerciseFacet[] {
  if (!meta) return [];
  if (region) return meta.muscles_by_region?.[region] || [];
  return meta.muscles || [];
}

function Section({
  title, children, defaultOpen = false,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-t border-slate-200/70 py-2 first:border-t-0 dark:border-white/[0.07]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
      >
        <span className="text-[13px] font-[700] text-[var(--text-primary)]">
          {title}
        </span>
        <ChevronDown
          size={13}
          className={cn('text-[var(--text-muted)] transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="px-1 pt-1.5">{children}</div>}
    </div>
  );
}

function ChipGrid({
  options, value, onSelect, capitalize, regionOf,
}: {
  options: ExerciseFacet[];
  value: string;
  onSelect: (v: string) => void;
  capitalize?: boolean;
  /** Paints each chip in its body region's colour (libraryTheme.ts). */
  regionOf?: (o: ExerciseFacet) => string | undefined;
}) {
  if (!options.length) {
    return <p className="px-1 py-2 text-[11px] text-[var(--text-muted)]">No options</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.slug;
        const empty = o.count === 0;
        const region = regionOf?.(o);
        return (
          <button
            key={o.slug}
            type="button"
            disabled={empty && !active}
            aria-pressed={active}
            onClick={() => onSelect(active ? '' : o.slug)}
            style={region ? toneVars(regionTone(region)) : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-[600] transition-all active:scale-[0.96]',
              capitalize && 'capitalize',
              active && region
                ? 'border-transparent bg-[var(--rg-wash-hi)] text-[var(--rg-ink)] dark:text-[var(--rg-ink-d)]'
                : active
                  ? 'border-transparent bg-[var(--brand)] text-white'
                  : 'border-slate-200 bg-white text-[var(--text-muted)] hover:border-slate-300 hover:text-[var(--text-primary)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20',
              empty && !active && 'cursor-not-allowed opacity-35 hover:border-slate-200',
            )}
          >
            {region && (
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--rg-from)' }} />
            )}
            {o.name}
            {typeof o.count === 'number' && (
              <span className={cn('tabular-nums', active ? 'opacity-80' : 'opacity-55')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.03]">
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-[600] text-[var(--text-primary)]">{label}</span>
        {hint && <span className="block text-[10.5px] text-[var(--text-muted)]">{hint}</span>}
      </span>
      {/* A real checkbox, drawn as an iOS switch: it keeps the native
          keyboard and screen-reader behaviour, and role="switch" says on/off
          rather than ticked. */}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[rgba(0,103,224,0.4)]',
          checked ? 'bg-[var(--success)]' : 'bg-slate-300 dark:bg-white/20',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_2px_4px_rgba(15,23,42,0.25)] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
          )}
        />
      </span>
    </label>
  );
}
