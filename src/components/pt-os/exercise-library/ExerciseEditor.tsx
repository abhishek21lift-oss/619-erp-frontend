'use client';

import * as React from 'react';
import {
  X, Check, Loader2, AlertCircle, Plus, Trash2, Eye, ChevronLeft, Save,
} from 'lucide-react';
import { Badge, Button, cn } from '@/components/ui';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { ExerciseMeta, LibraryExercise } from '@/lib/api';

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

interface FormState {
  name: string;
  description: string;
  primary_muscle_id: string;
  secondary_muscle_ids: string[];
  equipment_id: string;
  category_id: string;
  difficulty: string;
  mechanic: string;
  force: string;
  movement_pattern: string;
  plane_of_motion: string;
  instructions: string;
  coaching_cues: string[];
  common_mistakes: string[];
  safety_tips: string[];
  contraindications: string[];
  breathing_tips: string;
  tempo_recommendation: string;
  recommended_sets: string;
  recommended_reps: string;
  rest_seconds: string;
  beginner_notes: string;
  advanced_notes: string;
  trainer_notes: string;
  tags: string[];
}

const BLANK: FormState = {
  name: '', description: '', primary_muscle_id: '', secondary_muscle_ids: [],
  equipment_id: '', category_id: '', difficulty: 'beginner', mechanic: '', force: '',
  movement_pattern: '', plane_of_motion: '', instructions: '',
  coaching_cues: [], common_mistakes: [], safety_tips: [], contraindications: [],
  breathing_tips: '', tempo_recommendation: '', recommended_sets: '', recommended_reps: '',
  rest_seconds: '', beginner_notes: '', advanced_notes: '', trainer_notes: '',
  tags: [],
};

const DRAFT_KEY = '619:exercise-draft:v1';

const MOVEMENT_PATTERNS = [
  'Squat', 'Hinge', 'Lunge', 'Horizontal Push', 'Vertical Push',
  'Horizontal Pull', 'Vertical Pull', 'Carry', 'Rotation',
  'Anti-Extension', 'Trunk Flexion', 'Isolation', 'Mobility', 'Locomotion', 'General',
];
const PLANES = ['Sagittal', 'Frontal', 'Transverse'];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function fromExercise(ex: LibraryExercise): FormState {
  return {
    name: ex.name || '',
    description: ex.description || '',
    primary_muscle_id: ex.primary_muscle_id || '',
    secondary_muscle_ids: [],
    equipment_id: ex.equipment_id || '',
    category_id: ex.category_id || '',
    difficulty: ex.difficulty || 'beginner',
    mechanic: ex.mechanic || '',
    force: ex.force || '',
    movement_pattern: ex.movement_pattern || '',
    plane_of_motion: ex.plane_of_motion || '',
    instructions: ex.instructions || '',
    coaching_cues: ex.coaching_cues || [],
    common_mistakes: ex.common_mistakes || [],
    safety_tips: ex.safety_tips || [],
    contraindications: ex.contraindications || [],
    breathing_tips: ex.breathing_tips || '',
    tempo_recommendation: ex.tempo_recommendation || '',
    recommended_sets: ex.recommended_sets || '',
    recommended_reps: ex.recommended_reps || '',
    rest_seconds: ex.rest_seconds != null ? String(ex.rest_seconds) : '',
    beginner_notes: ex.beginner_notes || '',
    advanced_notes: ex.advanced_notes || '',
    trainer_notes: ex.trainer_notes || '',
    tags: ex.tags || [],
  };
}

