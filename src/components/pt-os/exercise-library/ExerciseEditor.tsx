'use client';

import * as React from 'react';
import {
  X, Check, Loader2, AlertCircle, Plus, Trash2, Eye, ChevronLeft, Save,
} from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { ExerciseMeta, LibraryExercise } from '@/lib/api';
import { useStore } from '@tanstack/react-form';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  exerciseSchema, blankExercise, exerciseToFormValues, toExercisePayload,
  isExerciseDraft, EXERCISE_FIELD_HINTS, DIFFICULTY_OPTIONS,
  MOVEMENT_PATTERNS, PLANES,
  type ExerciseFormState,
} from '@/lib/forms/schemas/exercise';
import {
  TextField, TextAreaField, SelectField, NumberField, FormErrorBanner,
} from '@/components/ui/form';

/**
 * Create / edit an exercise.
 *
 * Three things this deliberately does:
 *
 *  1. Autosaves a draft to localStorage while creating. Authoring a proper
 *     exercise means writing cues, mistakes and safety notes — several minutes
 *     of typing. Losing that to a mistimed refresh is unacceptable, so the
 *     draft survives it.
 *  2. Checks the name against the server as you type. Duplicate detection
 *     after you hit save, when you have already written everything, is a
 *     worse experience than an inline warning at the top.
 *  3. Confirms before discarding unsaved edits, and only when there ARE
 *     unsaved edits — a confirmation on an untouched form trains people to
 *     click through confirmations.
 */

export interface ExerciseEditorProps {
  /** null = create mode. */
  exercise: LibraryExercise | null;
  meta: ExerciseMeta | null;
  onClose: () => void;
  onSaved: (ex: LibraryExercise, created: boolean) => void;
}

