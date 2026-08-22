/**
 * The MY PT STUDIO Visualization Design System — every colour, gradient,
 * typeface, grid line, axis style, tooltip style, legend, radius, shadow,
 * animation and spacing value a chart in this app can use, in one place.
 *
 * A Premium* component or primitive never writes a hex, a px value, an
 * easing curve or a media query of its own — it imports the relevant token
 * group from here. That is the whole rule this folder exists to enforce, and
 * it's what makes "change the studio's whole visual identity" a one-file
 * edit: swap `saffron` in colors.ts, or `EASE` in motion.ts, or `chartHeight`
 * in spacing.ts, and every chart — bar, line, area, donut, pie, progress
 * ring, sparkline — picks it up on its next render.
 *
 *   colors.ts      chart colours, gradients' source colours, the icon chip
 *   typography.ts  font family, size scale, weight, letter-spacing
 *   motion.ts      easing, duration, the two animation presets
 *   shape.ts       border-radius, border-width, box-shadow
 *   spacing.ts     padding, gaps, plot margins, per-chart-type defaults
 *   chartStyle.ts  grid lines, axis ticks, tooltip chrome, legend chrome
 *   gradients.ts   the three named gradient presets + the builder
 *   responsive.ts  the breakpoint, the compact-mode scale, the hook
 *   nivoTheme.ts   the two Nivo Theme objects assembled from all of the above
 *   surface.ts     the `Surface` union every token group above is aware of
 *   format.ts      the default number formatter
 */

export { saffron, navy, series, semantic, band, rgba, iconChip } from './colors';
export { fontFamily, fontSize, fontWeight, letterSpacing, typography } from './typography';
export { EASE, duration, spring, framerTransition, framerTransitionReduced, motion } from './motion';
export { radius, border, shadow, shape } from './shape';
export {
  spacing, chartHeight, chartMargin, barPadding, pieLayout, radialLayout, pointLayout,
} from './spacing';
export { grid, axis, tooltipChrome, legendChrome } from './chartStyle';
export { gradientPreset, buildGradientFill } from './gradients';
export type { GradientPreset } from './gradients';
export { breakpoint, responsiveScale, useIsCompactChart, scaleMargin } from './responsive';
export { autoNivoTheme, darkNivoTheme, nivoThemeFor } from './nivoTheme';
export type { Surface } from './surface';
export { defaultFormat } from './format';
