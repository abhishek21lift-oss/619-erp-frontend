/**
 * Semantic status colour, theme-aware.
 *
 * The five families in palette.ts are decoration and state at once. A fill
 * (emerald-500) is not a text colour: on a light surface it measures ~2.3:1,
 * and on the dark theme the 700 tones used for light text disappear. The app
 * already solved that in globals.css with `--*-text` and `--*-soft` pairs;
 * this is the one import that lets a component ask for "success" instead of
 * picking a numbered swatch and getting dark mode wrong.
 */
export interface StateToneStyle {
  /** Readable text/icon colour on the current theme. */
  fg: string;
  /** Tinted background for a chip, strip or callout. */
  bg: string;
  border: string;
}

export const stateTone = {
  success: { fg: 'var(--success-text)', bg: 'var(--success-soft)', border: 'var(--success-border)' },
  warning: { fg: 'var(--warning-text)', bg: 'var(--warning-soft)', border: 'var(--warning-border)' },
  danger:  { fg: 'var(--danger-text)',  bg: 'var(--danger-soft)',  border: 'var(--danger-border)' },
  info:    { fg: 'var(--info-lo)',      bg: 'var(--info-soft)',    border: 'var(--info-border)' },
  neutral: { fg: 'var(--text-muted)',   bg: 'var(--bg-subtle)',    border: 'var(--border)' },
} satisfies Record<string, StateToneStyle>;

export type StateToneName = keyof typeof stateTone;
