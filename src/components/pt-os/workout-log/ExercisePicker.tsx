'use client';

// The one exercise picker, shared by the Workout Builder and the workout log.
//
// Reads the premium library at /api/exercises, so a custom exercise a trainer
// created is pickable here the moment it exists — the whole point of the
// library being the single source of truth.
//
// Server-backed favourites and recents replace the old client-derived "recent
// names" chips, which produced entries with no exercise id: picking one
// inserted a name-only row that could never join back to the library, so it
// had no muscle, no equipment and no history.
//
// The chips and the Cancel button are sized in explicit pixels: globals.css
// sets `html { font-size: 14px }`, so padding-derived heights land short of a
// thumb target. Measured at 390px they were 24px tall, against the 44 the
// workout brief asks for. This sheet is opened from the builder on a phone,
// mid-session, which is exactly when a 24px chip is unhittable.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Dumbbell, X, Clock, Heart, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { LibraryExercise, ExerciseMeta } from '@/lib/api/types';

export interface PickedExercise { id: string; name: string; }

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: PickedExercise) => void;
  /** @deprecated Server-backed recents are used instead; kept so existing callers compile. */
  recentNames?: string[];
  /** Ids already on the plan — shown as added rather than offered twice. */
  excludeIds?: string[];
}

const PAGE_SIZE = 30;
type Tab = 'all' | 'favorites' | 'recent';

export function ExercisePicker({ open, onClose, onSelect, excludeIds = [] }: ExercisePickerProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [meta, setMeta] = useState<ExerciseMeta | null>(null);
  const [items, setItems] = useState<LibraryExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  useEffect(() => {
    if (!open) return;
    api.exercises.meta().then(setMeta).catch(() => { /* filters degrade to none */ });
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: PAGE_SIZE, sort: debounced ? 'relevance' : 'name' };
      if (debounced) params.search = debounced;
      if (muscle) params.muscle_group = muscle;
      if (equipment) params.equipment = equipment;

      const r = tab === 'favorites' ? await api.exercises.favorites(params)
        : tab === 'recent' ? await api.exercises.recent({ limit: PAGE_SIZE })
        : await api.exercises.list(params);
      setItems(r.data);
      setCursor(0);
    } catch {
      toast.error('Could not load exercises');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, muscle, equipment, tab, toast]);

  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => {
    if (!open) { setSearch(''); setDebounced(''); setMuscle(''); setEquipment(''); setTab('all'); setCursor(0); }
  }, [open]);

  const pick = useCallback((ex: LibraryExercise) => {
    if (excluded.has(ex.id)) return;
    onSelect({ id: ex.id, name: ex.name });
    // Records that this exercise was actually used, which is what makes the
    // Recent tab reflect behaviour rather than nothing. Fire-and-forget.
    api.exercises.recordUse([ex.id]);
    onClose();
  }, [excluded, onSelect, onClose]);

  // Arrow keys move a highlight, Enter picks it — this list is long and the
  // builder is often driven from a keyboard.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === 'Enter' && items[cursor]) { e.preventDefault(); pick(items[cursor]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, cursor, pick]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const toggleFav = async (e: React.MouseEvent, ex: LibraryExercise) => {
    e.stopPropagation();
    const next = !ex.is_favorite;
    setItems((l) => l.map((i) => (i.id === ex.id ? { ...i, is_favorite: next } : i)));
    try { await api.exercises.favorite(ex.id, next); }
    catch {
      setItems((l) => l.map((i) => (i.id === ex.id ? { ...i, is_favorite: !next } : i)));
    }
  };

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All', icon: <Dumbbell size={12} /> },
    { id: 'favorites', label: 'Favourites', icon: <Heart size={12} /> },
    { id: 'recent', label: 'Recent', icon: <Clock size={12} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>Search the library, or pick a favourite or recent one.</DialogDescription>
        </DialogHeader>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text" autoFocus placeholder="Search exercises…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search exercises"
            className="w-full rounded-[10px] py-2.5 pl-9 pr-3 text-[13px] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className="flex h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-[650] transition"
              style={{
                background: tab === t.id ? '#0f172a' : 'var(--bg-subtle)',
                color: tab === t.id ? '#fff' : '#64748b',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'all' && (
          <div className="mb-3 flex gap-2">
            <select
              value={muscle} onChange={(e) => setMuscle(e.target.value)} aria-label="Filter by muscle"
              className="min-h-[40px] flex-1 rounded-[10px] px-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">Any muscle</option>
              {(meta?.muscle_groups || []).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={equipment} onChange={(e) => setEquipment(e.target.value)} aria-label="Filter by equipment"
              className="min-h-[40px] flex-1 rounded-[10px] px-2 text-[12px] outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">Any equipment</option>
              {(meta?.equipment_types || []).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        <div ref={listRef} className="max-h-[360px] space-y-1 overflow-y-auto">
          {loading && (
            <p className="flex items-center justify-center gap-2 py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>
              <Loader2 size={14} className="animate-spin" /> Loading…
            </p>
          )}
          {!loading && items.length === 0 && (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>
              {tab === 'favorites' ? 'No favourites yet — tap the heart on any exercise.'
                : tab === 'recent' ? 'Nothing used yet.'
                : 'No exercises found.'}
            </p>
          )}
          {!loading && items.map((ex, i) => {
            const isAdded = excluded.has(ex.id);
            return (
              <div
                key={ex.id}
                data-idx={i}
                role="button"
                tabIndex={0}
                aria-disabled={isAdded}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(ex)}
                onKeyDown={(e) => { if (e.key === 'Enter') pick(ex); }}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition"
                style={{
                  background: i === cursor ? 'var(--bg-subtle)' : 'transparent',
                  opacity: isAdded ? 0.45 : 1,
                  cursor: isAdded ? 'not-allowed' : 'pointer',
                }}
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--bg-subtle)' }}>
                  <Dumbbell size={14} style={{ color: '#94a3b8' }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{ex.name}</span>
                  <span className="block truncate text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>
                    {ex.target_muscle || ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
                    {ex.organization_id ? ' · custom' : ''}
                  </span>
                </span>
                {isAdded ? (
                  <span className="flex items-center gap-1 text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                    <Check size={12} /> Added
                  </span>
                ) : (
                  <button
                    onClick={(e) => toggleFav(e, ex)}
                    aria-label={ex.is_favorite ? 'Remove favourite' : 'Add favourite'}
                    className="shrink-0 rounded p-1"
                    style={{ color: ex.is_favorite ? '#e11d48' : 'var(--text-disabled)' }}
                  >
                    <Heart size={13} fill={ex.is_favorite ? '#e11d48' : 'none'} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex justify-end">
          <button
            onClick={onClose}
            className="flex h-[44px] items-center gap-1.5 rounded-[10px] px-3.5 text-[12px] font-[650]"
            style={{ color: '#64748b' }}
          >
            <X size={13} /> Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExercisePicker;
