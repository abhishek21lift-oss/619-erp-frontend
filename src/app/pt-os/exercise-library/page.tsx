'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dumbbell, Plus, SlidersHorizontal, Search, Command, ChevronLeft, ChevronRight,
  RefreshCw, AlertCircle, Star, LayoutGrid,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Badge, Button, EmptyState, Skeleton, cn } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { useSeededSearch } from '@/lib/use-seeded-search';
import type { LibraryExercise } from '@/lib/api';

import { ExerciseCard } from '@/components/pt-os/exercise-library/ExerciseCard';
import { ExerciseFilterRail } from '@/components/pt-os/exercise-library/ExerciseFilterRail';
import { ExerciseDetailDrawer } from '@/components/pt-os/exercise-library/ExerciseDetailDrawer';
import { ExerciseEditorDialog } from '@/components/pt-os/exercise-library/ExerciseEditorDialog';
import { ExerciseCommandPalette } from '@/components/pt-os/exercise-library/ExerciseCommandPalette';
import { PAGE_SIZE, useExerciseLibrary } from '@/components/pt-os/exercise-library/useExerciseLibrary';

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

const ROLES_THAT_CAN_AUTHOR = new Set(['super_admin', 'admin', 'manager', 'trainer']);

export default function ExerciseLibraryPage() {
  return (
    <Guard>
      <AppShell>
        <ExerciseLibrary />
      </AppShell>
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryExercise | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  const canAuthor = ROLES_THAT_CAN_AUTHOR.has(user?.role || '');

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
      toast.error(err instanceof Error ? err.message : 'Could not duplicate exercise');
    }
  }, [lib, toast]);

  const handleArchive = useCallback(async (ex: LibraryExercise) => {
    const archiving = !ex.archived_at;
    try {
      await api.exercises.archive(ex.id, archiving);
      toast.success(archiving ? `"${ex.name}" archived` : `"${ex.name}" restored`);
      await lib.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not archive exercise');
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
      toast.error(err instanceof Error ? err.message : 'Could not delete exercise');
    }
  }, [lib, toast, detailId]);

  const openCreate = useCallback(() => { setEditing(null); setEditorOpen(true); }, []);
  const openEdit = useCallback((ex: LibraryExercise) => { setEditing(ex); setEditorOpen(true); }, []);

  const handleSaved = useCallback(async (ex: LibraryExercise, created: boolean) => {
    await lib.refetch();
    if (created) setDetailId(ex.id);
    else lib.upsertLocal(ex);
  }, [lib]);

  const showingFrom = total === 0 ? 0 : lib.page * PAGE_SIZE + 1;
  const showingTo   = Math.min((lib.page + 1) * PAGE_SIZE, total);

  const quickChips = useMemo(() => ([
    { key: 'favorites_only' as const, label: 'Favorites', icon: Star },
    { key: 'custom_only'    as const, label: 'Custom',    icon: LayoutGrid },
  ]), []);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-5 sm:px-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
              <Dumbbell size={18} />
            </span>
            Exercise Library
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            {meta ? (
              <>
                {meta.total.toLocaleString()} exercises
                {meta.custom_total > 0 && ` · ${meta.custom_total} custom`}
              </>
            ) : (
              'Loading library…'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => lib.refetch()} aria-label="Refresh library">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </Button>
          {canAuthor && (
            <Button onClick={openCreate}>
              <span className="flex items-center gap-1.5"><Plus size={15} /> New exercise</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── Search bar ─────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={filters.q}
            onChange={(e) => { setFilter('q', e.target.value); setSeededQ(e.target.value); }}
            placeholder="Search by name, muscle, equipment…"
            aria-label="Search exercises"
            className="w-full rounded-xl border border-slate-200 bg-white/70 py-2.5 pl-10 pr-24 text-[13.5px] text-[var(--text-primary)] outline-none backdrop-blur-xl transition-colors placeholder:text-slate-400 focus:border-[var(--brand)]/50 focus:ring-2 focus:ring-[var(--brand)]/15 dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-white/25"
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10.5px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--brand)]/40 hover:text-[var(--brand)] dark:border-white/10 sm:flex"
          >
            <Command size={10} /> K
          </button>
        </div>

        <button
          type="button"
          onClick={() => setRailOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[12.5px] font-medium text-[var(--text-primary)] transition-colors hover:border-slate-300 dark:border-white/10 lg:hidden"
        >
          <SlidersHorizontal size={14} /> Filters
          {lib.activeCount > 0 && <Badge tone="brand">{lib.activeCount}</Badge>}
        </button>

        {quickChips.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key, !filters[key])}
            aria-pressed={filters[key]}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-all',
              filters[key]
                ? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]'
                : 'border-slate-200 text-[var(--text-muted)] hover:border-slate-300 hover:text-[var(--text-primary)] dark:border-white/10',
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}

        <select
          value={filters.sort}
          onChange={(e) => setFilter('sort', e.target.value)}
          aria-label="Sort exercises"
          className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2.5 text-[12.5px] font-medium text-[var(--text-primary)] outline-none dark:border-white/10 dark:bg-white/[0.04]"
        >
          <option value="name">A → Z</option>
          <option value="name_desc">Z → A</option>
          <option value="updated">Recently updated</option>
          <option value="created">Newest</option>
        </select>
      </div>

      <div className="flex gap-6">
        {/* ── Filter rail ──────────────────────────────────────── */}
        <div className="hidden w-[248px] shrink-0 lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/60 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
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
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setRailOpen(false)} aria-hidden />
            <div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
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
          <div className="mb-3 flex items-center justify-between gap-3 text-[12px] text-[var(--text-muted)]">
            <span aria-live="polite">
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
                className="font-medium text-[var(--brand)] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {error ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-6 py-12 text-center">
              <AlertCircle size={24} className="text-[var(--danger)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Could not load the library</p>
                <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">{error}</p>
              </div>
              <Button variant="secondary" onClick={() => lib.refetch()}>Try again</Button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/50 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
                <nav className="mt-6 flex items-center justify-center gap-1.5" aria-label="Pagination">
                  <Button
                    variant="ghost"
                    onClick={() => lib.setPage(Math.max(0, lib.page - 1))}
                    disabled={lib.page === 0}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </Button>

                  {pageWindow(lib.page, lib.pageCount).map((p, i) =>
                    p === null ? (
                      <span key={`gap-${i}`} className="px-1.5 text-[var(--text-muted)]">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => lib.setPage(p)}
                        aria-current={p === lib.page ? 'page' : undefined}
                        className={cn(
                          'min-w-[34px] rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                          p === lib.page
                            ? 'bg-[var(--brand)] text-white'
                            : 'text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--text-primary)] dark:hover:bg-white/10',
                        )}
                      >
                        {p + 1}
                      </button>
                    )
                  )}

                  <Button
                    variant="ghost"
                    onClick={() => lib.setPage(Math.min(lib.pageCount - 1, lib.page + 1))}
                    disabled={lib.page >= lib.pageCount - 1}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </Button>
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

      <ExerciseEditorDialog
        open={editorOpen}
        exercise={editing}
        meta={meta}
        onClose={() => { setEditorOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />

      <ExerciseCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={(ex) => setDetailId(ex.id)}
      />
    </div>
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
