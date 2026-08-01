'use client';

// Create or edit a custom exercise.
//
// The old modal showed a dozen fields and only actually saved two of them
// (name and instructions) — everything else was read-only display wired to
// nothing. This one is generated from a single field spec, so a field that
// appears is a field that saves; there is no way for the two to drift.
//
// Grouped into sections because thirty inputs in one column is not a form
// anyone finishes. Only Basics is expanded initially: a trainer adding
// "Landmine Squat" in ten seconds should not have to scroll past
// contraindications to reach Save.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Loader2, Check, AlertTriangle, ChevronDown, Sparkles, Link2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { LibraryExercise, ExerciseMeta } from '@/lib/api/types';
import { cn } from '@/components/ui/cn';

type FieldKind = 'text' | 'textarea' | 'select' | 'number' | 'tags';

interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  hint?: string;
  options?: string[];
  /** Free-text with suggestions, rather than a closed list. */
  datalist?: keyof ExerciseMeta;
  rows?: number;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  fields: FieldSpec[];
}

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body', 'Neck', 'Olympic'];
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const CATEGORIES = ['Strength', 'Cardio', 'Flexibility', 'Plyometric', 'Olympic', 'Powerlifting', 'Strongman', 'Rehab', 'Mobility'];
const PATTERNS = ['Squat', 'Hinge', 'Push', 'Pull', 'Carry', 'Core', 'Rotation', 'Lunge', 'Gait'];
const PLANES = ['Sagittal', 'Frontal', 'Transverse', 'Multi-planar'];
const MECHANICS = ['compound', 'isolation'];
const FORCES = ['push', 'pull', 'static'];

