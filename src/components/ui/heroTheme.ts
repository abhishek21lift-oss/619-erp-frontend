/**
 * The app hero's paint — the arrival slab PageHero, the studio dashboard and
 * the client profile all wear.
 *
 * ── Why this is its own file ───────────────────────────────────────────────
 *
 * The hero runs a dark surface the rest of the app does not: #0B132B and its
 * neighbours are not in the eight families. They are legal here and nowhere
 * else, because a card or a chart reaching for the hero navy would be a
 * second, drifting surface. `token-files.ts` exempts this path from the
 * palette scan and `palette.test.ts` confines the export to the three heroes.
 *
 * ── How the depth is built ─────────────────────────────────────────────────
 *
 * One light source, not a stack of soft gradients — the first attempt at this
 * painted three big radials and read as fog. The slab is lit at the top and
 * falls to near-black at its bottom edge, which makes it sit like a solid.
 * On top of that: a 1px gradient bevel, film grain, a specular streak and a
 * vignette (all in globals.css as `.hero-*`, because they are identical on
 * every hero and carry no brand colour), then two rim lights — sky at the
 * bottom-left, cream at the bottom-right — which are what bring the colour.
 *
 * The crest's gold coin is the one warm object in the composition.
 */

/** Lit at the top, near-black at the bottom edge. */
export const heroBase = 'linear-gradient(172deg, #101B33 0%, #0B132B 32%, #04060D 100%)';

/** The amber spotlight behind the crest, when the hero has no section tint. */
export const heroSpotlight =
  'radial-gradient(52% 70% at 50% 2%, rgba(232,140,18,0.58) 0%, rgba(217,119,6,0.18) 42%, transparent 70%)';

/** Cool rim at the bottom-left. */
export const heroRimCool =
  'radial-gradient(52% 44% at 4% 106%, rgba(91,192,222,0.48) 0%, transparent 64%)';

/** Warm rim at the bottom-right. */
export const heroRimWarm =
  'radial-gradient(26% 30% at 98% 98%, rgba(244,214,176,0.16) 0%, transparent 62%)';

/** The gold coin the dashboard crest sits on. */
export const heroCrest =
  'radial-gradient(circle at 34% 24%, #FFF6E4 0%, #F4D6B0 24%, #D9AE79 50%, #8A5A2B 76%, #2E1C0C 100%)';

/**
 * The full hero's background. `spot` replaces the amber spotlight with a
 * section's own light — a tint over the slab, never a fill behind the text.
 */
export function heroBackground(spot?: string): string {
  const light = spot
    ? `radial-gradient(52% 70% at 50% 2%, ${spot} 0%, transparent 68%)`
    : heroSpotlight;
  return [light, heroRimCool, heroRimWarm, heroBase].join(', ');
}

/**
 * The shadow the card casts. Two of them, not one: a near-black drop for the
 * lift and a coloured glow for the ambient bounce, so the hero reads as a lit
 * object on the page rather than a rectangle pasted onto it.
 */
export function heroShadow(glow = 'rgba(217,119,6,0.30)'): string {
  return '0 48px 92px -30px rgba(2,5,12,0.95),'
    + ` 0 22px 60px -26px ${glow},`
    + ' 0 14px 34px rgba(2,5,12,0.55),'
    + ' 0 2px 6px rgba(2,5,12,0.40),'
    + ' inset 0 26px 42px -34px rgba(255,214,160,0.40)';
}

/**
 * The compact band: the same slab, one soft tint from the left, no spotlight.
 * A 64px strip cannot carry a full light rig — it would read as a smear under
 * the title — so this is the slab plus its section colour and nothing else.
 */
export function heroCompactBackground(spot: string): string {
  return [`radial-gradient(90% 150% at 0% 0%, ${spot} 0%, transparent 72%)`, heroBase].join(', ');
}

/** The compact band's shadow — the same idea, at a strip's scale. */
export function heroCompactShadow(glow: string): string {
  return `0 18px 40px -22px rgba(2,5,12,0.80), 0 10px 26px -18px ${glow},`
    + ' inset 0 1px 0 rgba(255,255,255,0.10)';
}
