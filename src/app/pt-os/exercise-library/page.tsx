'use client';

// The exercise library.
//
// Replaces the free-exercise-db browser that shipped before: that page had
// four dropdowns, a GIF per card from a third-party CDN, an edit form that
// only actually saved two of its fields, and Add/Edit/Delete buttons shown to
// every authenticated user including the staff the API then refused.
//
// The list is server-filtered, server-sorted and server-paginated — the
// library is ~900 rows today and a studio's own customs grow on top, so
// filtering in the browser would mean shipping the whole table to render
// forty cards.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dumbbell, Search, Plus, X, SlidersHorizontal, Heart, Clock, Archive,
  AlertTriangle, ChevronLeft, ChevronRight, Loader2, Command,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { useSeededSearch } from '@/lib/use-seeded-search';
import { cn } from '@/components/ui/cn';
import ExerciseCard from '@/components/exercises/ExerciseCard';
import ExerciseFormModal from '@/components/exercises/ExerciseFormModal';
import ExerciseDetailModal from '@/components/exercises/ExerciseDetailModal';
import { canCreateExercise, canEditExercise } from '@/lib/exercise-permissions';
import type { LibraryExercise, ExerciseMeta } from '@/lib/api/types';

const PAGE_SIZE = 24;

type Scope = 'all' | 'favorites' | 'recent' | 'custom' | 'archived';

const SCOPES: Array<{ id: Scope; label: string; icon: React.ReactNode }> = [
  { id: 'all',       label: 'All',       icon: <Dumbbell size={13} /> },
  { id: 'favorites', label: 'Favourites', icon: <Heart size={13} /> },
  { id: 'recent',    label: 'Recent',    icon: <Clock size={13} /> },
  { id: 'custom',    label: 'Custom',    icon: <Plus size={13} /> },
  { id: 'archived',  label: 'Archived',  icon: <Archive size={13} /> },
];

const FILTERS: Array<{ key: string; label: string; metaKey: keyof ExerciseMeta }> = [
  { key: 'muscle_group',     label: 'Muscle',     metaKey: 'muscle_groups' },
  { key: 'equipment',        label: 'Equipment',  metaKey: 'equipment_types' },
  { key: 'category',         label: 'Category',   metaKey: 'categories' },
  { key: 'difficulty',       label: 'Difficulty', metaKey: 'difficulties' },
  { key: 'mechanic',         label: 'Mechanics',  metaKey: 'mechanics' },
  { key: 'force',            label: 'Force',      metaKey: 'forces' },
  { key: 'movement_pattern', label: 'Pattern',    metaKey: 'movement_patterns' },
];

const SORTS = [
  { id: 'name', label: 'A–Z' },
  { id: 'name_desc', label: 'Z–A' },
  { id: 'relevance', label: 'Best match' },
  { id: 'newest', label: 'Newest' },
  { id: 'updated', label: 'Recently updated' },
  { id: 'difficulty', label: 'Easiest first' },
];

