'use client';
/**
 * storage.ts — Persistent offline key-value storage
 *
 * On native: @capacitor/preferences (encrypted keychain-backed storage).
 * On web: localStorage with JSON serialisation.
 *
 * Use this instead of localStorage for anything that must survive app restarts
 * and be available offline (user preferences, cached data, draft forms, etc.).
 */

import { isNative } from './platform';

// ── Web fallback ──────────────────────────────────────────────────────────────
function webGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function webSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota */ }
}
function webRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}
function webClear(prefix?: string): void {
  if (!prefix) { try { localStorage.clear(); } catch { /* noop */ } return; }
  Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function get(key: string): Promise<string | null> {
  if (!isNative()) return webGet(key);
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key });
  return value;
}

export async function set(key: string, value: string): Promise<void> {
  if (!isNative()) { webSet(key, value); return; }
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value });
}

export async function remove(key: string): Promise<void> {
  if (!isNative()) { webRemove(key); return; }
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key });
}

export async function clear(prefix?: string): Promise<void> {
  if (!isNative()) { webClear(prefix); return; }
  const { Preferences } = await import('@capacitor/preferences');
  if (!prefix) { await Preferences.clear(); return; }
  const { keys } = await Preferences.keys();
  await Promise.all(keys.filter(k => k.startsWith(prefix)).map(k => Preferences.remove({ key: k })));
}

/** JSON helper — store any serialisable value. */
export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await set(key, JSON.stringify(value));
}

// ── Typed keys used by the app ─────────────────────────────────────────────
export const STORAGE_KEYS = {
  /** Minimal user identity persisted across sessions */
  USER_SESSION:       '619_user_v3',
  /** Last-visited route for deep-link restoration */
  LAST_ROUTE:         '619_last_route',
  /** Biometric login enabled flag */
  BIOMETRIC_ENABLED:  '619_biometric',
  /** FCM/APNs device token */
  PUSH_TOKEN:         '619_push_token',
  /** Theme preference */
  THEME:              '619_theme',
  /** Offline queue (array of pending mutations) */
  OFFLINE_QUEUE:      '619_offline_queue',
} as const;
