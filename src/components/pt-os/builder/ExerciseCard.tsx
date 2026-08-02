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
  GripVertical, Copy, Trash2, ChevronDown, StickyNote, PlayCircle, TrendingUp,
} from 'lucide-react';
import type { ProgressionPreview, WorkoutPlanExercise, WorkoutExerciseInput } from '@/lib/api';

/** Muscle-group hues. Fixed per group so a group keeps its colour everywhere. */
const GROUP_TONE: Record<string, string> = {
  chest: '#dc2626', back: '#0067e0', legs: '#0067e0', shoulders: '#f59e0b',
  arms: '#0059ce', core: '#d97706', cardio: '#059669', 'full body': '#64748b',
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
  // The card has always RENDERED a "Superset A" badge and never had a way to
  // create one: the column existed, the badge existed, and the only route to a
  // value was the whole-plan PUT, which the builder does not use. A free-text
  // letter rather than a picker — exercises sharing a value are performed
  // together, and "A"/"B" is what a coach writes on the sheet.
  { key: 'superset_group', label: 'Superset', mode: 'text', placeholder: 'A' },
];

export interface ExerciseCardProps {
  exercise: WorkoutPlanExercise;
  /** Called with only the fields that changed. Required unless `readOnly`. */
  onChange?: (patch: WorkoutExerciseInput) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  /** Rendered by the parent's drag container; the handle wires into it. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  /** Suppresses the entry animation while a drag is settling. */
  isDragging?: boolean;
  /**
   * Where the plan's progression rule lands for THIS exercise.
   *
   * A rule is abstract until you see the number it produces: "+2.5 kg a week"
   * on a 60 kg squat is 87.5 kg by week 12, which a trainer may well decide is
   * too much — and that is much cheaper to learn here than in week 9.
   */
  preview?: ProgressionPreview;
  /**
   * A generated week. Every input becomes text, and the actions disappear.
   *
   * Not `disabled` inputs: a greyed-out field reads as "broken, try again",
   * and a derived week is not broken — it is a correct prescription that
   * simply is not written here. Week 1 is where it is written.
   */
  readOnly?: boolean;
}

export default function ExerciseCard({
  exercise, onChange, onDuplicate, onDelete, dragHandleProps, isDragging, preview, readOnly,
}: ExerciseCardProps) {
  const [open, setOpen] = useState(false);
  const tone = toneFor(exercise.muscle_group);
  const demo = exercise.video_url || exercise.gif_url;
  const commit = onChange ?? (() => {});

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

          Explicit pixels, not h-11/w-11. globals.css sets `html { font-size:
          14px }`, so every rem-based Tailwind size renders at 87.5% — h-11 is
          38.5px, not the 44 the name implies, and this handle measured
          31.5×38.5 on a 390px viewport. Anything that has to be exactly 44
          says 44.
        */}
        {!readOnly && (
          <button
            type="button"
            aria-label={`Reorder ${exercise.name}`}
            {...dragHandleProps}
            className="-ml-1 flex h-[44px] w-[44px] shrink-0 cursor-grab touch-none items-center justify-center rounded-[10px] active:cursor-grabbing"
            style={{ color: 'var(--text-muted)' }}
          >
            <GripVertical size={18} />
          </button>
        )}

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

        {!readOnly && (
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton label={`Duplicate ${exercise.name}`} onClick={onDuplicate ?? (() => {})}>
              <Copy size={16} />
            </IconButton>
            <IconButton label={`Remove ${exercise.name}`} onClick={onDelete ?? (() => {})} danger>
              <Trash2 size={16} />
            </IconButton>
          </div>
        )}
      </div>

      {/* ── Parameters ── */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {PRIMARY.map((f) => (
          readOnly
            ? <StaticField key={String(f.key)} spec={f} exercise={exercise} />
            : <InlineField key={String(f.key)} spec={f} exercise={exercise} onCommit={commit} />
        ))}
      </div>

      {/* ── Where the rule takes this exercise ──
          One line, only when the rule actually moves this exercise. An
          exercise with no prescribed load under a weight rule is not
          progressed at all — inventing a starting weight to show a ramp from
          would be a number the trainer never wrote. */}
      {preview && <RampLine preview={preview} exercise={exercise} />}

      {/* ── Intensity detail, folded away ──
          Sets/reps/weight/rest are set on nearly every exercise; tempo and RPE
          are not. Showing all seven at once is the spreadsheet feeling the
          redesign is trying to remove. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 flex h-[44px] items-center gap-1 text-[12px] font-[650]"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronDown
          size={14}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}
        />
        {open ? 'Fewer options' : 'Tempo, RPE, warm-up, drop sets'}
      </button>

      {open && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden"
        >
          {/* Two rows of two rather than three-then-one: a lone field on its
              own row at 390px reads as a mistake, and 2×2 keeps each box wide
              enough for "3-1-2-0" to fit without scrolling inside itself. */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {ADVANCED.map((f) => (
              readOnly
                ? <StaticField key={String(f.key)} spec={f} exercise={exercise} />
                : <InlineField key={String(f.key)} spec={f} exercise={exercise} onCommit={commit} />
            ))}
          </div>
          <DropSetField exercise={exercise} onCommit={commit} readOnly={readOnly} />
        </m.div>
      )}

      {/* ── Coach notes ── */}
      {(!readOnly || exercise.notes) && (
        <div className="mt-3 flex items-start gap-2">
          <StickyNote size={14} className="mt-2.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
          {readOnly ? (
            <p className="min-h-[44px] w-full rounded-[12px] px-3 py-2.5 text-[13px]" style={{ ...inputStyle, color: 'var(--text-muted)' }}>
              {exercise.notes}
            </p>
          ) : (
            <NotesField exercise={exercise} onCommit={commit} />
          )}
        </div>
      )}
    </m.div>
  );
}

