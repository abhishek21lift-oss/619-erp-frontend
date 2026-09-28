/**
 * The Today's Sessions card's colour — Apple Fitness energy for the one card
 * a trainer opens between clients.
 *
 * The staff app runs on five families that each mean something (blue action,
 * emerald success, amber warning, red failure, gray neutral), and this card
 * keeps them for what MEANS something: a live session is emerald, a warning
 * about a programme is amber. What it adds is decoration — the header mark,
 * the day's progress ring and the avatar halos — which must not borrow a
 * meaningful family: the old card's header wore the overdue red, and its
 * "3 left" count read as an error.
 *
 * The seventh deliberate exception to the palette, made the same way as the
 * member portal's spectrum and the exercise library's regions: its own token
 * file, exempt from the palette scan, and confined to the dashboard by
 * palette.test.ts. Same hues as the member spectrum, so the two apps share
 * one set.
 */

const spectrum = {
  pink:   { 400: '#F472B6', 500: '#EC4899', 600: '#DB2777' },
  orange: { 400: '#FB923C', 500: '#F97316' },
  indigo: { 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5' },
  violet: { 500: '#8B5CF6' },
  cyan:   { 400: '#22D3EE' },
  teal:   { 400: '#2DD4BF', 500: '#14B8A6' },
} as const;

/** The card's own mark: warm, like a stopwatch — never the overdue red. */
export const todayMark = {
  from: spectrum.orange[400],
  to: spectrum.pink[500],
  glow: 'rgba(236,72,153,0.35)',
} as const;

/** The day's progress ring — Apple's Move ring, pink to orange. */
export const ringStops = [spectrum.pink[600], spectrum.orange[400]] as const;
export const ringTrack = 'rgba(236,72,153,0.14)';

/**
 * A row's state as a gradient: who is on the floor, who is next, and who
 * is waiting behind them. Live stays in the emerald family's meaning (a
 * session in progress is the good state) via teal-to-cyan; next is the
 * primary action's blue pulled toward indigo; waiting is violet, quiet.
 */
export const rowTones = {
  live:    { from: spectrum.teal[400],   to: spectrum.cyan[400],   ink: '#0F766E', wash: 'rgba(20,184,166,0.10)', glow: 'rgba(20,184,166,0.30)' },
  next:    { from: spectrum.indigo[400], to: spectrum.indigo[600], ink: '#4338CA', wash: 'rgba(99,102,241,0.09)',  glow: 'rgba(99,102,241,0.30)' },
  waiting: { from: spectrum.violet[500], to: spectrum.pink[400],   ink: '#6D28D9', wash: 'rgba(139,92,246,0.06)', glow: 'rgba(139,92,246,0.22)' },
} as const;

export type RowTone = keyof typeof rowTones;

export function gradient(from: string, to: string, angle = 135): string {
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}
