/**
 * The trainer app's page tints — one light per section, painted on the shared
 * PageHero's dark slab.
 *
 * The five palette families still carry every STATE (blue action, emerald
 * success, amber warning, red failure, gray neutral); these hues are page
 * identity and nothing else. Same pattern as the member spectrum and the
 * attendance mesh: its own token file, exempt from the palette scan by
 * path, and confined to PageHero by palette.test.ts.
 *
 * ── What changed, and why it is not a `to` stop any more ───────────────────
 *
 * These used to be two-stop gradients painted as full bands. The hero is now
 * a dark surface lit from above, so a saturated band behind white text would
 * sit on top of it as a second, brighter object. An accent is a LIGHT here:
 * `spot` is the translucent colour of the hero's spotlight, `glow` is the
 * coloured shadow the card casts. Its alpha is already baked in, so the value
 * drops straight into an `rgba` position — no `color-mix`, which older Safari
 * cannot parse and would drop the whole background declaration over.
 *
 * `brand` is the house rose. The default hero (no accent) uses the hero's own
 * amber spotlight; naming `brand` asks for the rose light instead.
 */
export type PageAccent = 'brand' | 'amber' | 'indigo' | 'red' | 'teal';

export const PAGE_ACCENTS: Record<PageAccent, { spot: string; glow: string }> = {
  brand:  { spot: 'rgba(220,88,109,0.55)', glow: 'rgba(220,88,109,0.28)' },
  amber:  { spot: 'rgba(232,140,18,0.58)', glow: 'rgba(217,119,6,0.30)' },
  indigo: { spot: 'rgba(129,140,248,0.52)', glow: 'rgba(99,102,241,0.28)' },
  red:    { spot: 'rgba(248,113,113,0.50)', glow: 'rgba(220,38,38,0.28)' },
  teal:   { spot: 'rgba(45,212,191,0.44)', glow: 'rgba(20,184,166,0.26)' },
};