export default function ExerciseLibraryPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [seeded] = useSeededSearch();
  const [searchInput, setSearchInput] = useState(seeded || '');
  const [search, setSearch] = useState(seeded || '');
  const [scope, setScope] = useState<Scope>('all');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<LibraryExercise[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [meta, setMeta] = useState<ExerciseMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryExercise | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const canCreate = canCreateExercise(user);

  // Debounce the search box, and reset to page 1 — staying on page 7 of the
  // old result set would show an empty grid for a query with three matches.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    api.exercises.meta().then(setMeta).catch(() => { /* filters degrade to empty */ });
  }, []);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit: PAGE_SIZE, sort };
    if (search.trim()) p.search = search.trim();
    for (const [k, v] of Object.entries(filters)) if (v) p[k] = v;
    if (scope === 'favorites') p.favorites = 'true';
    if (scope === 'custom') p.custom = 'true';
    if (scope === 'archived') p.archived = 'true';
    if (scope === 'recent') p.sort = 'recent';
    // Relevance is meaningless without a query; fall back so the list is not
    // arbitrarily ordered when the box is empty.
    if (sort === 'relevance' && !search.trim()) p.sort = 'name';
    return p;
  }, [page, sort, search, filters, scope]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = scope === 'recent'
        ? await api.exercises.recent({ limit: PAGE_SIZE })
        : await api.exercises.list(params);
      setItems(r.data);
      setTotal(r.pagination?.total ?? r.data.length);
      setPages(r.pagination?.pages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the exercise library');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [params, scope]);

  useEffect(() => { load(); }, [load]);

  // "/" focuses search, the shortcut every list UI has.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (typing) return;
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key.toLowerCase() === 'n' && canCreate && !formOpen && !detailId) {
        e.preventDefault();
        setEditing(null); setFormOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCreate, formOpen, detailId]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const setFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters({}); setSearchInput(''); setSearch(''); setPage(1);
  };

  const toggleFavorite = async (ex: LibraryExercise) => {
    const next = !ex.is_favorite;
    setItems((list) => list.map((i) => (i.id === ex.id ? { ...i, is_favorite: next } : i)));
    try {
      await api.exercises.favorite(ex.id, next);
      // On the favourites tab, un-favouriting should remove the card rather
      // than leave a hollow heart in a list defined by having one.
      if (scope === 'favorites' && !next) {
        setItems((list) => list.filter((i) => i.id !== ex.id));
        setTotal((t) => Math.max(t - 1, 0));
      }
    } catch {
      setItems((list) => list.map((i) => (i.id === ex.id ? { ...i, is_favorite: !next } : i)));
      toast.error('Could not update favourites');
    }
  };

  const duplicate = async (ex: LibraryExercise) => {
    try {
      const r = await api.exercises.duplicate(ex.id);
      toast.success(`Created "${r.data.name}" — it is yours to edit.`);
      setEditing(r.data); setFormOpen(true); setDetailId(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not duplicate this exercise');
    }
  };

  const archive = async (ex: LibraryExercise) => {
    try {
      if (ex.archived_at) { await api.exercises.restore(ex.id); toast.success('Restored.'); }
      else { await api.exercises.archive(ex.id); toast.success('Archived — still available under the Archived tab.'); }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update this exercise');
    }
  };

  const remove = async (ex: LibraryExercise) => {
    if (!window.confirm(`Delete "${ex.name}"?\n\nExisting workout plans and logged sessions keep working — they will still show this exercise.`)) return;
    try {
      await api.exercises.delete(ex.id);
      toast.success('Deleted.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete this exercise');
    }
  };

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
          <header className="mb-5 flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white"
              style={{ background: 'linear-gradient(145deg,#8B5CF6,#6D28D9)', boxShadow: '0 6px 16px rgba(139,92,246,0.3)' }}>
              <Dumbbell size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] font-[850] leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Exercise Library
              </h1>
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {loading ? 'Loading…' : `${total.toLocaleString('en-IN')} exercise${total === 1 ? '' : 's'}`}
                {activeFilterCount > 0 && ' · filtered'}
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => { setEditing(null); setFormOpen(true); }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-[750] text-white"
                style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}
              >
                <Plus size={15} /> New exercise
              </button>
            )}
          </header>

          {/* Search + scope tabs */}
          <div className="mb-3 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  ref={searchRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, muscle, equipment…"
                  aria-label="Search exercises"
                  className="w-full rounded-[12px] py-2.5 pl-9 pr-9 text-[13px] outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                {searchInput ? (
                  <button onClick={() => setSearchInput('')} aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5" style={{ color: 'var(--text-muted)' }}>
                    <X size={14} />
                  </button>
                ) : (
                  <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] sm:flex"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-disabled)', border: '1px solid var(--border)' }}>
                    <Command size={9} />K
                  </kbd>
                )}
              </div>

              <button
                onClick={() => setShowFilters((s) => !s)}
                className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[12.5px] font-[700]"
                style={{
                  background: activeFilterCount ? 'color-mix(in srgb, var(--brand) 12%, transparent)' : 'var(--bg-subtle)',
                  border: `1px solid ${activeFilterCount ? 'var(--brand)' : 'var(--border)'}`,
                  color: activeFilterCount ? 'var(--brand)' : 'var(--text-primary)',
                }}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && <span>({activeFilterCount})</span>}
              </button>

              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                aria-label="Sort"
                className="min-h-[42px] shrink-0 rounded-[12px] px-2.5 text-[12.5px] font-[650] outline-none"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setScope(s.id); setPage(1); }}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[700] transition"
                  style={{
                    background: scope === s.id ? 'var(--text-primary)' : 'var(--bg-subtle)',
                    color: scope === s.id ? 'var(--bg-elevated)' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                  aria-pressed={scope === s.id}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 gap-2 rounded-[14px] p-3 sm:grid-cols-4"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                {FILTERS.map((f) => {
                  const opts = (meta?.[f.metaKey] as string[] | null) || [];
                  return (
                    <div key={f.key}>
                      <label className="mb-1 block text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {f.label}
                      </label>
                      <select
                        value={filters[f.key] || ''}
                        onChange={(e) => setFilter(f.key, e.target.value)}
                        className="w-full rounded-[9px] px-2 py-1.5 text-[12px] outline-none"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      >
                        <option value="">Any</option>
                        {opts.map((o) => <option key={o} value={o} className="capitalize">{o}</option>)}
                      </select>
                    </div>
                  );
                })}
                {activeFilterCount > 0 && (
                  <div className="col-span-2 sm:col-span-4">
                    <button onClick={clearAll} className="text-[12px] font-[700] underline" style={{ color: 'var(--brand)' }}>
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {error ? (
            <div className="flex items-center gap-2.5 rounded-[14px] p-4"
              style={{ background: 'var(--danger-bg, rgba(220,38,38,0.08))', border: '1px solid rgba(220,38,38,0.25)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
              <p className="flex-1 text-[13px]" style={{ color: 'var(--danger)' }}>{error}</p>
              <button onClick={load} className="text-[12.5px] font-[700] underline" style={{ color: 'var(--danger)' }}>Retry</button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[168px] animate-pulse rounded-[14px]"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              scope={scope}
              hasQuery={!!search.trim() || activeFilterCount > 0}
              canCreate={canCreate}
              onClear={clearAll}
              onCreate={() => { setEditing(null); setFormOpen(true); }}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((ex) => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    onOpen={() => setDetailId(ex.id)}
                    onToggleFavorite={toggleFavorite}
                    onDuplicate={canCreate ? duplicate : undefined}
                    onEdit={(e) => { setEditing(e); setFormOpen(true); }}
                    onArchive={archive}
                    onDelete={remove}
                    canEdit={canEditExercise(user, ex)}
                  />
                ))}
              </div>

              {pages > 1 && scope !== 'recent' && (
                <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Pagination">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-[10px] px-3 py-2 text-[12.5px] font-[700] disabled:opacity-40"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="px-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    Page {page} of {pages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    disabled={page >= pages}
                    className="inline-flex items-center gap-1 rounded-[10px] px-3 py-2 text-[12.5px] font-[700] disabled:opacity-40"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>

        <ExerciseDetailModal
          exerciseId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(e) => { setEditing(e as LibraryExercise); setFormOpen(true); setDetailId(null); }}
          onDuplicate={(e) => duplicate(e as LibraryExercise)}
          onFavoriteChanged={(id, isFav) =>
            setItems((list) => list.map((i) => (i.id === id ? { ...i, is_favorite: isFav } : i)))}
          canEdit={(e) => canEditExercise(user, e)}
        />

        <ExerciseFormModal
          open={formOpen}
          exercise={editing}
          meta={meta}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={() => load()}
        />
      </AppShell>
    </Guard>
  );
}

function EmptyState({
  scope, hasQuery, canCreate, onClear, onCreate,
}: { scope: Scope; hasQuery: boolean; canCreate: boolean; onClear: () => void; onCreate: () => void }) {
  const copy: Record<Scope, { title: string; body: string }> = {
    all:       { title: 'No exercises found', body: 'Nothing matches what you are looking for.' },
    favorites: { title: 'No favourites yet', body: 'Tap the heart on any exercise to keep it here.' },
    recent:    { title: 'Nothing used yet', body: 'Exercises you add to a workout will show up here.' },
    custom:    { title: 'No custom exercises', body: 'Create your own movements — they behave exactly like library ones.' },
    archived:  { title: 'Nothing archived', body: 'Archived exercises are hidden from pickers but kept here.' },
  };
  const { title, body } = copy[scope];

  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] px-6 py-16 text-center"
      style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}>
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--bg-elevated)' }}>
        <Dumbbell size={20} style={{ color: 'var(--text-muted)' }} />
      </span>
      <h3 className="text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="mt-1 max-w-sm text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        {hasQuery ? 'Nothing matches your search and filters.' : body}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {hasQuery && (
          <button onClick={onClear} className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-[700]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Clear search &amp; filters
          </button>
        )}
        {canCreate && (
          <button onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-[750] text-white"
            style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>
            <Plus size={14} /> New exercise
          </button>
        )}
      </div>
    </div>
  );
}
