/**
 * My Profile's colour — the trainer's own page, dressed like Apple's Settings
 * and Fitness: every section its own gradient tile, the hero a colour mesh.
 *
 * The staff app runs on five families that each mean something (rose action,
 * emerald success, amber warning, red failure, gray neutral). Those still carry
 * every STATE on this page: a certificate that expired is red, one expiring is
 * amber, a valid one emerald. What this file adds is decoration — section
 * tiles, tab pills, the hero — and decoration stays on the brand's one warm
 * ramp (rose through plum, with founder gold as the only accent). A page of
 * decorative green tiles would read as a page of success states, and a page of
 * per-section hues would read as a template rather than MY PT STUDIO.
 *
 * Every `from` stop below is dark enough for white text at 4.5:1 or better
 * (the lightest is gold at 5.04:1), so the icons and tab labels that sit on
 * these gradients never depend on which stop they land over.
 *
 * The eighth deliberate exception to the palette, made the same way as the
 * member portal's spectrum, the exercise library's regions and the Today
 * card: its own token file, exempt from the palette scan, and confined to the
 * profile by palette.test.ts.
 */

import { heroBase, heroRimCool, heroRimWarm, heroShadow, heroSpotlight } from '../ui/heroTheme';

/**
 * One warm ramp. The names are kept from the previous nine-hue set so every
 * section that already imports a tone keeps working; what changed is that they
 * now describe a depth on the same rose/plum/gold ramp instead of nine
 * unrelated hues.
 */
const ramp = {
  rose: '#A33757',
  roseDeep: '#852E4E',
  plum: '#6B2440',
  plumDeep: '#4C1D3D',
  ink: '#2B1220',
  peach: '#FFBB94',
  coral: '#DC586D',
  copper: '#B0472F',
  copperDeep: '#8C3E14',
  gold: '#96650F',
  goldDeep: '#7C570B',
  goldBright: '#C9971F',
  goldPale: '#F7E7B4',
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
  indigo:  tone(ramp.rose,       ramp.plum,       ramp.roseDeep,  ramp.peach,    '163,55,87'),
  sunset:  tone(ramp.copper,     ramp.copperDeep, ramp.copperDeep, ramp.peach,   '176,71,47'),
  berry:   tone(ramp.roseDeep,   ramp.plumDeep,   ramp.roseDeep,  ramp.peach,    '133,46,78'),
  mint:    tone(ramp.copperDeep, ramp.plumDeep,   ramp.copperDeep, ramp.peach,   '140,62,20'),
  sky:     tone(ramp.plum,       ramp.plumDeep,   ramp.plum,      ramp.peach,    '107,36,64'),
  lime:    tone(ramp.rose,       ramp.gold,       ramp.goldDeep,  ramp.goldPale, '163,55,87'),
  gold:    tone(ramp.gold,       ramp.goldDeep,   ramp.goldDeep,  ramp.goldPale, '150,101,15'),
  rose:    tone(ramp.rose,       ramp.roseDeep,   ramp.roseDeep,  ramp.peach,    '163,55,87'),
  violet:  tone(ramp.roseDeep,   ramp.ink,        ramp.plum,      ramp.peach,    '133,46,78'),
} as const;

export type ToneName = keyof typeof tones;

/**
 * State colours are not decoration and are not in `tones`.
 *
 * The certification badge is the one place on this page where a colour makes
 * a claim about the data, so it gets its own semantic token rather than the
 * decorative `lime` it used to borrow.
 */
export const statusTones = {
  success: tone('#047857', '#065F46', '#047857', '#6EE7B7', '4,120,87'),
} as const;

/** The hero's colour mesh, when the trainer has not chosen a banner. */
export const heroMesh = {
  base: `linear-gradient(125deg, ${ramp.ink} 0%, ${ramp.plum} 34%, ${ramp.rose} 68%, ${ramp.gold} 100%)`,
  glowA: 'rgba(220,88,109,0.48)',
  glowB: 'rgba(201,151,31,0.42)',
} as const;

/**
 * The house hero — the slab the dashboard and every PageHero page open on,
 * not this file's spectrum. The export keeps its old name so the client
 * profile and its test stay put; renaming is separate work.
 *
 * The paint is imported rather than repeated: three copies of the same navy
 * would drift the moment one changed. `crown` is the light rig (the spotlight
 * and the two rim lights) and sits above `base`, which is the lit slab.
 * `shadow` is a call, not a literal, because it carries the hero's glow.
 */
export const auroraHero = {
  base: heroBase,
  crown: `${heroSpotlight}, ${heroRimCool}, ${heroRimWarm}`,
  shadow: heroShadow(),
} as const;

/** The completion ring's stops — brand rose through coral to founder gold. */
export const ringStops = [ramp.rose, ramp.coral, ramp.goldBright] as const;

export function gradient(t: Tone, angle = 135): string {
  return `linear-gradient(${angle}deg, ${t.from}, ${t.to})`;
}
