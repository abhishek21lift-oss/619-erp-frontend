'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dumbbell, Plus, SlidersHorizontal, Search, Command, ChevronLeft, ChevronRight,
  AlertCircle, Star, LayoutGrid, X, Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import { Badge, Button, EmptyState, PageContainer, PageHero, Skeleton, cn } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { useSeededSearch } from '@/lib/use-seeded-search';
import type { ExerciseFacet, ExerciseMeta, LibraryExercise } from '@/lib/api';

import { ExerciseCard } from '@/components/pt-os/exercise-library/ExerciseCard';
import { ExerciseFilterRail, regionFacets } from '@/components/pt-os/exercise-library/ExerciseFilterRail';
import { ExerciseDetailDrawer } from '@/components/pt-os/exercise-library/ExerciseDetailDrawer';
import { ExerciseCommandPalette } from '@/components/pt-os/exercise-library/ExerciseCommandPalette';
import { PAGE_SIZE, useExerciseLibrary } from '@/components/pt-os/exercise-library/useExerciseLibrary';
import type { ExerciseFilters } from '@/components/pt-os/exercise-library/useExerciseLibrary';
import {
  REGION_ORDER, regionTone, toneGradient, toneVars,
} from '@/components/pt-os/exercise-library/libraryTheme';
import { errorMessage } from '@/lib/forms/errors';

/**
 * The Exercise Library.
 *
 * Replaces the previous GIF-grid entirely. Three things changed structurally:
 *
 *  - Search, filtering, counting and paging all happen in one indexed query on
 *    the server. The old page pulled up to 1,000 rows and filtered in the
 *    browser, which is why it got slower as the library grew.
 *  - No media. Cards carry facts, not pictures, so a screenful is ~24
 *    exercises you can compare at a glance rather than 6 you have to read.
 *  - Everything a trainer authors is first-class: custom exercises search,
 *    filter and programme exactly like the built-in 890.
 */


export default function ExerciseLibraryPage() {
  return (
    <Guard>
      <ExerciseLibrary />
    </Guard>
  );
}

function ExerciseLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();

  const lib = useExerciseLibrary();
  const { filters, setFilter, setFilters, reset, meta, items, total, loading, searching, error } = lib;

  const [seededQ, setSeededQ] = useSeededSearch('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  // The studio's own library is the trainer's to write; the built-in library
  // is read-only for everyone (the server refuses edits to it).
  const canAuthor = user?.role === 'trainer';

  // The global top-nav search hands off via ?q= — carry it into the library's
  // own query so landing here from a global search shows filtered results.
  useEffect(() => {
    if (seededQ && seededQ !== filters.q) setFilter('q', seededQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededQ]);

  // ⌘K anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleToggleFavorite = useCallback(async (ex: LibraryExercise) => {
    try {
      await lib.toggleFavorite(ex);
    } catch {
      toast.error('Could not update favorite');
    }
  }, [lib, toast]);

  const handleDuplicate = useCallback(async (ex: LibraryExercise) => {
    try {
      const res = await api.exercises.duplicate(ex.id);
      toast.success(`Created "${res.exercise.name}"`);
      await lib.refetch();
      setDetailId(res.exercise.id);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not duplicate exercise'));
    }
  }, [lib, toast]);

  const handleArchive = useCallback(async (ex: LibraryExercise) => {
    const archiving = !ex.archived_at;
    try {
      await api.exercises.archive(ex.id, archiving);
      toast.success(archiving ? `"${ex.name}" archived` : `"${ex.name}" restored`);
      await lib.refetch();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not archive exercise'));
    }
  }, [lib, toast]);

  const handleDelete = useCallback(async (ex: LibraryExercise) => {
    const ok = window.confirm(
      `Delete "${ex.name}"?\n\nIt will be removed from the library. Any workout plan already using it keeps working — the exercise is retired, not erased.`
    );
    if (!ok) return;
    try {
      const res = await api.exercises.delete(ex.id);
      lib.removeLocal(ex.id);
      const refs = res.still_referenced;
      if (refs && (refs.in_plans > 0 || refs.in_logs > 0)) {
        toast.info(
          `"${ex.name}" deleted. It is still referenced by ${refs.in_plans} plan${refs.in_plans === 1 ? '' : 's'} and ${refs.in_logs} logged session${refs.in_logs === 1 ? '' : 's'}, which are unchanged.`
        );
      } else {
        toast.success(`"${ex.name}" deleted`);
      }
      if (detailId === ex.id) setDetailId(null);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete exercise'));
    }
  }, [lib, toast, detailId]);

  // Authoring lives at its own URL, so a half-written exercise survives a
  // reload and Back does the obvious thing.
  const openCreate = useCallback(() => { router.push('/pt-os/exercise-library/new'); }, [router]);
  const openEdit = useCallback((ex: LibraryExercise) => {
    router.push(`/pt-os/exercise-library/${ex.id}/edit`);
  }, [router]);

  const showingFrom = total === 0 ? 0 : lib.page * PAGE_SIZE + 1;
  const showingTo   = Math.min((lib.page + 1) * PAGE_SIZE, total);

  const quickChips = useMemo(() => ([
    { key: 'favorites_only' as const, label: 'Favorites', icon: Star },
    { key: 'custom_only'    as const, label: 'Custom',    icon: LayoutGrid },
  ]), []);

  const regions = useMemo(() => {
    const facets = regionFacets(meta);
    const order = (r: string) => {
      const i = REGION_ORDER.indexOf(r);
      return i === -1 ? REGION_ORDER.length : i;
    };
    return [...facets].sort((a, b) => order(a.slug) - order(b.slug));
  }, [meta]);

  const activeChips = useMemo(() => describeActiveFilters(filters, meta), [filters, meta]);

  return (
    <PageContainer>
      {/* max-w-[1600px] with its own px-4/sm:px-6 INSIDE .shell-main's gutter
          — so this page was 320px wider than the dashboard and paid its
          padding twice. */}
      {/* Compact: a trainer opens the library to find an exercise, so the
          header is furniture, not an arrival moment. No counts or refresh —
          the list below is the library, and it refetches on every filter. */}
      <PageHero
        compact
        icon={<Dumbbell size={18} />}
        title="Exercise Library"
        subtitle="Browse by muscle, equipment or name"
        actions={canAuthor ? (
          <Button onClick={openCreate} iconLeft={<Plus size={16} />} className="h-[44px] w-full sm:w-auto">
            New exercise
          </Button>
        ) : undefined}
      />

      {/* ── Browse by muscle ───────────────────────────────────── */}
      {regions.length > 0 && (
        <section aria-label="Browse by muscle group">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <h2 className="text-[17px] font-[750] tracking-[-0.015em] text-[var(--text-primary)]">Browse by muscle</h2>
            {filters.body_region && (
              <button
                type="button"
                onClick={() => setFilter('body_region', '')}
                className="text-[12.5px] font-[650] text-[var(--brand)] hover:underline"
              >
                Show all
              </button>
            )}
          </div>
          {/* A row that scrolls sideways on a phone and wraps into a grid from
              md up — eight tiles fit a laptop without scrolling. */}
          <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 sm:scroll-px-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 xl:grid-cols-8 [&::-webkit-scrollbar]:hidden">
            {regions.map((r) => (
              <RegionTile
                key={r.slug}
                region={r.slug}
                count={r.count ?? 0}
                active={filters.body_region === r.slug}
                onSelect={() => {
                  const next = filters.body_region === r.slug ? '' : r.slug;
                  setFilter('body_region', next);
                  // Same rule as the filter rail: a region and a muscle from a
                  // different region cannot both be true.
                  if (next && filters.muscle) setFilter('muscle', '');
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Search and quick filters ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 basis-full sm:basis-auto">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={filters.q}
            onChange={(e) => { setFilter('q', e.target.value); setSeededQ(e.target.value); }}
            placeholder="Search by name, muscle, equipment…"
            aria-label="Search exercises"
            className="h-12 w-full rounded-2xl border border-slate-200/70 bg-white py-2.5 pl-11 pr-24 text-[14px] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-all placeholder:text-slate-400 focus:border-[rgba(0,103,224,0.5)] focus:shadow-[0_0_0_4px_rgba(0,103,224,0.12)] dark:border-white/10 dark:bg-white/[0.05] dark:placeholder:text-white/30"
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10.5px] font-[650] text-[var(--text-muted)] transition-colors hover:text-[var(--brand)] dark:bg-white/10 sm:flex"
          >
            <Command size={10} /> K
          </button>
        </div>

        {/* Filters, the two quick toggles and sort share one row that slides
            sideways on a phone instead of wrapping into three ragged lines. */}
        <div className="-mx-4 -my-1 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-white px-4 sm:h-12 text-[13px] font-[650] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.05] lg:hidden"
          >
            <SlidersHorizontal size={15} /> Filters
            {lib.activeCount > 0 && <Badge tone="brand">{lib.activeCount}</Badge>}
          </button>

          {quickChips.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key, !filters[key])}
              aria-pressed={filters[key]}
              className={cn(
                'flex h-11 sm:h-12 items-center gap-1.5 rounded-2xl border px-4 text-[13px] font-[650] transition-all active:scale-[0.97]',
                filters[key]
                  ? 'border-transparent bg-[var(--brand)] text-white shadow-[0_8px_20px_-8px_rgba(0,103,224,0.7)]'
                  : 'border-slate-200/70 bg-white text-[var(--text-muted)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:text-[var(--text-primary)] dark:border-white/10 dark:bg-white/[0.05]',
              )}
            >
              <Icon size={14} fill={key === 'favorites_only' && filters[key] ? 'currentColor' : 'none'} /> {label}
            </button>
          ))}

          <select
            value={filters.sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            aria-label="Sort exercises"
            className="h-11 shrink-0 cursor-pointer sm:h-12 rounded-2xl border border-slate-200/70 bg-white px-4 text-[13px] font-[650] text-[var(--text-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none dark:border-white/10 dark:bg-white/[0.05]"
          >
            <option value="name">A → Z</option>
            <option value="name_desc">Z → A</option>
            <option value="updated">Recently updated</option>
            <option value="created">Newest</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Filter rail ──────────────────────────────────────── */}
        <div className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[24px] border border-slate-200/70 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-18px_rgba(15,23,42,0.14)] dark:border-white/[0.08] dark:bg-white/[0.04]">
            <ExerciseFilterRail
              meta={meta}
              filters={filters}
              activeCount={lib.activeCount}
              onChange={setFilter}
              onReset={reset}
            />
          </div>
        </div>

        {railOpen && (
          <div data-no-pull-refresh className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] animate-in fade-in duration-200" onClick={() => setRailOpen(false)} aria-hidden />
            <div
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] border-t border-slate-200 bg-white px-4 pt-2 shadow-[0_-20px_60px_-20px_rgba(15,23,42,0.4)] animate-in slide-in-from-bottom duration-300 dark:border-white/10 dark:bg-[#0f172a]"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* The sheet's grabber: says "this slides", the iOS way. */}
              <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-white/20" />
              <ExerciseFilterRail
                meta={meta}
                filters={filters}
                activeCount={lib.activeCount}
                onChange={setFilter}
                onReset={reset}
                onClose={() => setRailOpen(false)}
              />
            </div>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────── */}
        <main className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[12.5px] text-[var(--text-muted)]">
            <span aria-live="polite" className="font-medium">
              {loading
                ? 'Loading…'
                : total === 0
                  ? 'No results'
                  : `Showing ${showingFrom}–${showingTo} of ${total.toLocaleString()}`}
              {searching && <span className="ml-2 opacity-60">searching…</span>}
            </span>
            {lib.activeCount > 0 && (
              <button
                type="button"
                onClick={reset}
                className="font-[650] text-[var(--brand)] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* What is narrowing the list, each removable in one tap. */}
          {activeChips.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {activeChips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFilter(c.key, (typeof filters[c.key] === 'boolean' ? false : '') as never)}
                  aria-label={`Remove filter: ${c.label}`}
                  style={c.region ? toneVars(regionTone(c.region)) : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-2 text-[12px] font-[650] transition-colors',
                    c.region
                      ? 'bg-[var(--rg-wash)] text-[var(--rg-ink)] hover:bg-[var(--rg-wash-hi)] dark:text-[var(--rg-ink-d)]'
                      : 'bg-[rgba(0,103,224,0.1)] text-[var(--brand)] hover:bg-[rgba(0,103,224,0.15)]',
                  )}
                >
                  {c.label}
                  <X size={12} />
                </button>
              ))}
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center gap-3 rounded-[24px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] px-6 py-12 text-center">
              <AlertCircle size={24} className="text-[var(--danger-text)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Could not load the library</p>
                <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">{error}</p>
              </div>
              <Button variant="secondary" onClick={() => lib.refetch()}>Try again</Button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-b border-slate-200/70 px-1 py-3.5 dark:border-white/[0.07] sm:rounded-[22px] sm:border sm:bg-white sm:p-4 sm:dark:bg-white/[0.04]"
                >
                  <Skeleton className="h-10 w-10 shrink-0 rounded-[12px]" />
                  <div className="flex flex-1 flex-col gap-2.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={
                filters.favorites_only
                  ? <Star size={22} />
                  : filters.q
                    ? <Search size={22} />
                    : <Dumbbell size={22} />
              }
              title={
                filters.favorites_only
                  ? 'No favorites yet'
                  : filters.q
                    ? `Nothing matches "${filters.q}"`
                    : 'No exercises match these filters'
              }
              description={
                filters.favorites_only
                  ? 'Star an exercise to pin it here for quick programming.'
                  : filters.q
                    ? 'Try a shorter search, or clear your filters.'
                    : 'Widen or clear the filters to see more of the library.'
              }
              action={
                lib.activeCount > 0 || filters.q ? (
                  <Button variant="secondary" onClick={() => { reset(); setFilters((f) => ({ ...f, q: '' })); }}>
                    Clear search and filters
                  </Button>
                ) : canAuthor ? (
                  <Button onClick={openCreate}>
                    <span className="flex items-center gap-1.5"><Plus size={14} /> Create the first one</span>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((ex) => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    onOpen={(e) => setDetailId(e.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={canAuthor ? openEdit : undefined}
                    onDuplicate={canAuthor ? handleDuplicate : undefined}
                    onArchive={canAuthor ? handleArchive : undefined}
                    onDelete={canAuthor ? handleDelete : undefined}
                  />
                ))}
              </div>

              {lib.pageCount > 1 && (
                <nav
                  className="mx-auto mt-6 flex w-fit items-center justify-center gap-1 rounded-full border border-slate-200/70 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-16px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.05]"
                  aria-label="Pagination"
                >
                  <button
                    type="button"
                    onClick={() => lib.setPage(Math.max(0, lib.page - 1))}
                    disabled={lib.page === 0}
                    aria-label="Previous page"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {pageWindow(lib.page, lib.pageCount).map((p, i) =>
                    p === null ? (
                      <span key={`gap-${i}`} className="px-1 text-[var(--text-muted)]">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => lib.setPage(p)}
                        aria-current={p === lib.page ? 'page' : undefined}
                        className={cn(
                          'h-9 min-w-[36px] rounded-full px-2.5 text-[13px] font-[650] tabular-nums transition-all',
                          p === lib.page
                            ? 'bg-[var(--brand)] text-white shadow-[0_6px_16px_-6px_rgba(0,103,224,0.7)]'
                            : 'text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--text-primary)] dark:hover:bg-white/10',
                        )}
                      >
                        {p + 1}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => lib.setPage(Math.min(lib.pageCount - 1, lib.page + 1))}
                    disabled={lib.page >= lib.pageCount - 1}
                    aria-label="Next page"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Overlays ───────────────────────────────────────────── */}
      <ExerciseDetailDrawer
        exerciseId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(ex) => { setDetailId(null); openEdit(ex); }}
        onDuplicate={handleDuplicate}
        onToggleFavorite={handleToggleFavorite}
        onSelectRelated={(id) => setDetailId(id)}
      />

      <ExerciseCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={(ex) => setDetailId(ex.id)}
      />
    </PageContainer>
  );
}

/**
 * Page numbers to render: always the first, last and current ± 1, with gaps
 * collapsed. Keeps the control a fixed width at 19 pages or 190.
 */
function pageWindow(current: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);

  const pages = new Set<number>([0, count - 1, current]);
  if (current - 1 > 0) pages.add(current - 1);
  if (current + 1 < count - 1) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let prev = -1;
  for (const p of sorted) {
    if (prev !== -1 && p - prev > 1) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}


/**
 * A body region as a tile in its own colour — the library's front door.
 * Tapping it filters to that region; tapping it again clears the filter.
 */
function RegionTile({
  region, count, active, onSelect,
}: { region: string; count: number; active: boolean; onSelect: () => void }) {
  const tone = regionTone(region);
  const Icon = tone.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      disabled={count === 0 && !active}
      style={{ ...toneVars(tone), background: toneGradient(tone, 150) }}
      className={cn(
        'group relative flex min-w-[124px] shrink-0 snap-start flex-col items-start overflow-hidden rounded-[20px] p-3.5 text-left text-white',
        'shadow-[0_10px_24px_-12px_var(--rg-glow)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-12px_var(--rg-glow)] active:scale-[0.97]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-40 md:min-w-0',
        active && 'ring-[3px] ring-[color:var(--rg-from)] ring-offset-2 ring-offset-[color:var(--bg-canvas)]',
      )}
    >
      {/* Gloss: a light top edge and a soft highlight, the Apple tile finish. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.28),transparent_55%)]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-5 -right-4 opacity-20 transition-transform duration-500 group-hover:scale-110">
        <Icon size={64} strokeWidth={1.6} />
      </span>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/20 backdrop-blur-sm">
        <Icon size={16} strokeWidth={2.3} />
      </span>
      <span className="relative mt-3 text-[14px] font-[750] leading-tight tracking-[-0.01em]">{region}</span>
      <span className="relative mt-0.5 text-[11.5px] font-[600] tabular-nums text-white/80">
        {count.toLocaleString()} {count === 1 ? 'exercise' : 'exercises'}
      </span>
      {active && (
        <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[var(--rg-ink)]">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

type ChipKey = Exclude<keyof ExerciseFilters, 'q' | 'sort' | 'include_secondary'>;

/**
 * The filters narrowing the list, named the way the rail names them. Slugs
 * are looked up in the same facets the rail renders, so a chip never says
 * "barbell-bb" where the rail said "Barbell".
 */
function describeActiveFilters(
  f: ExerciseFilters, meta: ExerciseMeta | null,
): { key: ChipKey; label: string; region?: string }[] {
  const name = (list: ExerciseFacet[] | undefined, slug: string) =>
    list?.find((o) => o.slug === slug)?.name ?? slug;
  const out: { key: ChipKey; label: string; region?: string }[] = [];
  if (f.body_region) out.push({ key: 'body_region', label: f.body_region, region: f.body_region });
  if (f.muscle) {
    const m = meta?.muscles.find((o) => o.slug === f.muscle);
    out.push({ key: 'muscle', label: m?.name ?? f.muscle, region: m?.body_region });
  }
  if (f.equipment)  out.push({ key: 'equipment',  label: name(meta?.equipment, f.equipment) });
  if (f.category)   out.push({ key: 'category',   label: name(meta?.categories, f.category) });
  if (f.difficulty) {
    const d = name(meta?.difficulties, f.difficulty);
    out.push({ key: 'difficulty', label: d.charAt(0).toUpperCase() + d.slice(1) });
  }
  if (f.mechanic)   out.push({ key: 'mechanic',   label: name(meta?.mechanics, f.mechanic) });
  if (f.force)      out.push({ key: 'force',      label: name(meta?.forces, f.force) });
  if (f.pattern)    out.push({ key: 'pattern',    label: name(meta?.movement_patterns, f.pattern) });
  if (f.favorites_only)   out.push({ key: 'favorites_only',   label: 'Favorites' });
  if (f.custom_only)      out.push({ key: 'custom_only',      label: 'Custom' });
  if (f.include_archived) out.push({ key: 'include_archived', label: 'Including archived' });
  return out;
}
