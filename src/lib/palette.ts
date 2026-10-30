/**
 * The app's colour system — one source of truth for every surface.
 *
 * Eight families, each with a meaning. Nothing else is a colour in this app:
 *
 *   blue     Logo blue — the mark, and the few surfaces that must match it
 *   indigo   Actions, links, highlights, selected state (the UI accent)
 *   emerald  Success, completed, active, healthy
 *   mint     Positive accent — deltas, healthy charts, "on track"
 *   amber    Warning, pending, due soon, partial
 *   orange   Warm accent — one highlight, never a warning or a second CTA
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
 * Aurora added indigo, mint and orange back deliberately: indigo is the one
 * action colour (the logo blue stays on the mark), mint is the positive
 * accent, and orange is a warm highlight that never means "warning".
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
 * Logo blue — the mark's own blue.
 *
 * Anchored on the blue measured out of the logo artwork rather than a generic
 * Tailwind blue; see src/lib/brand.ts for how the three brand stops (450, 500,
 * 600) were sampled. 950 is not "darker than 900" — it is a deliberately
 * brighter blue for icons sitting on the near-black gray[900] tiles, where the
 * deep 500 only reaches 3.4:1.
 *
 * UI actions moved to `indigo` in Aurora; this ramp remains for the wordmark,
 * the logo-blue tokens and the surfaces that must visibly match the artwork.
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

/**
 * The action ramp — primary buttons, links, selected rows, focus rings and the
 * hero. Values are the warm ramp (peach #FFBB94 through plum #4C1D3D) chosen
 * over the original indigo; the family keeps its module name so every import
 * stays put, and renaming it is separate work.
 *
 * Same index rules as before, checked against the new values:
 *   300  the tone that survives on a dark surface (peach on near-black)
 *   400  decoration only — 2.1:1 on white, never a label
 *   450  decoration only — 3.7:1 on white, never a label
 *   500  the fill; white labels clear AA at 6.5:1
 *   600  text-safe tone on a light tint, and hover on a 500 fill, at 8.4:1
 *
 * The ramp is one hue, so it cannot also serve as the "merely different"
 * colour that `identity` and `series` want — those stay listable but now read
 * as the brand, not as a neutral alternative.
 */
export const indigo = {
  50:  '#FFF7F3',
  100: '#FFE9E0',
  200: '#FFD0C6',
  300: '#FFBB94',
  400: '#FB9590',
  450: '#DC586D',
  500: '#A33757',
  600: '#852E4E',
  700: '#6B2440',
  800: '#4C1D3D',
  900: '#2B1220',
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

/** Mint — positive accent: deltas, healthy charts, "on track". */
export const mint = {
  50:  '#E6F8F4',
  100: '#C9F1E9',
  200: '#9AE5D7',
  300: '#63D6C1',
  400: '#3AC9AF',
  500: '#20BFA4',
  600: '#159B85',
  700: '#117A6A',
  800: '#0D5C50',
  900: '#093F37',
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

/** Orange — a warm highlight. Never a warning, never a second CTA. */
export const orange = {
  50:  '#FFF1E8',
  100: '#FFE1CE',
  200: '#FFC7A5',
  300: '#FFA876',
  400: '#FF9557',
  500: '#FF853D',
  600: '#E56A24',
  700: '#B8521A',
  800: '#8C3E14',
  900: '#662D0F',
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
  25:  '#F7F9FD',
  50:  '#F8FAFC',
  100: '#F1F5F9',
  150: '#E7EAF0',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  550: '#667085',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#0E1420',
} as const;

export const palette = { blue, indigo, emerald, mint, amber, orange, red, gray } as const;

/**
 * What each family means, by name rather than by hue.
 *
 * Reach for these first: `semantic.danger` says why the thing is red, which
 * `red[500]` does not, and it is the difference between a later theme change
 * being one edit or two hundred.
 */
export const semantic = {
  primary:    indigo[500],
  primaryHi:  indigo[400],
  primaryLo:  indigo[600],
  actionText: indigo[600],
  onDark:     indigo[300],

  success:    emerald[500],
  successLo:  emerald[600],
  positive:   mint[500],
  positiveLo: mint[700],

  warm:       orange[500],
  warmLo:     orange[700],

  warning:    amber[500],
  warningLo:  amber[600],

  danger:     red[500],
  dangerLo:   red[600],

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
 * A semantic colour cannot also be an arbitrary series colour without "green"
 * starting to mean "the third bar". Where a chart is genuinely categorical
 * rather than semantic, this walks the indigo ramp — the primary, then lighter
 * and darker — before borrowing another family, so a two or three series chart
 * stays entirely in one hue and reads as one object.
 */
export const series = [
  indigo[500],
  indigo[300],
  indigo[700],
  mint[500],
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
 * Deliberately no emerald, mint, amber, orange or red: those families mean
 * something here, and a client whose avatar came out red should not look
 * overdue. This walks the indigo ramp against two greys instead, which is both
 * in-system and how Apple tints this kind of thing.
 *
 * Index into it with a stable hash of the row's id, not its position in a
 * list, or the colour changes when the list re-sorts.
 */
export const identity = [
  indigo[500],
  indigo[300],
  indigo[700],
  gray[500],
  indigo[400],
  gray[400],
  indigo[900],
  indigo[200],
] as const;

/**
 * Founder gold. One badge, and nothing else.
 *
 * This is the second deliberate exception to the families, and it is made the
 * same way `identity` above is: by being explicitly NOT semantic. Each family
 * carries a meaning — indigo is action, emerald is success, mint is positive,
 * amber is warning, orange is a warm highlight, red is failure, gray is
 * neutral — and a colour that means something is exactly what this must not
 * be. Founder status is not a state to act on.
 * It is a permanent mark of who bought in first.
 *
 * Amber was the obvious in-system alternative and is the wrong one twice over:
 * a gold-ish badge rendered in the warning colour reads as a problem beside
 * the studio name, and using it here would dilute amber everywhere else.
 *
 * Scoped by convention AND by test: founder-badge.test.tsx asserts these
 * values appear in exactly one component. If a second file starts reaching for
 * gold, that is the moment to stop and ask what it is really trying to say.
 *
 * The ramp is a real metallic sweep rather than one flat yellow — dark bronze
 * through pale champagne — because the shimmer needs stops to travel between.
 */
export const founderGold = {
  100: '#FDF6E3',
  200: '#F7E7B4',
  300: '#EFD27C',
  400: '#E3B94A',
  500: '#C9971F',
  600: '#A87A12',
  700: '#7C570B',
} as const;

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
