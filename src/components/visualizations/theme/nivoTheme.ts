import type { PartialTheme } from '@nivo/theming';
import { navy } from './colors';
import { fontFamily, fontSize, fontWeight } from './typography';
import { grid } from './chartStyle';

/**
 * Two Nivo themes, not one-per-app-theme-times-N-components.
 *
 * `auto` is built entirely from CSS custom properties (var(--text-muted), …),
 * so it re-colours the instant the app's [data-theme] attribute flips — no
 * useTheme() re-render, no light/dark branch to keep in sync, because the
 * browser re-evaluates the var() at paint time exactly like it does for every
 * other themed surface in the app (see src/components/ui/chart.tsx, which
 * uses the same trick). This is what every chart gets by default.
 *
 * `dark` is the always-dark "premium" surface — literal navy, not CSS vars —
 * for a chart card that opts into ChartShell's `surface="dark"` and should
 * read as the cinematic dark tile regardless of the viewer's light/dark
 * toggle (the landing page's own hero cards work the same way).
 *
 * Every literal below is a typography/chartStyle token, not a number typed
 * here — this file decides WHICH colour goes where, never what size or
 * weight a label is.
 */

const sharedText = {
  fontFamily: fontFamily.sans,
  fontSize: fontSize.sm,
  outlineWidth: 0,
  outlineColor: 'transparent',
  outlineOpacity: 0,
};

export const autoNivoTheme: PartialTheme = {
  background: 'transparent',
  text: { ...sharedText, fill: 'var(--text-muted)' },
  axis: {
    domain: { line: { stroke: 'var(--border)', strokeWidth: grid.strokeWidth } },
    ticks: {
      line: { stroke: 'var(--border)', strokeWidth: grid.strokeWidth },
      text: { ...sharedText, fill: 'var(--text-muted)', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    },
    legend: { text: { ...sharedText, fill: 'var(--text-secondary)', fontWeight: fontWeight.bold } },
  },
  grid: { line: { stroke: 'var(--border)', strokeWidth: grid.strokeWidth, strokeDasharray: grid.strokeDasharray } },
  crosshair: {
    line: { stroke: 'var(--text-disabled)', strokeWidth: grid.strokeWidth, strokeOpacity: 0.6, strokeDasharray: '4 4' },
  },
  legends: {
    text: { ...sharedText, fill: 'var(--text-muted)', fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    title: { text: { ...sharedText, fill: 'var(--text-secondary)' } },
    ticks: {
      line: { stroke: 'var(--border)' },
      text: { ...sharedText, fill: 'var(--text-muted)' },
    },
  },
  labels: { text: { ...sharedText, fill: 'var(--text-primary)', fontWeight: fontWeight.bold } },
  dots: { text: { ...sharedText, fill: 'var(--text-secondary)', fontWeight: fontWeight.bold } },
  markers: { lineColor: 'var(--border)', lineStrokeWidth: grid.strokeWidth, text: { ...sharedText, fill: 'var(--text-muted)' } },
  tooltip: {
    // The chip/table/basic wrappers are unused — every chart in this system
    // supplies its own `tooltip` render prop (see primitives/ChartTooltip),
    // so only `container` (the positioning wrapper Nivo still renders around
    // it) needs a value, and it needs to contribute nothing visually.
    container: { background: 'transparent', boxShadow: 'none', padding: 0 },
  },
  annotations: {
    text: { ...sharedText, fill: 'var(--text-primary)' },
    link: { stroke: 'var(--text-disabled)', strokeWidth: grid.strokeWidth, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    outline: { stroke: 'var(--text-disabled)', strokeWidth: grid.strokeWidth, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    symbol: { fill: 'var(--brand)', outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
  },
};

export const darkNivoTheme: PartialTheme = {
  background: 'transparent',
  text: { ...sharedText, fill: navy.muted },
  axis: {
    domain: { line: { stroke: navy.line, strokeWidth: grid.strokeWidth } },
    ticks: {
      line: { stroke: navy.line, strokeWidth: grid.strokeWidth },
      text: { ...sharedText, fill: navy.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    },
    legend: { text: { ...sharedText, fill: navy.body, fontWeight: fontWeight.bold } },
  },
  grid: { line: { stroke: navy.line, strokeWidth: grid.strokeWidth } },
  crosshair: { line: { stroke: navy.faint, strokeWidth: grid.strokeWidth, strokeOpacity: 0.7, strokeDasharray: '4 4' } },
  legends: {
    text: { ...sharedText, fill: navy.muted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    title: { text: { ...sharedText, fill: navy.body } },
    ticks: { line: { stroke: navy.line }, text: { ...sharedText, fill: navy.muted } },
  },
  labels: { text: { ...sharedText, fill: navy.ink, fontWeight: fontWeight.bold } },
  dots: { text: { ...sharedText, fill: navy.body, fontWeight: fontWeight.bold } },
  markers: { lineColor: navy.line, lineStrokeWidth: grid.strokeWidth, text: { ...sharedText, fill: navy.muted } },
  tooltip: {
    container: { background: 'transparent', boxShadow: 'none', padding: 0 },
  },
  annotations: {
    text: { ...sharedText, fill: navy.ink },
    link: { stroke: navy.faint, strokeWidth: grid.strokeWidth, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    outline: { stroke: navy.faint, strokeWidth: grid.strokeWidth, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    symbol: { fill: navy.ink, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
  },
};

export function nivoThemeFor(surface: 'auto' | 'dark'): PartialTheme {
  return surface === 'dark' ? darkNivoTheme : autoNivoTheme;
}