const SECTIONS: Section[] = [
  {
    id: 'basics',
    title: 'Basics',
    description: 'The minimum needed to save. Everything else can wait.',
    fields: [
      { key: 'name', label: 'Exercise name', kind: 'text', placeholder: 'e.g. Landmine Squat' },
      { key: 'muscle_group', label: 'Primary muscle group', kind: 'select', options: MUSCLE_GROUPS },
      { key: 'target_muscle', label: 'Target muscle', kind: 'text', datalist: 'target_muscles', placeholder: 'e.g. quadriceps' },
      { key: 'secondary_muscles', label: 'Secondary muscles', kind: 'text', placeholder: 'e.g. glutes, core' },
      { key: 'equipment', label: 'Equipment', kind: 'text', datalist: 'equipment_types', placeholder: 'e.g. Barbell' },
      { key: 'difficulty', label: 'Difficulty', kind: 'select', options: DIFFICULTIES },
      { key: 'category', label: 'Category', kind: 'select', options: CATEGORIES },
      { key: 'description', label: 'Short description', kind: 'textarea', rows: 2, placeholder: 'One line a trainer would recognise it by.' },
    ],
  },
  {
    id: 'classification',
    title: 'Classification',
    description: 'Drives the compound/isolation and push/pull filters.',
    fields: [
      { key: 'mechanic', label: 'Mechanics', kind: 'select', options: MECHANICS, hint: 'Compound works multiple joints; isolation works one.' },
      { key: 'force', label: 'Force type', kind: 'select', options: FORCES },
      { key: 'movement_pattern', label: 'Movement pattern', kind: 'select', options: PATTERNS },
      { key: 'plane_of_motion', label: 'Plane of motion', kind: 'select', options: PLANES },
      { key: 'exercise_type', label: 'Exercise type', kind: 'text', datalist: 'exercise_types', placeholder: 'e.g. strength' },
    ],
  },
  {
    id: 'coaching',
    title: 'Coaching',
    description: 'What you would say standing next to the client.',
    fields: [
      { key: 'instructions', label: 'Instructions', kind: 'textarea', rows: 4, placeholder: 'Step by step, one per line.' },
      { key: 'coaching_cues', label: 'Coaching cues', kind: 'textarea', rows: 3, placeholder: '"Chest tall", "drive through midfoot"…' },
      { key: 'common_mistakes', label: 'Common mistakes', kind: 'textarea', rows: 3 },
      { key: 'breathing_tips', label: 'Breathing', kind: 'textarea', rows: 2 },
      { key: 'beginner_notes', label: 'Notes for beginners', kind: 'textarea', rows: 2 },
      { key: 'advanced_notes', label: 'Notes for advanced clients', kind: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'safety',
    title: 'Safety',
    description: 'Surfaced prominently on the exercise detail view.',
    fields: [
      { key: 'safety_tips', label: 'Safety tips', kind: 'textarea', rows: 3 },
      { key: 'contraindications', label: 'Contraindications', kind: 'textarea', rows: 3, hint: 'Conditions or injuries where this should be avoided.' },
    ],
  },
  {
    id: 'prescription',
    title: 'Default prescription',
    description: 'Pre-fills the builder when this exercise is added to a plan.',
    fields: [
      { key: 'sets_default', label: 'Sets', kind: 'number', placeholder: '3' },
      { key: 'reps_default', label: 'Reps', kind: 'number', placeholder: '10' },
      { key: 'rest_seconds', label: 'Rest (seconds)', kind: 'number', placeholder: '90' },
      { key: 'tempo_recommendation', label: 'Tempo', kind: 'text', placeholder: 'e.g. 3-1-1-0', hint: 'Eccentric-pause-concentric-pause. X means explosive.' },
    ],
  },
  {
    id: 'discovery',
    title: 'Discovery & notes',
    fields: [
      { key: 'tags', label: 'Tags', kind: 'tags', placeholder: 'unilateral, rehab, warm-up', hint: 'Comma separated. Filterable in the library.' },
      { key: 'search_keywords', label: 'Extra search terms', kind: 'tags', placeholder: 'hack squat, machine squat', hint: 'Alternate names people might search for. The obvious ones are added automatically.' },
      { key: 'trainer_notes', label: 'Trainer notes', kind: 'textarea', rows: 3, hint: 'Internal — for your team, not the client.' },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const DRAFT_KEY = '619_exercise_draft';

type FormState = Record<string, string>;

function toFormState(ex?: LibraryExercise | null): FormState {
  const s: FormState = {};
  for (const f of ALL_FIELDS) {
    const v = ex ? (ex as unknown as Record<string, unknown>)[f.key] : undefined;
    s[f.key] = v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v);
  }
  if (!ex) {
    s.difficulty = s.difficulty || 'beginner';
    s.muscle_group = s.muscle_group || 'Chest';
    s.category = s.category || 'Strength';
  }
  return s;
}

export interface ExerciseFormModalProps {
  open: boolean;
  /** Null = create. */
  exercise?: LibraryExercise | null;
  meta?: ExerciseMeta | null;
  onClose: () => void;
  onSaved: (e: LibraryExercise) => void;
}

export default function ExerciseFormModal({
  open, exercise, meta, onClose, onSaved,
}: ExerciseFormModalProps) {
  const { toast } = useToast();
  const isEdit = !!exercise;

  const [form, setForm] = useState<FormState>(() => toFormState(exercise));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ basics: true });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nameCheck, setNameCheck] = useState<{ state: 'idle' | 'checking' | 'ok' | 'taken'; slug?: string; existing?: string }>({ state: 'idle' });
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Reset whenever the modal is opened for a different exercise; without this
  // the previous exercise's values persist into the next open.
  useEffect(() => {
    if (!open) return;
    setForm(toFormState(exercise));
    setErrors({});
    setNameCheck({ state: 'idle' });
    setDirty(false);
    setShowPreview(false);
    setOpenSections({ basics: true });
    const t = setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, exercise]);

  // Restore an interrupted draft — only for create, and only if the user has
  // not started typing something else. Restoring over an edit would silently
  // overwrite the saved exercise's real values.
  useEffect(() => {
    if (!open || isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as FormState;
      if (draft?.name?.trim()) {
        setForm((f) => ({ ...f, ...draft }));
        setDirty(true);
        toast.info('Restored your unsaved draft.');
      }
    } catch { /* a corrupt draft is not worth surfacing */ }
  }, [open, isEdit, toast]);

  useEffect(() => {
    if (!open || isEdit || !dirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* quota */ }
    }, 600);
    return () => clearTimeout(t);
  }, [form, open, isEdit, dirty]);

  const set = useCallback((key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
  }, []);

  // Duplicate-name detection, debounced. The unique index is the real
  // authority — this just means the user finds out while typing rather than
  // when they press Save.
  useEffect(() => {
    const name = form.name?.trim();
    if (!open || !name) { setNameCheck({ state: 'idle' }); return; }
    if (isEdit && name.toLowerCase() === exercise?.name.toLowerCase()) {
      setNameCheck({ state: 'idle' });
      return;
    }
    setNameCheck({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const r = await api.exercises.checkName(name, exercise?.id);
        setNameCheck(r.available
          ? { state: 'ok', slug: r.slug }
          : { state: 'taken', existing: r.existing?.name });
      } catch { setNameCheck({ state: 'idle' }); }
    }, 400);
    return () => clearTimeout(t);
  }, [form.name, open, isEdit, exercise?.id, exercise?.name]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'A name is required';
    else if (form.name.trim().length > 160) e.name = 'Keep the name under 160 characters';
    for (const k of ['sets_default', 'reps_default', 'rest_seconds']) {
      if (form[k] && (!/^\d+$/.test(form[k]) || Number(form[k]) > 10000)) e[k] = 'Enter a whole number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const payload = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const f of ALL_FIELDS) {
      const v = form[f.key];
      if (f.kind === 'number') out[f.key] = v === '' ? null : Number(v);
      else if (f.kind === 'tags') out[f.key] = v.split(',').map((s) => s.trim()).filter(Boolean);
      else out[f.key] = v === '' ? null : v;
    }
    return out;
  }, [form]);

  const save = useCallback(async () => {
    if (!validate()) {
      setOpenSections((s) => ({ ...s, basics: true }));
      toast.error('Please correct the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const r = isEdit
        ? await api.exercises.update(exercise!.id, payload)
        : await api.exercises.create(payload);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      toast.success(isEdit ? 'Exercise updated.' : `"${r.data.name}" added to your library.`);
      setDirty(false);
      onSaved(r.data);
      onClose();
    } catch (err) {
      const e = err as { status?: number; payload?: { error?: { field?: string; message?: string; fields?: Record<string, string> } } };
      const apiErr = e.payload?.error;
      if (apiErr?.fields) setErrors(apiErr.fields);
      else if (apiErr?.field) setErrors({ [apiErr.field]: apiErr.message || 'Invalid' });
      toast.error(apiErr?.message || (err instanceof Error ? err.message : 'Could not save the exercise'));
    } finally {
      setSaving(false);
    }
  }, [validate, isEdit, exercise, payload, toast, onSaved, onClose]);

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm('Discard your changes to this exercise?')) return;
    onClose();
  }, [dirty, onClose]);

  // Cmd/Ctrl+Enter saves, Escape closes — the two shortcuts anyone tries.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, requestClose, save]);

  if (!open) return null;

  const metaOptions = (key?: keyof ExerciseMeta): string[] => {
    if (!key || !meta) return [];
    const v = meta[key];
    return Array.isArray(v) ? (v as string[]) : [];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit exercise' : 'Create exercise'}
    >
      <div
        className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-t-[20px] sm:rounded-[20px]"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-modal, 0 24px 64px rgba(0,0,0,0.35))' }}
      >
        <header className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white"
            style={{ background: 'linear-gradient(145deg,#8B5CF6,#6D28D9)' }}
          >
            <Sparkles size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-[820] leading-tight" style={{ color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit exercise' : 'New custom exercise'}
            </h2>
            <p className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              {isEdit ? exercise?.name : 'Only Basics is required — the rest can be filled in later.'}
            </p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Close" className="rounded-lg p-1.5" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {showPreview ? (
            <Preview form={form} />
          ) : (
            SECTIONS.map((section) => {
              const isOpen = openSections[section.id];
              const sectionHasError = section.fields.some((f) => errors[f.key]);
              return (
                <section key={section.id} className="mb-3 rounded-[12px]" style={{ border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setOpenSections((s) => ({ ...s, [section.id]: !s[section.id] }))}
                    className="flex w-full items-center gap-2 px-3.5 py-3 text-left"
                    aria-expanded={!!isOpen}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                        {section.title}
                      </span>
                      {sectionHasError && (
                        <span className="ml-2 text-[11px] font-[700]" style={{ color: 'var(--danger)' }}>needs attention</span>
                      )}
                      {section.description && !isOpen && (
                        <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{section.description}</p>
                      )}
                    </div>
                    <ChevronDown size={16} className={cn('shrink-0 transition', isOpen && 'rotate-180')} style={{ color: 'var(--text-muted)' }} />
                  </button>

                  {isOpen && (
                    <div className="grid grid-cols-1 gap-3 px-3.5 pb-4 sm:grid-cols-2">
                      {section.fields.map((f) => (
                        <Field
                          key={f.key}
                          spec={f}
                          value={form[f.key] ?? ''}
                          error={errors[f.key]}
                          onChange={(v) => set(f.key, v)}
                          inputRef={f.key === 'name' ? firstFieldRef : undefined}
                          suggestions={metaOptions(f.datalist)}
                          nameStatus={f.key === 'name' ? nameCheck : undefined}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="rounded-[10px] px-3 py-2 text-[12.5px] font-[700]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
          >
            {showPreview ? 'Back to form' : 'Preview'}
          </button>
          <span className="ml-auto hidden text-[11px] sm:inline" style={{ color: 'var(--text-disabled)' }}>
            ⌘/Ctrl + Enter to save
          </span>
          <button type="button" onClick={requestClose} className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-[700]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || nameCheck.state === 'taken'}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] px-4 text-[12.5px] font-[750] text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isEdit ? 'Save changes' : 'Create exercise'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  spec, value, error, onChange, inputRef, suggestions, nameStatus,
}: {
  spec: FieldSpec;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  suggestions?: string[];
  nameStatus?: { state: string; slug?: string; existing?: string };
}) {
  const listId = suggestions?.length ? `dl-${spec.key}` : undefined;
  const wide = spec.kind === 'textarea' || spec.key === 'name';

  const base = {
    width: '100%',
    background: 'var(--bg-subtle)',
    border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
    color: 'var(--text-primary)',
    borderRadius: 10,
    padding: '9px 11px',
    fontSize: 13,
    outline: 'none',
  } as const;

  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <label htmlFor={`f-${spec.key}`} className="mb-1 block text-[11.5px] font-[700]" style={{ color: 'var(--text-secondary)' }}>
        {spec.label}
      </label>

      {spec.kind === 'textarea' ? (
        <textarea id={`f-${spec.key}`} rows={spec.rows ?? 3} value={value} placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)} style={{ ...base, resize: 'vertical' }} />
      ) : spec.kind === 'select' ? (
        <select id={`f-${spec.key}`} value={value} onChange={(e) => onChange(e.target.value)} style={base}>
          <option value="">—</option>
          {spec.options?.map((o) => <option key={o} value={o} className="capitalize">{o}</option>)}
        </select>
      ) : (
        <>
          <input
            id={`f-${spec.key}`}
            ref={inputRef}
            type={spec.kind === 'number' ? 'text' : 'text'}
            inputMode={spec.kind === 'number' ? 'numeric' : undefined}
            value={value}
            placeholder={spec.placeholder}
            list={listId}
            onChange={(e) => onChange(e.target.value)}
            style={base}
          />
          {listId && (
            <datalist id={listId}>
              {suggestions!.slice(0, 200).map((s) => <option key={s} value={s} />)}
            </datalist>
          )}
        </>
      )}

      {nameStatus?.state === 'checking' && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>Checking availability…</p>
      )}
      {nameStatus?.state === 'ok' && (
        <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: '#059669' }}>
          <Check size={11} /> Available · <Link2 size={10} /> {nameStatus.slug}
        </p>
      )}
      {nameStatus?.state === 'taken' && (
        <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: 'var(--danger)' }}>
          <AlertTriangle size={11} /> &ldquo;{nameStatus.existing}&rdquo; already exists in your library
        </p>
      )}
      {error && <p className="mt-1 text-[11px]" style={{ color: 'var(--danger)' }}>{error}</p>}
      {!error && spec.hint && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-disabled)' }}>{spec.hint}</p>
      )}
    </div>
  );
}

/** What the exercise will look like once saved. */
function Preview({ form }: { form: FormState }) {
  const rows = ALL_FIELDS.filter((f) => form[f.key]?.trim());
  return (
    <div>
      <h3 className="text-[18px] font-[820]" style={{ color: 'var(--text-primary)' }}>
        {form.name || 'Untitled exercise'}
      </h3>
      <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        {[form.target_muscle || form.muscle_group, form.equipment, form.difficulty].filter(Boolean).join(' · ')}
      </p>
      <dl className="mt-4 space-y-3">
        {rows.filter((f) => !['name', 'muscle_group', 'target_muscle', 'equipment', 'difficulty'].includes(f.key)).map((f) => (
          <div key={f.key}>
            <dt className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{f.label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-[13px]" style={{ color: 'var(--text-primary)' }}>{form[f.key]}</dd>
          </div>
        ))}
      </dl>
      {rows.length <= 1 && (
        <p className="mt-6 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          Nothing filled in yet — go back to the form and add some detail.
        </p>
      )}
    </div>
  );
}
