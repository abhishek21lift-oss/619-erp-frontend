'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Dumbbell, X, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';

interface ExerciseLite {
  id: string;
  name: string;
  body_part: string;
  target_muscle: string;
  equipment: string | null;
  muscle_group: string;
}

export interface PickedExercise { id: string; name: string; }

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: PickedExercise) => void;
  /** Exercise names this client has logged recently — shown as quick-pick chips before any search. */
  recentNames?: string[];
}

const PAGE_SIZE = 30;

/** Searchable/filterable picker over the shared exercises library
 *  (src/app/pt-os/exercise-library) — reuses the exact same API rather
 *  than a second exercise data source.
 *
 *  The chips and the Cancel button are sized in explicit pixels: globals.css
 *  sets `html { font-size: 14px }`, so padding-derived heights land short of a
 *  thumb target. Measured at 390px they were 24px tall, against the 44 the
 *  workout brief asks for. This sheet is opened from the builder on a phone,
 *  mid-session, which is exactly when a 24px chip is unhittable. */
export function ExercisePicker({ open, onClose, onSelect, recentNames = [] }: ExercisePickerProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [exercises, setExercises] = useState<ExerciseLite[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    api.exercises.meta().then((m) => setBodyParts(m.body_parts || [])).catch(() => {});
  }, [open]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: '0' });
    if (search) params.set('search', search);
    if (bodyPart) params.set('body_part', bodyPart);
    api.exercises.list(params.toString())
      .then((data) => setExercises(data as ExerciseLite[]))
      .catch(() => toast.error('Failed to load exercises'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, bodyPart]);

  useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [open, load]);

  useEffect(() => {
    if (!open) { setSearch(''); setBodyPart(''); }
  }, [open]);

  const showRecent = !search && !bodyPart && recentNames.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>Search the exercise library or pick a recent one.</DialogDescription>
        </DialogHeader>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            type="text" autoFocus placeholder="Search exercises…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-[10px] text-[13px] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        {bodyParts.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setBodyPart('')}
              className="flex h-[44px] min-w-[44px] items-center justify-center rounded-full px-3.5 text-[11px] font-[650] transition"
              style={{ background: !bodyPart ? '#0f172a' : 'var(--bg-subtle)', color: !bodyPart ? '#fff' : '#64748b' }}>
              All
            </button>
            {bodyParts.slice(0, 8).map((bp) => (
              <button
                key={bp} onClick={() => setBodyPart(bp === bodyPart ? '' : bp)}
                className="flex h-[44px] items-center rounded-full px-3.5 text-[11px] font-[650] capitalize transition"
                style={{ background: bodyPart === bp ? '#0f172a' : 'var(--bg-subtle)', color: bodyPart === bp ? '#fff' : '#64748b' }}>
                {bp}
              </button>
            ))}
          </div>
        )}

        {showRecent && (
          <div className="mb-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-[650] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              <Clock size={11} /> Recent
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recentNames.slice(0, 6).map((name) => (
                <button
                  key={name}
                  onClick={() => { onSelect({ id: '', name }); onClose(); }}
                  className="flex h-[44px] items-center rounded-full px-3.5 text-[12px] font-[650] transition hover:opacity-80"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-[360px] overflow-y-auto space-y-1">
          {loading && (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>Loading…</p>
          )}
          {!loading && exercises.length === 0 && (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>No exercises found.</p>
          )}
          {!loading && exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => { onSelect({ id: ex.id, name: ex.name }); onClose(); }}
              className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--bg-subtle)' }}>
                <Dumbbell size={14} style={{ color: '#94a3b8' }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-[650] text-gray-900">{ex.name}</span>
                <span className="block truncate text-[11px] text-slate-400 capitalize">
                  {ex.target_muscle || ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
                </span>
              </span>
            </button>
          ))}
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
