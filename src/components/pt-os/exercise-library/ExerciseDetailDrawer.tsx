'use client';

import * as React from 'react';
import {
  X, Star, Pencil, Copy, History, AlertTriangle, Lightbulb, ShieldAlert,
  Wind, Timer, TrendingUp, TrendingDown, Repeat, Loader2,
} from 'lucide-react';
import { Badge, Skeleton, cn } from '@/components/ui';
import { api } from '@/lib/api';
import type { ExerciseVersion, LibraryExercise } from '@/lib/api';

/**
 * Full exercise detail, in a right-hand drawer.
 *
 * A drawer rather than a route so the trainer never loses their place in the
 * grid — browsing the library is a scanning task, and navigating away to read
 * one exercise then coming back to a reset scroll position is the single most
 * annoying thing a library can do.
 *
 * No media. Everything here is text a coach can actually say out loud on the
 * gym floor: cues, mistakes, safety, breathing, tempo, and where the movement
 * sits on a progression ladder.
 */

export interface ExerciseDetailDrawerProps {
  exerciseId: string | null;
  onClose: () => void;
  onEdit: (ex: LibraryExercise) => void;
  onDuplicate: (ex: LibraryExercise) => void;
  onToggleFavorite: (ex: LibraryExercise) => void;
  onSelectRelated: (id: string) => void;
}

