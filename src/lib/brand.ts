/**
 * The MY PT STUDIO blue, sampled from the logo rather than guessed.
 *
 * Every value below was read out of public/mypt-logo.png by decoding the PNG
 * and taking the distribution of its blue pixels — not eyedropped by eye and
 * not a Tailwind blue that looked close. Provenance matters here because
 * "close to the logo" is exactly the kind of thing that drifts a shade per
 * screen until nothing matches anything.
 *
 *   most common blue   #0067E0   (rgb 0,103,224 — the single most frequent
 *                                 fully-opaque blue pixel in the mark)
 *   highlight (p85)    #0271EB
 *   mid / shadow (p50) #0059CE
 *
 * In HSL the mark's blue is hue 212.4°, saturation 100%, lightness 44%. The
 * pale surface tints are that exact hue and saturation lifted to L 97.5% and
 * 98.8%, so the banner reads as a wash of the logo colour rather than a
 * generic light blue sitting near it.
 *
 * Contrast, measured (WCAG 2.1 relative luminance):
 *   #FFFFFF on SURFACE_FROM  4.60:1  — white icon on the lightest tile stop
 *   #FFFFFF on SURFACE_TO    6.32:1
 *   LABEL on TINT_FROM       5.82:1  — the small uppercase eyebrow
 * All clear 4.5:1, which the eyebrow needs at its size and weight.
 */

/** The mark's blue. Use for a flat fill or a single-colour icon. */
export const BRAND_BLUE = '#0067E0';

/** Gradient stops for a solid brand surface — icon tiles, primary buttons. */
export const BRAND_BLUE_FROM = '#0271EB';
export const BRAND_BLUE_TO = '#0059CE';

/** The same hue at surface lightness, for the soft banner wash. */
export const BRAND_TINT_FROM = '#F2F8FF';
export const BRAND_TINT_TO = '#F9FCFF';

/** Dark enough for small text on BRAND_TINT_*. This is the logo's mid blue. */
export const BRAND_BLUE_LABEL = '#0059CE';

/** Ready-made gradients, so the angle does not drift between call sites. */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND_BLUE_FROM}, ${BRAND_BLUE_TO})`;
export const BRAND_TINT_GRADIENT = `linear-gradient(135deg, ${BRAND_TINT_FROM} 0%, ${BRAND_TINT_TO} 100%)`;

/** Glow under a brand-filled tile, matched to BRAND_BLUE_FROM. */
export const BRAND_GLOW = '0 8px 24px rgba(2,113,235,0.30)';
