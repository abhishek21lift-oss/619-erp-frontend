/**
 * Attendance and Check-In colour — the two front-desk screens, dressed like
 * Apple Fitness: a colour-mesh hero, gradient squircles, an activity ring.
 *
 * The five palette families still carry every STATE on these screens:
 * present is emerald, late is amber, absent is red, unmarked is gray, and a
 * scan result wears the same three. What this file adds is decoration — the
 * hero mesh, the rate ring, tab pills, section tiles, chart bars, the
 * viewfinder glow — none of which may borrow a family that means something,
 * or a page of green tiles reads as a page of "all good".
 *
 * The ninth deliberate exception to the palette, made like the others: its own
 * token file, exempt from the palette scan, and confined to the attendance and
 * check-in screens by palette.test.ts. Same hues as the member spectrum.
 */

const spectrum = {
  pink:   { 400: '#F472B6', 500: '#EC4899', 600: '#DB2777' },
  orange: { 400: '#FB923C', 500: '#F97316' },
  yellow: { 400: '#FACC15' },
  indigo: { 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
  violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
  cyan:   { 400: '#22D3EE', 500: '#06B6D4' },
  sky:    { 400: '#38BDF8', 500: '#0EA5E9', 700: '#0369A1' },
  teal:   { 400: '#2DD4BF', 500: '#14B8A6', 700: '#0F766E' },
} as const;

export type Tone = { from: string; to: string; ink: string; wash: string; glow: string };

const tone = (from: string, to: string, ink: string, rgb: string): Tone => ({
  from, to, ink, wash: `rgba(${rgb},0.10)`, glow: `rgba(${rgb},0.34)`,
});

export const tones = {
  aqua:   tone(spectrum.teal[400],   spectrum.cyan[500],   spectrum.teal[700],   '20,184,166'),
  indigo: tone(spectrum.indigo[400], spectrum.violet[600], spectrum.indigo[700], '99,102,241'),
  sunset: tone(spectrum.orange[400], spectrum.pink[500],   '#C2410C',            '249,115,22'),
  berry:  tone(spectrum.pink[400],   spectrum.violet[500], '#BE185D',            '236,72,153'),
  sky:    tone(spectrum.sky[400],    spectrum.indigo[500], spectrum.sky[700],    '14,165,233'),
  gold:   tone(spectrum.yellow[400], spectrum.orange[500], '#A16207',            '250,204,21'),
} as const;

export type ToneName = keyof typeof tones;

/** The attendance hero: deep ocean to violet, with an aqua and a pink glow. */
export const attendanceMesh = {
  base: `linear-gradient(135deg, ${spectrum.indigo[700]} 0%, ${spectrum.indigo[600]} 30%, ${spectrum.violet[600]} 65%, ${spectrum.pink[600]} 100%)`,
  glowA: 'rgba(45,212,191,0.55)',
  glowB: 'rgba(251,146,60,0.45)',
  shadow: 'rgba(79,70,229,0.55)',
} as const;

/** The check-in header: aqua to indigo — the front door, not the office. */
export const checkinMesh = {
  base: `linear-gradient(130deg, ${spectrum.teal[700]} 0%, ${spectrum.sky[700]} 45%, ${spectrum.indigo[600]} 100%)`,
  glowA: 'rgba(34,211,238,0.5)',
  glowB: 'rgba(167,139,250,0.5)',
  shadow: 'rgba(3,105,161,0.5)',
} as const;

/** The day's rate ring — Apple's Exercise ring, aqua to cyan. */
export const ringStops = [spectrum.teal[400], spectrum.cyan[400], spectrum.sky[400]] as const;

/** Trend bars. */
export const barGradient = `linear-gradient(180deg, ${spectrum.violet[400]}, ${spectrum.indigo[600]})`;

/** The viewfinder's live corners: a moving aqua→violet sheen. */
export const scanGlow = [spectrum.cyan[400], spectrum.violet[400]] as const;

export function gradient(t: Tone, angle = 135): string {
  return `linear-gradient(${angle}deg, ${t.from}, ${t.to})`;
}
