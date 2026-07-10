'use client'

import { m } from 'framer-motion'
import { Heart, Plus, Dumbbell } from 'lucide-react'
import { cn } from '@/components/ui/cn'

interface ExerciseCardProps {
  id: string
  name: string
  muscleGroup?: string
  equipment?: string
  difficulty?: string
  gifUrl?: string
  setsDefault?: number
  repsDefault?: string | number
  restSeconds?: number
  exerciseType?: string
  compact?: boolean
  onAdd?: () => void
  onFavorite?: () => void
  isFavorited?: boolean
  className?: string
}

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  Chest: '#ef4444',
  Back: '#8b5cf6',
  Legs: '#f59e0b',
  Shoulders: '#06b6d4',
  Arms: '#ec4899',
  Core: '#10b981',
  Cardio: '#f97316',
  'Full Body': '#6366f1',
}

function getMuscleColor(muscleGroup?: string): string {
  if (!muscleGroup) return '#6366f1'
  return MUSCLE_GROUP_COLORS[muscleGroup] ?? '#6366f1'
}

function hexToRgba(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function formatRest(restSeconds?: number): string | null {
  if (restSeconds === undefined || restSeconds === null) return null
  if (restSeconds >= 60 && restSeconds % 60 === 0) {
    return `${restSeconds / 60} min rest`
  }
  return `${restSeconds}s rest`
}

export function ExerciseCard({
  id: _id,
  name,
  muscleGroup,
  equipment,
  difficulty,
  gifUrl,
  setsDefault,
  repsDefault,
  restSeconds,
  exerciseType: _exerciseType,
  compact = false,
  onAdd,
  onFavorite,
  isFavorited = false,
  className,
}: ExerciseCardProps) {
  const accentColor = getMuscleColor(muscleGroup)
  const restLabel = formatRest(restSeconds)
  const setsReps =
    setsDefault !== undefined && repsDefault !== undefined
      ? `${setsDefault} × ${repsDefault}`
      : setsDefault !== undefined
        ? `${setsDefault} sets`
        : repsDefault !== undefined
          ? `${repsDefault} reps`
          : null

  if (compact) {
    return (
      <m.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn('flex items-center gap-3 rounded-[18px] overflow-hidden', className)}
        style={{
          background: 'var(--bg-card)',
          border: `1px solid var(--border)`,
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        {/* Compact image: 44px */}
        <div
          className="shrink-0 flex items-center justify-center rounded-l-lg overflow-hidden"
          style={{
            width: 44,
            height: 44,
            background: hexToRgba(accentColor, 0.10),
          }}
        >
          {gifUrl ? (
            <img
              src={gifUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Dumbbell size={18} style={{ color: accentColor }} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-2">
          <p className="font-semibold truncate" style={{ fontSize: 13 }}>
            {name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {muscleGroup && (
              <span
                className="rounded-full px-1.5 py-0.5 font-medium"
                style={{ fontSize: 10, background: hexToRgba(accentColor, 0.12), color: accentColor }}
              >
                {muscleGroup}
              </span>
            )}
            {setsReps && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {setsReps}
              </span>
            )}
          </div>
        </div>

        {/* Add button */}
        {onAdd && (
          <button
            onClick={onAdd}
            className="shrink-0 mr-3 flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 28,
              height: 28,
              background: accentColor,
              color: '#fff',
            }}
            aria-label={`Add ${name}`}
          >
            <Plus size={14} />
          </button>
        )}
      </m.div>
    )
  }

  return (
    <m.div
      whileHover={{
        scale: 1.01,
        borderColor: hexToRgba(accentColor, 0.6),
        boxShadow: `0 8px 32px ${hexToRgba(accentColor, 0.12)}`,
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('rounded-[18px] overflow-hidden flex flex-col', className)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* Image area */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{
          height: 150,
          background: hexToRgba(accentColor, 0.08),
          borderRadius: '18px 18px 0 0',
          overflow: 'hidden',
        }}
      >
        {gifUrl ? (
          <img
            src={gifUrl}
            alt={name}
            className="w-full h-full"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 52,
                height: 52,
                background: hexToRgba(accentColor, 0.18),
              }}
            >
              <Dumbbell size={26} style={{ color: accentColor }} />
            </div>
            {muscleGroup && (
              <span style={{ fontSize: 11, color: accentColor, fontWeight: 600 }}>
                {muscleGroup}
              </span>
            )}
          </div>
        )}

        {/* Difficulty badge overlaid top-right */}
        {difficulty && (
          <span
            className="absolute top-2 right-2 rounded-full px-2 py-0.5 font-semibold"
            style={{
              fontSize: 10,
              background: 'rgba(0,0,0,0.45)',
              color: '#fff',
              backdropFilter: 'blur(4px)',
            }}
          >
            {difficulty}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col" style={{ padding: 16 }}>
        {/* Name */}
        <p className="font-bold mb-1.5" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
          {name}
        </p>

        {/* Muscle group badge */}
        {muscleGroup && (
          <span
            className="self-start rounded-full px-2 py-0.5 font-semibold mb-2"
            style={{ fontSize: 10, background: hexToRgba(accentColor, 0.12), color: accentColor }}
          >
            {muscleGroup}
          </span>
        )}

        {/* Equipment chip */}
        {equipment && (
          <span
            className="self-start rounded-md px-2 py-0.5 mb-3"
            style={{
              fontSize: 11,
              background: 'var(--bg-subtle, rgba(0,0,0,0.05))',
              color: 'var(--text-secondary)',
            }}
          >
            {equipment}
          </span>
        )}

        {/* Sets × Reps */}
        {setsReps && (
          <div className="flex items-center gap-1.5 mb-2">
            <Dumbbell size={14} style={{ color: accentColor }} />
            <span className="font-semibold" style={{ fontSize: 16, color: 'var(--text-primary)' }}>
              {setsReps}
            </span>
          </div>
        )}

        {/* Rest badge */}
        {restLabel && (
          <span
            className="self-start rounded-full px-2.5 py-1 font-medium mb-2"
            style={{
              fontSize: 11,
              background: hexToRgba(accentColor, 0.10),
              color: accentColor,
            }}
          >
            {restLabel}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer actions */}
        <div
          className="flex items-center justify-between gap-2 pt-3 mt-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {onAdd ? (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: accentColor, color: '#fff' }}
              aria-label={`Add ${name}`}
            >
              <Plus size={13} />
              Add
            </button>
          ) : (
            <div />
          )}

          {onFavorite && (
            <button
              onClick={onFavorite}
              className="flex items-center justify-center rounded-full p-1.5 transition-colors"
              style={{
                color: isFavorited ? '#ef4444' : 'var(--text-muted)',
                background: isFavorited ? 'rgba(239,68,68,0.10)' : 'transparent',
              }}
              aria-label={isFavorited ? 'Unfavorite' : 'Favorite'}
            >
              <Heart
                size={16}
                fill={isFavorited ? '#ef4444' : 'none'}
                stroke={isFavorited ? '#ef4444' : 'currentColor'}
              />
            </button>
          )}
        </div>
      </div>
    </m.div>
  )
}
