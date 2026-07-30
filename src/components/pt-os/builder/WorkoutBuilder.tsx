'use client';

// The Workout Builder: one day at a time, every exercise an editable card.
//
// ── Why one day at a time ─────────────────────────────────────────────────
//
// A week is up to seven lists; showing them together is the spreadsheet the
// redesign exists to remove, and on a phone it is unusable. Day tabs also make
// the save model honest — the granular endpoints are scoped per exercise, and
// the reorder endpoint is scoped per day, so the visible unit matches the unit
// that gets written.
//
// ── Drag and drop ─────────────────────────────────────────────────────────
//
// framer-motion's Reorder, not dnd-kit. framer-motion is already a dependency
// driving every other animation in the app, so this adds no bytes and no second
// animation idiom. Reorder.Group gives touch-friendly dragging and the layout
// animation for free.
//
// ── Optimistic, but not credulous ─────────────────────────────────────────
//
// Every edit paints immediately and queues a save. If the save fails the local
// value stays (retyping it would be worse) but the status pill goes red and
// says so — an optimistic UI that hides a failed write is worse than a save
// button, because the trainer leaves believing the programme is stored.
//
// ── Why the sizes are h-[44px] and not h-11 ───────────────────────────────
//
// globals.css sets `html { font-size: 14px }`, so Tailwind's rem-based sizes
// render at 87.5% of their names: h-11 is 38.5px, h-12 is 42, h-14 is 49. Every
// control on this screen was written as h-11 for "44px touch target" and shipped
// measuring 38.5. Sizes that have to be exact are written in pixels here.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { Plus, Loader2, Check, CloudOff, Dumbbell } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlan, WorkoutPlanExercise, WorkoutExerciseInput } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { EmptyState } from '@/components/ui';
import { ExercisePicker } from '@/components/pt-os/workout-log/ExercisePicker';
import ExerciseCard from './ExerciseCard';
import { useAutosave, saveStatusLabel } from './useAutosave';

/** ISO-ish: 1 = Monday, matching workout_exercises.day_of_week. */
const DAYS = [
  { n: 1, short: 'Mon', long: 'Monday' },
  { n: 2, short: 'Tue', long: 'Tuesday' },
  { n: 3, short: 'Wed', long: 'Wednesday' },
  { n: 4, short: 'Thu', long: 'Thursday' },
  { n: 5, short: 'Fri', long: 'Friday' },
  { n: 6, short: 'Sat', long: 'Saturday' },
  { n: 7, short: 'Sun', long: 'Sunday' },
];

export interface WorkoutBuilderProps {
  planId: string;
  /** Recently logged exercise names, for the picker's quick-pick chips. */
  recentNames?: string[];
}

