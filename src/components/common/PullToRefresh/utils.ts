// Pure helpers for the pull-to-refresh system — no React, no side effects
// beyond the guarded haptic call.

/** MY PT STUDIO brand palette used by the indicator. */
export const BRAND = {
  maroon: '#0059CE',
  maroonDeep: '#0050AD',
  gold: '#FBBF24',
  ink: '#0F172A',
  mute: '#94a3b8',
  success: '#10b981',
} as const;

export const MAX_PULL_RATIO = 1.8;
const RESISTANCE_BEYOND_THRESHOLD = 0.35;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** 1:1 finger tracking up to `threshold`, then rubber-band damped to `cap`. */
export function easePull(dy: number, threshold: number, cap: number): number {
  if (dy <= 0) return 0;
  if (dy <= threshold) return dy;
  const extra = (dy - threshold) * RESISTANCE_BEYOND_THRESHOLD;
  return Math.min(threshold + extra, cap);
}

/**
 * Fire a haptic tick where supported (silently no-ops otherwise).
 *
 * Takes a pattern as well as a plain duration, because that is what
 * `navigator.vibrate` takes. The check-in scanner tells its three outcomes
 * apart by rhythm — one tap, two taps, one long buzz — so the answer lands
 * without looking at the screen.
 */
export function triggerHaptic(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try { navigator.vibrate(pattern); } catch { /* unsupported / blocked — non-fatal */ }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
