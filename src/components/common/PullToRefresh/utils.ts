// Pure helpers for the pull-to-refresh system — no React, no side effects
// beyond the guarded haptic call.

/** MY PT STUDIO brand palette used by the indicator. */
export const BRAND = {
  maroon: '#6E1230',
  maroonDeep: '#4A0A1E',
  gold: '#C8A24B',
  ink: '#1A1420',
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

/** Fire a short haptic tick where supported (silently no-ops otherwise). */
export function triggerHaptic(ms: number): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try { navigator.vibrate(ms); } catch { /* unsupported / blocked — non-fatal */ }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
