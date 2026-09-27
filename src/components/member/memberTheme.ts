/**
 * The member app's colour — a spectrum for the parts of the app that are
 * about how training FEELS, not about what state something is in.
 *
 * The staff app runs on five families that each mean something (blue action,
 * emerald success, amber warning, red failure, gray neutral), and it should:
 * a trainer scanning a roster needs colour to carry information. A member
 * opening their app between sets needs something else — energy — and a
 * screen of meaningful blues and greys reads as a bank statement.
 *
 * So this is the fifth deliberate exception to the palette, made the same way
 * as the marketing page and the chart system: its own token file, exempt from
 * the palette scan, and confined to this one file by palette.test.ts. Nothing
 * outside the member portal may import it.
 *
 * The rule that keeps it honest: these hues are DECORATIVE. They paint the
 * hero, the shortcut tiles and category icons — never a status. Anything that
 * says "owed", "expired", "done" or "failed" still uses the palette's amber,
 * red and emerald, so a member never has to guess whether pink means a problem.
 */

export const spectrum = {
  indigo: { 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
  violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9' },
  pink:   { 400: '#F472B6', 500: '#EC4899', 600: '#DB2777' },
  cyan:   { 300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4' },
  orange: { 400: '#FB923C', 500: '#F97316' },
  teal:   { 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488' },
} as const;

/**
 * The hero's mesh: a diagonal indigo→violet→pink base with a cyan glow at the
 * top left and an orange one at the bottom right. White text sits on the
 * indigo/violet half, which is where every line of it is laid out; the pink
 * end stays at 600 so large text there still clears 3:1.
 */
export const heroMesh = {
  base: `linear-gradient(135deg, ${spectrum.indigo[600]} 0%, ${spectrum.violet[600]} 48%, ${spectrum.pink[600]} 100%)`,
  glowA: spectrum.cyan[400],
  glowB: spectrum.orange[400],
  shadow: spectrum.violet[600],
} as const;

/** A two-stop gradient per category, for icon squircles and tiles. */
export const accents = {
  workout:  { from: spectrum.violet[500], to: spectrum.indigo[600] },
  diet:     { from: spectrum.teal[400],   to: spectrum.teal[600] },
  checkin:  { from: spectrum.orange[400], to: spectrum.pink[500] },
  progress: { from: spectrum.cyan[400],   to: spectrum.indigo[500] },
  records:  { from: spectrum.pink[400],   to: spectrum.violet[600] },
  plan:     { from: spectrum.violet[400], to: spectrum.pink[500] },
  studio:   { from: spectrum.indigo[500], to: spectrum.cyan[500] },
  neutral:  { from: '#94A3B8',            to: '#475569' },
} as const;

export type Accent = keyof typeof accents;

/** `linear-gradient` for an accent, at a given angle. */
export function accentGradient(a: Accent, angle = 135): string {
  const { from, to } = accents[a];
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}
