/**
 * Command Center colour — the operator console, dressed like an Apple system
 * app: every module owns a gradient (the way Settings gives every row its own
 * tinted squircle), charts are drawn in the system spectrum, and each screen
 * opens on a colour-mesh hero tinted by the module it belongs to.
 *
 * The five palette families still carry every STATE here: healthy is emerald,
 * warning is amber, critical is red, unknown is gray. What this file adds is
 * decoration and category — module identity, chart series, hero meshes —
 * none of which may borrow a family that means something, or a chart of plans
 * in green reads as "all good".
 *
 * A deliberate exception to the palette, made like the others: its own token
 * file, exempt from the palette scan, and confined to the Command Center by
 * palette.test.ts. Hues are Apple's system colours (light-mode values; they
 * hold contrast on the dark canvas too because every use sits on a tinted
 * wash or carries a visible label).
 */

const sys = {
  blue:   '#0A84FF',
  indigo: '#5E5CE6',
  purple: '#AF52DE',
  pink:   '#FF2D55',
  red:    '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  green:  '#30D158',
  mint:   '#00C7BE',
  teal:   '#30B0C7',
  cyan:   '#32ADE6',
  deep:   '#1C1C3C',
} as const;

export type CcTone = {
  /** Gradient start and end. */
  from: string;
  to: string;
  /** A solid for strokes, icons and chart marks. */
  ink: string;
  /** rgb triplet, for washes and glows at any alpha. */
  rgb: string;
  /**
   * The same hue, dark enough for text on a white card or a 10% wash.
   * `ink` is a system colour (2.6:1 for teal); small labels need 4.5:1.
   */
  inkText: string;
};

const tone = (from: string, to: string, ink: string, rgb: string, inkText: string): CcTone => ({ from, to, ink, rgb, inkText });

export const ccTones = {
  indigo: tone(sys.indigo, sys.purple, sys.indigo, '94,92,230',  '#4338CA'),
  sky:    tone(sys.cyan,   sys.blue,   sys.blue,   '10,132,255', '#0369A1'),
  teal:   tone(sys.mint,   sys.teal,   sys.teal,   '48,176,199', '#0E7490'),
  green:  tone('#1FA347', sys.teal,   '#1FA347',  '31,163,71',  '#15803D'),
  purple: tone(sys.purple, sys.pink,   sys.purple, '175,82,222', '#6B21A8'),
  orange: tone(sys.orange, '#FF5E3A', '#E07A00',  '255,120,40', '#B45309'),
  pink:   tone(sys.pink,   sys.red,    sys.pink,   '255,45,85',  '#BE123C'),
  blue:   tone(sys.blue,   sys.indigo, sys.blue,   '10,132,255', '#1D4ED8'),
} as const;

/**
 * The dark scrim under the hero's text. The mesh's lower-left glow washes the
 * light tones out (sampled #09C3C0 under the teal title, white is 2.2:1), so
 * the text sits on this instead. It keeps the white title above 6:1 and the
 * 90%-white subtitle above 4.5:1 at the mesh's lightest point.
 */
export const ccHeroScrim = 'linear-gradient(100deg, rgba(15,23,42,0.62) 0%, rgba(15,23,42,0.52) 65%, rgba(15,23,42,0.44) 100%)';

export type CcToneName = keyof typeof ccTones;

/** Categorical chart series — distinct things, no good/bad meaning. */
export const ccSeries = [
  sys.blue, sys.purple, sys.orange, sys.teal, sys.pink, sys.indigo, sys.yellow, sys.mint,
] as const;

/** States. The same five meanings the rest of the app uses. */
export const ccState = {
  healthy:  '#10B981',
  warning:  '#F59E0B',
  critical: '#EF4444',
  unknown:  '#94A3B8',
  info:     sys.blue,
} as const;

/** Every module's identity, in navigation order. */
export const ccModuleTone: Record<string, CcToneName> = {
  overview: 'indigo',
  studios: 'sky',
  users: 'teal',
  revenue: 'green',
  ai: 'purple',
  operations: 'orange',
  security: 'pink',
  control: 'blue',
};

export function ccGradient(t: CcTone, angle = 135): string {
  return `linear-gradient(${angle}deg, ${t.from}, ${t.to})`;
}

export function ccWash(t: CcTone, alpha = 0.1): string {
  return `rgba(${t.rgb},${alpha})`;
}

/** The hero mesh: the module gradient with two soft glows over it. */
export function ccMesh(t: CcTone): string {
  return [
    `radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.28) 0%, transparent 55%)`,
    `radial-gradient(80% 120% at 0% 100%, rgba(${t.rgb},0.55) 0%, transparent 60%)`,
    `linear-gradient(135deg, ${sys.deep} 0%, ${t.from} 45%, ${t.to} 100%)`,
  ].join(',');
}
