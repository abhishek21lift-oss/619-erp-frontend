/**
 * Landing design tokens — a self-contained system for the public marketing
 * page, drawn from the app's own palette (src/lib/palette.ts) so the site and
 * the product share one colour language:
 *
 *   · near-black navy canvas (gray-900 family)   — the deep base
 *   · royal blue (#0067E0)                       — primary action
 *   · saffron / gold (amber family)              — the accent
 *
 * The page renders its own surfaces deliberately: the app is light-mode-first,
 * but the marketing site sits on a dark cinematic canvas. Token names are the
 * only colours used across the landing components — no one-off hex values.
 */

export const C = {
  // ── Surfaces ────────────────────────────────────────────────────────────
  canvas: '#0B1220', // near-black navy — page base
  canvasAlt: '#0D1728', // alternate section band
  panel: '#101B30', // elevated panels, product frames
  panelAlt: '#0E182A', // nested surfaces inside a panel
  line: 'rgba(148,163,184,0.16)', // hairline borders
  lineSoft: 'rgba(148,163,184,0.10)',
  lineBlue: 'rgba(0,103,224,0.40)', // active-state borders

  // ── Text ────────────────────────────────────────────────────────────────
  ink: '#F8FAFC', // primary text on canvas
  body: '#CBD5E1', // body copy (≈12.9:1 on canvas)
  muted: '#94A3B8', // secondary text (≈7.7:1 on canvas)
  faint: '#64748B', // captions, disabled

  // ── Brand ───────────────────────────────────────────────────────────────
  blue: '#0067E0', // primary action (logo blue)
  blueHi: '#1CA3F9', // blue text/icons on dark (--blue-on-dark token)
  blueLo: '#0059CE', // gradient end
  blue450: '#0271EB', // button gradient start (blue[450])
  blueHover: '#5CC0FB', // hover for small blue links
  trackDot: '#334155', // mock toggle dots (gray[700])
  blueWash: 'rgba(0,103,224,0.14)',
  blueWashStrong: 'rgba(0,103,224,0.22)',
  blueGlow: 'rgba(0,103,224,0.45)',

  // ── Accent ──────────────────────────────────────────────────────────────
  gold: '#F59E0B', // saffron accent
  goldHi: '#FBBF24', // bright saffron for text on dark
  goldSoft: 'rgba(245,158,11,0.12)',
  goldGlow: 'rgba(245,158,11,0.35)',
  onGold: '#331B00', // text on gold fills

  // ── Status ──────────────────────────────────────────────────────────────
  emerald: '#34D399',
  emeraldSoft: 'rgba(52,211,153,0.12)',
  onEmerald: '#052E22', // text/icons on emerald fills
  red: '#F87171',
  redSoft: 'rgba(248,113,113,0.12)',

  // ── Marketing surfaces ──────────────────────────────────────────────────
  skyHi: '#7DD3FC', // hero gradient highlight
  ctaFrom: '#021E4A', // final CTA panel gradient start
  ctaTo: '#062B5E', // final CTA panel gradient mid
  highlightFrom: '#01265C', // pricing highlight card gradient start
  highlightMid: '#0A1730', // pricing highlight card gradient mid
} as const;

/** House easing curve (matches the app's EASE everywhere else). */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Elevation — deep, blue-tinted shadows for dark surfaces. */
export const SHADOW = {
  card: '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px -12px rgba(0,0,0,0.55)',
  panel: '0 32px 72px -24px rgba(0,0,0,0.65), 0 8px 24px -16px rgba(0,0,0,0.5)',
  float: '0 24px 56px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(148,163,184,0.10)',
  blueGlow: '0 12px 34px -10px rgba(0,103,224,0.55)',
} as const;

/** Fixed-width numbers everywhere figures appear. */
export const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;