'use client';

import * as React from 'react';
import {
  Star, MoreHorizontal, Pencil, Copy, Archive, Trash2, Eye, ArchiveRestore,
} from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import type { LibraryExercise } from '@/lib/api';
import { exerciseRegion, regionTone, toneGradient, toneVars } from './libraryTheme';

/**
 * An exercise, as a card.
 *
 * Deliberately media-free. The old card led with a 144px GIF, which meant the
 * grid was mostly pictures of strangers and a trainer had to read the caption
 * to find anything. Here the name is the largest thing on the card and every
 * other pixel is a fact you would otherwise open the exercise to learn:
 * what it trains, what it needs, how hard it is, and how it moves.
 *
 * The one picture it does carry is the region's icon squircle, in the
 * region's own colour (libraryTheme.ts) — the way an iOS list row leads with
 * a tinted app icon. It says "Chest" before the eye reaches the words, and
 * the words are still there for anyone who cannot tell pink from violet.
 */

const DIFFICULTY_TONE = {
  beginner:     'success',
  intermediate: 'warning',
  advanced:     'danger',
} as const;

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

  const region = exerciseRegion(ex);
  const tone = regionTone(region);
  const RegionIcon = tone.icon;
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
      style={toneVars(tone)}
      className={cn(
        // ── No container box on a phone ─────────────────────────────────
        // 48 exercises, each in its own rounded, bordered card with padding
        // and gap, is a column of boxes you scroll through rather than a list
        // you read. Below sm this is a flat row with a hairline under it, led
        // by the region squircle the way an iOS list row leads with its icon.
        // The card returns at sm, where the layout is a 2-4 column grid and
        // cells genuinely need edges to read as cells. The list container
        // matches it: gap-0 below sm so these hairlines meet and read as one
        // list, gap-3 from sm so the cards stand apart.
        'group relative flex flex-col text-left transition-colors duration-200',
        'border-b border-slate-200/70 dark:border-white/[0.07]',
        'sm:rounded-[22px] sm:border sm:border-slate-200/70 sm:dark:border-white/[0.08]',
        'sm:bg-white sm:dark:bg-white/[0.04]',
        'sm:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)]',
        'hover:bg-slate-50/70 dark:hover:bg-white/[0.03] sm:hover:bg-white sm:dark:hover:bg-white/[0.06]',
        'sm:transition-all sm:duration-300 sm:ease-[cubic-bezier(0.16,1,0.3,1)]',
        'sm:hover:-translate-y-1 sm:hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_22px_44px_-18px_rgba(15,23,42,0.22)]',
        'sm:dark:hover:shadow-[0_22px_44px_-18px_rgba(0,0,0,0.6)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,103,224,0.4)]',
        selected && 'ring-2 ring-[rgba(0,103,224,0.5)] sm:border-[rgba(0,103,224,0.4)]',
        archived && 'opacity-60',
        dense ? 'p-3 gap-2' : 'gap-2.5 px-1 py-3.5 sm:gap-3 sm:p-4',
        // The row menu hangs below this row and over the next one, and a
        // later sibling wins on equal footing — the menu was cut off
        // mid-item. Lifting the whole row while its menu is open fixes it.
        menuOpen && 'z-50',
      )}
    >
      {/* The region's colour as a soft wash in the card's top corner — the
          only colour on the card that is not the icon or a chip. sm+ only:
          on a phone the row is a list line and a wash there reads as a stain. */}
      {/* Clipped by its own frame rather than the card's, so the actions menu
          can still hang out of the card. */}
      {!dense && (
        <span aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-[22px] sm:block">
          <span
            className="absolute -right-10 -top-12 h-32 w-32 rounded-full opacity-[0.13] blur-2xl transition-opacity duration-300 group-hover:opacity-25 dark:opacity-20 dark:group-hover:opacity-30"
            style={{ background: toneGradient(tone) }}
          />
        </span>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <span
          aria-hidden
          className={cn(
            'flex shrink-0 items-center justify-center text-white',
            'shadow-[0_6px_14px_-6px_var(--rg-glow),inset_0_1px_0_rgba(255,255,255,0.35)]',
            dense ? 'h-8 w-8 rounded-[10px]' : 'h-10 w-10 rounded-[12px] sm:h-11 sm:w-11 sm:rounded-[13px]',
          )}
          style={{ background: toneGradient(tone) }}
        >
          <RegionIcon size={dense ? 15 : 18} strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-[650] leading-snug tracking-[-0.01em] text-[var(--text-primary)] break-words',
              dense ? 'text-[13px]' : 'text-[15px]',
            )}
          >
            {ex.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
            <span className="font-[650] text-[var(--rg-ink)] dark:text-[var(--rg-ink-d)]">
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
              'rounded-full p-1.5 transition-all active:scale-90',
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
                className="rounded-full p-1.5 text-[var(--text-muted)] opacity-0 transition-colors group-hover:opacity-100 focus:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  // `menu` is an interactive role, so it has to be reachable.
                  // tabIndex={-1} makes it programmatically focusable without
                  // adding a tab stop of its own — the items inside are the
                  // stops. Escape closes it, which it previously could not do
                  // at all: the only way to dismiss this menu was a click.
                  tabIndex={-1}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { e.stopPropagation(); setMenuOpen(false); }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-no-pull-refresh className="absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-[0_18px_48px_-12px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0F172A]/95"
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

      <div className={cn('relative flex flex-wrap items-center gap-1.5', dense ? 'pl-11' : 'pl-[52px] sm:pl-0')}>
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
        <div className="relative mt-auto flex items-center justify-between gap-2 pl-[52px] text-[11px] text-[var(--text-muted)] sm:border-t sm:border-slate-100 sm:pl-0 sm:pt-2.5 sm:dark:border-white/[0.06]">
          <span className="truncate font-medium">
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
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:bg-slate-50 dark:hover:bg-white/5',
        destructive ? 'text-[var(--danger-text)]' : 'text-[var(--text-primary)]',
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
