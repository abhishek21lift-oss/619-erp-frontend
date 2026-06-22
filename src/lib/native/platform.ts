'use client';
/**
 * platform.ts — Capacitor environment detection helpers
 *
 * All helpers are safe to call from SSR (return false / 'web' on server).
 */

/** True when running inside a Capacitor native WebView (Android or iOS). */
export function isCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/** 'android' | 'ios' | 'web' */
export function getPlatform(): 'android' | 'ios' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  if (!cap) return 'web';
  const p = cap.getPlatform?.() as string | undefined;
  if (p === 'android') return 'android';
  if (p === 'ios') return 'ios';
  return 'web';
}

export const isAndroid = () => getPlatform() === 'android';
export const isIOS     = () => getPlatform() === 'ios';
export const isNative  = () => isAndroid() || isIOS();
export const isWeb     = () => getPlatform() === 'web';
