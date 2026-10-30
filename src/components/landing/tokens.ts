/**
 * Public surface tokens — the marketing site, Start Free, the three sign-in
 * doors and password recovery.
 *
 * ── The look ────────────────────────────────────────────────────────────────
 *
 * Clean, light and product-led, in the spirit of apple.com: a white page, one
 * near-black ink, a grey band for rhythm, and colour spent only where it
 * carries meaning — the action plum, and small accents on product surfaces.
 * Elevation is a real drop shadow, not an inset/outset light pair; cards are
 * white on grey, not the page pushed out.
 *
 * Everything here is public-only. The signed-in app keeps its own palette in
 * src/lib/palette.ts; these values never leak into it.
 *
 * Contrast: body and caption tokens are 4.5:1 or better on `canvas` and
 * `canvasAlt`. The action plum carries white at 6.5:1. Orange is a fill and
 * icon colour, never body text on white.
 */

export const C = {
  // ── Surfaces ────────────────────────────────────────────────────────────
  canvas: '#FFFFFF',
  canvasAlt: '#F5F5F7', // the grey band Apple alternates sections with
  panel: '#FFFFFF',
  panelAlt: '#F5F5F7',
  lightSrc: '#FFFFFF',
  darkSrc: 'rgba(0,0,0,0.08)',
  line: '#D2D2D7',
  lineSoft: 'rgba(0,0,0,0.08)',
  lineBlue: 'rgba(163,55,87,0.35)',

  // ── Text ────────────────────────────────────────────────────────────────
  ink: '#1D1D1F', // 16.1:1 on white
  body: '#3A3A3C', // 11.4:1
  muted: '#6E6E73', // 5.1:1
  faint: '#6F6F74', // 5.0:1 on white, 4.6:1 on the grey band — captions, not body copy

  // ── Brand ───────────────────────────────────────────────────────────────
  blue: '#A33757', // action fill; white on it 6.5:1
  blueHi: '#A33757', // links and icons on white — 6.5:1
  blueLo: '#852E4E', // hover fill; white on it 8.4:1
  blue450: '#A33757',
  blueHover: '#6B2440',
  trackDot: '#D2D2D7',
  blueWash: 'rgba(163,55,87,0.08)',
  blueWashStrong: 'rgba(163,55,87,0.14)',
  blueGlow: 'rgba(163,55,87,0.22)',

  // ── Accents ─────────────────────────────────────────────────────────────
  // Decorative product colour, used on small surfaces and gradients. Text
  // versions are dark enough to pass on white.
  gold: '#FF9500',
  goldHi: '#C2410C', // 5.0:1
  goldSoft: 'rgba(255,149,0,0.12)',
  goldGlow: 'rgba(255,149,0,0.20)',
  onGold: '#1D1D1F', // dark ink on orange, 6.4:1
  violet: '#6E5AE6',
  violetHi: '#5B45D6', // 6.0:1
  violetSoft: 'rgba(110,90,230,0.10)',
  pink: '#E84A8A',
  pinkHi: '#C62E6E', // 5.4:1
  pinkSoft: 'rgba(232,74,138,0.10)',
  teal: '#0E9AA7',
  tealHi: '#0B7C87', // 4.9:1
  tealSoft: 'rgba(14,154,167,0.10)',

  // ── Status ──────────────────────────────────────────────────────────────
  emerald: '#1D7A46', // 5.2:1
  emeraldSoft: 'rgba(29,122,70,0.10)',
  onEmerald: '#FFFFFF',
  red: '#D70015', // 5.9:1
  redSoft: 'rgba(215,0,21,0.08)',

  // ── Marketing surfaces ──────────────────────────────────────────────────
  skyHi: '#A33757',
  ctaFrom: '#F5F5F7',
  ctaTo: '#FFFFFF',
  highlightFrom: '#F5F5F7',
  highlightMid: '#FFFFFF',
} as const;

/** House easing curve (matches the app's EASE everywhere else). */
export const EASE = [0.16, 1, 0.3, 1] as const;

// ── Header ────────────────────────────────────────────────────────────────
// A 48px translucent bar, the way apple.com's global nav behaves: the page
// shows through, a hairline holds the bottom edge, and the bar is the same
// height on every signed-out page so moving between them never jumps.
export const HEADER = {
  padTop: 'max(env(safe-area-inset-top), 0px)',
  bar: 'flex h-12 items-center justify-between',
  container: 'mx-auto w-full max-w-[1024px] px-6',
  bg: 'rgba(255,255,255,0.80)',
  blur: 'blur(20px) saturate(180%)',
  bgIdle: 'rgba(255,255,255,0.72)',
  blurIdle: 'blur(20px) saturate(180%)',
  border: 'rgba(0,0,0,0.08)',
  accentLine: 'rgba(0,0,0,0.08)',
  accentGlow: 'none',
  chipClass: 'transition-opacity hover:opacity-75',
  chipBlur: 'none',
  chipShadow: 'none',
  logoSize: 26,
} as const;

