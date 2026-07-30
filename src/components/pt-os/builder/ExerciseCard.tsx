'use client';

// One planned exercise, as an independently editable card.
//
// The design brief: building a programme should feel like arranging a playlist,
// not filling a spreadsheet. That means every parameter is edited in place —
// no modal, no separate page, no save button per field. The card owns its own
// draft state and reports changes upward; persistence is the parent's problem.
//
// ── Why this is not src/components/fitness/ExerciseCard.tsx ────────────────
//
// That one already exists and renders an exercise to the CLIENT: a demo, a
// description, what to do. This one is the TRAINER's authoring surface for a
// row of workout_exercises. They share a name and nothing else — same word,
// two audiences — so this lives under builder/ rather than replacing it.
//
// ── Editing model ─────────────────────────────────────────────────────────
//
// Local draft state, committed on blur, not on every keystroke. A per-keystroke
// commit would fire a PATCH per character, and — worse — the parent's optimistic
// update would race the response and fight the cursor. Blur is also when a
// trainer has actually finished thinking about a number.
//
// `Escape` reverts the field to its last committed value, which is the only
// undo a card this small needs.

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import {
  GripVertical, Copy, Trash2, ChevronDown, StickyNote, PlayCircle,
} from 'lucide-react';
import type { WorkoutPlanExercise, WorkoutExerciseInput } from '@/lib/api';

/** Muscle-group hues. Fixed per group so a group keeps its colour everywhere. */
const GROUP_TONE: Record<string, string> = {
  chest: '#e11d48', back: '#2563eb', legs: '#7c3aed', shoulders: '#ea580c',
  arms: '#0891b2', core: '#ca8a04', cardio: '#059669', 'full body': '#64748b',
};
const toneFor = (group?: string | null) =>
  GROUP_TONE[(group || '').toLowerCase()] ?? 'var(--brand)';

type FieldSpec = {
  key: keyof WorkoutExerciseInput;
  label: string;
  /** `decimal` keeps the numeric keypad but allows 62.5 and 8.5. */
  mode?: 'numeric' | 'decimal' | 'text';
  suffix?: string;
  placeholder?: string;
  /** Shown in the collapsed summary row. */
  primary?: boolean;
};

// Order is the visual hierarchy from the brief: the four a trainer sets on
// every exercise first, then the intensity detail behind a disclosure.
const PRIMARY: FieldSpec[] = [
  { key: 'sets',          label: 'Sets',   mode: 'numeric', primary: true },
  { key: 'reps',          label: 'Reps',   mode: 'numeric', primary: true },
  { key: 'target_weight', label: 'Weight', mode: 'decimal', suffix: 'kg', primary: true },
  { key: 'rest_seconds',  label: 'Rest',   mode: 'numeric', suffix: 's',  primary: true },
];
const ADVANCED: FieldSpec[] = [
  { key: 'tempo',       label: 'Tempo',    mode: 'text',    placeholder: '3-1-2-0' },
  { key: 'rpe',         label: 'RPE / RIR', mode: 'decimal' },
  { key: 'warmup_sets', label: 'Warm-up sets', mode: 'numeric' },
];

export interface ExerciseCardProps {
  exercise: WorkoutPlanExercise;
  /** Called with only the fields that changed. */
  onChange: (patch: WorkoutExerciseInput) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Rendered by the parent's drag container; the handle wires into it. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  /** Suppresses the entry animation while a drag is settling. */
  isDragging?: boolean;
}

