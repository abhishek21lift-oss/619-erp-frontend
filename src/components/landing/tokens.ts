/**
 * Landing design tokens — the surface system for the public pages: the
 * marketing site, Start Free, the three sign-in doors, and password recovery.
 *
 * ── Neumorphism, and what that actually means here ─────────────────────────
 *
 * This surface used to be a dark cinematic canvas (a near-black navy, deep
 * black shadows, glass panels floating over radial glows). It is now soft-UI:
 * ONE light base colour, and elements made of that same colour, told apart
 * only by how the light falls on them.
 *
 * That is the whole grammar, and it is worth stating because it inverts the
 * usual one. A raised card is not a lighter box on a darker page — there is
 * no lighter box, it is the page, pushed out. Two shadows do the work: a warm
 * white one up and to the left, a cool grey one down and to the right. An
 * input is the same trick inverted: pressed IN rather than out.
 *
 * So `panel` is deliberately the same value as `canvas`. A component that
 * paints C.panel and forgets SHADOW.raised will render an invisible card, and
 * that is not a bug in the token — it is the component not finishing the
 * sentence.
 *
 * ── Where this refuses to be purely neumorphic ─────────────────────────────
 *
 * Soft UI's standard failure is contrast: everything is one colour, so
 * everything is one colour to a person who cannot see a 4% luminance step. The
 * two places that matter are not negotiable here:
 *
 *   · TEXT is dark ink on the light base, never a tinted-on-tinted whisper.
 *     Every text token below is checked against `canvas` and none is under
 *     4.5:1 — the values are in the comments, computed not guessed.
 *   · The PRIMARY ACTION stays a filled blue button with white on it (5.2:1),
 *     not an extruded ghost. A studio's "Start free trial" must not be a
 *     shape you have to find.
 *
 * Everything else — cards, panels, chips, inputs, the nav bar — is soft.
 *
 * Token names are the only colours used across the landing components. A
 * stray hex in a component is caught by palette.test.ts.
 */

