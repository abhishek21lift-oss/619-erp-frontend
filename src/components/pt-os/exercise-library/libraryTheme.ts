/**
 * The Exercise Library's colour — one hue per body region.
 *
 * The staff app runs on five families that each MEAN something (blue action,
 * emerald success, amber warning, red failure, gray neutral). A muscle group
 * is not a state: Chest is not better or worse than Back. Painting regions in
 * those families is how "Legs" ended up the same green as "paid", and why the
 * old cards leaned on a 3px rail to carry the whole idea.
 *
 * So this is the sixth deliberate exception to the palette, made the same way
 * as the member portal's spectrum: its own token file, exempt from the palette
 * scan, and confined to the exercise library by palette.test.ts.
 *
 * The rule that keeps it honest is the member app's rule: these hues are
 * DECORATIVE. They paint a region's tile, icon squircle and label — never a
 * status. Difficulty stays emerald / amber / red, archived stays amber, and
 * delete stays red, so a trainer never has to wonder whether pink means risk.
 *
 * Every region also carries its name in text beside the colour, so the hue is
 * never the only way to tell two regions apart.
 */

import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Shirt, MoveVertical, Footprints, Mountain, BicepsFlexed, Target, HeartPulse,
  PersonStanding, Dumbbell,
} from 'lucide-react';

/** The member portal's spectrum values, so both apps share one set of hues. */
const spectrum = {
  pink:   { 300: '#F9A8D4', 400: '#F472B6', 500: '#EC4899', 600: '#DB2777', 700: '#BE185D' },
  indigo: { 300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
  teal:   { 300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E' },
  orange: { 300: '#FDBA74', 400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C' },
  violet: { 300: '#C4B5FD', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9' },
  cyan:   { 300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490' },
  slate:  { 300: '#CBD5E1', 400: '#94A3B8', 600: '#475569', 700: '#334155' },
} as const;

export interface RegionTone {
  /** Gradient stops for tiles and icon squircles. White icons sit on these. */
  from: string;
  to: string;
  /** Label text on a light surface — every value clears 4.5:1 on white. */
  ink: string;
  /** Label text on the dark surface. */
  inkDark: string;
  icon: LucideIcon;
}

export const REGION_TONES: Record<string, RegionTone> = {
  Chest:       { from: spectrum.pink[400],   to: spectrum.pink[600],   ink: spectrum.pink[700],   inkDark: spectrum.pink[300],   icon: Shirt },
  Back:        { from: spectrum.indigo[400], to: spectrum.indigo[600], ink: spectrum.indigo[700], inkDark: spectrum.indigo[300], icon: MoveVertical },
  Legs:        { from: spectrum.teal[400],   to: spectrum.teal[600],   ink: spectrum.teal[700],   inkDark: spectrum.teal[300],   icon: Footprints },
  Shoulders:   { from: spectrum.orange[400], to: spectrum.orange[600], ink: spectrum.orange[700], inkDark: spectrum.orange[300], icon: Mountain },
  Arms:        { from: spectrum.violet[400], to: spectrum.violet[600], ink: spectrum.violet[700], inkDark: spectrum.violet[300], icon: BicepsFlexed },
  Core:        { from: spectrum.cyan[400],   to: spectrum.cyan[600],   ink: spectrum.cyan[700],   inkDark: spectrum.cyan[300],   icon: Target },
  Cardio:      { from: spectrum.orange[400], to: spectrum.pink[500],   ink: spectrum.pink[700],   inkDark: spectrum.pink[300],   icon: HeartPulse },
  'Full Body': { from: spectrum.indigo[500], to: spectrum.pink[500],   ink: spectrum.violet[700], inkDark: spectrum.violet[300], icon: PersonStanding },
};

/** For an exercise, or a muscle, whose region is missing or unknown. */
export const NEUTRAL_TONE: RegionTone = {
  from: spectrum.slate[400], to: spectrum.slate[600], ink: spectrum.slate[700], inkDark: spectrum.slate[300], icon: Dumbbell,
};

/**
 * A form with no muscle chosen yet. The spectrum's own indigo→pink rather
 * than the neutral slate, which read as "disabled" on the header of a brand
 * new exercise.
 */
export const FRESH_TONE: RegionTone = {
  from: spectrum.indigo[500], to: spectrum.pink[500], ink: spectrum.violet[700], inkDark: spectrum.violet[300], icon: Dumbbell,
};

/** The display order for region tiles: upper body, lower body, then the rest. */
export const REGION_ORDER = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

export function regionTone(region?: string | null): RegionTone {
  return (region && REGION_TONES[region]) || NEUTRAL_TONE;
}

/** The region an exercise belongs to, falling back to its legacy muscle group. */
export function exerciseRegion(ex: { body_region?: string | null; muscle_group?: string | null }): string {
  return ex.body_region || ex.muscle_group || '';
}

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

export function toneGradient(t: RegionTone, angle = 135): string {
  return `linear-gradient(${angle}deg, ${t.from}, ${t.to})`;
}

/**
 * CSS variables for a region, set inline on an element so its children can
 * use `text-[var(--rg-ink)] dark:text-[var(--rg-ink-d)]` and friends. Keeps
 * the hexes in this file while the classes stay in the components.
 */
export function toneVars(t: RegionTone): CSSProperties {
  return {
    ['--rg-from' as string]: t.from,
    ['--rg-to' as string]: t.to,
    ['--rg-ink' as string]: t.ink,
    ['--rg-ink-d' as string]: t.inkDark,
    // Tailwind 3 cannot put an opacity modifier on a var() colour, so the
    // tints are precomputed here rather than written as bg-[var(..)]/15.
    ['--rg-wash' as string]: withAlpha(t.from, 0.14),
    ['--rg-wash-hi' as string]: withAlpha(t.from, 0.24),
    ['--rg-glow' as string]: withAlpha(t.to, 0.55),
  } as CSSProperties;
}

/** The spectrum as one strip, for the library hero's accent ribbon. */
export const SPECTRUM_RIBBON = `linear-gradient(90deg, ${REGION_ORDER.map((r) => REGION_TONES[r].from).join(', ')})`;
