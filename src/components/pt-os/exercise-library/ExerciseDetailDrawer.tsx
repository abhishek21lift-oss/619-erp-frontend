'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  X, Star, Pencil, Copy, History, AlertTriangle, Lightbulb, ShieldAlert,
  Wind, Timer, TrendingUp, TrendingDown, Repeat, Loader2, ChevronRight,
  BookOpen, ListOrdered, Layers, StickyNote, Tag, GraduationCap, Ban,
} from 'lucide-react';
import { Badge, Skeleton, cn } from '@/components/ui';
import { api } from '@/lib/api';
import type { ExerciseVersion, LibraryExercise } from '@/lib/api';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { errorMessage } from '@/lib/forms/errors';
import { exerciseRegion, regionTone, toneGradient, toneVars } from './libraryTheme';
import { TRACKING_MODE_LABEL, isTrackingMode } from '@/lib/training-tracking';

/** "Hold (time)" rather than "HOLD"; unknown values fall back to readable text. */
const modeLabel = (mode: string) => (isTrackingMode(mode) ? TRACKING_MODE_LABEL[mode] : mode.replace(/_/g, ' '));

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
      .catch((e) => { if (alive) setError(errorMessage(e, 'Could not load exercise')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [exerciseId]);

  // Escape, focus trap and focus restore, replacing a bespoke Escape listener.
  // The panel declared aria-modal while Tab walked out of it into the page
  // behind, and closing dropped focus to the top of the document.
  const dialogRef = useDialogA11y({ open: !!exerciseId, onClose });

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

  // Portalled to <body>, not rendered in place.
  //
  // In place, the panel sat inside the page's animated route wrapper and
  // pull-to-refresh container. A transform (or filter) on any ancestor makes
  // it the containing block for `position: fixed`, so on a phone the panel was
  // positioned and sized against the page instead of the viewport: it started
  // part-way down the screen, grew as tall as the page, the page scrolled
  // instead of the panel, and the hero slid under the sticky header. At body
  // level `fixed` means the viewport again, whatever the page does.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  // The page behind must not scroll while the panel is open — on iOS a
  // scroll that reaches the panel's end otherwise carries on into the page.
  React.useEffect(() => {
    if (!exerciseId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [exerciseId]);

  if (!exerciseId || !mounted) return null;

  return createPortal(
    <>
      <div
        data-no-pull-refresh className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[3px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ex?.name || 'Exercise details'}
        style={ex ? toneVars(regionTone(exerciseRegion(ex))) : undefined}
        // 100dvh, not h-full: the visible viewport, so Safari's toolbar can
        // never push the panel's foot off-screen. overflow-hidden at every
        // width so only the body below the header scrolls.
        data-no-pull-refresh className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[540px] flex-col overflow-hidden border-l border-slate-200/70 bg-[var(--bg-canvas)] shadow-[0_0_80px_-20px_rgba(15,23,42,0.45)] dark:border-white/10 animate-in slide-in-from-right duration-300 sm:rounded-l-[28px]"
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
            Outside the scroll area, so the actions never scroll away and the
            content can never slide underneath it: only the body below
            scrolls. */}
        <header
          className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/60 bg-slate-50/85 px-4 dark:bg-slate-900/85 pb-3 backdrop-blur-xl dark:border-white/[0.07]"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {loading && !ex ? (
              <Skeleton className="h-5 w-40" />
            ) : ex ? (
              <>
                <RegionSquircle exercise={ex} size="sm" />
                <h2 className="truncate text-[15px] font-[700] tracking-[-0.01em] text-[var(--text-primary)]">
                  {ex.name}
                </h2>
              </>
            ) : null}
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
                <IconButton label="Version history" onClick={loadVersions} className={showVersions ? 'bg-[rgba(0,103,224,0.1)] text-[var(--brand)]' : undefined}>
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
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {error && (
            <div className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-4 text-sm text-[var(--danger-text)]">
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
            <div className="space-y-3.5">
              <DetailHero exercise={ex} />

              {showVersions && (
                <Section title="Version history" icon={History} tone="neutral">
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
                        <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-white/[0.04]">
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
                <Section title="Overview" icon={BookOpen} tone="region">
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--text-secondary,var(--text-muted))]">
                    {ex.description}
                  </p>
                </Section>
              )}

              <Prescription exercise={ex} />

              {ex.instructions && (
                <Section title="Execution" icon={ListOrdered} tone="region">
                  <ol className="space-y-2">
                    {ex.instructions.split('\n').filter(Boolean).map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-[var(--text-primary)]">
                        <span
                          className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-[750] text-white"
                          style={{ background: 'linear-gradient(135deg, var(--rg-from), var(--rg-to))' }}
                        >
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
              <BulletSection title="Contraindications" icon={Ban} tone="danger" items={ex.contraindications} />

              {ex.progression_notes && (
                <Section title="Recommended progression" icon={TrendingUp} tone="success">
                  <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{ex.progression_notes}</p>
                </Section>
              )}

              {ex.breathing_tips && (
                <Section title="Breathing" icon={Wind} tone="info">
                  <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{ex.breathing_tips}</p>
                </Section>
              )}

              {(ex.beginner_notes || ex.advanced_notes) && (
                <Section title="Coaching by level" icon={GraduationCap} tone="region">
                  <div className="space-y-2">
                    {ex.beginner_notes && <LevelNote label="Beginner" text={ex.beginner_notes} />}
                    {ex.advanced_notes && <LevelNote label="Advanced" text={ex.advanced_notes} />}
                  </div>
                </Section>
              )}

              <RelationList title="Progressions" icon={TrendingUp} tone="success" items={ex.progressions} onSelect={onSelectRelated} />
              <RelationList title="Regressions" icon={TrendingDown} tone="info" items={ex.regressions} onSelect={onSelectRelated} />
              <RelationList title="Alternatives" icon={Repeat} tone="neutral" items={ex.alternatives} onSelect={onSelectRelated} />

              {ex.trainer_notes && (
                <Section title="Trainer notes" icon={StickyNote} tone="warning">
                  <p className="rounded-xl bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    {ex.trainer_notes}
                  </p>
                </Section>
              )}

              {ex.tags && ex.tags.length > 0 && (
                <Section title="Tags" icon={Tag} tone="neutral">
                  <div className="flex flex-wrap gap-1.5">
                    {ex.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

/** The region's icon in its gradient squircle. */
function RegionSquircle({ exercise: ex, size }: { exercise: LibraryExercise; size: 'sm' | 'lg' }) {
  const tone = regionTone(exerciseRegion(ex));
  const Icon = tone.icon;
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
        size === 'sm' ? 'h-7 w-7 rounded-[9px]' : 'h-12 w-12 rounded-[15px]',
      )}
      style={{ background: toneGradient(tone) }}
    >
      <Icon size={size === 'sm' ? 14 : 22} strokeWidth={2.2} />
    </span>
  );
}

const DIFFICULTY_DOT: Record<string, string> = {
  beginner:     'bg-[var(--success)]',
  intermediate: 'bg-[var(--warning)]',
  advanced:     'bg-[var(--danger)]',
};

/**
 * The exercise's own header card, in its region's colour.
 *
 * Difficulty keeps its meaning in colour — a dot in the palette's emerald,
 * amber or red — because it is a judgement; everything else on this card is
 * decorative and rides the region gradient.
 */
function DetailHero({ exercise: ex }: { exercise: LibraryExercise }) {
  const region = exerciseRegion(ex);
  const tone = regionTone(region);
  const Icon = tone.icon;
  const facts = [
    ex.mechanic ? (ex.mechanic === 'compound' ? 'Compound' : 'Isolation') : null,
    ex.force ? ex.force.charAt(0).toUpperCase() + ex.force.slice(1) : null,
    ex.category_name || null,
    ex.movement_pattern && ex.movement_pattern !== 'General' ? ex.movement_pattern : null,
    ex.plane_of_motion ? `${ex.plane_of_motion} plane` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-[0_18px_40px_-20px_var(--rg-glow)]"
      style={{ background: toneGradient(tone, 150) }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(255,255,255,0.26),transparent_55%)]" />
      <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-6 opacity-[0.16]">
        <Icon size={150} strokeWidth={1.4} />
      </span>

      <div className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-white/20 backdrop-blur-sm">
          <Icon size={22} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-[700] uppercase tracking-[0.08em] text-white/75">{region || 'Exercise'}</p>
          <p className="mt-0.5 text-[13px] font-[600] text-white/90">
            {ex.primary_muscle || ex.target_muscle}
            {ex.equipment_name ? ` · ${ex.equipment_name}` : ''}
          </p>
        </div>
      </div>

      <h3 className="relative mt-4 text-[24px] font-[800] leading-tight tracking-[-0.022em]">{ex.name}</h3>

      <div className="relative mt-3.5 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-[700] capitalize text-slate-900">
          <span aria-hidden className={cn('h-2 w-2 rounded-full', DIFFICULTY_DOT[ex.difficulty] || 'bg-slate-400')} />
          {ex.difficulty}
        </span>
        {facts.map((f) => (
          <span key={f} className="rounded-full bg-white/20 px-2.5 py-1 text-[11.5px] font-[650] backdrop-blur-sm">{f}</span>
        ))}
        {ex.is_custom && <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11.5px] font-[650]">Custom</span>}
        {ex.version ? <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11.5px] font-[650]">v{ex.version}</span> : null}
        {ex.archived_at && <Badge tone="warning">Archived</Badge>}
      </div>
    </div>
  );
}

function MuscleMap({ exercise: ex }: { exercise: LibraryExercise }) {
  const primary = (ex.muscles || []).filter((m) => m.role === 'primary');
  const secondary = (ex.muscles || []).filter((m) => m.role === 'secondary');
  if (!primary.length && !secondary.length) return null;

  return (
    <Section title="Muscles worked" icon={Layers} tone="region">
      <div className="space-y-3">
        {primary.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-[650] text-[var(--text-muted)]">Primary</p>
            <div className="flex flex-wrap gap-1.5">
              {primary.map((m) => (
                <span
                  key={m.slug}
                  className="rounded-full px-3 py-1 text-[12px] font-[700] text-white"
                  style={{ background: 'linear-gradient(135deg, var(--rg-from), var(--rg-to))' }}
                >
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {secondary.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-[650] text-[var(--text-muted)]">Secondary</p>
            <div className="flex flex-wrap gap-1.5">
              {secondary.map((m) => (
                <span
                  key={m.slug}
                  className="rounded-full bg-[var(--rg-wash)] px-3 py-1 text-[12px] font-[650] text-[var(--rg-ink)] dark:text-[var(--rg-ink-d)]"
                >
                  {m.name}
                </span>
              ))}
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
    <Section title="Prescription" icon={Timer} tone="region">
      {ex.prescription_mode_primary && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-primary)]">
            <span>Tracked as</span>
            <Badge tone="brand">{modeLabel(ex.prescription_mode_primary)}</Badge>
          </div>
          {ex.prescription_mode_allowed && ex.prescription_mode_allowed.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ex.prescription_mode_allowed.map((mode) => (
                <Badge key={mode} tone="neutral">{modeLabel(mode)}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
      {cells.length > 0 && (
        // One row of tiles that share the width, so three values never leave
        // a stranded fourth slot — the reason this was a single strip before.
        // Two by two on a phone, where four tiles in a row cut "3-1-1-0" short.
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {cells.map((c) => (
            <div key={c.label} className="min-w-0 flex-1 rounded-2xl bg-[var(--rg-wash)] px-3 py-2.5 text-center">
              <p className="truncate text-[17px] font-[800] tracking-[-0.02em] text-[var(--rg-ink)] tabular-nums dark:text-[var(--rg-ink-d)]">
                {c.value}
              </p>
              <p className="mt-0.5 text-[10.5px] font-[650] uppercase tracking-[0.06em] text-[var(--text-muted)]">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function RelationList({
  title, icon, items, onSelect, tone,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items?: LibraryExercise['progressions'];
  onSelect: (id: string) => void;
  tone: SectionTone;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Section title={title} icon={icon} tone={tone}>
      <div className="-mx-1 divide-y divide-slate-200/70 dark:divide-white/[0.06]">
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2.5 text-left text-[13px] font-[600] text-[var(--text-primary)] transition-colors hover:text-[var(--brand)]"
          >
            <span className="min-w-0 truncate">{r.name}</span>
            <ChevronRight size={15} className="shrink-0 text-[var(--text-muted)]" />
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
    <Section title={title} icon={icon} tone={tone}>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--text-primary)]">
            <span className={cn('mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function LevelNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-white/[0.04]">
      <p className="text-[11px] font-[700] uppercase tracking-[0.06em] text-[var(--rg-ink)] dark:text-[var(--rg-ink-d)]">{label}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-primary)]">{text}</p>
    </div>
  );
}

/**
 * What a section's icon squircle is painted with. `region` takes the
 * exercise's own colour (set as CSS variables on the panel); the rest are the
 * staff palette's meanings — safety is red because it is a warning, not
 * because red is pretty.
 */
type SectionTone = 'region' | 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const SECTION_FILL: Record<SectionTone, string> = {
  region:  'linear-gradient(135deg, var(--rg-from), var(--rg-to))',
  info:    'var(--info)',
  warning: 'var(--warning)',
  danger:  'var(--danger)',
  success: 'var(--success)',
  neutral: 'var(--text-muted)',
};

function Section({
  title, icon: Icon, children, tone = 'neutral',
}: {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  tone?: SectionTone;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200/60 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/[0.07] dark:bg-white/[0.04]">
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-[750] tracking-[-0.01em] text-[var(--text-primary)]">
        {Icon && (
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[9px] text-white"
            style={{ background: SECTION_FILL[tone] }}
          >
            <Icon size={14} />
          </span>
        )}
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
        'flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-all hover:bg-slate-200/60 hover:text-[var(--text-primary)] active:scale-90 dark:hover:bg-white/10',
        className,
      )}
    >
      {children}
    </button>
  );
}
