'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dumbbell, Search, Plus, X, ChevronDown, Filter, Image as ImageIcon,
  Edit3, Trash2, Check, RefreshCw, Info, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { cn } from '@/components/ui/cn';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  body_part: string;
  target_muscle: string;
  secondary_muscles: string | null;
  equipment: string | null;
  difficulty: string;
  instructions: string | null;
  gif_url: string | null;
  exercise_type: string | null;
  force: string | null;
  mechanic: string | null;
  sets_default: number | null;
  reps_default: number | null;
  rest_seconds: number | null;
  source_id: string | null;
}

interface Meta {
  body_parts: string[];
  equipment_types: string[];
  exercise_types: string[];
  difficulties: string[];
  total: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     '#6ee7b7',
  intermediate: '#fbbf24',
  advanced:     '#f87171',
};

const BODY_PART_COLORS: Record<string, string> = {
  Core:      '#a78bfa',
  Back:      '#60a5fa',
  Legs:      '#34d399',
  Chest:     '#f87171',
  Shoulders: '#fbbf24',
  Arms:      '#fb923c',
  Neck:      '#94a3b8',
  'Full Body': '#818cf8',
};

const PAGE_SIZE = 40;

function ExerciseCard({
  exercise, onClick, onDelete,
}: { exercise: Exercise; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const [imgError, setImgError] = useState(false);
  const bodyColor = BODY_PART_COLORS[exercise.body_part] || '#94a3b8';
  const diffColor = DIFFICULTY_COLORS[exercise.difficulty] || '#94a3b8';

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-xl border overflow-hidden transition-all hover:scale-[1.01]"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* GIF / placeholder */}
      <div
        className="w-full h-36 flex items-center justify-center overflow-hidden"
        style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
      >
        {exercise.gif_url && !imgError ? (
          <img
            src={exercise.gif_url}
            alt={exercise.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-30">
            <Dumbbell size={28} />
            <span style={{ fontSize: 10 }}>No image</span>
          </div>
        )}
      </div>

      {/* Body badge */}
      <span
        className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: bodyColor + '22', color: bodyColor, border: `1px solid ${bodyColor}44` }}
      >
        {exercise.body_part}
      </span>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
      >
        <Trash2 size={13} />
      </button>

      <div className="p-3">
        <p className="font-semibold text-sm leading-snug line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>
          {exercise.name}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {exercise.equipment && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
              {exercise.equipment}
            </span>
          )}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: diffColor + '22', color: diffColor }}
          >
            {exercise.difficulty}
          </span>
          {exercise.exercise_type && (
            <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
              {exercise.exercise_type}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseModal({ exercise, onClose, onSave }: {
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (updated: Partial<Exercise>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Exercise>>({});
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (exercise) { setForm(exercise); setEditing(false); setImgError(false); }
  }, [exercise]);

  if (!exercise) return null;

  const bodyColor = BODY_PART_COLORS[exercise.body_part] || '#94a3b8';
  const diffColor = DIFFICULTY_COLORS[exercise.difficulty] || '#94a3b8';

  async function handleSave() {
    setSaving(true);
    try { await onSave(form); setEditing(false); }
    catch { showToast('Save failed', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex-1 pr-4">
            {editing ? (
              <input
                className="w-full text-xl font-bold rounded-lg px-2 py-1"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                value={form.name ?? ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            ) : (
              <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{exercise.name}</h2>
            )}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: bodyColor + '22', color: bodyColor }}>
                {exercise.body_part}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: diffColor + '22', color: diffColor }}>
                {exercise.difficulty}
              </span>
              {exercise.equipment && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  {exercise.equipment}
                </span>
              )}
              {exercise.exercise_type && (
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  {exercise.exercise_type}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg transition-colors" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                <Edit3 size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* GIF */}
        {exercise.gif_url && !imgError && (
          <div className="w-full h-56 overflow-hidden" style={{ background: 'var(--muted)' }}>
            <img src={exercise.gif_url} alt={exercise.name} className="w-full h-full object-contain" onError={() => setImgError(true)} />
          </div>
        )}

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Muscle info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: 'var(--muted)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Primary Muscle</p>
              <p className="font-semibold capitalize text-sm" style={{ color: 'var(--foreground)' }}>{exercise.target_muscle || '—'}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--muted)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Secondary Muscles</p>
              <p className="text-sm capitalize" style={{ color: 'var(--foreground)' }}>{exercise.secondary_muscles || '—'}</p>
            </div>
            {exercise.force && (
              <div className="rounded-lg p-3" style={{ background: 'var(--muted)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Force</p>
                <p className="font-semibold capitalize text-sm" style={{ color: 'var(--foreground)' }}>{exercise.force}</p>
              </div>
            )}
            {exercise.mechanic && (
              <div className="rounded-lg p-3" style={{ background: 'var(--muted)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>Mechanic</p>
                <p className="font-semibold capitalize text-sm" style={{ color: 'var(--foreground)' }}>{exercise.mechanic}</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          {exercise.instructions && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>Instructions</p>
              {editing ? (
                <textarea
                  className="w-full rounded-lg p-3 text-sm resize-none"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)', minHeight: 120 }}
                  value={form.instructions ?? ''}
                  onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                />
              ) : (
                <ol className="space-y-2">
                  {exercise.instructions.split('\n').filter(Boolean).map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm" style={{ color: 'var(--foreground)' }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--primary)', color: 'white' }}>
                        {i + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Edit actions */}
          {editing && (
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setEditing(false); setForm(exercise); }} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: 'white', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddExerciseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', body_part: 'Core', difficulty: 'beginner', equipment: '', exercise_type: 'strength', instructions: '' });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function handleCreate() {
    if (!form.name.trim()) return showToast('Name required', 'error');
    setSaving(true);
    try {
      await api.exercises.create({ ...form, muscle_group: form.body_part });
      showToast('Exercise created', 'success');
      onCreated();
      onClose();
    } catch { showToast('Failed to create exercise', 'error'); }
    finally { setSaving(false); }
  }

  const field = (label: string, key: keyof typeof form, type: 'text' | 'select' | 'textarea' = 'text', options?: string[]) => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
      {type === 'select' ? (
        <select className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
          {options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea rows={4} className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      ) : (
        <input className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
          value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Add Exercise</h2>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {field('Exercise Name *', 'name')}
          {field('Body Part', 'body_part', 'select', ['Core', 'Back', 'Legs', 'Chest', 'Shoulders', 'Arms', 'Full Body'])}
          {field('Difficulty', 'difficulty', 'select', ['beginner', 'intermediate', 'advanced'])}
          {field('Equipment', 'equipment')}
          {field('Type', 'exercise_type', 'select', ['strength', 'cardio', 'stretching', 'plyometrics', 'powerlifting', 'strongman', 'olympic weightlifting'])}
          {field('Instructions', 'instructions', 'textarea')}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--primary)', color: 'white', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creating…' : 'Create Exercise'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState('');
  const [equipment, setEquipment] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const { showToast } = useToast();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (pg = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(pg * PAGE_SIZE) });
      if (search)       params.set('search', search);
      if (bodyPart)     params.set('body_part', bodyPart);
      if (equipment)    params.set('equipment', equipment);
      if (exerciseType) params.set('exercise_type', exerciseType);
      if (difficulty)   params.set('difficulty', difficulty);

      const [data, countRes] = await Promise.all([
        api.exercises.list(params.toString()),
        api.exercises.count(params.toString()),
      ]);
      setExercises(data);
      setTotal(countRes?.total ?? data.length);
    } catch { showToast('Failed to load exercises', 'error'); }
    finally { setLoading(false); }
  }, [search, bodyPart, equipment, exerciseType, difficulty]);

  const loadMeta = useCallback(async () => {
    try { setMeta(await api.exercises.meta()); } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  useEffect(() => {
    setPage(0);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(0), search ? 400 : 0);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, bodyPart, equipment, exerciseType, difficulty]);

  useEffect(() => { load(page); }, [page]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this exercise?')) return;
    try {
      await api.exercises.delete(id);
      showToast('Exercise deleted', 'success');
      load(page);
    } catch { showToast('Failed to delete', 'error'); }
  }

  async function handleSave(updated: Partial<Exercise>) {
    if (!selected) return;
    await api.exercises.update(selected.id, updated);
    showToast('Exercise saved', 'success');
    load(page);
    setSelected(prev => prev ? { ...prev, ...updated } : null);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filterActive = !!(bodyPart || equipment || exerciseType || difficulty);

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--background)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Exercise Library</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                {meta?.total ?? total} exercises · {meta?.body_parts.length ?? 7} body parts · {meta?.equipment_types.length ?? 12} equipment types
              </p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              <Plus size={16} /> Add Exercise
            </button>
          </div>

          {/* Search + Filters */}
          <div className="mb-5 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                placeholder="Search exercises…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Body Part', value: bodyPart, setter: setBodyPart, options: meta?.body_parts ?? [] },
                { label: 'Equipment', value: equipment, setter: setEquipment, options: meta?.equipment_types ?? [] },
                { label: 'Type', value: exerciseType, setter: setExerciseType, options: meta?.exercise_types ?? [] },
                { label: 'Difficulty', value: difficulty, setter: setDifficulty, options: meta?.difficulties ?? [] },
              ].map(({ label, value, setter, options }) => (
                <div key={label} className="relative">
                  <select
                    className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium cursor-pointer"
                    style={{
                      background: value ? 'var(--primary)' : 'var(--card)',
                      color: value ? 'white' : 'var(--foreground)',
                      border: `1px solid ${value ? 'var(--primary)' : 'var(--border)'}`,
                    }}
                    value={value}
                    onChange={e => setter(e.target.value)}
                  >
                    <option value="">{label}</option>
                    {options.map(o => <option key={o} value={o} style={{ background: 'var(--card)', color: 'var(--foreground)' }}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: value ? 'white' : 'var(--muted-foreground)' }} />
                </div>
              ))}

              {filterActive && (
                <button
                  onClick={() => { setBodyPart(''); setEquipment(''); setExerciseType(''); setDifficulty(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <X size={13} /> Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="rounded-xl h-52 animate-pulse" style={{ background: 'var(--muted)' }} />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center py-20">
              <Dumbbell size={40} className="mx-auto mb-3 opacity-20" />
              <p style={{ color: 'var(--muted-foreground)' }}>No exercises found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {exercises.map(ex => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  onClick={() => setSelected(ex)}
                  onDelete={e => handleDelete(ex.id, e)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl disabled:opacity-30"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Page {page + 1} of {totalPages} · {total} exercises
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl disabled:opacity-30"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        {selected && <ExerciseModal exercise={selected} onClose={() => setSelected(null)} onSave={handleSave} />}
        {showAdd && <AddExerciseModal onClose={() => setShowAdd(false)} onCreated={() => load(page)} />}
      </AppShell>
    </Guard>
  );
}
