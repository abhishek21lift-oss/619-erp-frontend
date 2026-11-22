/**
 * The Today's Sessions card's colour.
 *
 * State, not decoration: a live session is emerald (success), the next booked
 * slot is Rosé (the action colour), and a waiting row is neutral. The card's
 * mark and day ring are Rosé too.
 *
 * This used to be a seven-hue "spectrum" borrowed from the member app. On the
 * staff dashboard it competed with the brand and made four states look like
 * four brands; the audit called it drift. The card keeps its energy through
 * the gradient and the ring, not through colours that mean something else
 * everywhere in the app.
 *
 * The module stays separate because `palette.test.ts` confines these tokens to
 * the dashboard: the same halos on a finance screen would be colour without
 * meaning.
 */

import { palette, rgba } from '@/lib/palette';

/** The card's own mark: Rosé, the same action colour as the rest of the app. */
export const todayMark = {
  from: palette.indigo[450],
  to: palette.indigo[600],
  glow: rgba(palette.indigo[500], 0.35),
} as const;

/** The day's progress ring, lit from the brand's light step to its fill. */
export const ringStops = [palette.indigo[500], palette.indigo[300]] as const;
export const ringTrack = rgba(palette.indigo[500], 0.14);

/**
 * A row's state as a gradient: who is on the floor, who is next, and who is
 * waiting behind them.
 *
 * Live keeps the emerald family's meaning (a session in progress is the good
 * state); next is the primary action colour; waiting is the neutral ramp.
 */
export const rowTones = {
  live: {
    from: palette.emerald[400],
    to: palette.emerald[500],
    ink: palette.emerald[800],
    wash: rgba(palette.emerald[500], 0.10),
    glow: rgba(palette.emerald[500], 0.30),
  },
  next: {
    from: palette.indigo[500],
    to: palette.indigo[600],
    ink: palette.indigo[600],
    wash: rgba(palette.indigo[500], 0.09),
    glow: rgba(palette.indigo[500], 0.30),
  },
  waiting: {
    from: palette.gray[400],
    to: palette.gray[500],
    ink: palette.gray[700],
    wash: rgba(palette.gray[500], 0.06),
    glow: rgba(palette.gray[500], 0.22),
  },
} as const;

export type RowTone = keyof typeof rowTones;

export function gradient(from: string, to: string, angle = 135): string {
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}
