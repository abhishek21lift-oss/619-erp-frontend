/**
 * MY PT STUDIO visualization tokens — the single source of colour, motion and
 * spacing values for every chart in src/components/visualizations.
 *
 * Nothing here is invented. It's assembled from what the app already declared
 * as its brand:
 *
 *   · Saffron (#F59E0B and its ramp) is already the app's public-facing accent
 *     — see --saffron-* in src/app/globals.css and the "gold" tokens in
 *     src/components/landing/tokens.ts, both used on the marketing site today.
 *     Charts are the other place a studio owner actually looks at the brand,
 *     so they get the same accent rather than a third invented colour.
 *   · The near-black navy surface (canvas/panel) is the landing page's dark
 *     canvas, verbatim — the "premium SaaS" dark card look this system needs
 *     for hero metrics already exists; this reuses it instead of redrawing it.
 *   · Neutrals for the "auto" surface (the default — charts that sit inside
 *     an ordinary light/dark-toggle-aware card) are CSS custom properties
 *     (var(--text-muted), var(--border), …) from globals.css, not literals —
 *     so a chart re-colours itself the instant [data-theme] flips, with zero
 *     JS branching and no light/dark duplication of this file.
 *   · The house easing curve [0.16, 1, 0.3, 1] is the same one already named
 *     EASE across PtOsDashboard.tsx and the landing components.
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

/** House easing — identical to EASE in PtOsDashboard.tsx and the landing page. */
export const EASE = [0.16, 1, 0.3, 1] as const;

export const motion = {
  /** Nivo's own transition duration for entrance/update animation. */
  duration: 650,
  /** Framer-motion transition, for anything hand-animated inside a chart shell. */
  spring: { duration: 0.65, ease: EASE },
  reducedSpring: { duration: 0 },
} as const;

/**
 * Spacing and radii — aliases onto the app's own --radius-* (and --shadow-*)
 * custom properties so a chart card is dimensionally identical to every
 * other card around it. Kept as CSS var() strings, not literals, so a global
 * radius/shadow change still reaches every chart with zero edits here.
 */
export const shape = {
  radius: 'var(--radius-md, 16px)',
  radiusSm: 'var(--radius-sm, 10px)',
  radiusFull: 'var(--radius-full, 9999px)',
  border: 'var(--border, rgba(15,23,42,0.08))',
  shadow: 'var(--shadow-card, 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05))',
  padding: 20,
  paddingSm: 14,
  gap: 14,
} as const;

/** Font stacks — the app's own, never a chart-specific typeface. */
export const type = {
  sans: 'var(--font-sans, Inter, system-ui, sans-serif)',
  mono: 'var(--font-mono, "JetBrains Mono", "Fira Code", monospace)',
  size: {
    xs: 10,
    sm: 11,
    base: 12,
    label: 13,
    value: 20,
  },
} as const;

/** Formats a number the same way across every chart unless a caller overrides it. */
export function defaultFormat(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}