export function ExerciseDetailDrawer({
  exerciseId, onClose, onEdit, onDuplicate, onToggleFavorite, onSelectRelated,
}: ExerciseDetailDrawerProps) {
  const [ex, setEx] = React.useState<LibraryExercise | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [versions, setVersions] = React.useState<ExerciseVersion[] | null>(null);
  const [showVersions, setShowVersions] = React.useState(false);

  React.useEffect(() => {
    if (!exerciseId) { setEx(null); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    setShowVersions(false);
    setVersions(null);
    api.exercises.get(exerciseId)
      .then((d) => { if (alive) setEx(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load exercise'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [exerciseId]);

  React.useEffect(() => {
    if (!exerciseId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [exerciseId, onClose]);

  const loadVersions = React.useCallback(async () => {
    if (!ex) return;
    setShowVersions((v) => !v);
    if (versions) return;
    try {
      const res = await api.exercises.versions(ex.id);
      setVersions(res.versions);
    } catch {
      setVersions([]);
    }
  }, [ex, versions]);

  if (!exerciseId) return null;

  return (
    <>
      <div
        data-no-pull-refresh className="fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ex?.name || 'Exercise details'}
        data-no-pull-refresh className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a] animate-in slide-in-from-right duration-250"
      >
        {/* ── The status bar is not free space ─────────────────────────────
            This panel is `fixed top-0 h-full`, so on a phone its header began
            at y=0 — behind the notch. The title collided with the clock and
            the close button sat between the wifi and battery icons.
            The app already knows the answer: --topbar-h is
            `46px + env(safe-area-inset-top)`. Same idea here, applied as
            padding so the header keeps its own height and simply starts below
            the inset. Zero on a device without one, so nothing changes on a
            desktop.
            Sticky as well: the actions were scrolling away with the title, and
            on a long exercise there was no way back to Close without
            scrolling to the top. */}
        <header
          className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-5 pb-4 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0f172a]/95"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="min-w-0 flex-1">
            {loading && !ex ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <>
                <h2 className="text-lg font-semibold leading-tight text-[var(--text-primary)]">
                  {ex?.name}
                </h2>
                {ex && (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {ex.primary_muscle || ex.target_muscle}
                    {ex.equipment_name ? ` · ${ex.equipment_name}` : ''}
                    {ex.version ? ` · v${ex.version}` : ''}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {ex && (
              <>
                <IconButton
                  label={ex.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={() => { onToggleFavorite(ex); setEx({ ...ex, is_favorite: !ex.is_favorite }); }}
                  className={ex.is_favorite ? 'text-amber-500' : undefined}
                >
                  <Star size={15} fill={ex.is_favorite ? 'currentColor' : 'none'} />
                </IconButton>
                <IconButton label="Duplicate" onClick={() => onDuplicate(ex)}>
                  <Copy size={15} />
                </IconButton>
                {ex.can_edit !== false && (
                  <IconButton label="Edit" onClick={() => onEdit(ex)}>
                    <Pencil size={15} />
                  </IconButton>
                )}
                <IconButton label="Version history" onClick={loadVersions}>
                  <History size={15} />
                </IconButton>
              </>
            )}
            <IconButton label="Close" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </div>
        </header>

        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {error && (
            <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4 text-sm text-[var(--danger-text)]">
              {error}
            </div>
          )}

          {loading && !ex && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {ex && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={ex.difficulty === 'advanced' ? 'danger' : ex.difficulty === 'intermediate' ? 'warning' : 'success'}>
                  {ex.difficulty}
                </Badge>
                {ex.mechanic && (
                  <Badge tone={ex.mechanic === 'compound' ? 'brand' : 'purple'}>
                    {ex.mechanic === 'compound' ? 'Compound' : 'Isolation'}
                  </Badge>
                )}
                {ex.force && <Badge tone="info" className="capitalize">{ex.force}</Badge>}
                {ex.category_name && <Badge tone="neutral">{ex.category_name}</Badge>}
                {ex.movement_pattern && ex.movement_pattern !== 'General' && (
                  <Badge tone="neutral">{ex.movement_pattern}</Badge>
                )}
                {ex.plane_of_motion && <Badge tone="neutral">{ex.plane_of_motion} plane</Badge>}
                {ex.is_custom && <Badge tone="brand">Custom</Badge>}
                {ex.archived_at && <Badge tone="warning">Archived</Badge>}
              </div>

              {showVersions && (
                <Section title="Version history" icon={History}>
                  {versions === null ? (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Loader2 size={12} className="animate-spin" /> Loading…
                    </div>
                  ) : versions.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      No edits yet — this is the original version.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {versions.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-white/[0.03]">
                          <span className="font-medium text-[var(--text-primary)]">v{v.version}</span>
                          <span className="truncate text-[var(--text-muted)]">
                            {v.changed_by_name || 'Unknown'} ·{' '}
                            {new Date(v.created_at).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              )}

              <MuscleMap exercise={ex} />

              {ex.description && (
                <Section title="Overview">
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--text-secondary,var(--text-muted))]">
                    {ex.description}
                  </p>
                </Section>
              )}

              <Prescription exercise={ex} />

              {ex.instructions && (
                <Section title="Execution">
                  <ol className="space-y-2">
                    {ex.instructions.split('\n').filter(Boolean).map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-[var(--text-primary)]">
                        <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[10px] font-semibold text-[var(--brand)]">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

              <BulletSection title="Coaching cues" icon={Lightbulb} tone="info" items={ex.coaching_cues} />
              <BulletSection title="Common mistakes" icon={AlertTriangle} tone="warning" items={ex.common_mistakes} />
              <BulletSection title="Safety" icon={ShieldAlert} tone="danger" items={ex.safety_tips} />
              <BulletSection title="Contraindications" icon={ShieldAlert} tone="danger" items={ex.contraindications} />

              {ex.progression_notes && (
                <Section title="Recommended progression" icon={TrendingUp}>
                  <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{ex.progression_notes}</p>
                </Section>
              )}

              {ex.breathing_tips && (
                <Section title="Breathing" icon={Wind}>
                  <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{ex.breathing_tips}</p>
                </Section>
              )}

              {(ex.beginner_notes || ex.advanced_notes) && (
                <Section title="Coaching by level">
                  <div className="space-y-2">
                    {ex.beginner_notes && <LevelNote label="Beginner" text={ex.beginner_notes} />}
                    {ex.advanced_notes && <LevelNote label="Advanced" text={ex.advanced_notes} />}
                  </div>
                </Section>
              )}

              <RelationList title="Progressions" icon={TrendingUp} items={ex.progressions} onSelect={onSelectRelated} />
              <RelationList title="Regressions" icon={TrendingDown} items={ex.regressions} onSelect={onSelectRelated} />
              <RelationList title="Alternatives" icon={Repeat} items={ex.alternatives} onSelect={onSelectRelated} />

              {ex.trainer_notes && (
                <Section title="Trainer notes">
                  <p className="rounded-xl bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    {ex.trainer_notes}
                  </p>
                </Section>
              )}

              {ex.tags && ex.tags.length > 0 && (
                <Section title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {ex.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MuscleMap({ exercise: ex }: { exercise: LibraryExercise }) {
  const primary = (ex.muscles || []).filter((m) => m.role === 'primary');
  const secondary = (ex.muscles || []).filter((m) => m.role === 'secondary');
  if (!primary.length && !secondary.length) return null;

  return (
    <Section title="Muscles worked">
      <div className="space-y-2.5">
        {primary.length > 0 && (
          <div>
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Primary</p>
            <div className="flex flex-wrap gap-1.5">
              {primary.map((m) => <Badge key={m.slug} tone="brand">{m.name}</Badge>)}
            </div>
          </div>
        )}
        {secondary.length > 0 && (
          <div>
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Secondary</p>
            <div className="flex flex-wrap gap-1.5">
              {secondary.map((m) => <Badge key={m.slug} tone="neutral">{m.name}</Badge>)}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function Prescription({ exercise: ex }: { exercise: LibraryExercise }) {
  const cells = [
    { label: 'Sets',  value: ex.recommended_sets || (ex.sets_default ? String(ex.sets_default) : null) },
    { label: 'Reps',  value: ex.recommended_reps || (ex.reps_default ? String(ex.reps_default) : null) },
    { label: 'Rest',  value: ex.rest_seconds ? `${ex.rest_seconds}s` : null },
    { label: 'Tempo', value: ex.tempo_recommendation },
  ].filter((c) => c.value);

  if (!cells.length && !ex.prescription_mode_primary) return null;

  return (
    <Section title="Prescription" icon={Timer}>
      {ex.prescription_mode_primary && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]">
            <span>Primary mode</span>
            <Badge tone="brand">{ex.prescription_mode_primary.replace(/_/g, ' ')}</Badge>
          </div>
          {ex.prescription_mode_allowed && ex.prescription_mode_allowed.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ex.prescription_mode_allowed.map((mode) => (
                <Badge key={mode} tone="neutral">{mode.replace(/_/g, ' ')}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
      {cells.length > 0 && (
        <>
          {/* One strip, not a box each. At grid-cols-2 the usual three values —
              sets, reps, rest — left the third stranded on a row of its own with a
              gap beside it, which reads as a missing fourth. A single divided row
              fits three or four without either looking short. */}
          <div className="flex divide-x divide-slate-200/80 overflow-hidden rounded-xl border border-slate-200/80 dark:divide-white/[0.07] dark:border-white/[0.07]">
            {cells.map((c) => (
              <div key={c.label} className="flex-1 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{c.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{c.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

function RelationList({
  title, icon, items, onSelect,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items?: LibraryExercise['progressions'];
  onSelect: (id: string) => void;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Section title={title} icon={icon}>
      <div className="flex flex-wrap gap-1.5">
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className="rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/5 hover:text-[var(--brand)] dark:border-white/10 dark:bg-white/[0.03]"
          >
            {r.name}
          </button>
        ))}
      </div>
    </Section>
  );
}

function BulletSection({
  title, icon, items, tone,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items?: string[];
  tone: 'info' | 'warning' | 'danger';
}) {
  if (!items || items.length === 0) return null;
  const dot = {
    info:    'bg-[var(--info)]',
    warning: 'bg-[var(--warning)]',
    danger:  'bg-[var(--danger)]',
  }[tone];

  return (
    <Section title={title} icon={icon}>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-[var(--text-primary)]">
            <span className={cn('mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function LevelNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 px-3 py-2.5 dark:border-white/[0.07]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-primary)]">{text}</p>
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {Icon && <Icon size={12} />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function IconButton({
  label, onClick, children, className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-primary)] dark:hover:bg-white/10',
        className,
      )}
    >
      {children}
    </button>
  );
}
