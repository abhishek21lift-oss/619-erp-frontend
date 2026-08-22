'use client'

// A programme, as the trainer needs to read it.
//
// ── What the card used to say ─────────────────────────────────────────────
//
// A name, a difficulty pill, and three more pills carrying "muscle gain",
// "3x/wk · 4wk" and "0 exercises" — five bordered objects stacked inside a
// bordered card with a coloured bar across the top, and the colour chosen by
// the plan's index in the list, so it meant nothing at all. Underneath, a
// progress bar that was always at zero, because the endpoint feeding it hard-
// coded `0 AS progress` for every studio-wide read.
//
// It never said who was running the programme. That is the first thing a
// trainer looks for on this screen, and the only reason a plan is interesting.
//
// ── What it says now ──────────────────────────────────────────────────────
//
//   Hypertrophy Foundation          ← the programme
//   Rahul Sharma                    ← who is on it
//   Muscle Gain · 4 weeks · 3/week · 12 exercises
//   Week 2 of 4                52%  ← where they are
//   ▓▓▓▓▓▓░░░░░░
//
// One line of metadata instead of four pills: these are four facts of the same
// kind and the same weight, and four rounded boxes said they were four
// different kinds of thing.
//
// ── Honesty rules, which are why the shape branches ───────────────────────
//
// The week number is derived from the assignment's start_date, so it exists
// only when somebody is actually running the plan. A plan nobody has been
// assigned has no week, no percentage and no bar — it says "Not assigned yet",
// because a 0% bar on an unassigned plan is a measurement of nothing dressed
// as a measurement of zero. With several clients on one plan they are in
// different weeks, so the week line gives way to the roster and the percentage
// is explicitly labelled as an average.

