/**
 * Every chart and ChartShell in this system takes the same `surface` prop,
 * defined once here so the seven chart components and the shell can never
 * drift into accepting different values.
 *
 *   auto  (default) — follows the app's own light/dark toggle via CSS vars.
 *   dark             — always the premium navy card, regardless of toggle.
 */
export type Surface = 'auto' | 'dark';