// ── Elevation ─────────────────────────────────────────────────────────────
// One soft drop shadow, scaled by how far a surface sits above the page.
export const SHADOW = {
  card: '0 2px 12px rgba(0,0,0,0.05)',
  panel: '0 20px 60px -24px rgba(0,0,0,0.20)',
  float: '0 14px 40px -16px rgba(0,0,0,0.18)',
  raised: '0 1px 3px rgba(0,0,0,0.06)',
  inset: 'inset 0 1px 2px rgba(0,0,0,0.04)',
  blueGlow: '0 10px 30px -12px rgba(163,55,87,0.45)',
} as const;

/**
 * Readable ink for an arbitrary fill.
 *
 * Compares both candidates outright rather than guessing a luminance
 * threshold — saffron/orange is exactly the value a threshold gets wrong.
 */
function relativeLuminance(hex: string): number {
  const lin = [0, 2, 4]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function inkOn(fill: string): string {
  const hex = fill.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#fff';
  const bg = relativeLuminance(hex);
  const contrast = (fg: number) => {
    const [hi, lo] = bg > fg ? [bg, fg] : [fg, bg];
    return (hi + 0.05) / (lo + 0.05);
  };
  return contrast(1) >= contrast(relativeLuminance(C.onGold.replace('#', ''))) ? '#fff' : C.onGold;
}

// ── The studio mark ────────────────────────────────────────────────────────
export const MARK = {
  shadow: 'drop-shadow(0 24px 30px rgba(15,23,42,0.14)) drop-shadow(0 4px 6px rgba(15,23,42,0.08))',
  bloom: 'radial-gradient(closest-side, rgba(163,55,87,0.16), rgba(110,90,230,0.08) 55%, transparent)',
  contact: 'radial-gradient(closest-side, rgba(15,23,42,0.16), rgba(15,23,42,0.05) 60%, transparent)',
  contactWide: 'radial-gradient(closest-side, rgba(15,23,42,0.06), transparent)',
} as const;

// ── Signed-out controls ────────────────────────────────────────────────────
export const FIELD = {
  base:
    'w-full rounded-[12px] border bg-white text-[16px] leading-none text-[#1D1D1F] ' +
    'outline-none transition-[border-color,box-shadow,background-color] duration-200 ' +
    'placeholder:text-[#86868B]',
  ok: 'border-[#D2D2D7] hover:border-[#B8B8BD] focus:border-[#A33757] focus:shadow-[0_0_0_3px_rgba(163,55,87,0.18)]',
  invalid: 'border-[#D70015] focus:border-[#D70015] focus:shadow-[0_0_0_3px_rgba(215,0,21,0.12)]',
  icon: 'text-[#6E6E73] transition-colors group-focus-within:text-[#A33757]',
} as const;

/** The primary action: one flat blue pill, the way apple.com sells a product. */
export const PRIMARY_BUTTON =
  'relative inline-flex items-center justify-center gap-2 rounded-full bg-[#A33757] font-[500] text-white ' +
  'transition-colors duration-200 hover:bg-[#852E4E] active:bg-[#6B2440] ' +
  'disabled:cursor-default disabled:opacity-50 disabled:hover:bg-[#A33757] ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(163,55,87,0.25)]';

/** A quiet secondary action: white pill, hairline border. */
export const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[#D2D2D7] bg-white font-[500] ' +
  'text-[#1D1D1F] transition-colors duration-200 hover:bg-[#F5F5F7] ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(0,0,0,0.10)]';

/** The form card: a white sheet on the grey stage. */
export const CARD = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.06)',
  boxShadow: '0 24px 60px -28px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.04)',
  backdropFilter: 'none',
} as const;

/** The page behind everything: white, with one soft light from the top. */
export const STAGE = {
  light: 'radial-gradient(90% 60% at 50% 0%, #FFFFFF 0%, #F5F5F7 55%, #FFFFFF 100%)',
  grid: 'none',
  gridSize: '0px 0px',
  gridMask: 'none',
  horizon: 'transparent',
} as const;