export const C = {
  // ── Surfaces ────────────────────────────────────────────────────────────
  // One base. `panel` IS `canvas`: elevation comes from SHADOW, not from a
  // different fill. canvasAlt and panelAlt are the only two exceptions — a
  // half-step down, for bands and nested chips that carry no shadow of their
  // own and would otherwise vanish into the page.
  canvas: '#E9EDF4', // the base tone everything is made of
  canvasAlt: '#E3E8F1', // alternate section band, a half-step down
  panel: '#E9EDF4', // cards and panels — same tone, raised by shadow
  panelAlt: '#E1E6EF', // nested chips inside a panel, gently recessed
  // The extrusion pair. Nothing outside SHADOW should need these, but a
  // component building a one-off soft edge must use them rather than invent
  // its own grey.
  lightSrc: 'rgba(255,255,255,0.92)', // highlight, up and to the left
  darkSrc: 'rgba(174,184,202,0.60)', // shade, down and to the right
  line: 'rgba(163,177,198,0.34)', // hairline, where one is still needed
  lineSoft: 'rgba(163,177,198,0.20)',
  lineBlue: 'rgba(0,103,224,0.38)', // active-state borders

  // ── Text ────────────────────────────────────────────────────────────────
  // Contrast against `canvas`, computed: none below 4.5:1.
  ink: '#1F2A3D', // primary text — 12.3:1
  body: '#3A4759', // body copy — 8.0:1
  muted: '#59677C', // secondary text — 4.9:1
  faint: '#555F6E', // captions — 5.5:1 on canvas, 5.2:1 on panelAlt
  // (the first pass set this against `canvas` alone and it then measured
  //  4.3:1 on the half-step-darker panelAlt, where most captions actually sit)

  // ── Brand ───────────────────────────────────────────────────────────────
  blue: '#0067E0', // primary action FILL (white on it: 5.2:1)
  blueHi: '#0052B8', // blue TEXT and icons on the base — 6.2:1
  blueLo: '#0059CE', // gradient end
  blue450: '#0271EB', // button gradient start
  blueHover: '#0045A0', // hover for small blue links — darkens, not lightens
  trackDot: '#C3CAD8', // mock toggle dots — a recess, not a dark pip
  blueWash: 'rgba(0,103,224,0.10)',
  blueWashStrong: 'rgba(0,103,224,0.18)',
  blueGlow: 'rgba(0,103,224,0.30)',

  // ── Accent ──────────────────────────────────────────────────────────────
  gold: '#F59E0B', // saffron FILL (dark ink on it: 7.5:1)
  goldHi: '#9A4A07', // saffron TEXT on the base — 5.3:1
  goldSoft: 'rgba(245,158,11,0.16)',
  goldGlow: 'rgba(245,158,11,0.28)',
  onGold: '#331B00', // text on gold fills

  // ── Status ──────────────────────────────────────────────────────────────
  // The dark-canvas versions were pastels chosen to glow on near-black; on a
  // light base they are invisible. These are their legible counterparts.
  // Dark enough to be TEXT on the light base (6.8:1) and still dark enough
  // to carry white as a fill (8.0:1). The dark-canvas pastel it replaces was
  // a glow colour: 3.8:1 as text here, which is how it read on screen.
  emerald: '#025C43', // 6.8:1 on canvas, white on it 8.0:1
  emeraldSoft: 'rgba(4,120,87,0.12)',
  onEmerald: '#FFFFFF', // white on an emerald fill, not near-black
  red: '#B71C1C', // 5.7:1 on canvas, 5.3:1 on panelAlt where the
  // suggestion lines actually sit (#C62828 measured 4.49 there — a hundredth
  // under, which is still under)
  redSoft: 'rgba(183,28,28,0.10)',

  // ── Marketing surfaces ──────────────────────────────────────────────────
  skyHi: '#0052B8', // hero gradient highlight (was a pale sky for dark)
  ctaFrom: '#DFE6F2', // final CTA panel gradient start
  ctaTo: '#E9EDF4', // final CTA panel gradient mid
  highlightFrom: '#DDE5F3', // pricing highlight card gradient start
  highlightMid: '#E9EDF4', // pricing highlight card gradient mid
} as const;

/** House easing curve (matches the app's EASE everywhere else). */
export const EASE = [0.16, 1, 0.3, 1] as const;

// ── Header system — the canonical top bar ─────────────────────────────────
// The landing navbar (LandingNav) is the single source of truth for every top
// bar on the public pages. Start Free, Sign In and the Command Center door
// reuse these EXACT values so all of them occupy the same vertical space and
// moving between pages never changes the header's height or proportions.
// Do not restyle one header in isolation — change it here first.
//
// On this surface the bar is not a darker strip over a lighter page; it is the
// page, lifted. A soft shadow along its lower edge is what separates it from
// the content scrolling under it.
export const HEADER = {
  padTop: 'max(env(safe-area-inset-top), 1.5rem)',
  bar: 'flex h-16 items-center justify-between',
  container: 'mx-auto w-full max-w-[1200px] px-5 sm:px-8',
  // Scrolled state (and always-on for the auth bars).
  bg: 'rgba(233,237,244,0.92)',
  blur: 'blur(18px) saturate(140%)',
  // Idle state, landing nav only: lighter, so the bar sits quietly over the
  // hero until there is something scrolling beneath it to separate from.
  bgIdle: 'rgba(233,237,244,0.55)',
  blurIdle: 'blur(9px) saturate(120%)',
  border: 'rgba(163,177,198,0.24)',
  // Saffron hairline along the bottom edge, and its halo.
  accentLine: 'rgba(245,158,11,0.42)',
  accentGlow: '0 10px 24px -14px rgba(245,158,11,0.40)',
  // Logo chip — extruded from the bar rather than glassed over it.
  chipClass:
    'rounded-2xl border border-[rgba(163,177,198,0.26)] bg-[#E9EDF4] px-3 py-2 transition-shadow',
  chipBlur: 'blur(0px)',
  chipShadow:
    '3px 3px 7px rgba(174,184,202,0.55), -3px -3px 7px rgba(255,255,255,0.92)',
  logoSize: 38,
} as const;

