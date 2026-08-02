'use client'

import { m, type Variants } from 'framer-motion'
import { Edit3, Trash2, UserPlus, Target, Clock, Dumbbell } from 'lucide-react'
import { cn } from '@/components/ui/cn'

interface WorkoutPlanCardProps {
  id: string
  name: string
  description?: string
  goal?: string
  difficulty?: string
  duration?: string
  exerciseCount?: number
  progress?: number
  color?: string
  onAssign?: () => void
  onEdit?: () => void
  onDelete?: () => void
  compact?: boolean
  className?: string
  variants?: Variants
}

const DIFFICULTY_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  Beginner: { label: 'Beginner', bg: '#d1fae5', color: '#10b981' },
  Intermediate: { label: 'Intermediate', bg: '#fef3c7', color: '#f59e0b' },
  Advanced: { label: 'Advanced', bg: '#fee2e2', color: '#ef4444' },
}

export function WorkoutPlanCard({
  id: _id,
  name,
  description,
  goal,
  difficulty,
  duration,
  exerciseCount,
  progress = 0,
  color = 'linear-gradient(135deg, #0067e0, #0059ce)',
  onAssign,
  onEdit,
  onDelete,
  compact = false,
  className,
  variants,
}: WorkoutPlanCardProps) {
  const diffStyle = difficulty ? DIFFICULTY_STYLES[difficulty] : undefined
  const clampedProgress = Math.min(100, Math.max(0, progress))

  if (compact) {
    return (
      <m.div
        variants={variants}
        whileHover={{ translateY: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn('relative overflow-hidden rounded-[18px]', className)}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Top color bar */}
        <div style={{ height: 4, background: color, width: '100%' }} />

        {/* Horizontal compact layout */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Color dot */}
          <div
            className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center"
            style={{ background: color }}
          >
            <Dumbbell size={14} color="#fff" />
          </div>

          {/* Name + chips */}
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate" style={{ fontSize: 14 }}>
              {name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {goal && (
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: 11, color: 'var(--text-muted)' }}
                >
                  <Target size={10} />
                  {goal}
                </span>
              )}
              {duration && (
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: 11, color: 'var(--text-muted)' }}
                >
                  <Clock size={10} />
                  {duration}
                </span>
              )}
              {exerciseCount !== undefined && (
                <span
                  className="flex items-center gap-1"
                  style={{ fontSize: 11, color: 'var(--text-muted)' }}
                >
                  <Dumbbell size={10} />
                  {exerciseCount} exercises
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Edit plan"
              >
                <Edit3 size={13} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Delete plan"
              >
                <Trash2 size={13} />
              </button>
            )}
            {onAssign && (
              <button
                onClick={onAssign}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Assign plan"
              >
                <UserPlus size={13} />
              </button>
            )}
          </div>
        </div>
      </m.div>
    )
  }

  return (
    <m.div
      variants={variants}
      whileHover={{ translateY: -3, boxShadow: '0 12px 40px rgba(0,0,0,0.10)' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('relative overflow-hidden rounded-[18px]', className)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Top color bar */}
      <div style={{ height: 4, background: color, width: '100%' }} />

      {/* Body */}
      <div style={{ padding: 20 }}>
        {/* Header row: badge + name */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-bold leading-tight flex-1" style={{ fontSize: 15 }}>
            {name}
          </p>
          {diffStyle && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: diffStyle.bg, color: diffStyle.color }}
            >
              {diffStyle.label}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p
            className="mb-3"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {goal && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-1"
              style={{
                fontSize: 11,
                background: 'var(--bg-subtle, rgba(0,103,224,0.08))',
                color: 'var(--text-secondary)',
              }}
            >
              <Target size={11} />
              {goal}
            </span>
          )}
          {duration && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-1"
              style={{
                fontSize: 11,
                background: 'var(--bg-subtle, rgba(0,103,224,0.08))',
                color: 'var(--text-secondary)',
              }}
            >
              <Clock size={11} />
              {duration}
            </span>
          )}
          {exerciseCount !== undefined && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-1"
              style={{
                fontSize: 11,
                background: 'var(--bg-subtle, rgba(0,103,224,0.08))',
                color: 'var(--text-secondary)',
              }}
            >
              <Dumbbell size={11} />
              {exerciseCount} exercises
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-1">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 6, background: 'var(--bg-subtle, rgba(0,0,0,0.06))' }}
          >
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${clampedProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: color }}
            />
          </div>
          <p
            className="mt-1 text-right"
            style={{ fontSize: 11, color: 'var(--text-muted)' }}
          >
            {clampedProgress}% complete
          </p>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-end gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Edit plan"
            >
              <Edit3 size={13} />
              <span>Edit</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{ color: '#ef4444' }}
              aria-label="Delete plan"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </button>
          )}
          {onAssign && (
            <button
              onClick={onAssign}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: color, color: '#fff' }}
              aria-label="Assign plan"
            >
              <UserPlus size={13} />
              <span>Assign</span>
            </button>
          )}
        </div>
      </div>
    </m.div>
  )
}
