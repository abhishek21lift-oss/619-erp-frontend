'use client';

// One exercise, as a card.
//
// Deliberately text-only: no GIF, no image, no video. The old card led with a
// remote GIF from a third-party CDN, which meant a grid of forty cards opened
// forty external requests, and a broken box wherever one 404'd. What a trainer
// actually scans for — muscle, equipment, whether it is compound, whether it
// is theirs — is text, and text renders instantly.

import { memo } from 'react';
import {
  Dumbbell, Heart, Pencil, Copy, Archive, Trash2, Lock, MoreHorizontal, Star,
} from 'lucide-react';
import type { LibraryExercise } from '@/lib/api/types';
import { cn } from '@/components/ui/cn';

const DIFFICULTY_TONE: Record<string, { bg: string; fg: string }> = {
  beginner:     { bg: 'rgba(5,150,105,0.12)',  fg: '#059669' },
  intermediate: { bg: 'rgba(217,119,6,0.12)',  fg: '#d97706' },
  advanced:     { bg: 'rgba(220,38,38,0.12)',  fg: '#dc2626' },
};

const MUSCLE_TONE: Record<string, string> = {
  Chest: '#dc2626', Back: '#2563eb', Legs: '#059669', Shoulders: '#d97706',
  Arms: '#ea580c', Core: '#7c3aed', Cardio: '#0891b2', Neck: '#6b7280',
  'Full Body': '#4f46e5', Olympic: '#be123c',
};

function Chip({ children, tone, title }: { children: React.ReactNode; tone?: string; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-[750] leading-none"
      style={{
        background: tone ? `color-mix(in srgb, ${tone} 14%, transparent)` : 'var(--bg-subtle)',
        color: tone ?? 'var(--text-muted)',
      }}
    >
      {children}
    </span>
  );
}

export interface ExerciseCardProps {
  exercise: LibraryExercise;
  onOpen: (e: LibraryExercise) => void;
  onToggleFavorite?: (e: LibraryExercise) => void;
  onEdit?: (e: LibraryExercise) => void;
  onDuplicate?: (e: LibraryExercise) => void;
  onArchive?: (e: LibraryExercise) => void;
  onDelete?: (e: LibraryExercise) => void;
  canEdit?: boolean;
  /** Compact variant for the workout-builder picker. */
  dense?: boolean;
  selected?: boolean;
}

function ExerciseCardBase({
  exercise, onOpen, onToggleFavorite, onEdit, onDuplicate, onArchive, onDelete,
  canEdit = false, dense = false, selected = false,
}: ExerciseCardProps) {
  const muscleTone = MUSCLE_TONE[exercise.muscle_group] || '#6b7280';
  const diff = DIFFICULTY_TONE[exercise.difficulty] || { bg: 'var(--bg-subtle)', fg: 'var(--text-muted)' };
  const isShared = exercise.organization_id === null;
  const mechanic = (exercise.mechanic || '').toLowerCase();
  const force = (exercise.force || '').toLowerCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(exercise)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(exercise); }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-[14px] text-left transition',
        'hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2',
        dense ? 'p-3' : 'p-4',
      )}
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
        boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--brand) 30%, transparent)' : 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: `color-mix(in srgb, ${muscleTone} 14%, transparent)`, color: muscleTone }}
        >
          <Dumbbell size={15} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3
              className={cn('min-w-0 flex-1 font-[800] leading-tight', dense ? 'text-[13px]' : 'text-[14.5px]')}
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
            >
              {exercise.name}
            </h3>
            {exercise.archived_at && <Chip title="Archived">Archived</Chip>}
          </div>

          <p className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {exercise.target_muscle || exercise.muscle_group}
            {exercise.equipment ? ` · ${exercise.equipment}` : ''}
          </p>
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            aria-label={exercise.is_favorite ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={!!exercise.is_favorite}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(exercise); }}
            className="shrink-0 rounded-md p-1 transition hover:scale-110"
            style={{ color: exercise.is_favorite ? '#e11d48' : 'var(--text-disabled)' }}
          >
            <Heart size={15} fill={exercise.is_favorite ? '#e11d48' : 'none'} />
          </button>
        )}
      </div>

      {!dense && (
        <>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Chip tone={muscleTone}>{exercise.muscle_group}</Chip>
            <span
              className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-[750] leading-none capitalize"
              style={{ background: diff.bg, color: diff.fg }}
            >
              {exercise.difficulty}
            </span>
            {mechanic && (
              <Chip title={mechanic === 'compound' ? 'Works multiple joints' : 'Works a single joint'}>
                {mechanic === 'compound' ? 'Compound' : 'Isolation'}
              </Chip>
            )}
            {force && (force === 'push' || force === 'pull') && (
              <Chip>{force === 'push' ? 'Push' : 'Pull'}</Chip>
            )}
            {exercise.category && <Chip>{exercise.category}</Chip>}
            {isShared
              ? <Chip title="Shared library — duplicate it to edit"><Lock size={9} /> Library</Chip>
              : <Chip tone="#7c3aed" title="Your studio's own exercise"><Star size={9} /> Custom</Chip>}
          </div>

          {exercise.secondary_muscles && (
            <p className="mt-2 truncate text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              Also: {exercise.secondary_muscles}
            </p>
          )}

          <div
            className="mt-3 flex items-center justify-between border-t pt-2.5"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
              Updated {new Date(exercise.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>

            {/* Actions stay mounted but transparent until hover/focus, so the
                card's height never changes and the grid does not reflow. */}
            <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {onDuplicate && (
                <IconAction label="Duplicate" onClick={() => onDuplicate(exercise)}><Copy size={13} /></IconAction>
              )}
              {canEdit && onEdit && (
                <IconAction label="Edit" onClick={() => onEdit(exercise)}><Pencil size={13} /></IconAction>
              )}
              {canEdit && onArchive && (
                <IconAction label={exercise.archived_at ? 'Restore' : 'Archive'} onClick={() => onArchive(exercise)}>
                  <Archive size={13} />
                </IconAction>
              )}
              {canEdit && onDelete && (
                <IconAction label="Delete" tone="var(--danger)" onClick={() => onDelete(exercise)}>
                  <Trash2 size={13} />
                </IconAction>
              )}
              {!canEdit && !onDuplicate && (
                <span style={{ color: 'var(--text-disabled)' }}><MoreHorizontal size={13} /></span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IconAction({
  label, onClick, children, tone,
}: { label: string; onClick: () => void; children: React.ReactNode; tone?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="rounded-md p-1.5 transition hover:bg-[var(--bg-subtle)]"
      style={{ color: tone ?? 'var(--text-muted)' }}
    >
      {children}
    </button>
  );
}

// The library renders up to 60 of these at once and re-renders on every
// keystroke in the search box. Without memo, typing repaints every card.
export const ExerciseCard = memo(ExerciseCardBase);
export default ExerciseCard;