/**
 * Elevation — the soft-UI light model.
 *
 * Every raised value is the same pair at a different distance: white up-left,
 * grey down-right. Keeping the ratio constant is what makes a small chip and a
 * large panel read as the same material lit by the same lamp, rather than as
 * two unrelated effects.
 *
 * `inset` is the inverse, for anything the user types or presses into.
 */
export const SHADOW = {
  card: '5px 5px 11px rgba(174,184,202,0.55), -5px -5px 11px rgba(255,255,255,0.92)',
  panel: '10px 10px 26px rgba(174,184,202,0.60), -10px -10px 26px rgba(255,255,255,0.95)',
  float: '8px 8px 20px rgba(174,184,202,0.50), -8px -8px 20px rgba(255,255,255,0.90)',
  /** Small extrusion — chips, icon tiles, the nav logo. */
  raised: '3px 3px 7px rgba(174,184,202,0.55), -3px -3px 7px rgba(255,255,255,0.92)',
  /** Pressed in: inputs, wells, anything holding content rather than sitting on it. */
  inset: 'inset 4px 4px 9px rgba(174,184,202,0.55), inset -4px -4px 9px rgba(255,255,255,0.92)',
  /** Focus and the primary CTA — the one place colour, not light, does the work. */
  blueGlow: '0 10px 26px -12px rgba(0,103,224,0.55)',
} as const;

/**
 * Readable ink for an arbitrary fill.
 *
 * The avatars and status tiles take a fill from a data row and used to print
 * white on whatever arrived. That is right for the blues and the dark green
 * and wrong for exactly one value — saffron, where white measures 2.15:1 — so
 * the bug showed up only on the row that happened to be gold, and would come
 * back the next time somebody added another.
 *
 * It does NOT pick by a luminance threshold. The first version of this did,
 * at 0.45, and saffron measures 0.4308 — so it returned white for the one
 * colour the helper existed to catch, and the page still failed. A threshold
 * is a guess about where the crossover sits; comparing the two candidates
 * outright is the answer itself, costs one more multiply, and cannot be
 * wrong for a fill nobody has tried yet.
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
  return contrast(1) >= contrast(relativeLuminance(C.onGold.replace('#', '')))
    ? '#fff'
    : C.onGold;
}

// ── The studio object ──────────────────────────────────────────────────────
//
// The brand mark is an isometric cube — a black anodised frame with a cobalt
// "M" running through it. The signed-out surface renders that object for real
// (components/landing/StudioCube.tsx) instead of illustrating the product with
// a mocked dashboard, so its materials live here with the rest of the
// marketing palette.
//
// Each material is lit from one fixed key light, up and to the left — the
// same direction SHADOW already assumes for the soft surface, so the object
// and the page it sits on agree about where the light is. `top` catches the
// most, `front` is the key side, `side` is the shadowed flank, `back` is what
// the open frame lets you glimpse through it.
export const MATERIAL = {
  anodised: {
    top: 'linear-gradient(135deg, #5B6576 0%, #3A4250 55%, #262C37 100%)',
    front: 'linear-gradient(160deg, #353C49 0%, #1F242E 70%, #171B23 100%)',
    side: 'linear-gradient(160deg, #20252F 0%, #12161D 100%)',
    back: '#0E1117',
    edge: 'inset 0 0 0 1px rgba(255,255,255,0.07)',
  },
  cobalt: {
    top: 'linear-gradient(135deg, #7FB4FF 0%, #3B8DF5 45%, #0271EB 100%)',
    front: 'linear-gradient(160deg, #3B8DF5 0%, #0067E0 55%, #0050AD 100%)',
    side: 'linear-gradient(160deg, #0059CE 0%, #003F87 100%)',
    back: '#002D61',
    edge: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
  },
  // Contact shadow under the object: tight and dark where it touches the
  // floor, wide and faint further out. Two layers, because one Gaussian
  // either looks like a hover glow or a hole.
  floorCore: 'radial-gradient(closest-side, rgba(15,23,42,0.42), rgba(15,23,42,0.18) 55%, transparent)',
  floorWide: 'radial-gradient(closest-side, rgba(15,23,42,0.16), transparent)',
} as const;

// Hairline annotation — the drafting-sheet callouts around the object.
export const ANNOTATION = {
  line: 'rgba(31,42,61,0.28)',
  dot: '#0067E0',
  text: '#3A4759',
} as const;

// ── Signed-out controls ────────────────────────────────────────────────────
//
// One field, one primary button and one card for every signed-out page, so
// the five of them cannot drift into five slightly different forms. Class
// strings rather than style objects so :hover and :focus-visible work without
// JavaScript — and they live here because they carry colour.

/** A text input: a clean white well, a cobalt focus ring. 16px text, so iOS never zooms. */
export const FIELD = {
  base:
    'w-full rounded-[14px] border bg-[rgba(255,255,255,0.74)] text-[16px] leading-none text-[#1F2A3D] ' +
    'shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow,background-color] duration-200 ' +
    'placeholder:text-[#7B8799] hover:bg-white focus:bg-white',
  ok: 'border-[rgba(31,42,61,0.14)] hover:border-[rgba(31,42,61,0.26)] focus:border-[#0067E0] focus:shadow-[0_0_0_4px_rgba(0,103,224,0.14)]',
  invalid: 'border-[rgba(183,28,28,0.55)] focus:border-[#B71C1C] focus:shadow-[0_0_0_4px_rgba(183,28,28,0.12)]',
  /** Leading icon: muted at rest, cobalt while its field has focus. */
  icon: 'text-[#59677C] transition-colors group-focus-within:text-[#0052B8]',
} as const;