/**
 * "W1 60 → W12 87.5 kg" — one line, only where the rule actually moves.
 *
 * Rendered from the SERVER's preview rather than recomputed here. The client's
 * workout log resolves week N server-side too, and a second implementation of
 * the same arithmetic in TypeScript would eventually disagree with it — at
 * which point the builder promises a number the gym floor never shows.
 */
function RampLine({ preview, exercise }: { preview: ProgressionPreview; exercise: WorkoutPlanExercise }) {
  const { first, last } = preview;

  // The preview was computed from the numbers as they were when the plan was
  // fetched. Change the squat from 60 to 80 and it still reads "W1 60 → W12
  // 87.5" — a prescription for a weight this exercise no longer carries,
  // sitting directly under the field that contradicts it. The parent re-reads
  // the ramp once the edit saves; until then, saying nothing beats saying
  // something wrong.
  const stale = (first.target_weight ?? null) !== (exercise.target_weight ?? null)
    || (first.reps ?? null) !== (exercise.reps ?? null)
    || (first.rpe ?? null) !== (exercise.rpe ?? null);
  if (stale) return null;

  // Which measure moved decides what to print. Nothing moved (a bodyweight
  // exercise under a weight rule, an exercise with no RPE under an RPE rule)
  // means there is no ramp to show, and a flat "60 → 60" is noise.
  const moved =
    first.target_weight !== last.target_weight ? { from: first.target_weight, to: last.target_weight, unit: 'kg' }
      : first.reps !== last.reps ? { from: first.reps, to: last.reps, unit: 'reps' }
        : first.rpe !== last.rpe ? { from: first.rpe, to: last.rpe, unit: 'RPE' }
          : null;
  if (!moved || moved.from == null || moved.to == null) return null;

  return (
    <div className="mt-2 flex items-center gap-1.5 text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
      <TrendingUp size={12} style={{ color: 'var(--brand)' }} />
      <span>
        W{first.week} {moved.from} → W{last.week}{' '}
        <span className="font-[800]" style={{ color: 'var(--text-primary)' }}>{moved.to}</span> {moved.unit}
      </span>
    </div>
  );
}

