/**
 * The brand ramp — the Rosé palette chosen in the design review.
 *
 * The constants keep their historical `BLUE` names because every call site
 * imports them, and renaming is separate work. The mark itself was recoloured
 * to the same ramp (public/mypt-logo*.png), so these tokens and the artwork
 * still agree — that was the whole point of sampling the logo in the first
 * place, and it stays true after the palette change.
 *
 *   action fill   #A33757   white label 6.48:1
 *   hover / deep  #852E4E   white label 8.41:1
 *   hero shadow   #4C1D3D   white label 13.54:1
 *   wash          #FFF7F3
 *
 * Contrast, measured (WCAG 2.1 relative luminance):
 *   #FFFFFF on BRAND_BLUE_FROM  6.48:1
 *   #FFFFFF on BRAND_BLUE_TO    8.41:1
 *   LABEL on TINT_FROM          7.95:1  — the small uppercase eyebrow
 * All clear 4.5:1, which the eyebrow needs at its size and weight.
 */

/** The mark's accent. Use for a flat fill or a single-colour icon. */
export const BRAND_BLUE = '#A33757';

/** Gradient stops for a solid brand surface — icon tiles, primary buttons. */
export const BRAND_BLUE_FROM = '#A33757';
export const BRAND_BLUE_TO = '#852E4E';

/**
 * The shadow end of the hero banner — the deepest step of the ramp, where
 * white has the most room to breathe. The banner runs deep at the bottom-left
 * to bright at the top-right, same direction as the reference that set the
 * angle.
 */
export const BRAND_BLUE_DEEP = '#4C1D3D';

/** The same ramp at surface lightness, for a soft wash. */
export const BRAND_TINT_FROM = '#FFF7F3';
export const BRAND_TINT_TO = '#FFF7F3';

/** Dark enough for small text on BRAND_TINT_*. */
export const BRAND_BLUE_LABEL = '#852E4E';

/** Ready-made gradients, so the angle does not drift between call sites. */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND_BLUE_FROM}, ${BRAND_BLUE_TO})`;
export const BRAND_TINT_GRADIENT = `linear-gradient(135deg, ${BRAND_TINT_FROM} 0%, ${BRAND_TINT_TO} 100%)`;

/**
 * The hero banner: a filled brand block, not a wash.
 *
 * 45deg puts the first stop at the bottom-left and the last at the top-right,
 * matching the reference. White clears 4.5:1 against every point along it —
 * 6.48:1 at the brightest end, 13.54:1 at the deepest — so the title, the
 * eyebrow and the icon are all legible the whole way across, not just at the
 * dark corner where a gradient is easy to check.
 */
export const BRAND_HERO_GRADIENT = `linear-gradient(45deg, ${BRAND_BLUE_DEEP} 0%, ${BRAND_BLUE_FROM} 100%)`;

/** Lift under the filled hero, keyed to the ramp's own deep step. */
export const BRAND_HERO_SHADOW = '0 10px 30px rgba(76,29,61,0.28)';

/**
 * On-hero text is pure white — all of it, including the small eyebrow and the
 * secondary meta line. Hierarchy comes from size and weight, not opacity.
 *
 * That is a constraint, not a preference. White on the gradient's bright end
 * clears AA with a measured margin, and fading secondary text trades that
 * margin away at exactly the corner of the banner where it is hardest to read.
 */
export const ON_BRAND_TEXT = '#FFFFFF';

/**
 * Ghost tile edge on the hero. Purely decorative — it outlines an icon that is
 * itself pure white — so it is free to sit below text contrast thresholds.
 */
export const ON_BRAND_BORDER = 'rgba(255,255,255,0.45)';

/** Glow under a brand-filled tile, matched to BRAND_BLUE_FROM. */
export const BRAND_GLOW = '0 8px 24px rgba(163,55,87,0.30)';