const DRAFT_KEY = '619:exercise-draft:v1';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function ExerciseEditor({
  exercise, meta, onClose, onSaved,
}: ExerciseEditorProps) {
  const { toast } = useToast();
  const isEdit = Boolean(exercise);

  const [saved, setSaved] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [nameCheck, setNameCheck] = React.useState<{
    state: 'idle' | 'checking' | 'ok' | 'taken';
    conflict?: string;
  }>({ state: 'idle' });

  const secondaryFromServer = React.useMemo(
    () => (exercise?.muscles || []).filter((m) => m.role === 'secondary').map((m) => m.slug),
    [exercise]
  );

  /**
   * The values this editor opens with.
   *
   * Computed once per exercise rather than written into state by an effect.
   * The effect version had to re-seed `form` AND `initial` in step, and the
   * dirty check compared the two — so a mis-ordered update made a freshly
   * opened form report itself as edited.
   */
  const initialValues = React.useMemo<ExerciseFormState>(() => {
    if (exercise) {
      const secondaryIds = (meta?.all_muscles || [])
        .filter((m) => secondaryFromServer.includes(m.slug))
        .map((m) => m.id!)
        .filter(Boolean);
      return exerciseToFormValues(exercise, secondaryIds);
    }

    // Create mode: restore an autosaved draft if one survived a refresh.
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // Shape-checked rather than cast. The draft comes out of localStorage,
        // and one written by an older version of this form — before a field
        // existed, or under its old name — produced `undefined` where a string
        // belongs, and then `undefined.trim()` on save.
        if (isExerciseDraft(parsed)) return parsed;
      }
    } catch { /* a corrupt draft is not worth failing the dialog over */ }

    return blankExercise();
  }, [exercise, meta, secondaryFromServer]);

  const f = useAppForm({
    schema: exerciseSchema,
    defaultValues: initialValues,
    fieldHints: EXERCISE_FIELD_HINTS,
    keepValuesOnSuccess: true,
    onSubmit: async (values) => {
      const payload = toExercisePayload(values);
      const res = isEdit
        ? await api.exercises.update(exercise!.id, payload)
        : await api.exercises.create(payload);

      setSaved(true);
      if (!isEdit) {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      }
      toast.success(isEdit ? 'Exercise updated' : `"${res.exercise.name}" added to the library`);

      // Let the success state land before the page changes — a form that
      // vanishes the instant you click save leaves you unsure it worked.
      setTimeout(() => {
        onSaved(res.exercise, !isEdit);
        onClose();
      }, 550);
    },
  });

  const { form, isSubmitting, isDirty } = f;
  const values = useStore(form.store, (s) => s.values);

  // A restored draft is worth saying out loud — otherwise a half-written
  // exercise appearing in a "new" form reads as a bug.
  const announcedDraft = React.useRef(false);
  React.useEffect(() => {
    if (isEdit || announcedDraft.current || !initialValues.name) return;
    announcedDraft.current = true;
    toast.info('Restored your unsaved draft');
  }, [isEdit, initialValues.name, toast]);

  // Autosave the draft — create mode only. Editing writes through the API, so
  // a local draft there would be a second, staler source of truth.
  React.useEffect(() => {
    if (isEdit || !isDirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)); } catch { /* quota */ }
    }, 800);
    return () => clearTimeout(t);
  }, [values, isEdit, isDirty]);

  // Live duplicate detection. Checking after save, when everything is already
  // written, is a worse experience than an inline warning at the top.
  React.useEffect(() => {
    const name = values.name.trim();
    if (name.length < 3) { setNameCheck({ state: 'idle' }); return; }
    if (isEdit && name === exercise?.name) { setNameCheck({ state: 'idle' }); return; }

    setNameCheck({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const res = await api.exercises.checkName(name, exercise?.id);
        setNameCheck(res.available
          ? { state: 'ok' }
          : { state: 'taken', conflict: res.conflict?.name });
      } catch {
        // A failed check is not a verdict. Leaving it idle means the server's
        // own uniqueness constraint decides at save, which it does regardless.
        setNameCheck({ state: 'idle' });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [values.name, isEdit, exercise?.id, exercise?.name]);

  const handleClose = React.useCallback(() => {
    if (isDirty && !saved) {
      const ok = window.confirm('Discard your unsaved changes to this exercise?');
      if (!ok) return;
    }
    onClose();
  }, [isDirty, saved, onClose]);

  const handleSave = React.useCallback(() => {
    // The duplicate check is advisory and lives outside the schema: it is a
    // server round trip, not a rule about the value, and a failed check must
    // not become a verdict. Blocking on a KNOWN conflict is still right —
    // the server would reject it anyway, after the user waited.
    if (nameCheck.state === 'taken') {
      toast.error('That name is already taken. Pick a different one.');
      return;
    }
    void f.submit();
  }, [f, nameCheck.state, toast]);

  // ⌘S / Ctrl+S saves, Esc closes. Both go through the same guarded submit as
  // the button — the previous version called a handler whose only protection
  // was a `saving` flag read from the render closure, so holding ⌘S posted
  // twice and created the exercise twice.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape' && !preview) {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleSave, handleClose, preview]);

  const muscles = React.useMemo(() => meta?.all_muscles ?? [], [meta]);
  const slug = slugify(values.name);

  // Memoised on `meta` rather than on the `?? []` expressions, which produce a
  // fresh array every render and would defeat the memo entirely.
  const muscleOptions = React.useMemo(
    () => (meta?.all_muscles ?? []).map((m) => ({ value: m.id!, label: `${m.body_region} · ${m.name}` })),
    [meta],
  );
  const equipmentOptions = React.useMemo(
    () => (meta?.all_equipment ?? []).map((q) => ({ value: q.id!, label: q.name })),
    [meta],
  );
  const categoryOptions = React.useMemo(
    () => (meta?.all_categories ?? []).map((c) => ({ value: c.id!, label: c.name })),
    [meta],
  );

  return (
    // A page, not a floating window. This form is long enough to scroll on a
    // laptop and much longer than a phone screen, and a modal that tall fights
    // the page behind it for the scroll: the browser keeps the body scrolled
    // where it was, the sheet has its own inner scroller, and on iOS the two
    // hand off unpredictably mid-drag. It also had no URL, so a half-written
    // exercise could not be linked, reloaded or recovered with Back.
    <main
      aria-label={isEdit ? `Edit ${exercise?.name}` : 'Create exercise'}
      className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4 sm:px-6"
    >
      <form
        noValidate
        onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4 dark:border-white/[0.07]">
          <div className="flex min-w-0 items-center gap-3">
            {preview && (
              <button
                type="button"
                onClick={() => setPreview(false)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Back to editing"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">
                {preview ? 'Preview' : isEdit ? 'Edit exercise' : 'New exercise'}
              </h2>
              {!preview && slug && (
                <p className="truncate font-mono text-[11px] text-[var(--text-muted)]">/{slug}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              aria-pressed={preview}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-primary)] dark:hover:bg-white/10"
            >
              <Eye size={13} /> {preview ? 'Edit' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {preview ? (
            <PreviewPane form={values} meta={meta} />
          ) : (
            <div className="space-y-6">
              <FormErrorBanner errors={f.errors} onRetry={handleSave} />

              <Fieldset title="Identity">
                <form.Field name="name">
                  {(field) => (
                    <div>
                      <TextField
                        field={field}
                        label="Exercise name"
                        required
                        placeholder="e.g. Landmine Squat"
                        maxLength={120}
                        showCount
                        serverError={
                          nameCheck.state === 'taken'
                            ? `"${nameCheck.conflict}" already exists. Pick a different name.`
                            : f.errors.fieldErrors.name
                        }
                        trailing={
                          <span className="pointer-events-none flex h-10 w-10 items-center justify-center">
                            {/* aria-hidden: the verdict is announced through the
                                live region below, where it is a sentence rather
                                than an icon. */}
                            <span aria-hidden>
                              {nameCheck.state === 'checking' && <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />}
                              {nameCheck.state === 'ok' && <Check size={14} className="text-[var(--success-text)]" />}
                              {nameCheck.state === 'taken' && <AlertCircle size={14} className="text-[var(--danger-text)]" />}
                            </span>
                          </span>
                        }
                      />
                      {/* The duplicate verdict arrives asynchronously while the
                          user is typing elsewhere, so it needs a live region:
                          nothing else on screen changes to announce it. */}
                      <p role="status" className="sr-only">
                        {nameCheck.state === 'ok' ? 'That name is available.'
                          : nameCheck.state === 'taken' ? `That name is already used by ${nameCheck.conflict}.`
                          : ''}
                      </p>
                    </div>
                  )}
                </form.Field>

                <form.Field name="description">
                  {(field) => (
                    <TextAreaField
                      field={field}
                      label="Description"
                      rows={2}
                      placeholder="What is this movement for?"
                      maxLength={1000}
                      serverError={f.errors.fieldErrors.description}
                    />
                  )}
                </form.Field>
              </Fieldset>

              <Fieldset title="Classification" columns>
                <form.Field name="primary_muscle_id">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Primary muscle"
                      required
                      options={muscleOptions}
                      placeholderOption="Select…"
                      serverError={f.errors.fieldErrors.primary_muscle_id}
                    />
                  )}
                </form.Field>

                <form.Field name="equipment_id">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Equipment"
                      options={[{ value: '', label: 'Select…' }, ...equipmentOptions]}
                      serverError={f.errors.fieldErrors.equipment_id}
                    />
                  )}
                </form.Field>

                <form.Field name="category_id">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Category"
                      options={[{ value: '', label: 'Select…' }, ...categoryOptions]}
                      serverError={f.errors.fieldErrors.category_id}
                    />
                  )}
                </form.Field>

                <form.Field name="difficulty">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Difficulty"
                      options={DIFFICULTY_OPTIONS}
                      serverError={f.errors.fieldErrors.difficulty}
                    />
                  )}
                </form.Field>

                <form.Field name="mechanic">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Mechanics"
                      options={[
                        { value: '', label: 'Unspecified' },
                        { value: 'compound', label: 'Compound' },
                        { value: 'isolation', label: 'Isolation' },
                      ]}
                    />
                  )}
                </form.Field>

                <form.Field name="force">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Force"
                      options={[
                        { value: '', label: 'Unspecified' },
                        { value: 'push', label: 'Push' },
                        { value: 'pull', label: 'Pull' },
                        { value: 'static', label: 'Static' },
                      ]}
                    />
                  )}
                </form.Field>

                <form.Field name="movement_pattern">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Movement pattern"
                      options={[
                        { value: '', label: 'Unspecified' },
                        ...MOVEMENT_PATTERNS.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                  )}
                </form.Field>

                <form.Field name="plane_of_motion">
                  {(field) => (
                    <SelectField
                      field={field}
                      label="Plane of motion"
                      options={[
                        { value: '', label: 'Unspecified' },
                        ...PLANES.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                  )}
                </form.Field>
              </Fieldset>

              <Fieldset title="Secondary muscles">
                <form.Field name="secondary_muscle_ids">
                  {(field) => (
                    <div className="flex flex-wrap gap-1.5">
                      {muscles.map((m) => {
                        const on = field.state.value.includes(m.id!);
                        const isPrimary = values.primary_muscle_id === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={isPrimary}
                            aria-pressed={on}
                            onClick={() => field.handleChange(on
                              ? field.state.value.filter((x) => x !== m.id)
                              : [...field.state.value, m.id!])}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                              on
                                ? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]'
                                : 'border-slate-200 text-[var(--text-muted)] hover:border-slate-300 dark:border-white/10',
                              isPrimary && 'cursor-not-allowed opacity-30',
                            )}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </form.Field>
              </Fieldset>

              <Fieldset title="Execution">
                <form.Field name="instructions">
                  {(field) => (
                    <TextAreaField
                      field={field}
                      label="Step-by-step instructions"
                      description="One step per line"
                      rows={5}
                      maxLength={4000}
                      showCount
                      placeholder={'Set up with the bar in a landmine attachment.\nBrace, then descend under control.'}
                      serverError={f.errors.fieldErrors.instructions}
                    />
                  )}
                </form.Field>
              </Fieldset>

              <Fieldset title="Coaching">
                {([
                  ['coaching_cues', 'Coaching cues', 'Chest tall, knees track over toes'],
                  ['common_mistakes', 'Common mistakes', 'Heels lifting off the floor'],
                  ['safety_tips', 'Safety tips', 'Do not round the lower back'],
                  ['contraindications', 'Contraindications', 'Acute lower-back pain'],
                ] as const).map(([name, label, placeholder]) => (
                  <form.Field key={name} name={name}>
                    {(field) => (
                      <ListField
                        label={label}
                        placeholder={placeholder}
                        value={field.state.value}
                        onChange={field.handleChange}
                      />
                    )}
                  </form.Field>
                ))}

                <form.Field name="breathing_tips">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Breathing"
                      placeholder="Inhale down, exhale on the drive up"
                      maxLength={500}
                      serverError={f.errors.fieldErrors.breathing_tips}
                    />
                  )}
                </form.Field>
              </Fieldset>

              <Fieldset title="Prescription" columns>
                <form.Field name="recommended_sets">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Sets"
                      placeholder="3-4"
                      description="Written the way you say it"
                      serverError={f.errors.fieldErrors.recommended_sets}
                    />
                  )}
                </form.Field>

                <form.Field name="recommended_reps">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Reps"
                      placeholder="8-12"
                      serverError={f.errors.fieldErrors.recommended_reps}
                    />
                  )}
                </form.Field>

                <form.Field name="rest_seconds">
                  {(field) => (
                    <NumberField
                      field={field}
                      label="Rest"
                      mode="integer"
                      suffix="sec"
                      placeholder="90"
                      description="5 to 1800"
                      serverError={f.errors.fieldErrors.rest_seconds}
                    />
                  )}
                </form.Field>

                <form.Field name="tempo_recommendation">
                  {(field) => (
                    <TextField
                      field={field}
                      label="Tempo"
                      placeholder="3-1-1-0"
                      serverError={f.errors.fieldErrors.tempo_recommendation}
                    />
                  )}
                </form.Field>
              </Fieldset>

              <Fieldset title="Notes">
                <form.Field name="beginner_notes">
                  {(field) => (
                    <TextAreaField field={field} label="Beginner notes" rows={2} maxLength={2000} />
                  )}
                </form.Field>
                <form.Field name="advanced_notes">
                  {(field) => (
                    <TextAreaField field={field} label="Advanced notes" rows={2} maxLength={2000} />
                  )}
                </form.Field>
                <form.Field name="trainer_notes">
                  {(field) => (
                    <TextAreaField
                      field={field}
                      label="Trainer notes"
                      description="Internal — never shown to clients"
                      rows={2}
                      maxLength={2000}
                    />
                  )}
                </form.Field>
              </Fieldset>

              <Fieldset title="Discovery">
                <form.Field name="tags">
                  {(field) => (
                    <TagField value={field.state.value} onChange={field.handleChange} />
                  )}
                </form.Field>
              </Fieldset>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-5 py-3.5 dark:border-white/[0.07]">
          <p className="hidden text-[11px] text-[var(--text-muted)] sm:block">
            {saved ? '' : isDirty && !isEdit ? 'Draft saved automatically' : ''}
            {!isDirty && !saved && 'No changes yet'}
          </p>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            {/* The real guard is the in-flight ref inside useAppForm; `disabled`
                only communicates the state, and is no longer gated on validity
                — a dead button cannot say WHY it is dead, and this form has
                twenty-four fields to look through. */}
            <Button type="submit" disabled={isSubmitting || saved}>
              {saved ? (
                <span className="flex items-center gap-1.5 animate-in zoom-in duration-200">
                  <Check size={14} /> Saved
                </span>
              ) : isSubmitting ? (
                <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Saving…</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save size={14} /> {isEdit ? 'Save changes' : 'Create exercise'}
                </span>
              )}
            </Button>
          </div>
        </footer>
      </form>
    </main>
  );
}

