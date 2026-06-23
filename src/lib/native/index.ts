/**
 * native/index.ts — barrel export for all Capacitor native helpers.
 *
 * All modules use dynamic imports internally so they are safe to import
 * in any component — they become no-ops on web or SSR.
 */

export * from './platform';
export * from './camera';
export * from './biometric';
export * from './notifications';
export * from './storage';
export * from './deep-link';
