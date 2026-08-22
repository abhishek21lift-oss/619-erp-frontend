import type { PartialTheme } from '@nivo/theming';
import { navy, type as t } from './tokens';

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
 */

const sharedText = {
  fontFamily: t.sans,
  fontSize: t.size.sm,
  outlineWidth: 0,
  outlineColor: 'transparent',
  outlineOpacity: 0,
};

export const autoNivoTheme: PartialTheme = {
  background: 'transparent',
  text: { ...sharedText, fill: 'var(--text-muted)' },
  axis: {
    domain: { line: { stroke: 'var(--border)', strokeWidth: 1 } },
    ticks: {
      line: { stroke: 'var(--border)', strokeWidth: 1 },
      text: { ...sharedText, fill: 'var(--text-muted)', fontSize: t.size.xs, fontWeight: 600 },
    },
    legend: { text: { ...sharedText, fill: 'var(--text-secondary)', fontWeight: 700 } },
  },
  grid: { line: { stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '0' } },
  crosshair: {
    line: { stroke: 'var(--text-disabled)', strokeWidth: 1, strokeOpacity: 0.6, strokeDasharray: '4 4' },
  },
  legends: {
    text: { ...sharedText, fill: 'var(--text-muted)', fontSize: t.size.xs, fontWeight: 600 },
    title: { text: { ...sharedText, fill: 'var(--text-secondary)' } },
    ticks: {
      line: { stroke: 'var(--border)' },
      text: { ...sharedText, fill: 'var(--text-muted)' },
    },
  },
  labels: { text: { ...sharedText, fill: 'var(--text-primary)', fontWeight: 700 } },
  dots: { text: { ...sharedText, fill: 'var(--text-secondary)', fontWeight: 700 } },
  markers: { lineColor: 'var(--border)', lineStrokeWidth: 1, text: { ...sharedText, fill: 'var(--text-muted)' } },
  tooltip: {
    // The chip/table/basic wrappers are unused — every chart in this system
    // supplies its own `tooltip` render prop (see primitives/ChartTooltip),
    // so only `container` (the positioning wrapper Nivo still renders around
    // it) needs a value, and it needs to contribute nothing visually.
    container: { background: 'transparent', boxShadow: 'none', padding: 0 },
  },
  annotations: {
    text: { ...sharedText, fill: 'var(--text-primary)' },
    link: { stroke: 'var(--text-disabled)', strokeWidth: 1, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    outline: { stroke: 'var(--text-disabled)', strokeWidth: 1, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    symbol: { fill: 'var(--brand)', outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
  },
};

export const darkNivoTheme: PartialTheme = {
  background: 'transparent',
  text: { ...sharedText, fill: navy.muted },
  axis: {
    domain: { line: { stroke: navy.line, strokeWidth: 1 } },
    ticks: {
      line: { stroke: navy.line, strokeWidth: 1 },
      text: { ...sharedText, fill: navy.muted, fontSize: t.size.xs, fontWeight: 600 },
    },
    legend: { text: { ...sharedText, fill: navy.body, fontWeight: 700 } },
  },
  grid: { line: { stroke: navy.line, strokeWidth: 1 } },
  crosshair: { line: { stroke: navy.faint, strokeWidth: 1, strokeOpacity: 0.7, strokeDasharray: '4 4' } },
  legends: {
    text: { ...sharedText, fill: navy.muted, fontSize: t.size.xs, fontWeight: 600 },
    title: { text: { ...sharedText, fill: navy.body } },
    ticks: { line: { stroke: navy.line }, text: { ...sharedText, fill: navy.muted } },
  },
  labels: { text: { ...sharedText, fill: navy.ink, fontWeight: 700 } },
  dots: { text: { ...sharedText, fill: navy.body, fontWeight: 700 } },
  markers: { lineColor: navy.line, lineStrokeWidth: 1, text: { ...sharedText, fill: navy.muted } },
  tooltip: {
    container: { background: 'transparent', boxShadow: 'none', padding: 0 },
  },
  annotations: {
    text: { ...sharedText, fill: navy.ink },
    link: { stroke: navy.faint, strokeWidth: 1, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    outline: { stroke: navy.faint, strokeWidth: 1, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
    symbol: { fill: navy.ink, outlineWidth: 0, outlineColor: 'transparent', outlineOpacity: 0 },
  },
};

export function nivoThemeFor(surface: 'auto' | 'dark'): PartialTheme {
  return surface === 'dark' ? darkNivoTheme : autoNivoTheme;
}
