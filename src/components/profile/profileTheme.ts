/**
 * My Profile's colour — the trainer's own page, dressed like Apple's Settings
 * and Fitness: every section its own gradient tile, the hero a colour mesh.
 *
 * The staff app runs on five families that each mean something (blue action,
 * emerald success, amber warning, red failure, gray neutral). Those still
 * carry every STATE on this page: a certificate that expired is red, one
 * expiring is amber, a valid one emerald, Save is the primary blue. What this
 * file adds is decoration — section tiles, tab pills, the hero — which must
 * not borrow a family that means something, or a page of blue tiles reads as
 * a page of buttons.
 *
 * The eighth deliberate exception to the palette, made the same way as the
 * member portal's spectrum, the exercise library's regions and the Today
 * card: its own token file, exempt from the palette scan, and confined to the
 * profile by palette.test.ts. Same hues as the member spectrum, so the coach
 * a member sees and the page the coach edits share one set.
 */

const spectrum = {
  pink:   { 400: '#F472B6', 500: '#EC4899', 600: '#DB2777' },
  rose:   { 500: '#F43F5E' },
  orange: { 400: '#FB923C', 500: '#F97316' },
  yellow: { 400: '#FACC15' },
  indigo: { 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5' },
  violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
  cyan:   { 400: '#22D3EE', 500: '#06B6D4' },
  sky:    { 400: '#38BDF8', 500: '#0EA5E9' },
  teal:   { 400: '#2DD4BF', 500: '#14B8A6' },
  lime:   { 400: '#A3E635' },
  green:  { 400: '#4ADE80', 500: '#22C55E' },
} as const;

export type Tone = {
  from: string;
  to: string;
  /** Text in the tone, readable on a light card. */
  ink: string;
  /** Text in the tone, readable on a dark card. */
  inkDark: string;
  /** A faint fill for a chip or row in the tone. */
  wash: string;
  glow: string;
};

const tone = (from: string, to: string, ink: string, inkDark: string, rgb: string): Tone => ({
  from, to, ink, inkDark, wash: `rgba(${rgb},0.10)`, glow: `rgba(${rgb},0.32)`,
});

export const tones = {
  indigo:  tone(spectrum.indigo[400], spectrum.violet[600], '#4338CA', '#A5B4FC', '99,102,241'),
  sunset:  tone(spectrum.orange[400], spectrum.pink[500],   '#C2410C', '#FDBA74', '249,115,22'),
  berry:   tone(spectrum.pink[400],   spectrum.violet[500], '#BE185D', '#F9A8D4', '236,72,153'),
  mint:    tone(spectrum.teal[400],   spectrum.cyan[500],   '#0F766E', '#5EEAD4', '20,184,166'),
  sky:     tone(spectrum.sky[400],    spectrum.indigo[500], '#0369A1', '#7DD3FC', '14,165,233'),
  lime:    tone(spectrum.lime[400],   spectrum.green[500],  '#3F6212', '#BEF264', '132,204,22'),
  gold:    tone(spectrum.yellow[400], spectrum.orange[500], '#A16207', '#FDE047', '250,204,21'),
  rose:    tone(spectrum.rose[500],   spectrum.orange[400], '#BE123C', '#FDA4AF', '244,63,94'),
  violet:  tone(spectrum.violet[400], spectrum.pink[600],   '#6D28D9', '#C4B5FD', '139,92,246'),
} as const;

export type ToneName = keyof typeof tones;

/** Each tab's colour, which its pill, its sections and its header share. */
export const tabTones = {
  overview: 'indigo',
  credentials: 'sunset',
  portfolio: 'berry',
  security: 'mint',
  preferences: 'sky',
  upi: 'lime',
} as const satisfies Record<string, ToneName>;

/** The hero's colour mesh, when the trainer has not chosen a banner. */
export const heroMesh = {
  base: `linear-gradient(125deg, ${spectrum.indigo[600]} 0%, ${spectrum.violet[500]} 34%, ${spectrum.pink[500]} 68%, ${spectrum.orange[400]} 100%)`,
  glowA: 'rgba(34,211,238,0.55)',
  glowB: 'rgba(250,204,21,0.45)',
} as const;

/** The completion ring's stops — Move-ring warm to cool. */
export const ringStops = [spectrum.pink[500], spectrum.orange[400], spectrum.yellow[400]] as const;

export function gradient(t: Tone, angle = 135): string {
  return `linear-gradient(${angle}deg, ${t.from}, ${t.to})`;
}