/**
 * The primary action: a cobalt key with a lit top edge and a darker lip
 * underneath, so it reads as a physical button on the same light the cube
 * is lit by. Presses down 1px.
 */
export const PRIMARY_BUTTON =
  'relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[14px] font-[720] text-white ' +
  'bg-[linear-gradient(180deg,#0271EB_0%,#0059CE_100%)] ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_0_#003F87,0_14px_28px_-12px_rgba(0,103,224,0.65)] ' +
  'transition-[transform,box-shadow,filter] duration-150 hover:brightness-[1.06] active:translate-y-px ' +
  'active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_#003F87,0_8px_18px_-10px_rgba(0,103,224,0.6)] ' +
  'disabled:cursor-default disabled:opacity-70 disabled:hover:brightness-100 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(0,103,224,0.28)]';

/** A quiet secondary action on the same surface. */
export const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-[14px] border border-[rgba(31,42,61,0.14)] ' +
  'bg-[rgba(255,255,255,0.6)] font-[680] text-[#1F2A3D] transition-colors duration-150 hover:bg-white ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(0,103,224,0.22)]';

/** The form card: frosted white over the canvas, lifted by a real drop shadow. */
export const CARD = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.66) 100%)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(15,23,42,0.06), 0 24px 48px -24px rgba(15,23,42,0.28), 0 48px 96px -48px rgba(15,23,42,0.22)',
  backdropFilter: 'blur(16px) saturate(140%)',
} as const;

/** The page behind everything: the canvas, a key light from the upper left, a faint drafting grid. */
export const STAGE = {
  light: 'radial-gradient(90% 70% at 18% 0%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 60%)',
  grid:
    'linear-gradient(rgba(31,42,61,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(31,42,61,0.045) 1px, transparent 1px)',
  gridSize: '56px 56px',
  gridMask: 'radial-gradient(ellipse 75% 65% at 50% 38%, #000 30%, transparent 78%)',
  horizon: 'linear-gradient(90deg, transparent, rgba(31,42,61,0.14) 20%, rgba(31,42,61,0.14) 80%, transparent)',
} as const;