export function ExerciseEditor({
  exercise, meta, onClose, onSaved,
}: ExerciseEditorProps) {
  const { toast } = useToast();
  const isEdit = Boolean(exercise);

  const [form, setForm] = React.useState<FormState>(BLANK);
  const [initial, setInitial] = React.useState<FormState>(BLANK);
  const [saving, setSaving] = React.useState(false);
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

  // Seed the form. On create, restore an autosaved draft if one survived.
  React.useEffect(() => {
    setSaved(false);
    setPreview(false);
    setNameCheck({ state: 'idle' });

    if (exercise) {
      const secondaryIds = (meta?.all_muscles || [])
        .filter((m) => secondaryFromServer.includes(m.slug))
        .map((m) => m.id!)
        .filter(Boolean);
      const seeded = { ...fromExercise(exercise), secondary_muscle_ids: secondaryIds };
      setForm(seeded);
      setInitial(seeded);
      return;
    }

    let draft: FormState | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) draft = JSON.parse(raw) as FormState;
    } catch { /* a corrupt draft is not worth failing the dialog over */ }

    setForm(draft || BLANK);
    setInitial(BLANK);
    if (draft?.name) toast.info('Restored your unsaved draft');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, meta]);

  const dirty = React.useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial]
  );

  // Autosave the draft — create mode only. Editing writes through the API, so
  // a local draft there would be a second, staler source of truth.
  React.useEffect(() => {
    if (isEdit || !dirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* quota */ }
    }, 800);
    return () => clearTimeout(t);
  }, [form, isEdit, dirty]);

  // Live duplicate detection.
  React.useEffect(() => {
    const name = form.name.trim();
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
        setNameCheck({ state: 'idle' });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.name, isEdit, exercise?.id, exercise?.name]);

  const set = React.useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
  }, []);

  const errors = React.useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    else if (form.name.trim().length > 120) e.name = 'Name must be 120 characters or fewer';
    if (!form.primary_muscle_id) e.primary_muscle_id = 'Pick the primary muscle';
    if (form.rest_seconds && Number.isNaN(Number(form.rest_seconds))) e.rest_seconds = 'Must be a number';
    return e;
  }, [form]);

  const valid = Object.keys(errors).length === 0 && nameCheck.state !== 'taken';

  const handleClose = React.useCallback(() => {
    if (dirty && !saved) {
      const ok = window.confirm('Discard your unsaved changes to this exercise?');
      if (!ok) return;
    }
    onClose();
  }, [dirty, saved, onClose]);

  const handleSave = React.useCallback(async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        primary_muscle_id: form.primary_muscle_id || null,
        secondary_muscle_ids: form.secondary_muscle_ids,
        equipment_id: form.equipment_id || null,
        category_id: form.category_id || null,
        difficulty: form.difficulty,
        mechanic: form.mechanic || null,
        force: form.force || null,
        movement_pattern: form.movement_pattern || null,
        plane_of_motion: form.plane_of_motion || null,
        instructions: form.instructions.trim() || null,
        coaching_cues: form.coaching_cues,
        common_mistakes: form.common_mistakes,
        safety_tips: form.safety_tips,
        contraindications: form.contraindications,
        breathing_tips: form.breathing_tips.trim() || null,
        tempo_recommendation: form.tempo_recommendation.trim() || null,
        recommended_sets: form.recommended_sets.trim() || null,
        recommended_reps: form.recommended_reps.trim() || null,
        rest_seconds: form.rest_seconds ? Number(form.rest_seconds) : null,
        beginner_notes: form.beginner_notes.trim() || null,
        advanced_notes: form.advanced_notes.trim() || null,
        trainer_notes: form.trainer_notes.trim() || null,
        tags: form.tags,
      };

      const res = isEdit
        ? await api.exercises.update(exercise!.id, payload)
        : await api.exercises.create(payload);

      setSaved(true);
      if (!isEdit) {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      }
      toast.success(isEdit ? 'Exercise updated' : `"${res.exercise.name}" added to the library`);

      // Let the success state land before the dialog closes — a form that
      // vanishes the instant you click save leaves you unsure it worked.
      setTimeout(() => {
        onSaved(res.exercise, !isEdit);
        onClose();
      }, 550);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save exercise');
    } finally {
      setSaving(false);
    }
  }, [valid, saving, form, isEdit, exercise, toast, onSaved, onClose]);

  // ⌘S / Ctrl+S saves, Esc closes.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      } else if (e.key === 'Escape' && !preview) {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleSave, handleClose, preview]);


  const muscles    = meta?.all_muscles || [];
  const equipment  = meta?.all_equipment || [];
  const categories = meta?.all_categories || [];
  const slug = slugify(form.name);

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
      <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
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
            <PreviewPane form={form} meta={meta} />
          ) : (
            <div className="space-y-6">
              <Fieldset title="Identity">
                <Field label="Exercise name" required error={errors.name}>
                  <div className="relative">
                    <input
                      autoFocus
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g. Landmine Squat"
                      maxLength={140}
                      className={inputCls(Boolean(errors.name) || nameCheck.state === 'taken')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {nameCheck.state === 'checking' && <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />}
                      {nameCheck.state === 'ok' && <Check size={14} className="text-[var(--success)]" />}
                      {nameCheck.state === 'taken' && <AlertCircle size={14} className="text-[var(--danger)]" />}
                    </span>
                  </div>
                  {nameCheck.state === 'taken' && (
                    <p className="mt-1.5 text-[11.5px] text-[var(--danger)]">
                      &ldquo;{nameCheck.conflict}&rdquo; already exists. Pick a different name.
                    </p>
                  )}
                </Field>

                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={2}
                    placeholder="What is this movement for?"
                    className={inputCls(false)}
                  />
                </Field>
              </Fieldset>

              <Fieldset title="Classification" columns>
                <Field label="Primary muscle" required error={errors.primary_muscle_id}>
                  <select
                    value={form.primary_muscle_id}
                    onChange={(e) => set('primary_muscle_id', e.target.value)}
                    className={inputCls(Boolean(errors.primary_muscle_id))}
                  >
                    <option value="">Select…</option>
                    {muscles.map((m) => (
                      <option key={m.id} value={m.id}>{m.body_region} · {m.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Equipment">
                  <select
                    value={form.equipment_id}
                    onChange={(e) => set('equipment_id', e.target.value)}
                    className={inputCls(false)}
                  >
                    <option value="">Select…</option>
                    {equipment.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
                  </select>
                </Field>

                <Field label="Category">
                  <select
                    value={form.category_id}
                    onChange={(e) => set('category_id', e.target.value)}
                    className={inputCls(false)}
                  >
                    <option value="">Select…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>

                <Field label="Difficulty">
                  <select
                    value={form.difficulty}
                    onChange={(e) => set('difficulty', e.target.value)}
                    className={inputCls(false)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </Field>

                <Field label="Mechanics">
                  <select value={form.mechanic} onChange={(e) => set('mechanic', e.target.value)} className={inputCls(false)}>
                    <option value="">Unspecified</option>
                    <option value="compound">Compound</option>
                    <option value="isolation">Isolation</option>
                  </select>
                </Field>

                <Field label="Force">
                  <select value={form.force} onChange={(e) => set('force', e.target.value)} className={inputCls(false)}>
                    <option value="">Unspecified</option>
                    <option value="push">Push</option>
                    <option value="pull">Pull</option>
                    <option value="static">Static</option>
                  </select>
                </Field>

                <Field label="Movement pattern">
                  <select value={form.movement_pattern} onChange={(e) => set('movement_pattern', e.target.value)} className={inputCls(false)}>
                    <option value="">Unspecified</option>
                    {MOVEMENT_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>

                <Field label="Plane of motion">
                  <select value={form.plane_of_motion} onChange={(e) => set('plane_of_motion', e.target.value)} className={inputCls(false)}>
                    <option value="">Unspecified</option>
                    {PLANES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </Fieldset>

              <Fieldset title="Secondary muscles">
                <div className="flex flex-wrap gap-1.5">
                  {muscles.map((m) => {
                    const on = form.secondary_muscle_ids.includes(m.id!);
                    const isPrimary = form.primary_muscle_id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={isPrimary}
                        onClick={() => set('secondary_muscle_ids', on
                          ? form.secondary_muscle_ids.filter((x) => x !== m.id)
                          : [...form.secondary_muscle_ids, m.id!])}
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
              </Fieldset>

              <Fieldset title="Execution">
                <Field label="Step-by-step instructions" hint="One step per line">
                  <textarea
                    value={form.instructions}
                    onChange={(e) => set('instructions', e.target.value)}
                    rows={5}
                    placeholder={'Set up with the bar in a landmine attachment.\nBrace, then descend under control.'}
                    className={inputCls(false)}
                  />
                </Field>
              </Fieldset>

              <Fieldset title="Coaching">
                <ListField label="Coaching cues" placeholder="Chest tall, knees track over toes" value={form.coaching_cues} onChange={(v) => set('coaching_cues', v)} />
                <ListField label="Common mistakes" placeholder="Heels lifting off the floor" value={form.common_mistakes} onChange={(v) => set('common_mistakes', v)} />
                <ListField label="Safety tips" placeholder="Do not round the lower back" value={form.safety_tips} onChange={(v) => set('safety_tips', v)} />
                <ListField label="Contraindications" placeholder="Acute lower-back pain" value={form.contraindications} onChange={(v) => set('contraindications', v)} />

                <Field label="Breathing">
                  <input value={form.breathing_tips} onChange={(e) => set('breathing_tips', e.target.value)} placeholder="Inhale down, exhale on the drive up" className={inputCls(false)} />
                </Field>
              </Fieldset>

              <Fieldset title="Prescription" columns>
                <Field label="Sets"><input value={form.recommended_sets} onChange={(e) => set('recommended_sets', e.target.value)} placeholder="3-4" className={inputCls(false)} /></Field>
                <Field label="Reps"><input value={form.recommended_reps} onChange={(e) => set('recommended_reps', e.target.value)} placeholder="8-12" className={inputCls(false)} /></Field>
                <Field label="Rest (seconds)" error={errors.rest_seconds}>
                  <input value={form.rest_seconds} onChange={(e) => set('rest_seconds', e.target.value)} placeholder="90" inputMode="numeric" className={inputCls(Boolean(errors.rest_seconds))} />
                </Field>
                <Field label="Tempo"><input value={form.tempo_recommendation} onChange={(e) => set('tempo_recommendation', e.target.value)} placeholder="3-1-1-0" className={inputCls(false)} /></Field>
              </Fieldset>

              <Fieldset title="Notes">
                <Field label="Beginner notes">
                  <textarea value={form.beginner_notes} onChange={(e) => set('beginner_notes', e.target.value)} rows={2} className={inputCls(false)} />
                </Field>
                <Field label="Advanced notes">
                  <textarea value={form.advanced_notes} onChange={(e) => set('advanced_notes', e.target.value)} rows={2} className={inputCls(false)} />
                </Field>
                <Field label="Trainer notes" hint="Internal — never shown to clients">
                  <textarea value={form.trainer_notes} onChange={(e) => set('trainer_notes', e.target.value)} rows={2} className={inputCls(false)} />
                </Field>
              </Fieldset>

              <Fieldset title="Discovery">
                <TagField value={form.tags} onChange={(v) => set('tags', v)} />
              </Fieldset>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-5 py-3.5 dark:border-white/[0.07]">
          <p className="hidden text-[11px] text-[var(--text-muted)] sm:block">
            {saved ? '' : dirty && !isEdit ? 'Draft saved automatically' : ''}
            {!dirty && !saved && 'No changes yet'}
          </p>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={!valid || saving || saved}>
              {saved ? (
                <span className="flex items-center gap-1.5 animate-in zoom-in duration-200">
                  <Check size={14} /> Saved
                </span>
              ) : saving ? (
                <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Saving…</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save size={14} /> {isEdit ? 'Save changes' : 'Create exercise'}
                </span>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ── preview ─────────────────────────────────────────────────── */

function PreviewPane({ form, meta }: { form: FormState; meta: ExerciseMeta | null }) {
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

function Field({
  label, children, required, error, hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[var(--text-primary)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-[var(--danger)]">{error}</span>}
    </label>
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

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft('');
  };

  return (
    <div>
      <span className="mb-1 block text-[12px] font-medium text-[var(--text-primary)]">{label}</span>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] dark:bg-white/[0.04]">
              <span className="flex-1">{item}</span>
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(value.filter((_, x) => x !== i))}
                className="shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
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
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (!v || value.includes(v)) { setDraft(''); return; }
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <div>
      <span className="mb-1 block text-[12px] font-medium text-[var(--text-primary)]">Tags</span>
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
