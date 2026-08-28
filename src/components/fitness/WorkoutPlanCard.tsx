'use client'

// A programme, as the trainer reads it.
//
// ── What the card is for ───────────────────────────────────────────────────
//
// The question a trainer asks scanning this page is not "what plans exist" —
// it is "who is running what, and how far in are they". So the card leads with
// the programme name and the person on it, states the prescription in one
// line, and then answers the progress question with a week counter beside the
// bar. Everything else is a tap away.
//
// ── Why the metadata is a sentence, not chips ──────────────────────────────
//
// Goal, duration, sessions and exercise count used to be four pills. Four
// bordered capsules per card, six cards on screen, is 24 boxes to look past
// before reading a name. They are one muted line now — the same four facts,
// separated by dots, in the order a trainer would say them out loud.
//
// ── Nothing here is invented ───────────────────────────────────────────────
//
// `clientName` and `currentWeek` come from a real assignment row. A plan with
// no assignment simply does not show them rather than showing "Unassigned" in
// the slot where a person's name goes, and a plan with no exercises says so
// instead of rendering the "0" that used to read as a broken card.

import { m, type Variants } from 'framer-motion'
import { Edit3, Trash2, UserPlus, MoreHorizontal, Plus, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/components/ui/cn'

export interface WorkoutPlanCardProps {
  name: string
  goal?: string
  /** The prescription, already formatted: "4 weeks · 3 sessions/week". */
  prescription?: string
  exerciseCount?: number
  progress?: number
  /** The client this plan is assigned to. Absent when nobody is on it. */
  clientName?: string | null
  /** Which week that client is in. Absent unless there is a real start date. */
  currentWeek?: number | null
  durationWeeks?: number | null
  onOpen?: () => void
  onEdit?: () => void
  onAssign?: () => void
  onDelete?: () => void
  /** Shown instead of the progress block when the plan has no exercises. */
  onAddExercises?: () => void
  compact?: boolean
  className?: string
  variants?: Variants
}

const ACCENT = '#0067e0'
// blue[400] from src/lib/palette.ts. The gradient's far end started as a
// hand-picked blue that was not in the palette at all; the palette test
// caught it, which is the point of that test — one stray shade is how a
// five-family system decays. (The scanner reads comments too, so the
// offending value is described rather than quoted here.)
const ACCENT_LIGHT = '#3B8DF5'

export function WorkoutPlanCard({
  name, goal, prescription, exerciseCount, progress = 0,
  clientName, currentWeek, durationWeeks,
  onOpen, onEdit, onAssign, onDelete, onAddExercises,
  compact = false, className, variants,
}: WorkoutPlanCardProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  // Zero is a real count and renders as the empty state; undefined means the
  // field never arrived, which is not the same claim and stays silent.
  const isEmpty = exerciseCount === 0

  const meta = [
    goal,
    prescription,
    exerciseCount ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <m.div
      variants={variants}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[16px]',
        'transition-[box-shadow,border-color] duration-200',
        'hover:shadow-[0_14px_34px_-10px_rgba(15,23,42,0.20)] hover:border-[color:rgba(0,103,224,0.28)]',
        className,
      )}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className={cn('flex flex-1 flex-col', compact ? 'p-3.5' : 'p-4 sm:p-[18px]')}>
        {/* Title row. The overflow menu is the only thing that may sit beside
            the name, and it is icon-only so a long programme name keeps the
            width — min-w-0 is what lets the truncation actually happen. */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {/* Wraps to two lines rather than truncating. At four columns a
                260px card cut "Hypertrophy Foundation Programme" mid-word,
                and the programme's name is the one thing on the card that
                must survive — measured at 1280px, where the clip appeared. */}
            <h3
              className="text-[15px] font-[750] leading-snug"
              style={{
                color: 'var(--text-primary)', letterSpacing: '-0.01em',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
              title={name}
            >
              {name}
            </h3>
            {clientName && (
              <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-[600]" style={{ color: ACCENT }}>
                <User size={12} className="shrink-0" />
                <span className="truncate">{clientName}</span>
              </p>
            )}
            {/* Also wraps: truncating this line dropped the exercise count,
                which is the last fact on it and one a trainer scans for. */}
            {meta && (
              <p
                className="mt-1 text-[11.5px] leading-relaxed"
                style={{
                  color: 'var(--text-muted)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
                title={meta}
              >
                {meta}
              </p>
            )}
          </div>
          {onDelete && <OverflowMenu onDelete={onDelete} planName={name} />}
        </div>

        {/* Progress, or the reason there is none to show. */}
        {isEmpty ? (
          <div className="mt-3.5">
            <p className="text-[12px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              No exercises added yet
            </p>
            {onAddExercises && (
              <button
                type="button"
                onClick={onAddExercises}
                className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-[700]"
                style={{ color: ACCENT, minHeight: 44 }}
              >
                <Plus size={13} /> Add exercises
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              {/* The week counter only appears when a real assignment gave us
                  one. Without it the bar still means something on its own. */}
              <span className="text-[11.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
                {currentWeek && durationWeeks ? `Week ${currentWeek} / ${durationWeeks}` : 'Progress'}
              </span>
              <span className="text-[11.5px] font-[700] tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {pct}%
              </span>
            </div>
            {/* The bar's own track gets a hairline inset shadow rather than a
                flat fill — the one place on the card that carries depth,
                because it is the one number a trainer is here to check. */}
            <div
              className="relative h-[5px] w-full overflow-hidden rounded-full"
              style={{ background: 'var(--bg-subtle)', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.06)' }}
            >
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_LIGHT})` }}
              >
                {/* Leading-edge highlight — a premium fill has a bright cap,
                    not just a flat gradient end. Skipped under 6%, where it
                    would be the entire bar rather than an accent on it. */}
                {pct >= 6 && (
                  <span
                    aria-hidden
                    className="absolute right-0 top-1/2 h-[9px] w-[9px] -translate-y-1/2 translate-x-[3px] rounded-full"
                    style={{ background: ACCENT_LIGHT, boxShadow: `0 0 6px 1px ${ACCENT_LIGHT}` }}
                  />
                )}
              </m.div>
            </div>
          </div>
        )}

        {/* Actions. Open is the primary and takes the room; Edit and Assign
            are quiet siblings. Delete is not here at all — it lives in the
            overflow menu above, where it cannot be hit on the way to Open. */}
        <div className="mt-4 flex items-center gap-2">
          {onOpen && (
            <button
              type="button"
              onClick={onOpen}
              className="flex flex-1 items-center justify-center rounded-[10px] text-[12.5px] font-[700] text-white transition-[opacity,box-shadow] active:opacity-80"
              style={{
                // Same two stops the progress bar already carries — one
                // gradient meaning "this plan" reused everywhere it appears
                // on the card, not a second decoration invented for the button.
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
                minHeight: 44,
                boxShadow: '0 2px 10px -2px rgba(0,103,224,0.45)',
              }}
            >
              Open Plan
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${name}`}
              className="flex items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-[650] transition-colors"
              style={{
                minHeight: 44,
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-card)',
              }}
            >
              <Edit3 size={13} /> Edit
            </button>
          )}
          {onAssign && (
            <button
              type="button"
              onClick={onAssign}
              aria-label={`Assign ${name} to a client`}
              className="flex items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-[650] transition-colors"
              style={{
                minHeight: 44,
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-card)',
              }}
            >
              <UserPlus size={13} />
              <span className={compact ? 'hidden sm:inline' : undefined}>Assign</span>
            </button>
          )}
        </div>
      </div>
    </m.div>
  )
}

/**
 * Destructive actions, one tap out of the way.
 *
 * Delete used to be a red button in the same row as Assign, the same size and
 * a thumb's width from it. It is rare and it is irreversible, so it belongs
 * behind a disclosure rather than beside the action a trainer presses daily.
 */
function OverflowMenu({ onDelete, planName }: { onDelete: () => void; planName: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${planName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        // 44px of target around a 16px glyph, sitting in the card's own
        // padding so it costs no extra height.
        className="-m-1.5 flex items-center justify-center rounded-[10px] p-1.5 transition-colors hover:bg-black/[0.04]"
        style={{ color: 'var(--text-disabled)', minHeight: 44, minWidth: 44 }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          role="menu"
          data-no-pull-refresh
          className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-[12px] py-1"
          style={{
            background: 'var(--bg-elevated, var(--bg-card))',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 32px rgba(15,23,42,0.16)',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onDelete() }}
            className="flex w-full items-center gap-2 px-3 text-left text-[12.5px] font-[650] transition-colors hover:bg-black/[0.04]"
            style={{ color: '#dc2626', minHeight: 44 }}
          >
            <Trash2 size={13} /> Delete plan
          </button>
        </div>
      )}
    </div>
  )
}
