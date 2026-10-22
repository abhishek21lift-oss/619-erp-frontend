/**
 * Fitness Testing colour — the assessment wizard and its results dashboard,
 * dressed like Apple Fitness: an energy-mesh hero, gradient squircles, one
 * hue per fitness domain, an activity ring for the overall score.
 *
 * The five palette families still carry every STATE on these screens: a
 * score band is emerald / amber / red, an unsafe BP reading is red, a stale
 * PAR-Q is amber. What this file adds is decoration — the hero mesh, the
 * domain hues, the ring — none of which may borrow a family that means
 * something, or a dashboard of green tiles reads as a dashboard of "all
 * good". The scoring thresholds are untouched; this file only paints.
 *
 * The tenth deliberate exception to the palette, made like the others: its
 * own token file, exempt from the palette scan in palette.test.ts, and
 * confined to the fitness-testing module and its page by the test beside it.
 */

import { emerald, amber, red, tint } from '@/lib/palette';
import type {
  FitnessCategory, BpCategory, RhrCategory, Spo2Category, BmiCategory, AnthropometricRisk,
} from '@/lib/fitness-calculations';

// The same hues as the member spectrum and the front desk's, so the
// decorative colour across the app stays one family.
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

export type Tone = { from: string; to: string; wash: string; glow: string };

const tone = (from: string, to: string, rgb: string): Tone => ({
  from, to, wash: `rgba(${rgb},0.10)`, glow: `rgba(${rgb},0.34)`,
});

export const tones = {
  aqua:   tone(spectrum.teal[400],   spectrum.cyan[500],   '20,184,166'),
  indigo: tone(spectrum.indigo[400], spectrum.violet[600], '99,102,241'),
  sunset: tone(spectrum.orange[400], spectrum.pink[500],   '249,115,22'),
  berry:  tone(spectrum.pink[400],   spectrum.violet[500], '236,72,153'),
  sky:    tone(spectrum.sky[400],    spectrum.indigo[500], '14,165,233'),
  gold:   tone(spectrum.yellow[400], spectrum.orange[500], '250,204,21'),
  violet: tone(spectrum.violet[400], spectrum.pink[500],   '139,92,246'),
  cyan:   tone(spectrum.cyan[400],   spectrum.sky[500],    '34,211,238'),
} as const;

/** A gradient fill for a squircle, tile or bar. */
export function gradient(t: Tone, angle = 135): string {
  return `linear-gradient(${angle}deg, ${t.from}, ${t.to})`;
}

/** One hue per fitness domain. Identity, not state — the score bands below
 *  are what says how the client actually did. */
export const domain = {
  cardio:          tones.berry,
  strength:        tones.sunset,
  endurance:       tones.aqua,
  mobility:        tones.gold,
  bodyComposition: tones.violet,
  healthRisk:      tones.indigo,
} as const;

/** The wizard's steps by StepId: vitals lead in indigo, the battery steps
 *  take their domain's hue, the measurements in between are sky. */
export const stepTones = {
  1: tones.indigo,
  2: tones.sky,
  3: tones.violet,
  4: tones.berry,
  5: tones.sunset,
  6: tones.aqua,
  7: tones.gold,
} as const;

/** The hero: an energy sweep from indigo through pink, with an aqua and a
 *  gold glow. Deep enough under the title that white body text stays
 *  readable everywhere text lands on it. */
export const fitnessMesh = {
  base: `linear-gradient(140deg, ${spectrum.indigo[700]} 0%, ${spectrum.indigo[600]} 28%, ${spectrum.violet[600]} 62%, ${spectrum.pink[600]} 100%)`,
  glowA: 'rgba(34,211,238,0.45)',
  glowB: 'rgba(250,204,21,0.38)',
  shadow: 'rgba(79,70,229,0.5)',
} as const;

/** For the small dark cards that carry text on the light page — the AI
 *  motivation quote. Deep enough that white body text stays readable. */
export const deepMesh = `linear-gradient(135deg, ${spectrum.indigo[700]} 0%, ${spectrum.violet[600]} 100%)`;

/** The overall-score ring: Apple's Move ring — pink through orange to gold. */
export const ringStops = [spectrum.pink[400], spectrum.orange[400], spectrum.yellow[400]] as const;

/** A decorative hairline for the top of a card. */
export const sweep = `linear-gradient(90deg, ${spectrum.pink[400]}, ${spectrum.violet[400]}, ${spectrum.teal[400]})`;

/* ── State, from the five families ─────────────────────────────────────────
   Everything below is semantic: how the client did, not which domain the
   test belongs to. The 80 / 40 cutoffs are the dashboard's existing ones. */

/** A 0–100 score onto the palette's band, for fills and bars. */
export function bandFill(score: number): string {
  if (score >= 80) return emerald[600];
  if (score >= 40) return amber[500];
  return red[500];
}

/** The same score as pill text on a tint — 600 or darker, per the palette. */
export function bandInk(score: number): string {
  if (score >= 80) return emerald[600];
  if (score >= 40) return amber[600];
  return red[600];
}

/** A classification pill: the wording is the classification's, the colour
 *  is the band's. */
export function categoryPill(category: FitnessCategory): { bg: string; color: string } {
  const color =
    category === 'Excellent' || category === 'Good' ? emerald[600]
      : category === 'Above Average' || category === 'Average' ? amber[600]
        : red[600];
  const alpha =
    category === 'Excellent' || category === 'Poor' || category === 'Very Poor' ? 0.16
      : 0.11;
  return { bg: tint(color, alpha), color };
}

/** A blood-pressure classification pill. Clinical bands: normal, watch,
 *  and the bands that stop exertion testing. */
export function bpPill(category: BpCategory): { bg: string; color: string } {
  const color =
    category === 'Normal' ? emerald[600]
      : category === 'Elevated' || category === 'Hypertension Stage 1' ? amber[600]
        : red[600];
  return { bg: tint(color, 0.13), color };
}

/** A resting-heart-rate pill. "Low" is a description, not a diagnosis —
 *  athlete context is applied to the safety decision, not to the label. */
export function rhrPill(category: RhrCategory): { bg: string; color: string } {
  const color =
    category === 'Normal' ? emerald[600]
      : category === 'Low' || category === 'High Normal' ? amber[600]
        : red[600];
  return { bg: tint(color, 0.13), color };
}

export function spo2Pill(category: Spo2Category): { bg: string; color: string } {
  const color =
    category === 'Normal' ? emerald[600]
      : category === 'Mildly Low' ? amber[600]
        : red[600];
  return { bg: tint(color, 0.13), color };
}

/** An adult Asian BMI band. Normal is the only green band. */
export function bmiPill(category: BmiCategory): { bg: string; color: string } {
  const color =
    category === 'Normal' ? emerald[600]
      : category === 'Obese' ? red[600]
        : amber[600];
  return { bg: tint(color, 0.13), color };
}

/** The low-risk cut-off is the only published side of the waist/WHR norms, so
 *  the other value is amber (review) — never red, which would invent a
 *  moderate/high-risk band the guideline does not define. */
export function riskPill(risk: AnthropometricRisk): { bg: string; color: string } {
  const color = risk === 'Low risk' ? emerald[600] : amber[600];
  return { bg: tint(color, 0.13), color };
}