import * as React from 'react'
import { m, type Variants } from 'framer-motion'
import {
  Pencil, Trash2, UserPlus, MoreHorizontal, Plus, ChevronRight, User,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'
import type { WorkoutPlanAssignment } from '@/lib/api'

export interface WorkoutPlanCardProps {
  id: string
  name: string
  description?: string
  goal?: string
  difficulty?: string
  /** Total length of the programme, in weeks. */
  durationWeeks?: number
  /** Prescribed sessions per week. */
  sessionsPerWeek?: number
  exerciseCount?: number
  /** 0-100. Only rendered when somebody is running the plan. */
  progress?: number
  /** The clients on this plan, already scoped by the server to what you may see. */
  assignments?: WorkoutPlanAssignment[]
  onOpen?: () => void
  onEdit?: () => void
  onAssign?: () => void
  onDelete?: () => void
  onAddExercises?: () => void
  compact?: boolean
  className?: string
  variants?: Variants
}

/** Difficulty is the one pill left, because it is the one fact that is a grade. */
const DIFFICULTY: Record<string, { bg: string; color: string }> = {
  Beginner:     { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
  Intermediate: { bg: 'rgba(245,158,11,0.14)',  color: '#B45309' },
  Advanced:     { bg: 'rgba(239,68,68,0.12)',   color: '#DC2626' },
}

const DAY = 86_400_000

/**
 * Which week of the programme a client is in, 1-based, or null.
 *
 * Null rather than 1 when there is no start date: "Week 1 of 4" is a claim
 * about someone's training, and defaulting it would state that claim about
 * every plan whose assignment predates the column.
 */
export function weekOfProgramme(
  startDate: string | null | undefined,
  durationWeeks: number | undefined,
  now: number = Date.now(),
): number | null {
  if (!startDate || !durationWeeks || durationWeeks < 1) return null
  const started = Date.parse(startDate)
  if (Number.isNaN(started)) return null
  // Before the start date the client has not begun; that is week 1, not week 0
  // or a negative one.
  const elapsedDays = Math.floor((now - started) / DAY)
  const week = Math.floor(Math.max(0, elapsedDays) / 7) + 1
  // A client past the end of the programme is on its last week, not week 9 of 8.
  return Math.min(week, durationWeeks)
}

export function WorkoutPlanCard({
  id: _id,
  name,
  goal,
  difficulty,
  durationWeeks,
  sessionsPerWeek,
  exerciseCount,
  progress = 0,
  assignments = [],
  onOpen,
  onEdit,
  onAssign,
  onDelete,
  onAddExercises,
  compact = false,
  className,
  variants,
}: WorkoutPlanCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    // Escape is bound to the document, not to the menu.
    //
    // The usual shape of this — onKeyDown on the menu div with tabIndex={-1} —
    // only fires if something inside the menu has focus, and opening it by
    // pointer leaves focus on the trigger. So the key never reached the
    // handler and the only way out was a click, which is exactly the thing
    // Escape is there to avoid for a keyboard user.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const diff = difficulty ? DIFFICULTY[difficulty] : undefined
  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const assigned = assignments.length
  const solo = assigned === 1 ? assignments[0] : null
  const week = solo ? weekOfProgramme(solo.start_date, durationWeeks) : null
  const hasExercises = (exerciseCount ?? 0) > 0

  // Four facts of the same kind, on one line, in the order a trainer reads
  // them: what it is for, how long, how often, how much.
  const meta = [
    goal,
    durationWeeks ? `${durationWeeks} week${durationWeeks === 1 ? '' : 's'}` : null,
    sessionsPerWeek ? `${sessionsPerWeek}/week` : null,
    hasExercises ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean) as string[]

  return (
    <m.div
      variants={variants}
      className={cn(
        'group relative flex flex-col rounded-[18px] transition-shadow',
        'bg-[var(--bg-card)] border border-[var(--border)]',
        'hover:shadow-[0_10px_30px_-14px_rgba(15,23,42,0.30)]',
        compact ? 'p-3.5' : 'p-4',
        className,
      )}
    >
      {/* ── Identity ── */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-[750] leading-tight tracking-[-0.01em] text-[var(--text-primary)]">
            {name}
          </h3>

          {/* Who is on it. The first thing this card exists to answer. */}
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] leading-none">
            <User size={12} className="shrink-0 text-[var(--text-disabled)]" aria-hidden />
            {solo ? (
              <span className="truncate font-[600] text-[var(--text-secondary)]">{solo.client_name}</span>
            ) : assigned > 1 ? (
              <span className="truncate font-[600] text-[var(--text-secondary)]">
                {assignments[0].client_name}
                <span className="font-[500] text-[var(--text-muted)]"> +{assigned - 1} more</span>
              </span>
            ) : (
              <span className="truncate text-[var(--text-muted)]">Not assigned yet</span>
            )}
          </p>
        </div>

        {diff && (
          <span
            className="shrink-0 rounded-full px-2 py-[3px] text-[10px] font-[700] uppercase tracking-[0.04em]"
            style={{ background: diff.bg, color: diff.color }}
          >
            {difficulty}
          </span>
        )}
      </div>

      {/* ── Shape of the programme ── */}
      {meta.length > 0 && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
          {meta.join(' · ')}
        </p>
      )}

      {/* ── The empty state that used to read "0 exercises" ──
          A programme with no exercises is not a programme with a count of
          zero; it is one that has not been written yet, and the useful thing
          to put in front of the trainer is the way to write it. */}
      {!hasExercises && (
        <button
          type="button"
          onClick={onAddExercises ?? onOpen}
          className={cn(
            'mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[12px]',
            'border border-dashed border-[var(--border)] px-3',
            'text-[12.5px] font-[650] text-[var(--text-muted)] transition-colors',
            'hover:border-[rgba(0,103,224,0.35)] hover:text-[#0067E0]',
          )}
        >
          <Plus size={14} aria-hidden />
          No exercises added yet — add exercises
        </button>
      )}

      {/* ── Where they are ── */}
      {assigned > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-[11.5px] font-[650] text-[var(--text-secondary)]">
              {week && durationWeeks
                ? `Week ${week} of ${durationWeeks}`
                : `${assigned} client${assigned === 1 ? '' : 's'} training`}
            </span>
            <span className="text-[12px] font-[750] tabular-nums text-[var(--text-primary)]">
              {pct}%
              {assigned > 1 && (
                <span className="ml-1 text-[10.5px] font-[550] text-[var(--text-muted)]">avg</span>
              )}
            </span>
          </div>
          <div
            className="h-[6px] w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${name} completion`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #0067E0 0%, #3B8DF5 100%)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Actions ──
          Open is the verb this card is for, so it is the only filled control.
          Edit and Assign sit beside it as peers. Delete is not a peer of any
          of them and does not belong in the row: it used to sit between Edit
          and Assign in full red, which made the most destructive action the
          most eye-catching thing on the card. */}
      <div className="mt-3.5 flex items-center gap-1.5 border-t border-[var(--border)] pt-3">
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              'inline-flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-[11px] px-3',
              'whitespace-nowrap text-[12.5px] font-[700] text-white transition-transform active:scale-[0.98]',
            )}
            style={{ background: 'linear-gradient(135deg, #0067E0 0%, #0059CE 100%)' }}
          >
            Open plan
            <ChevronRight size={14} aria-hidden />
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${name}`}
            className={cn(
              'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[11px] px-3',
              'whitespace-nowrap text-[12.5px] font-[650] text-[var(--text-secondary)] transition-colors',
              'hover:bg-[var(--bg-subtle)]',
            )}
          >
            <Pencil size={13} aria-hidden />
            <span className="hidden sm:inline">Edit</span>
          </button>
        )}
        {onAssign && (
          <button
            type="button"
            onClick={onAssign}
            aria-label={`Assign ${name} to a client`}
            className={cn(
              'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[11px] px-3',
              'whitespace-nowrap text-[12.5px] font-[650] text-[var(--text-secondary)] transition-colors',
              'hover:bg-[var(--bg-subtle)]',
            )}
          >
            <UserPlus size={13} aria-hidden />
            <span className="hidden sm:inline">Assign</span>
          </button>
        )}

        {onDelete && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              ref={triggerRef}
              type="button"
              aria-label={`More actions for ${name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                'inline-flex h-[40px] w-[40px] items-center justify-center rounded-[11px]',
                'text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]',
              )}
            >
              <MoreHorizontal size={16} aria-hidden />
            </button>

            {menuOpen && (
              <div
                role="menu"
                // Floating overlay: a drag that starts inside it is a scroll
                // of the menu, not a pull-to-refresh of the page behind it.
                data-no-pull-refresh
                className={cn(
                  'absolute bottom-full right-0 z-30 mb-1.5 w-44 overflow-hidden rounded-[12px] py-1',
                  'border border-[var(--border)] bg-[var(--bg-elevated)] shadow-xl',
                )}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onDelete() }}
                  className="flex min-h-[40px] w-full items-center gap-2.5 px-3 text-left text-[13px] text-[#DC2626] transition-colors hover:bg-[rgba(239,68,68,0.08)]"
                >
                  <Trash2 size={14} aria-hidden />
                  Delete plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </m.div>
  )
}