export default function ExerciseCard({
  exercise, onChange, onDuplicate, onDelete, dragHandleProps, isDragging,
}: ExerciseCardProps) {
  const [open, setOpen] = useState(false);
  const tone = toneFor(exercise.muscle_group);
  const demo = exercise.video_url || exercise.gif_url;

  return (
    <m.div
      layout
      initial={isDragging ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[20px] p-4"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: isDragging
          ? '0 12px 32px rgba(15,23,42,0.18)'
          : '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* ── Name → muscle group → actions ── */}
      <div className="flex items-start gap-2.5">
        {/*
          44px, not an icon-sized hit box. This is the control most likely to be
          used with a thumb, and the brief is explicit about no tiny buttons.
        */}
        <button
          type="button"
          aria-label={`Reorder ${exercise.name}`}
          {...dragHandleProps}
          className="-ml-1 flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-[10px] active:cursor-grabbing"
          style={{ color: 'var(--text-muted)' }}
        >
          <GripVertical size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            {exercise.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {exercise.muscle_group && (
              <span
                className="rounded-full px-2 py-0.5 text-[10.5px] font-[700] uppercase tracking-wide"
                style={{ background: `${tone}1A`, color: tone }}
              >
                {exercise.muscle_group}
              </span>
            )}
            {exercise.superset_group && (
              <span
                className="rounded-full px-2 py-0.5 text-[10.5px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                Superset {exercise.superset_group}
              </span>
            )}
            {demo && (
              <a
                href={demo} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10.5px] font-[650]"
                style={{ color: 'var(--brand)' }}
              >
                <PlayCircle size={12} /> Demo
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label={`Duplicate ${exercise.name}`} onClick={onDuplicate}>
            <Copy size={16} />
          </IconButton>
          <IconButton label={`Remove ${exercise.name}`} onClick={onDelete} danger>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>

      {/* ── Parameters ── */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {PRIMARY.map((f) => (
          <InlineField key={String(f.key)} spec={f} exercise={exercise} onCommit={onChange} />
        ))}
      </div>

      {/* ── Intensity detail, folded away ──
          Sets/reps/weight/rest are set on nearly every exercise; tempo and RPE
          are not. Showing all seven at once is the spreadsheet feeling the
          redesign is trying to remove. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 flex h-9 items-center gap-1 text-[12px] font-[650]"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronDown
          size={14}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}
        />
        {open ? 'Fewer options' : 'Tempo, RPE, warm-up'}
      </button>

      {open && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
        >
          <div className="grid grid-cols-3 gap-2 pt-1">
            {ADVANCED.map((f) => (
              <InlineField key={String(f.key)} spec={f} exercise={exercise} onCommit={onChange} />
            ))}
          </div>
        </m.div>
      )}

      {/* ── Coach notes ── */}
      <div className="mt-3 flex items-start gap-2">
        <StickyNote size={14} className="mt-2.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <NotesField exercise={exercise} onCommit={onChange} />
      </div>
    </m.div>
  );
}

function IconButton({
  children, label, onClick, danger,
}: { children: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-[12px] transition-colors"
      style={{ color: danger ? 'var(--danger)' : 'var(--text-muted)' }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

/**
 * One inline-edited parameter.
 *
 * Draft state is local and syncs down only when the committed value changes,
 * so a server echo cannot overwrite what the trainer is mid-way through typing.
 */
function InlineField({
  spec, exercise, onCommit,
}: { spec: FieldSpec; exercise: WorkoutPlanExercise; onCommit: (p: WorkoutExerciseInput) => void }) {
  const committed = exercise[spec.key as keyof WorkoutPlanExercise];
  const asText = committed === null || committed === undefined ? '' : String(committed);
  const [draft, setDraft] = useState(asText);
  const lastCommitted = useRef(asText);

  useEffect(() => {
    // Only adopt an external change if it differs from what we last sent up.
    // Without this guard the optimistic echo of our own edit resets the field.
    if (asText !== lastCommitted.current) {
      lastCommitted.current = asText;
      setDraft(asText);
    }
  }, [asText]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === lastCommitted.current) return;

    let value: string | number | null;
    if (trimmed === '') {
      value = null;                       // clearing is a legitimate edit
    } else if (spec.mode === 'text') {
      value = trimmed;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) { setDraft(lastCommitted.current); return; }
      value = n;                          // 0 is a real prescription, not a falsy blank
    }
    lastCommitted.current = trimmed;
    onCommit({ [spec.key]: value } as WorkoutExerciseInput);
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {spec.label}
      </span>
      <div className="relative">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setDraft(lastCommitted.current); e.currentTarget.blur(); }
          }}
          inputMode={spec.mode === 'text' ? 'text' : spec.mode === 'decimal' ? 'decimal' : 'numeric'}
          placeholder={spec.placeholder ?? '—'}
          className="h-11 w-full rounded-[12px] px-2.5 text-center text-[14px] font-[700] outline-none"
          style={inputStyle}
        />
        {spec.suffix && draft !== '' && (
          <span
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-[600]"
            style={{ color: 'var(--text-muted)' }}
          >
            {spec.suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function NotesField({
  exercise, onCommit,
}: { exercise: WorkoutPlanExercise; onCommit: (p: WorkoutExerciseInput) => void }) {
  const committed = exercise.notes ?? '';
  const [draft, setDraft] = useState(committed);
  const last = useRef(committed);

  useEffect(() => {
    if (committed !== last.current) { last.current = committed; setDraft(committed); }
  }, [committed]);

  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = draft.trim();
        if (v === last.current) return;
        last.current = v;
        onCommit({ notes: v === '' ? null : v });
      }}
      rows={1}
      placeholder="Coach notes…"
      aria-label={`Coach notes for ${exercise.name}`}
      className="min-h-[44px] w-full resize-y rounded-[12px] px-3 py-2.5 text-[13px] outline-none"
      style={inputStyle}
    />
  );
}
