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
  // Lightened one step from the original near-black (#0B1220 family) — still
  // a dark cinematic canvas, just no longer reading as pure black at a glance.
  canvas: '#0E1A2E', // navy — page base
  canvasAlt: '#101D34', // alternate section band
  panel: '#16233D', // elevated panels, product frames
  panelAlt: '#13203A', // nested surfaces inside a panel
  line: 'rgba(148,163,184,0.16)', // hairline borders
  lineSoft: 'rgba(148,163,184,0.10)',
  lineBlue: 'rgba(0,103,224,0.40)', // active-state borders

  // ── Text ────────────────────────────────────────────────────────────────
  ink: '#F8FAFC', // primary text on canvas
  body: '#CBD5E1', // body copy (≈11.7:1 on canvas)
  muted: '#94A3B8', // secondary text (≈6.8:1 on canvas)
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

// ── Header system — the canonical top bar ─────────────────────────────────
// The landing navbar (LandingNav) is the single source of truth for every
// top bar in the product. Start Free, Sign In and the Command Center door
// reuse these EXACT values so all of them occupy the same vertical space and
// moving between pages never changes the header's height or proportions.
// Do not restyle one header in isolation — change it here first.
//
// The bar is deliberately a different, bluer, lighter tone than the page
// canvas (C.canvas / C.panel) rather than a translucent copy of it — the
// point of a top bar is to read as its own strip, not as a see-through
// window onto the page behind it.
export const HEADER = {
  // Top reserve above the bar for notched devices (landing: 1.5rem floor).
  padTop: 'max(env(safe-area-inset-top), 1.5rem)',
  // The bar row that holds the logo and the page actions (h-16 = 64px).
  bar: 'flex h-16 items-center justify-between',
  // Outer container — same width and horizontal gutters as the landing nav.
  container: 'mx-auto w-full max-w-[1200px] px-5 sm:px-8',
  // Glass chrome, scrolled state (and always-on for the auth bars) — solid
  // enough to read as a distinct strip against any section behind it.
  bg: 'rgba(23,41,74,0.90)',
  blur: 'blur(18px) saturate(160%)',
  // Idle state, landing nav only: still tinted rather than fully transparent,
  // so the bar never fully dissolves into the hero and the logo has a strip
  // to sit on from the very first frame, before any scrolling happens.
  bgIdle: 'rgba(23,41,74,0.46)',
  blurIdle: 'blur(9px) saturate(140%)',
  border: 'rgba(148,163,184,0.10)',
  // Saffron accent — 1px hairline along the bar's bottom edge, kept at low
  // opacity so it reads as a premium underline, not an orange border. The
  // glow is the soft halo beneath that line.
  accentLine: 'rgba(245,158,11,0.40)',
  accentGlow: '0 10px 24px -12px rgba(245,158,11,0.35)',
  // Logo chip — a glass pill one step lighter than the bar itself, so the
  // logo clearly sits ON the bar rather than blending into it.
  chipClass:
    'rounded-2xl border border-[rgba(148,163,184,0.18)] bg-[rgba(31,52,89,0.92)] px-3 py-2 transition-colors hover:border-[rgba(148,163,184,0.32)] hover:bg-[rgba(31,52,89,0.98)]',
  chipBlur: 'blur(14px) saturate(150%)',
  chipShadow:
    '0 1px 2px rgba(0,0,0,0.4), 0 6px 20px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)',
  // Logo lockup (Wordmark tile + wordmark text).
  logoSize: 38,
} as const;

/** Elevation — deep, blue-tinted shadows for dark surfaces. */
export const SHADOW = {
  card: '0 1px 2px rgba(0,0,0,0.35), 0 8px 24px -12px rgba(0,0,0,0.55)',
  panel: '0 32px 72px -24px rgba(0,0,0,0.65), 0 8px 24px -16px rgba(0,0,0,0.5)',
  float: '0 24px 56px -20px rgba(0,0,0,0.65), 0 0 0 1px rgba(148,163,184,0.10)',
  blueGlow: '0 12px 34px -10px rgba(0,103,224,0.55)',
} as const;

/** Fixed-width numbers everywhere figures appear. */
export const TABULAR = { fontVariantNumeric: 'tabular-nums' } as const;