/**
 * The trainer app's page accents — one two-stop gradient per section, painted
 * on the shared PageHero.
 *
 * The five palette families still carry every STATE (blue action, emerald
 * success, amber warning, red failure, gray neutral); these hues are page
 * identity and nothing else. Same pattern as the member spectrum and the
 * attendance mesh: its own token file, exempt from the palette scan by
 * path, and confined to PageHero by palette.test.ts.
 *
 * Every `to` stop clears 4:1 against white, so the 12.5px subtitle stays
 * readable across the whole gradient in either theme.
 *
 * `brand` is the house rose. PageHero keeps its own literal for the default
 * (client-profile-premium.test.ts pins it); this entry exists so callers can
 * name it without special-casing.
 */
export type PageAccent = 'brand' | 'amber' | 'indigo' | 'red' | 'teal';

export const PAGE_ACCENTS: Record<PageAccent, { from: string; to: string; shadow: string }> = {
  brand:  { from: '#6B2440', to: '#A33757', shadow: 'rgba(107,36,64,0.55)' },
  amber:  { from: '#B45309', to: '#92400E', shadow: 'rgba(180,83,9,0.5)' },
  indigo: { from: '#4338CA', to: '#6D28D9', shadow: 'rgba(67,56,202,0.5)' },
  red:    { from: '#B91C1C', to: '#9F1239', shadow: 'rgba(185,28,28,0.5)' },
  teal:   { from: '#0F766E', to: '#0E7490', shadow: 'rgba(15,118,110,0.5)' },
};

/** `linear-gradient` for a page hero in an accent's colours. */
export function pageGradient(a: PageAccent): string {
  const { from, to } = PAGE_ACCENTS[a];
  return `linear-gradient(135deg, ${from}, ${to})`;
}
