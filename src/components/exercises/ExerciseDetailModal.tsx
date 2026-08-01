'use client';

// Everything known about one exercise, plus its history.
//
// Safety content leads rather than sitting at the bottom with the rest of the
// prose: contraindications are the one field on this screen that can prevent
// an injury, and a trainer scanning quickly must not have to scroll for them.

import { useEffect, useState } from 'react';
import {
  X, Loader2, Heart, Pencil, Copy, ShieldAlert, History, ArrowUpRight,
  ArrowDownRight, Shuffle, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { LibraryExerciseDetail, ExerciseVersion, RelatedExercise } from '@/lib/api/types';
import { cn } from '@/components/ui/cn';

const PROSE_FIELDS: Array<{ key: keyof LibraryExerciseDetail; label: string }> = [
  { key: 'description', label: 'Description' },
  { key: 'instructions', label: 'Instructions' },
  { key: 'coaching_cues', label: 'Coaching cues' },
  { key: 'common_mistakes', label: 'Common mistakes' },
  { key: 'breathing_tips', label: 'Breathing' },
  { key: 'beginner_notes', label: 'For beginners' },
  { key: 'advanced_notes', label: 'For advanced clients' },
  { key: 'trainer_notes', label: 'Trainer notes (internal)' },
];

const FACTS: Array<{ key: keyof LibraryExerciseDetail; label: string }> = [
  { key: 'muscle_group', label: 'Muscle group' },
  { key: 'target_muscle', label: 'Target' },
  { key: 'secondary_muscles', label: 'Secondary' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'difficulty', label: 'Difficulty' },
  { key: 'category', label: 'Category' },
  { key: 'mechanic', label: 'Mechanics' },
  { key: 'force', label: 'Force' },
  { key: 'movement_pattern', label: 'Pattern' },
  { key: 'plane_of_motion', label: 'Plane' },
  { key: 'tempo_recommendation', label: 'Tempo' },
];

export default function ExerciseDetailModal({
  exerciseId, onClose, onEdit, onDuplicate, onFavoriteChanged, canEdit,
}: {
  exerciseId: string | null;
  onClose: () => void;
  onEdit: (e: LibraryExerciseDetail) => void;
  onDuplicate: (e: LibraryExerciseDetail) => void;
  onFavoriteChanged?: (id: string, isFav: boolean) => void;
  canEdit: (e: LibraryExerciseDetail) => boolean;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<LibraryExerciseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [versions, setVersions] = useState<ExerciseVersion[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!exerciseId) { setData(null); setVersions(null); setShowHistory(false); return; }
    let cancelled = false;
    setLoading(true); setError('');
    api.exercises.get(exerciseId)
      .then((r) => { if (!cancelled) setData(r.data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this exercise'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [exerciseId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (exerciseId) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exerciseId, onClose]);

  const loadHistory = async () => {
    if (!data) return;
    setShowHistory(true);
    if (versions) return;
    try {
      const r = await api.exercises.versions(data.id);
      setVersions(r.data);
    } catch {
      toast.error('Could not load the edit history');
      setVersions([]);
    }
  };

  const toggleFavorite = async () => {
    if (!data) return;
    const next = !data.is_favorite;
    setData({ ...data, is_favorite: next });   // optimistic
    try {
      await api.exercises.favorite(data.id, next);
      onFavoriteChanged?.(data.id, next);
    } catch {
      setData({ ...data, is_favorite: !next });
      toast.error('Could not update favourites');
    }
  };

  if (!exerciseId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-t-[20px] sm:rounded-[20px]"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        ) : error || !data ? (
          <div className="p-6">
            <p className="text-[13px]" style={{ color: 'var(--danger)' }}>{error || 'Not found'}</p>
            <button onClick={onClose} className="mt-3 text-[12.5px] font-[700] underline" style={{ color: 'var(--text-primary)' }}>Close</button>
          </div>
        ) : (
          <>
            <header className="flex items-start gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[17px] font-[820] leading-tight" style={{ color: 'var(--text-primary)' }}>{data.name}</h2>
                  {data.organization_id === null && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-[750]"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                      <Lock size={9} /> Shared library
                    </span>
                  )}
                  {data.archived_at && (
                    <span className="rounded-full px-2 py-0.5 text-[10.5px] font-[750]"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>Archived</span>
                  )}
                </div>
                <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  v{data.version} · updated {new Date(data.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button onClick={toggleFavorite} aria-label="Toggle favourite" aria-pressed={!!data.is_favorite}
                className="rounded-lg p-1.5" style={{ color: data.is_favorite ? '#e11d48' : 'var(--text-disabled)' }}>
                <Heart size={17} fill={data.is_favorite ? '#e11d48' : 'none'} />
              </button>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {showHistory ? (
                <HistoryView versions={versions} onBack={() => setShowHistory(false)} />
              ) : (
                <>
                  {data.contraindications && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-[12px] p-3.5"
                      style={{ background: 'var(--danger-bg, rgba(220,38,38,0.08))', border: '1px solid rgba(220,38,38,0.25)' }}>
                      <ShieldAlert size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
                      <div>
                        <p className="text-[12px] font-[750]" style={{ color: 'var(--danger)' }}>Contraindications</p>
                        <p className="mt-0.5 whitespace-pre-wrap text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{data.contraindications}</p>
                      </div>
                    </div>
                  )}

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                    {FACTS.filter((f) => data[f.key]).map((f) => (
                      <div key={String(f.key)}>
                        <dt className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{f.label}</dt>
                        <dd className="mt-0.5 text-[12.5px] capitalize" style={{ color: 'var(--text-primary)' }}>{String(data[f.key])}</dd>
                      </div>
                    ))}
                    {(data.sets_default || data.reps_default || data.rest_seconds) && (
                      <div>
                        <dt className="text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Default</dt>
                        <dd className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-primary)' }}>
                          {[data.sets_default && `${data.sets_default} sets`, data.reps_default && `${data.reps_default} reps`,
                            data.rest_seconds && `${data.rest_seconds}s rest`].filter(Boolean).join(' · ')}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {!!data.tags?.length && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {data.tags.map((t) => (
                        <span key={t} className="rounded-full px-2 py-0.5 text-[10.5px] font-[700]"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {data.safety_tips && (
                    <Section label="Safety tips" value={data.safety_tips} />
                  )}
                  {PROSE_FIELDS.filter((f) => data[f.key]).map((f) => (
                    <Section key={String(f.key)} label={f.label} value={String(data[f.key])} />
                  ))}

                  <RelationGroup icon={<ArrowDownRight size={13} />} label="Regressions — easier" items={data.regressions} />
                  <RelationGroup icon={<ArrowUpRight size={13} />} label="Progressions — harder" items={data.progressions} />
                  <RelationGroup icon={<Shuffle size={13} />} label="Alternatives" items={data.alternatives} />
                </>
              )}
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
              {!showHistory && (
                <button onClick={loadHistory} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12.5px] font-[700]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                  <History size={13} /> History
                </button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => onDuplicate(data)} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12.5px] font-[700]"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <Copy size={13} /> Duplicate
                </button>
                {canEdit(data) && (
                  <button onClick={() => onEdit(data)}
                    className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-[750] text-white"
                    style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}>
                    <Pencil size={13} /> Edit
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <h4 className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</h4>
      <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function RelationGroup({ icon, label, items }: { icon: React.ReactNode; label: string; items: RelatedExercise[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <h4 className="flex items-center gap-1.5 text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {icon} {label}
      </h4>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.map((r) => (
          <span key={r.id} className="rounded-full px-2.5 py-1 text-[11.5px] font-[650]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
            {r.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function HistoryView({ versions, onBack }: { versions: ExerciseVersion[] | null; onBack: () => void }) {
  if (versions === null) {
    return <div className="flex h-32 items-center justify-center"><Loader2 size={18} className="animate-spin" /></div>;
  }
  return (
    <div>
      <button onClick={onBack} className="mb-3 text-[12px] font-[700] underline" style={{ color: 'var(--text-primary)' }}>
        ← Back to details
      </button>
      {versions.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          No edits recorded yet — this is still the original version.
        </p>
      ) : (
        <ol className="space-y-3">
          {versions.map((v) => (
            <li key={v.id} className="rounded-[12px] p-3" style={{ background: 'var(--bg-subtle)' }}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Version {v.version}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {v.changed_by_name || 'Unknown'} · {new Date(v.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              {v.change_note && (
                <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>&ldquo;{v.change_note}&rdquo;</p>
              )}
              <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-disabled)' }}>
                Was named &ldquo;{v.snapshot?.name ?? '—'}&rdquo;
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
