/**
 * MY PT STUDIO visualization colours — chart colour, gradient colour and
 * status colour all trace back to this one file. Nothing here is invented:
 *
 *   · Saffron (#F59E0B and its ramp) is already the app's public-facing accent
 *     — see --saffron-* in src/app/globals.css and the "gold" tokens in
 *     src/components/landing/tokens.ts, both used on the marketing site today.
 *     Charts are the other place a studio owner actually looks at the brand,
 *     so they get the same accent rather than a third invented colour.
 *   · The near-black navy surface (canvas/panel) is the landing page's dark
 *     canvas, verbatim — the "premium SaaS" dark card look this system needs
 *     for hero metrics already exists; this reuses it instead of redrawing it.
 *
 * Every other visualization/theme/*.ts file, and every chart component, reads
 * colour through this module (or through a CSS var(--token, #fallback) whose
 * fallback is one of the app's own sanctioned five-family values) — never a
 * hand-written hex. src/__tests__/palette.test.ts enforces that: it confines
 * every literal hex under components/visualizations to this one file, the
 * same way the marketing page is confined to landing/tokens.ts. Changing the
 * studio's accent, in the future, is a one-line edit to `saffron[500]` here —
 * every chart, every gradient, every ring picks it up.
 *
 * SAFFRON IS THE ACCENT, NOT THE WARNING COLOUR. The app's semantic amber
 * (pending / due soon) happens to share saffron's hex — that's an existing
 * fact about this brand, not a new collision introduced here. Charts use
 * `series[0]` (saffron) for "the primary metric," and `semantic.warning`
 * (also saffron) only for an actual warning state — the same rule the rest
 * of the app already follows for amber.
 */

/** The full saffron ramp — identical to --saffron-* (and --amber-*) in globals.css. */
export const saffron = {
  50: '#FFFBEB',
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

/**
 * The always-dark "premium" surface — the landing page's cinematic navy,
 * reused verbatim (src/components/landing/tokens.ts § Surfaces). Opting a
 * chart card into `surface="dark"` (see ChartShell) puts it on this canvas
 * regardless of the app's own light/dark toggle — for hero metrics that
 * should always read as the premium dark tile, the way the dashboard's own
 * hand-rolled hero cards already do.
 */
export const navy = {
  canvas: '#0B1220',
  canvasAlt: '#0D1728',
  panel: '#101B30',
  panelAlt: '#0E182A',
  line: 'rgba(148,163,184,0.16)',
  lineSoft: 'rgba(148,163,184,0.10)',
  ink: '#F8FAFC',
  body: '#CBD5E1',
  muted: '#94A3B8',
  faint: '#64748B',
} as const;

/**
 * Categorical series — saffron leads because it's the brand accent, then a
 * curated run of hues at matched saturation so a multi-series chart reads as
 * one considered palette rather than a rainbow. Reuses the app's own blue,
 * emerald and red where a series is genuinely that semantic colour "by
 * coincidence" (e.g. series 2 is often revenue, which is already emerald
 * everywhere else); violet and teal are the two genuinely new hues, added
 * only because five categories is the app's ceiling and charts regularly
 * need more.
 */
export const series = [
  saffron[500], // primary — the brand accent
  '#0067E0', // royal blue — the app's own primary
  '#10B981', // emerald — success / revenue
  '#8B5CF6', // violet — new, for a 4th+ category
  '#F43F5E', // rose — distinct from semantic danger red
  '#06B6D4', // teal — new, for a 6th+ category
  '#64748B', // slate — "other" / inactive
] as const;

/** What each colour means when it's carrying a state, not just an index. */
export const semantic = {
  primary: saffron[500],
  success: '#10B981',
  warning: saffron[500],
  danger: '#EF4444',
  info: '#0067E0',
} as const;

/** A five-step good→bad ramp for scored bands, matching the app's own. */
export const band = {
  best: '#059669',
  good: '#34D399',
  mid: saffron[500],
  poor: '#F87171',
  worst: '#DC2626',
} as const;

/** Hex → `rgba(r,g,b,a)`, for tints and glows derived from a token above. */
export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * The icon chip every ChartShell header renders behind its icon. Always
 * saffron — it's brand identity, not app state, so unlike everything else in
 * the "auto" surface it does NOT read `var(--brand)`: that CSS var resolves
 * to the app's operational blue, not the studio's saffron accent, and routing
 * through it here would silently paint every chart's icon chip blue.
 */
export const iconChip = {
  bg: rgba(saffron[500], 0.12),
  bgDark: rgba(saffron[500], 0.14),
  fg: saffron[600],
  fgDark: saffron[400],
} as const;
