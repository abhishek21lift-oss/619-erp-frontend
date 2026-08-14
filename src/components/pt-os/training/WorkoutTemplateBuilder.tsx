'use client';

// The trainer's builder for one workout day.
//
// ── What is different from the old one ─────────────────────────────────────
//
// Three things, and they are all consequences of the new schema rather than
// cosmetic choices:
//
//   SECTIONS   the old builder had a flat list per weekday, ordered by
//              sort_order alone, so a warm-up and a main lift were the same
//              kind of row. Sections are now a column, and volume analytics
//              counts working sets differently from warm-ups — so the
//              grouping is information, not decoration.
//
//   PRESCRIPTION TYPES  each row's fields come from its own type. A treadmill
//              row shows duration, distance and incline; the squat above it
//              shows sets, reps and weight. The old builder showed
//              SETS/REPS/WEIGHT/REST for both, because the schema forced it.
//
//   SUPERSETS  rows sharing a superset_group are rendered together and
//              labelled. The old schema had the column (migration 136) and
//              nothing rendered it.
//
// ── Ordering ───────────────────────────────────────────────────────────────
//
// order_index is global across the template, not per-section, and the reorder
// endpoint takes the whole list. Sections are a VIEW of that one order: the
// rows are grouped for display in canonical section order, and dragging
// inside a section rewrites the global list with that section's rows in their
// new order. Anything else would let the display order and order_index
// disagree, which is how a day renders differently in the builder and in the
// client's app.
//
// framer-motion's Reorder rather than dnd-kit, matching the old builder's
// deliberate choice: framer-motion is already a dependency, and Reorder.Group
// is touch-friendly, which matters on the tablet this is used on.

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, Reorder, useDragControls, m } from 'framer-motion';
import { Copy, GripVertical, Loader2, Plus, Trash2, Link2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import PrescriptionEditor from './PrescriptionEditor';
import type { PrescriptionTypeMeta, TemplateExercise, WorkoutSection } from '@/lib/api';

/**
 * Canonical section order.
 *
 * A workout reads warm-up first and cool-down last whatever order the rows
 * were added in. Kept here rather than taken from the server's list because
 * this is a reading order — a presentation decision — while the server's list
 * is the set of valid values.
 */
export const SECTION_ORDER: WorkoutSection[] = [
  'WARMUP', 'ACTIVATION', 'MAIN', 'ACCESSORY',
  'CARDIO', 'CONDITIONING', 'COOLDOWN', 'MOBILITY',
];

const SECTION_LABEL: Record<WorkoutSection, string> = {
  WARMUP: 'Warm-up', ACTIVATION: 'Activation', MAIN: 'Main', ACCESSORY: 'Accessory',
  CARDIO: 'Cardio', CONDITIONING: 'Conditioning', COOLDOWN: 'Cool-down', MOBILITY: 'Mobility',
};

/** Rows grouped by section, in reading order, skipping empty sections. */
export function groupBySection(rows: TemplateExercise[]): { section: WorkoutSection; rows: TemplateExercise[] }[] {
  const byOrder = [...rows].sort((a, b) => a.order_index - b.order_index);
  return SECTION_ORDER
    .map((section) => ({ section, rows: byOrder.filter((r) => (r.section ?? 'MAIN') === section) }))
    .filter((g) => g.rows.length > 0);
}

/**
 * Rewrite the whole template's order after one section was reordered.
 *
 * The other sections keep their relative order; only the moved section's rows
 * are replaced with the new sequence. Returns ids in the order the reorder
 * endpoint expects.
 */
export function reorderWithinSection(
  all: TemplateExercise[], section: WorkoutSection, nextRows: TemplateExercise[],
): string[] {
  const nextIds = nextRows.map((r) => r.id);
  const out: string[] = [];
  let taken = 0;
  for (const row of [...all].sort((a, b) => a.order_index - b.order_index)) {
    if ((row.section ?? 'MAIN') === section) {
      // Fill this section's slots, in the order the drag produced.
      out.push(nextIds[taken++] ?? row.id);
    } else {
      out.push(row.id);
    }
  }
  return out;
}

export interface WorkoutTemplateBuilderProps {
  templateId: string;
  exercises: TemplateExercise[];
  types: PrescriptionTypeMeta[];
  /** Called after any mutation so the parent can refetch. */
  onChanged: () => void;
  /** Opens the exercise picker for a section; the parent owns the picker. */
  onAddExercise: (section: WorkoutSection) => void;
}

export default function WorkoutTemplateBuilder({
  templateId, exercises, types, onChanged, onAddExercise,
}: WorkoutTemplateBuilderProps) {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const groups = useMemo(() => groupBySection(exercises), [exercises]);

  const patch = useCallback(async (rowId: string, body: Partial<TemplateExercise>) => {
    setBusyId(rowId);
    try {
      const res = await api.training.templates.updateExercise(templateId, rowId, body as Record<string, unknown>);
      // Warnings are the server telling us a field does not apply to the
      // type — worth surfacing, never worth blocking the save.
      if (res.warnings?.length) toast.info(res.warnings[0]);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save that change');
    } finally { setBusyId(null); }
  }, [templateId, onChanged, toast]);

  const remove = useCallback(async (rowId: string) => {
    setBusyId(rowId);
    try {
      await api.training.templates.removeExercise(templateId, rowId);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not remove that exercise');
    } finally { setBusyId(null); }
  }, [templateId, onChanged, toast]);

  const duplicate = useCallback(async (row: TemplateExercise) => {
    setBusyId(row.id);
    try {
      // Copy the prescription, not the id. Spreading the row and deleting the
      // key would also carry created_at and the server-rendered summary.
      const { id: _id, workout_template_id: _t, exercise_name: _n, summary: _s, logs_as: _l, ...rest } = row;
      await api.training.templates.addExercise(templateId, {
        ...rest, order_index: row.order_index + 1,
      } as Record<string, unknown>);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not duplicate that exercise');
    } finally { setBusyId(null); }
  }, [templateId, onChanged, toast]);

  const reorder = useCallback(async (section: WorkoutSection, nextRows: TemplateExercise[]) => {
    try {
      await api.training.templates.reorder(templateId, reorderWithinSection(exercises, section, nextRows));
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not save the new order');
      onChanged();   // refetch, so the screen stops showing an order that did not save
    }
  }, [templateId, exercises, onChanged, toast]);

  if (!exercises.length) {
    return (
      <div className="py-10 text-center">
        <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          Nothing prescribed yet. Add an exercise and it becomes a row you can configure,
          duplicate and reorder.
        </p>
        <button
          type="button" onClick={() => onAddExercise('MAIN')}
          className="mt-4 inline-flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[13px] font-[680]"
          style={{ background: 'var(--brand-lo, #0067e0)', color: '#fff' }}
        >
          <Plus size={14} /> Add exercise
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {groups.map(({ section, rows }) => (
        <section key={section}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11.5px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              {SECTION_LABEL[section]} · {rows.length}
            </h3>
            <button
              type="button" onClick={() => onAddExercise(section)}
              aria-label={`Add exercise to ${SECTION_LABEL[section]}`}
              className="flex items-center gap-1.5 text-[12px] font-[650]"
              style={{ color: 'var(--brand-lo, #0067e0)' }}
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <Reorder.Group
            axis="y" values={rows} onReorder={(next) => reorder(section, next as TemplateExercise[])}
            className="flex flex-col gap-2.5"
          >
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <ExerciseRow
                  key={row.id}
                  row={row}
                  types={types}
                  busy={busyId === row.id}
                  expanded={expanded === row.id}
                  onToggle={() => setExpanded((e) => (e === row.id ? null : row.id))}
                  onPatch={(body) => patch(row.id, body)}
                  onRemove={() => remove(row.id)}
                  onDuplicate={() => duplicate(row)}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </section>
      ))}
    </div>
  );
}

interface ExerciseRowProps {
  row: TemplateExercise;
  types: PrescriptionTypeMeta[];
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (body: Partial<TemplateExercise>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function ExerciseRow({ row, types, busy, expanded, onToggle, onPatch, onRemove, onDuplicate }: ExerciseRowProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={row} dragListener={false} dragControls={controls}
      className="rounded-[14px] p-3.5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <button
          type="button" aria-label={`Reorder ${row.exercise_name ?? 'exercise'}`}
          onPointerDown={(e) => controls.start(e)}
          className="mt-0.5 cursor-grab touch-none"
          style={{ color: 'var(--text-disabled)' }}
        >
          <GripVertical size={16} />
        </button>

        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>
              {row.exercise_name ?? 'Exercise'}
            </span>
            {row.superset_group && (
              <span
                className="flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[10px] font-[700]"
                style={{ background: 'var(--brand-soft, rgba(0,103,224,0.1))', color: 'var(--brand-lo, #0067e0)' }}
              >
                <Link2 size={9} /> {row.superset_group}
              </span>
            )}
            {row.warmup && (
              <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                warm-up
              </span>
            )}
          </div>
          {/* The server-rendered sentence, so the builder, the PDF and the
              client's screen say the same thing about this prescription. */}
          <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {row.summary || row.prescription_type.replace(/_/g, ' ')}
          </p>
        </button>

        <div className="flex items-center gap-1">
          {busy && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />}
          <button type="button" onClick={onDuplicate} aria-label={`Duplicate ${row.exercise_name ?? 'exercise'}`}
            disabled={busy} style={{ color: 'var(--text-disabled)' }}>
            <Copy size={14} />
          </button>
          <button type="button" onClick={onRemove} aria-label={`Remove ${row.exercise_name ?? 'exercise'}`}
            disabled={busy} style={{ color: 'var(--danger-text, #ef4444)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <m.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 overflow-hidden border-t pt-4" style={{ borderColor: 'var(--border)' }}
        >
          <PrescriptionEditor value={row} types={types} onChange={onPatch} disabled={busy} />
        </m.div>
      )}
    </Reorder.Item>
  );
}