/** A parameter in a generated week: the same value, with nothing to type into. */
function StaticField({ spec, exercise }: { spec: FieldSpec; exercise: WorkoutPlanExercise }) {
  const v = exercise[spec.key as keyof WorkoutPlanExercise];
  const text = v === null || v === undefined || v === '' ? '—' : String(v);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {spec.label}
      </span>
      <div
        className="flex h-[44px] items-center justify-center gap-0.5 rounded-[12px] px-1.5"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
      >
        <span className="truncate text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>{text}</span>
        {spec.suffix && text !== '—' && (
          <span className="text-[10px] font-[600]" style={{ color: 'var(--text-muted)' }}>{spec.suffix}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Drop sets, stored in `config` rather than a column of its own.
 *
 * A toggle and a count, because that is the whole prescription: "after the
 * last working set, strip the weight and go again, twice". Everything past
 * that — how much to strip, whether to rest — is studio convention a trainer
 * writes in the notes, and a field per convention is how this card becomes the
 * spreadsheet it exists to replace.
 *
 * `config` is a loose JSON column (migration 136) precisely so a set method
 * ships without a migration; this is its first real use.
 */
function DropSetField({
  exercise, onCommit, readOnly,
}: { exercise: WorkoutPlanExercise; onCommit: (p: WorkoutExerciseInput) => void; readOnly?: boolean }) {
  const cfg = (exercise.config ?? {}) as Record<string, unknown>;
  const raw = Number(cfg.drop_sets);
  const drops = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;

  if (readOnly) {
    if (drops === 0) return null;
    return (
      <p className="pt-2 text-[11.5px] font-[650]" style={{ color: 'var(--text-muted)' }}>
        {drops} drop set{drops === 1 ? '' : 's'} after the last working set
      </p>
    );
  }

  // Writing the WHOLE config back, not just this key: `config` is one JSON
  // column, so a patch of `{ drop_sets: n }` replaces whatever else lives in
  // it. Spreading the current value keeps a future key from being erased by
  // a trainer toggling drop sets.
  const set = (n: number) => {
    const next = { ...cfg };
    if (n <= 0) delete next.drop_sets; else next.drop_sets = n;
    onCommit({ config: Object.keys(next).length === 0 ? null : next });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-3">
      <span className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Drop sets
      </span>
      <div className="flex gap-1.5" role="radiogroup" aria-label={`Drop sets for ${exercise.name}`}>
        {[0, 1, 2, 3].map((n) => {
          const active = n === drops;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set(n)}
              className="flex h-[44px] min-w-[44px] items-center justify-center rounded-[12px] px-2.5 text-[12.5px] font-[700]"
              style={{
                background: active ? 'var(--brand)' : 'var(--bg-subtle)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              {n === 0 ? 'None' : n}
            </button>
          );
        })}
      </div>
    </div>
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
      className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] transition-colors"
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
      {/*
        The unit sits BESIDE the input, not on top of it.

        It used to be an absolutely-positioned span over the input's right
        edge, which works only while the value is narrow. At 390px each of
        these four fields is about 70px wide, and a 1000 kg prescription
        rendered as "1000" with "kg" painted across the final zero — the
        number and its unit were unreadable together, which is the one thing
        the field has to do. Padding could not fix it: an overlay is outside
        the input's box, so no amount of padding stops the text reaching it.

        As a flex row the input genuinely ends before the unit, so a long
        value scrolls within its own box and can never collide.
      */}
      <div
        className="flex items-center overflow-hidden rounded-[12px]"
        style={inputStyle}
      >
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
          className="h-[44px] w-full min-w-0 flex-1 bg-transparent px-1.5 text-center text-[14px] font-[700] outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {spec.suffix && draft !== '' && (
          <span
            className="shrink-0 pr-2 text-[10px] font-[600]"
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
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (committed !== last.current) { last.current = committed; setDraft(committed); }
  }, [committed]);

  /**
   * Grow to fit the note.
   *
   * `rows={1}` with a 44px min-height clipped anything longer than two lines:
   * a three-line coaching cue rendered as 44px of box with 114px of text inside
   * it, cut off mid-word. `resize-y` was the escape hatch, but a phone has no
   * resize handle to drag, so on the device this screen is designed for the
   * rest of the note was simply unreachable. The note is the one field a
   * trainer writes prose into; it has to be readable without being edited.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(44, el.scrollHeight)}px`;
  }, [draft]);

  return (
    <textarea
      ref={ref}
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
      className="min-h-[44px] w-full resize-none overflow-hidden rounded-[12px] px-3 py-2.5 text-[13px] outline-none"
      style={inputStyle}
    />
  );
}