/* ── preview ─────────────────────────────────────────────────── */

function PreviewPane({ form, meta }: { form: ExerciseFormState; meta: ExerciseMeta | null }) {
  const muscle = meta?.all_muscles.find((m) => m.id === form.primary_muscle_id);
  const equip  = meta?.all_equipment.find((q) => q.id === form.equipment_id);
  const cat    = meta?.all_categories.find((c) => c.id === form.category_id);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">
          {form.name || 'Untitled exercise'}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {muscle?.name || 'No primary muscle'}{equip ? ` · ${equip.name}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone={form.difficulty === 'advanced' ? 'danger' : form.difficulty === 'intermediate' ? 'warning' : 'success'}>
          {form.difficulty}
        </Badge>
        {form.mechanic && <Badge tone={form.mechanic === 'compound' ? 'brand' : 'purple'}>{form.mechanic}</Badge>}
        {form.force && <Badge tone="info" className="capitalize">{form.force}</Badge>}
        {cat && <Badge tone="neutral">{cat.name}</Badge>}
        {form.movement_pattern && <Badge tone="neutral">{form.movement_pattern}</Badge>}
      </div>

      {form.description && <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{form.description}</p>}

      {form.instructions && (
        <PreviewBlock title="Execution">
          <ol className="space-y-1.5">
            {form.instructions.split('\n').filter(Boolean).map((s, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-[var(--text-primary)]">
                <span className="font-semibold text-[var(--brand)]">{i + 1}.</span>{s}
              </li>
            ))}
          </ol>
        </PreviewBlock>
      )}

      {form.coaching_cues.length > 0 && (
        <PreviewBlock title="Coaching cues">
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-[var(--text-primary)]">
            {form.coaching_cues.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </PreviewBlock>
      )}

      {form.common_mistakes.length > 0 && (
        <PreviewBlock title="Common mistakes">
          <ul className="list-disc space-y-1 pl-4 text-[13px] text-[var(--text-primary)]">
            {form.common_mistakes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </PreviewBlock>
      )}

      {(form.recommended_sets || form.recommended_reps) && (
        <PreviewBlock title="Prescription">
          <p className="text-[13px] text-[var(--text-primary)]">
            {form.recommended_sets || '—'} × {form.recommended_reps || '—'}
            {form.rest_seconds ? `, ${form.rest_seconds}s rest` : ''}
            {form.tempo_recommendation ? `, tempo ${form.tempo_recommendation}` : ''}
          </p>
        </PreviewBlock>
      )}
    </div>
  );
}

function PreviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</h4>
      {children}
    </div>
  );
}

/* ── form primitives ─────────────────────────────────────────── */

function inputCls(hasError: boolean) {
  return cn(
    'w-full rounded-xl border bg-white px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition-colors',
    'placeholder:text-slate-400 dark:bg-white/[0.04] dark:placeholder:text-white/25',
    hasError
      ? 'border-[var(--danger)]/50 focus:border-[var(--danger)]'
      : 'border-slate-200 focus:border-[var(--brand)]/50 focus:ring-2 focus:ring-[var(--brand)]/15 dark:border-white/10',
  );
}

function Fieldset({
  title, children, columns,
}: { title: string; children: React.ReactNode; columns?: boolean }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </legend>
      <div className={cn('gap-3', columns ? 'grid grid-cols-1 sm:grid-cols-2' : 'flex flex-col')}>
        {children}
      </div>
    </fieldset>
  );
}

/** Repeatable single-line list — Enter adds, and empties are never stored. */
function ListField({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = React.useState('');
  // Per instance, so four of these on one page do not share an id.
  const inputId = React.useId();

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  };

  return (
    <div>
      {/* A <label>, not a <span>. This caption names the composer box below it,
          and a span names nothing — the box's only accessible name was its
          placeholder, which disappears the moment anything is typed. */}
      <label htmlFor={inputId} className="mb-1 block text-[12px] font-medium text-[var(--text-primary)]">{label}</label>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] dark:bg-white/[0.04]">
              <span className="flex-1">{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(value.filter((_, x) => x !== i))}
                className="shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--danger-text)]"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className={inputCls(false)}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          aria-label={`Add to ${label}`}
          className="shrink-0 rounded-xl border border-slate-200 px-2.5 text-[var(--text-muted)] transition-colors hover:border-[var(--brand)]/40 hover:text-[var(--brand)] disabled:opacity-40 dark:border-white/10"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function TagField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = React.useState('');
  const inputId = React.useId();
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (!v || value.includes(v)) { setDraft(''); return; }
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-[12px] font-medium text-[var(--text-primary)]">Tags</label>
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--brand)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--brand)]">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <input
        id={inputId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
        }}
        placeholder="Add a tag and press Enter"
        className={cn(inputCls(false), 'mt-2')}
      />
    </div>
  );
}
