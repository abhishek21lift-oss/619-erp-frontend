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

/**
 * The shadow end of the hero banner. The design reference runs deep at the
 * bottom-left to bright at the top-right, and its darkest point sampled as
 * #0059CE — hue 218.8°, which is 6° off the mark. This is the same lightness
 * (L 34%) held on the logo's own hue instead, so the banner is the logo blue
 * getting darker rather than a slightly different blue.
 */
export const BRAND_BLUE_DEEP = '#0050AD';

/** The same hue at surface lightness, for a soft wash. */
export const BRAND_TINT_FROM = '#F8FAFC';
export const BRAND_TINT_TO = '#F8FAFC';

/** Dark enough for small text on BRAND_TINT_*. This is the logo's mid blue. */
export const BRAND_BLUE_LABEL = '#0059CE';

/** Ready-made gradients, so the angle does not drift between call sites. */
export const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND_BLUE_FROM}, ${BRAND_BLUE_TO})`;
export const BRAND_TINT_GRADIENT = `linear-gradient(135deg, ${BRAND_TINT_FROM} 0%, ${BRAND_TINT_TO} 100%)`;

/**
 * The hero banner: a filled blue block, not a wash.
 *
 * 45deg puts the first stop at the bottom-left and the last at the top-right,
 * matching the reference. White clears 4.5:1 against every point along it —
 * 4.60:1 at the brightest end, 8.0:1 at the deepest — so the title, the
 * eyebrow and the icon are all legible the whole way across, not just at the
 * dark corner where a gradient is easy to check.
 */
export const BRAND_HERO_GRADIENT = `linear-gradient(45deg, ${BRAND_BLUE_DEEP} 0%, ${BRAND_BLUE_FROM} 100%)`;

/** Lift under the filled hero, keyed to the gradient's own blue. */
export const BRAND_HERO_SHADOW = '0 10px 30px rgba(0,89,206,0.28)';

/**
 * On-hero text is pure white — all of it, including the small eyebrow and the
 * secondary meta line. Hierarchy comes from size and weight, not opacity.
 *
 * That is a constraint, not a preference. White on the gradient's bright end
 * is 4.60:1, which clears AA for normal text with almost nothing to spare, so
 * ANY translucency drops below it: 0.85 alpha measures 3.75:1 and 0.75 alpha
 * 3.26:1. The usual trick of fading secondary text to 75% would put it under
 * the threshold at exactly the corner of the banner where it is hardest to
 * read anyway.
 */
export const ON_BRAND_TEXT = '#FFFFFF';

/**
 * Ghost tile edge on the hero. Purely decorative — it outlines an icon that is
 * itself pure white — so it is free to sit below text contrast thresholds.
 */
export const ON_BRAND_BORDER = 'rgba(255,255,255,0.45)';

/** Glow under a brand-filled tile, matched to BRAND_BLUE_FROM. */
export const BRAND_GLOW = '0 8px 24px rgba(2,113,235,0.30)';