export default function WorkoutBuilder({ planId, recentNames = [] }: WorkoutBuilderProps) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [rows, setRows] = useState<WorkoutPlanExercise[]>([]);
  const [day, setDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);

  const { status, enqueue, flushNow } = useAutosave<WorkoutExerciseInput>({
    save: (rowId, patch) => api.workouts.plans.exercises.patch(planId, rowId, patch),
    onError: () => toast.error('Could not save that change'),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await api.workouts.plans.detail(planId);
        if (cancelled) return;
        setPlan(detail);
        setRows(detail.exercises ?? []);
      } catch {
        if (!cancelled) toast.error('Could not load this programme');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [planId, toast]);

  // Flush on unmount so navigating away mid-debounce still saves.
  useEffect(() => () => { void flushNow(); }, [flushNow]);

  const forDay = useMemo(
    () => rows.filter((r) => r.day_of_week === day).sort((a, b) => a.sort_order - b.sort_order),
    [rows, day],
  );

  /** How many exercises each day holds — drives the count dots on the tabs. */
  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of rows) m.set(r.day_of_week, (m.get(r.day_of_week) ?? 0) + 1);
    return m;
  }, [rows]);

  const patchRow = useCallback((rowId: string, patch: WorkoutExerciseInput) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } as WorkoutPlanExercise : r)));
    enqueue(rowId, patch);
  }, [enqueue]);

  const addExercise = useCallback(async (exercise: { id: string; name: string }) => {
    setPicking(false);
    try {
      const { exercise: created } = await api.workouts.plans.exercises.add(planId, {
        exercise_id: exercise.id,
        day_of_week: day,
      });
      // Append the server's row rather than a locally-invented one: it carries
      // the id every later PATCH is keyed on, plus the joined name and demo url.
      setRows((prev) => [...prev, created]);
    } catch {
      toast.error('Could not add that exercise');
    }
  }, [planId, day, toast]);

  const duplicate = useCallback(async (row: WorkoutPlanExercise) => {
    try {
      const { exercise: created } = await api.workouts.plans.exercises.add(planId, {
        exercise_id: row.exercise_id ?? '',
        day_of_week: row.day_of_week,
        sets: row.sets, reps: row.reps, rest_seconds: row.rest_seconds,
        notes: row.notes, target_weight: row.target_weight, tempo: row.tempo,
        rpe: row.rpe, warmup_sets: row.warmup_sets, superset_group: row.superset_group,
      });
      setRows((prev) => [...prev, created]);
    } catch {
      toast.error('Could not duplicate that exercise');
    }
  }, [planId, toast]);

  const remove = useCallback(async (rowId: string) => {
    const snapshot = rows;
    setRows((prev) => prev.filter((r) => r.id !== rowId));   // optimistic
    try {
      await api.workouts.plans.exercises.remove(planId, rowId);
    } catch {
      setRows(snapshot);                                      // put it back
      toast.error('Could not remove that exercise');
    }
  }, [planId, rows, toast]);

  const reorder = useCallback(async (next: WorkoutPlanExercise[]) => {
    // Paint the new order, and renumber sort_order locally so the memo above
    // does not immediately re-sort the list back.
    const renumbered = next.map((r, i) => ({ ...r, sort_order: i }));
    setRows((prev) => [...prev.filter((r) => r.day_of_week !== day), ...renumbered]);
    try {
      await api.workouts.plans.exercises.reorder(planId, day, next.map((r) => r.id));
    } catch {
      toast.error('Could not save the new order');
    }
  }, [planId, day, toast]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={26} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* ── Header: plan name + live save status ── */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            {plan?.name ?? 'Workout'}
          </h1>
          <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {forDay.length} exercise{forDay.length === 1 ? '' : 's'} on {DAYS.find((d) => d.n === day)?.long}
          </p>
        </div>
        <SaveIndicator status={status} />
      </div>

      {/* ── Day tabs ──
          Horizontally scrollable rather than wrapped: seven tabs plus counts do
          not fit at 390px, and a wrapped second row pushes the cards down. */}
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Workout day">
        {DAYS.map((d) => {
          const active = d.n === day;
          const count = counts.get(d.n) ?? 0;
          return (
            <button
              key={d.n}
              role="tab"
              aria-selected={active}
              onClick={() => setDay(d.n)}
              className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-[14px] px-3.5 text-[13px] font-[700] transition-colors"
              style={{
                background: active ? 'var(--brand)' : 'var(--bg-card)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              {d.short}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 text-[10px] font-[800]"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                    color: active ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── The day's exercises ── */}
      {forDay.length === 0 ? (
        <EmptyState
          icon={<Dumbbell size={22} />}
          title={`Nothing on ${DAYS.find((d) => d.n === day)?.long} yet`}
          description="Add the first exercise and it becomes a card you can edit, duplicate and reorder."
          action={(
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="inline-flex h-[44px] items-center gap-2 rounded-[14px] px-4 text-[13.5px] font-[700] text-white"
              style={{ background: 'var(--brand)' }}
            >
              <Plus size={16} /> Add exercise
            </button>
          )}
        />
      ) : (
        <Reorder.Group axis="y" values={forDay} onReorder={reorder} className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {forDay.map((row) => (
              <DraggableExercise
                key={row.id}
                row={row}
                onChange={(patch) => patchRow(row.id, patch)}
                onDuplicate={() => duplicate(row)}
                onDelete={() => remove(row.id)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* ── Add, inline after the list ── */}
      {forDay.length > 0 && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-[16px] text-[13.5px] font-[700] transition-colors"
          style={{
            background: 'var(--bg-card)',
            border: '1px dashed var(--border)',
            color: 'var(--brand)',
          }}
        >
          <Plus size={16} /> Add exercise
        </button>
      )}

      {/* ── Floating action button ──
          Sits above the bottom nav via the --bottom-nav-h token rather than a
          magic number, so it stays put if the nav height changes. */}
      <button
        type="button"
        onClick={() => setPicking(true)}
        aria-label="Add exercise"
        className="fixed right-4 z-40 flex h-[56px] w-[56px] items-center justify-center rounded-full text-white"
        style={{
          bottom: 'calc(var(--bottom-nav-h, 52px) + env(safe-area-inset-bottom, 0px) + 16px)',
          background: 'var(--brand)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
        }}
      >
        <Plus size={24} />
      </button>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onSelect={addExercise}
        recentNames={recentNames}
      />
    </div>
  );
}

/**
 * One reorderable row.
 *
 * Exists as its own component solely so each item can own a `useDragControls`
 * — hooks cannot be called inside a `.map()` callback in the parent. The
 * controls are what let dragging start ONLY from the grip handle: the card is
 * full of text inputs, and a whole-card drag listener would hijack every
 * attempt to place a cursor or select a value.
 */
function DraggableExercise({
  row, onChange, onDuplicate, onDelete,
}: {
  row: WorkoutPlanExercise;
  onChange: (patch: WorkoutExerciseInput) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);

  return (
    <Reorder.Item
      value={row}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className="list-none"
    >
      <ExerciseCard
        exercise={row}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        isDragging={dragging}
        dragHandleProps={{
          // Pointer events rather than onMouseDown: this has to work with a
          // thumb, and touch is the primary input for this screen.
          onPointerDown: (e) => { e.preventDefault(); controls.start(e); },
        }}
      />
    </Reorder.Item>
  );
}

function SaveIndicator({ status }: { status: ReturnType<typeof useAutosave>['status'] }) {
  if (status === 'idle') return null;
  const label = saveStatusLabel(status);
  const tone =
    status === 'error' ? 'var(--danger)'
      : status === 'saved' ? '#059669'
        : 'var(--text-muted)';
  return (
    <div
      // polite, not assertive: a save confirmation should not interrupt a
      // screen-reader user mid-sentence.
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-[700]"
      style={{ background: 'var(--bg-subtle)', color: tone }}
    >
      {status === 'saving' && <Loader2 size={12} className="animate-spin" />}
      {status === 'saved' && <Check size={12} />}
      {status === 'error' && <CloudOff size={12} />}
      {label}
    </div>
  );
}
