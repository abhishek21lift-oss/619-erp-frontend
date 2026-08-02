/**
 * The app's colour system — one source of truth for every surface.
 *
 * Five families, each with a meaning. Nothing else is a colour in this app:
 *
 *   blue     Primary actions, links, highlights, selected state
 *   emerald  Success, completed, active, healthy
 *   amber    Warning, pending, due soon, partial
 *   red      Error, expired, overdue, destructive
 *   gray     Surfaces, borders, secondary text — everything neutral
 *
 * This replaced a palette of 226 distinct hex values (indigo, violet, purple,
 * cyan, magenta, teal, orange, lime, maroon, saffron, gold and five separate
 * greys) with 47. The old set had no rule behind it: three different blues
 * could appear in one card, and the same amber meant "warning" in one place
 * and "this tile is the fourth one" in another, so colour carried no
 * information at all.
 *
 * ── Choosing a tone ────────────────────────────────────────────────────────
 *   50/100    page and chip backgrounds — a wash, not a fill
 *   200/300   borders, dividers, disabled fills, chart gridlines
 *   400       icons and marks on dark surfaces
 *   500       THE colour: solid fills, primary buttons, status dots
 *   600       hover/pressed on a 500 fill, and text on a 50/100 tint
 *   700-900   text on light tints where 600 is not dark enough, deep gradients
 *
 * Text on a tint should be 600 or darker: 500 on its own 50 tint is around
 * 3:1 and fails WCAG AA for body copy.
 */

/**
 * Royal blue — primary actions, links, highlights.
 *
 * Anchored on the blue measured out of the logo artwork rather than a generic
 * Tailwind blue; see src/lib/brand.ts for how the three brand stops (450, 500,
 * 600) were sampled. 950 is not "darker than 900" — it is a deliberately
 * brighter blue for icons sitting on the near-black gray[900] tiles, where the
 * deep 500 only reaches 3.4:1.
 */
export const blue = {
  50:  '#F2F8FF',
  100: '#E1EFFF',
  200: '#B8D7FF',
  300: '#7FB4FF',
  400: '#3B8DF5',
  450: '#0271EB',
  500: '#0067E0',
  600: '#0059CE',
  700: '#0050AD',
  800: '#003F87',
  900: '#002D61',
  950: '#1CA3F9',
} as const;

/** Emerald — success, completed, active, healthy. */
export const emerald = {
  50:  '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
} as const;

/** Amber — warnings, pending, due soon, partial. */
export const amber = {
  50:  '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
} as const;

/** Red — errors, expired, overdue, destructive actions. */
export const red = {
  50:  '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
} as const;

/** Gray — neutral backgrounds, borders, secondary text. A slate ramp. */
export const gray = {
  0:   '#FFFFFF',
  50:  '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
} as const;

export const palette = { blue, emerald, amber, red, gray } as const;

/**
 * What each family means, by name rather than by hue.
 *
 * Reach for these first: `semantic.danger` says why the thing is red, which
 * `red[500]` does not, and it is the difference between a later theme change
 * being one edit or two hundred.
 */
export const semantic = {
  primary:   blue[500],
  primaryHi: blue[450],
  primaryLo: blue[600],
  onDark:    blue[950],

  success:   emerald[500],
  successLo: emerald[600],

  warning:   amber[500],
  warningLo: amber[600],

  danger:    red[500],
  dangerLo:  red[600],

  ink:       gray[900],
  body:      gray[700],
  muted:     gray[500],
  faint:     gray[400],
  border:    gray[200],
  surface:   gray[50],
  base:      gray[0],
} as const;

/**
 * Categorical series for charts, in order.
 *
 * Five semantic colours cannot also be five arbitrary series colours without
 * "green" starting to mean "the third bar". Where a chart is genuinely
 * categorical rather than semantic, this walks the ramp — the primary, then
 * lighter and darker blues — before borrowing another family, so a two or
 * three series chart stays entirely in one hue and reads as one object.
 */
export const series = [
  blue[500],
  blue[300],
  blue[700],
  emerald[500],
  amber[500],
  gray[400],
] as const;

/**
 * A five-step good→bad ramp, for scored bands: Excellent / Good / Average /
 * Needs Improvement / Poor, risk levels, adherence, readiness.
 *
 * Five bands out of three families needs two of them to contribute a second
 * tone, or adjacent bands come out identical — "Good" and "Average" both
 * landing on amber-500 tells the trainer nothing. Emerald and red each give a
 * light and a dark step; amber holds the middle alone, which is right, because
 * the middle should be the one that reads as neither.
 */
export const band = {
  best:  emerald[600],
  good:  emerald[400],
  mid:   amber[500],
  poor:  red[400],
  worst: red[600],
} as const;

/**
 * Distinguishable tones for things that are merely *different*, not good or bad
 * — avatar initials, trainer chips, template swatches, muscle groups.
 *
 * Deliberately no emerald, amber or red: those four families mean something
 * here, and a client whose avatar came out red should not look overdue. This
 * walks the blue ramp against two greys instead, which is both in-system and
 * how Apple tints this kind of thing.
 *
 * Index into it with a stable hash of the row's id, not its position in a
 * list, or the colour changes when the list re-sorts.
 */
export const identity = [
  blue[500],
  blue[300],
  blue[700],
  gray[500],
  blue[400],
  gray[400],
  blue[900],
  blue[200],
] as const;

/** Hex plus an 8-bit alpha suffix, e.g. tint(blue[500], 0.1). */
export function tint(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** `rgba(r, g, b, a)` from a 6-digit hex — for shadows and washes. */
export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
