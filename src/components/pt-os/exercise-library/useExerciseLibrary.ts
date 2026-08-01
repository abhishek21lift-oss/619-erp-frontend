'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ExerciseMeta, LibraryExercise } from '@/lib/api';

/**
 * The Exercise Library's data layer.
 *
 * Everything expensive happens on the server: filtering, ranking, counting and
 * paging are all one indexed query. This hook's whole job is to describe what
 * the user asked for, debounce it, and make sure a slow response for an old
 * query can never overwrite a fast response for the current one.
 */

export interface ExerciseFilters {
  q: string;
  muscle: string;
  body_region: string;
  equipment: string;
  category: string;
  difficulty: string;
  mechanic: string;
  force: string;
  pattern: string;
  favorites_only: boolean;
  custom_only: boolean;
  include_archived: boolean;
  include_secondary: boolean;
  sort: string;
}

export const EMPTY_FILTERS: ExerciseFilters = {
  q: '', muscle: '', body_region: '', equipment: '', category: '',
  difficulty: '', mechanic: '', force: '', pattern: '',
  favorites_only: false, custom_only: false, include_archived: false,
  include_secondary: false, sort: 'name',
};

export const PAGE_SIZE = 48;

/** Which of the filters are actually narrowing the list right now. */
export function activeFilterCount(f: ExerciseFilters): number {
  let n = 0;
  if (f.muscle) n++;
  if (f.body_region) n++;
  if (f.equipment) n++;
  if (f.category) n++;
  if (f.difficulty) n++;
  if (f.mechanic) n++;
  if (f.force) n++;
  if (f.pattern) n++;
  if (f.favorites_only) n++;
  if (f.custom_only) n++;
  if (f.include_archived) n++;
  return n;
}

function toParams(f: ExerciseFilters, offset: number): Record<string, string | number> {
  const p: Record<string, string | number> = { limit: PAGE_SIZE, offset, sort: f.sort };
  if (f.q.trim())        p.q = f.q.trim();
  if (f.muscle)          p.muscle = f.muscle;
  if (f.body_region)     p.body_region = f.body_region;
  if (f.equipment)       p.equipment = f.equipment;
  if (f.category)        p.category = f.category;
  if (f.difficulty)      p.difficulty = f.difficulty;
  if (f.mechanic)        p.mechanic = f.mechanic;
  if (f.force)           p.force = f.force;
  if (f.pattern)         p.pattern = f.pattern;
  if (f.favorites_only)  p.favorites_only = 'true';
  if (f.custom_only)     p.custom_only = 'true';
  if (f.include_archived) p.include_archived = 'true';
  if (f.include_secondary && f.muscle) p.include_secondary = 'true';
  // When there is a query, let relevance rank the results instead of the
  // alphabetical default — a search for "squat" should not open on
  // "Advanced Kettlebell Windmill" just because it sorts earlier.
  if (f.q.trim() && f.sort === 'name') delete p.sort;
  return p;
}

export function useExerciseLibrary() {
  const [filters, setFilters] = useState<ExerciseFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  const [items, setItems]   = useState<LibraryExercise[]>([]);
  const [total, setTotal]   = useState(0);
  const [meta, setMeta]     = useState<ExerciseMeta | null>(null);
  const [loading, setLoading]   = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Monotonic request id. A response is only applied if it belongs to the most
  // recent request — without this, typing "deadlift" fast can settle on the
  // results for "dead" when that request happens to resolve last.
  const reqId = useRef(0);
  const debounced = useRef(filters.q);
  const [debouncedQ, setDebouncedQ] = useState('');

  // 220ms: long enough that a normal typist issues one request per word,
  // short enough that results feel attached to the keystroke.
  useEffect(() => {
    debounced.current = filters.q;
    if (filters.q !== debouncedQ) setSearching(true);
    const t = setTimeout(() => {
      setDebouncedQ(debounced.current);
      setPage(0);
    }, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q]);

  const effective = useMemo(
    () => ({ ...filters, q: debouncedQ }),
    [filters, debouncedQ]
  );

  const fetchPage = useCallback(async () => {
    const id = ++reqId.current;
    setError(null);
    try {
      const res = await api.exercises.list(toParams(effective, page * PAGE_SIZE));
      if (id !== reqId.current) return;
      setItems(res.exercises || []);
      setTotal(res.total || 0);
    } catch (err) {
      if (id !== reqId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load exercises');
      setItems([]);
      setTotal(0);
    } finally {
      if (id === reqId.current) {
        setLoading(false);
        setSearching(false);
      }
    }
  }, [effective, page]);

  useEffect(() => { void fetchPage(); }, [fetchPage]);

  useEffect(() => {
    let alive = true;
    api.exercises.meta()
      .then((m) => { if (alive) setMeta(m); })
      .catch(() => { /* the rail degrades to no counts; the list still works */ });
    return () => { alive = false; };
  }, []);

  const setFilter = useCallback(<K extends keyof ExerciseFilters>(key: K, value: ExerciseFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (key !== 'q') setPage(0);
  }, []);

  const reset = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }, []);

  /**
   * Optimistic favorite toggle: the star flips now, and rolls back only if the
   * server disagrees. Waiting a round trip to fill in a star reads as lag.
   */
  const toggleFavorite = useCallback(async (ex: LibraryExercise) => {
    const next = !ex.is_favorite;
    setItems((prev) => prev.map((e) => (e.id === ex.id ? { ...e, is_favorite: next } : e)));
    try {
      await api.exercises.favorite(ex.id, next);
    } catch {
      setItems((prev) => prev.map((e) => (e.id === ex.id ? { ...e, is_favorite: !next } : e)));
      throw new Error('Could not update favorite');
    }
  }, []);

  /** Splices a created/updated row into the current page without a refetch. */
  const upsertLocal = useCallback((ex: LibraryExercise) => {
    setItems((prev) => {
      const i = prev.findIndex((e) => e.id === ex.id);
      if (i === -1) return prev;
      const next = [...prev];
      next[i] = { ...next[i], ...ex };
      return next;
    });
  }, []);

  const removeLocal = useCallback((id: string) => {
    setItems((prev) => prev.filter((e) => e.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    filters, setFilter, setFilters, reset,
    activeCount: activeFilterCount(filters),
    items, total, meta,
    loading, searching, error,
    page, setPage, pageCount,
    refetch: fetchPage,
    toggleFavorite, upsertLocal, removeLocal,
  };
}

/**
 * Minimal fixed-height list virtualizer.
 *
 * Used by the Workout Builder picker, which scrolls an unpaginated result set
 * inside a short panel — there, rendering 200 rows to show 8 is the difference
 * between a picker that opens instantly and one that stutters. The library
 * grid does not use this: it pages at 48, so there is nothing to window.
 */
export function useVirtualList<T>(items: T[], rowHeight: number, viewportHeight: number, overscan = 6) {
  const [scrollTop, setScrollTop] = useState(0);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const end = Math.min(items.length, start + visibleCount);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Reset to the top whenever the list identity changes, otherwise a new
  // search lands mid-scroll showing rows the user never scrolled to.
  useEffect(() => { setScrollTop(0); }, [items]);

  return {
    onScroll,
    slice: items.slice(start, end),
    padTop: start * rowHeight,
    padBottom: Math.max(0, (items.length - end) * rowHeight),
    totalHeight: items.length * rowHeight,
  };
}
