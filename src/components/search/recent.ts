'use client';

/**
 * Local history for the global search box: the terms someone typed and the
 * records they opened.
 *
 * This is deliberately client-side. Recency is personal, per-device and useless
 * to anyone else, so keeping it in localStorage makes it instant, keeps it
 * working when the backend is cold, and means one more place where a tenant's
 * data could leak simply does not exist.
 *
 * Everything here is defensive: localStorage throws in private mode on some
 * browsers, can be full, and can contain anything a previous version wrote. A
 * broken history must never take down the search box, so every read falls back
 * to empty and every write fails silently.
 */

import type { SearchItem } from '@/lib/api';

const QUERY_KEY = '619_recent_searches';
const VIEWED_KEY = '619_recently_viewed';

/** The spec's "last 10". Also what fits a dropdown without scrolling. */
export const MAX_RECENT_QUERIES = 10;
const MAX_RECENT_VIEWED = 8;

/** Fires after any mutation so every mounted search box updates together —
 *  the `storage` event only fires in OTHER tabs, not the one that wrote. */
const CHANGED_EVENT = 'global-search-history-changed';

function read<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode — history is a nicety, never a hard failure */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }
}

export function subscribeToHistory(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED_EVENT, fn);
  // Cross-tab: keep a second window's history in step.
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(CHANGED_EVENT, fn);
    window.removeEventListener('storage', fn);
  };
}

// ── Recent queries ───────────────────────────────────────────────────────────

export function getRecentQueries(): string[] {
  return read<string>(QUERY_KEY).filter((q) => typeof q === 'string' && q.trim()).slice(0, MAX_RECENT_QUERIES);
}

export function pushRecentQuery(raw: string): void {
  const query = raw.trim();
  // One and two character queries are almost always a keystroke on the way to a
  // real query; remembering them fills the list with noise.
  if (query.length < 3) return;
  const existing = getRecentQueries();
  // Case-insensitive de-dupe, but keep the casing the user just typed — the
  // most recent spelling is the one they will recognise.
  const next = [query, ...existing.filter((q) => q.toLowerCase() !== query.toLowerCase())];
  write(QUERY_KEY, next.slice(0, MAX_RECENT_QUERIES));
}

export function clearRecentQueries(): void {
  write(QUERY_KEY, []);
}

// ── Recently viewed records ──────────────────────────────────────────────────

/** A trimmed copy of the result card, so the list renders with no network call. */
export interface ViewedRecord {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  href: string;
  avatar_url?: string | null;
}

export function getRecentlyViewed(): ViewedRecord[] {
  return read<ViewedRecord>(VIEWED_KEY).filter(
    (r) => r && typeof r.id === 'string' && typeof r.href === 'string' && typeof r.title === 'string',
  );
}

export function pushRecentlyViewed(item: SearchItem): void {
  const record: ViewedRecord = {
    id: item.id,
    type: item.type,
    title: item.title,
    subtitle: item.subtitle ?? null,
    href: item.href,
    avatar_url: item.avatar_url ?? null,
  };
  const next = [record, ...getRecentlyViewed().filter((r) => r.id !== record.id)];
  write(VIEWED_KEY, next.slice(0, MAX_RECENT_VIEWED));
}

export function clearRecentlyViewed(): void {
  write(VIEWED_KEY, []);
}

/** Used when a session ends — history is per-person, so it must not survive a
 *  logout on a shared studio computer. */
export function clearSearchHistory(): void {
  write(QUERY_KEY, []);
  write(VIEWED_KEY, []);
}
