'use client';

import * as React from 'react';
import {
  Star, MoreHorizontal, Pencil, Copy, Archive, Trash2, Eye, ArchiveRestore,
} from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import type { LibraryExercise } from '@/lib/api';

/**
 * An exercise, as a card.
 *
 * Deliberately media-free. The old card led with a 144px GIF, which meant the
 * grid was mostly pictures of strangers and a trainer had to read the caption
 * to find anything. Here the name is the largest thing on the card and every
 * other pixel is a fact you would otherwise open the exercise to learn:
 * what it trains, what it needs, how hard it is, and how it moves.
 */

const DIFFICULTY_TONE = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'danger',
} as const;

/** Region accent. Colour carries the muscle group at a glance, not decoration. */
const REGION_ACCENT: Record<string, string> = {
  Chest:       'var(--danger)',
  Back:        'var(--info)',
  Legs:        'var(--success)',
  Shoulders:   'var(--warning)',
  Arms:        'var(--brand)',
  Core:        'var(--accent)',
  Cardio:      'var(--info)',
  'Full Body': 'var(--accent)',
};

export interface ExerciseCardProps {
  exercise: LibraryExercise;
  onOpen: (ex: LibraryExercise) => void;
  onToggleFavorite: (ex: LibraryExercise) => void;
  onEdit?: (ex: LibraryExercise) => void;
  onDuplicate?: (ex: LibraryExercise) => void;
  onArchive?: (ex: LibraryExercise) => void;
  onDelete?: (ex: LibraryExercise) => void;
  /** Compact variant for the Workout Builder picker. */
  dense?: boolean;
  selected?: boolean;
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ExerciseCard = React.memo(function ExerciseCard({
  exercise: ex,
  onOpen,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  dense = false,
  selected = false,
}: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const accent = REGION_ACCENT[ex.body_region || ex.muscle_group] || 'var(--text-muted)';
  const archived = Boolean(ex.archived_at);
  const canEdit = ex.can_edit !== false;

  const secondary = (ex.muscles || [])
    .filter((m) => m.role === 'secondary')
    .map((m) => m.name);
  const secondaryText = secondary.length
    ? secondary.join(', ')
    : (ex.secondary_muscles || '');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(ex)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(ex); }
      }}
      className={cn(
        'group relative flex flex-col rounded-2xl border text-left transition-all duration-200',
        'bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl',
        'border-slate-200/80 dark:border-white/10',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/20',
        'hover:border-slate-300 dark:hover:border-white/20',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40',
        selected && 'ring-2 ring-[var(--brand)]/50 border-[var(--brand)]/40',
        archived && 'opacity-60',
        dense ? 'p-3 gap-2' : 'p-4 gap-3',
        // The row menu hangs below this card and over the next one, and the
        // z-30 it carries cannot get it there on its own: `backdrop-blur-xl`
        // above makes every card its own stacking context, so that z-index is
        // resolved *inside* this card and the following sibling — later in DOM
        // order — paints straight over the top of it. The menu was being cut
        // off mid-item. Lifting the whole card while its menu is open is what
        // actually reorders it against its siblings.
        menuOpen && 'z-50',
      )}
    >
      {/* Region accent rail. The only colour on the card that is not a badge. */}
      <span
        aria-hidden
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between gap-2 pl-2.5">
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-semibold leading-snug text-[var(--text-primary)] break-words',
              dense ? 'text-[13px]' : 'text-[15px]',
            )}
          >
            {ex.name}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">
            <span style={{ color: accent }} className="font-medium">
              {ex.primary_muscle || ex.target_muscle || ex.muscle_group}
            </span>
            {secondaryText && <span className="opacity-70"> · {secondaryText}</span>}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label={ex.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={Boolean(ex.is_favorite)}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(ex); }}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              'hover:bg-slate-100 dark:hover:bg-white/10',
              ex.is_favorite
                ? 'text-amber-500'
                : 'text-slate-300 dark:text-white/20 opacity-0 group-hover:opacity-100 focus:opacity-100',
            )}
          >
            <Star size={14} fill={ex.is_favorite ? 'currentColor' : 'none'} />
          </button>

          {!dense && (onEdit || onDuplicate || onArchive || onDelete) && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Exercise actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition-colors group-hover:opacity-100 focus:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#0F172A]"
                >
                  <MenuItem icon={Eye} label="View details" onClick={() => { setMenuOpen(false); onOpen(ex); }} />
                  {onEdit && (
                    <MenuItem
                      icon={Pencil} label="Edit" disabled={!canEdit}
                      hint={canEdit ? undefined : 'Built-in exercise'}
                      onClick={() => { setMenuOpen(false); onEdit(ex); }}
                    />
                  )}
                  {onDuplicate && (
                    <MenuItem icon={Copy} label="Duplicate" onClick={() => { setMenuOpen(false); onDuplicate(ex); }} />
                  )}
                  {onArchive && (
                    <MenuItem
                      icon={archived ? ArchiveRestore : Archive}
                      label={archived ? 'Restore' : 'Archive'}
                      disabled={!canEdit}
                      onClick={() => { setMenuOpen(false); onArchive(ex); }}
                    />
                  )}
                  {onDelete && (
                    <MenuItem
                      icon={Trash2} label="Delete" destructive disabled={!canEdit}
                      onClick={() => { setMenuOpen(false); onDelete(ex); }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-2.5">
        {ex.equipment_name || ex.equipment ? (
          <Badge tone="neutral">{ex.equipment_name || ex.equipment}</Badge>
        ) : null}

        <Badge tone={DIFFICULTY_TONE[ex.difficulty as keyof typeof DIFFICULTY_TONE] || 'neutral'}>
          {ex.difficulty}
        </Badge>

        {ex.mechanic && (
          <Badge tone={ex.mechanic === 'compound' ? 'brand' : 'purple'}>
            {ex.mechanic === 'compound' ? 'Compound' : 'Isolation'}
          </Badge>
        )}

        {ex.force && ex.force !== 'static' && (
          <Badge tone="info">{ex.force === 'push' ? 'Push' : 'Pull'}</Badge>
        )}

        {!dense && ex.category_name && <Badge tone="neutral">{ex.category_name}</Badge>}
        {ex.is_custom && <Badge tone="brand">Custom</Badge>}
        {archived && <Badge tone="warning">Archived</Badge>}
      </div>

      {!dense && (
        <div className="mt-auto flex items-center justify-between gap-2 pl-2.5 pt-1 text-[11px] text-[var(--text-muted)]">
          <span className="truncate">
            {ex.movement_pattern && ex.movement_pattern !== 'General'
              ? ex.movement_pattern
              : (ex.category_name || '')}
            {ex.recommended_reps ? ` · ${ex.recommended_sets || ''}×${ex.recommended_reps}` : ''}
          </span>
          {ex.updated_at && (
            <span className="shrink-0 opacity-70">Updated {formatDate(ex.updated_at)}</span>
          )}
        </div>
      )}
    </div>
  );
});

function MenuItem({
  icon: Icon, label, onClick, destructive, disabled, hint,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={hint}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:bg-slate-50 dark:hover:bg-white/5',
        destructive ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]',
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
