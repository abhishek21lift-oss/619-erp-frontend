'use client';

import * as React from 'react';
import { ChevronDown, RotateCcw, X } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import type { ExerciseFacet, ExerciseMeta } from '@/lib/api';
import type { ExerciseFilters } from './useExerciseLibrary';

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
          <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">Filters</h2>
          {activeCount > 0 && <Badge tone="brand">{activeCount}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-primary)] dark:hover:bg-white/10"
            >
              <RotateCcw size={11} /> Clear
            </button>
          )}
          {onClose && (
            <button
              type="button"
              aria-label="Close filters"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto pr-1">
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

        <Section title="Muscle group" defaultOpen>
          <ChipGrid
            options={regionFacets(meta)}
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
              value={filters.muscle}
              onSelect={(v) => onChange('muscle', v)}
            />
            {filters.muscle && (
              <ToggleRow
                label="Include as secondary mover"
                hint="Also match exercises where this muscle assists"
                checked={filters.include_secondary}
                onChange={(v) => onChange('include_secondary', v)}
              />
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
function regionFacets(meta: ExerciseMeta | null): ExerciseFacet[] {
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
        className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
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
  options, value, onSelect, capitalize,
}: {
  options: ExerciseFacet[];
  value: string;
  onSelect: (v: string) => void;
  capitalize?: boolean;
}) {
  if (!options.length) {
    return <p className="px-1 py-2 text-[11px] text-[var(--text-muted)]">No options</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.slug;
        const empty = o.count === 0;
        return (
          <button
            key={o.slug}
            type="button"
            disabled={empty && !active}
            onClick={() => onSelect(active ? '' : o.slug)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
              capitalize && 'capitalize',
              active
                ? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'border-slate-200 bg-white/60 text-[var(--text-muted)] hover:border-slate-300 hover:text-[var(--text-primary)] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20',
              empty && !active && 'cursor-not-allowed opacity-35 hover:border-slate-200',
            )}
          >
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
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-[var(--brand)] dark:border-white/20"
      />
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-[var(--text-primary)]">{label}</span>
        {hint && <span className="block text-[10.5px] text-[var(--text-muted)]">{hint}</span>}
      </span>
    </label>
  );
}
