'use client';

import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

interface UseAutoSaveDraftOptions<T> {
  /** localStorage key — version-suffix it (e.g. '.v1') so future shape changes can be discarded safely. */
  key: string;
  data: T;
  /** Only persists while true — pass false once submitted/unchanged to stop writing. */
  isDirty: boolean;
  debounceMs?: number;
}

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

/**
 * How long an unsent draft is kept. These drafts are client health records
 * (PAR-Q answers, medications, pain) sitting in a browser that is often the
 * studio's shared front-desk device; they used to stay there indefinitely.
 */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ── Whose draft is it ───────────────────────────────────────────────────────
//
// Drafts used to be stored under the page's own key, the same for everyone who
// used the browser. The New Client draft's key named no client, user or
// studio at all, and neither it nor the Enrol draft matched the logout purge —
// so studio A's half-typed client (name, date of birth, mobile, address,
// emergency contact) was restored, "Restored your unsaved draft", into
// whoever signed in next, from any studio.
//
// Now every draft is stored under `draft:<scope>:<key>`, where the scope is
// the signed-in user AND their studio (AuthProvider supplies it through
// DraftScopeContext). A draft can only be read back by the identity that
// wrote it, and with no one signed in nothing is saved or restored at all.
// Logout removes every draft; signing in removes every draft that belongs to
// someone else, and every unscoped one.

const SCOPED_PREFIX = 'draft:';

/**
 * Unscoped draft keys, so they can be purged: the pre-scoping keys of the
 * forms above (never read again), and the exercise editor's own draft
 * (ExerciseEditor.tsx), which does not use this hook but must not outlive a
 * session either.
 */
const UNSCOPED_DRAFT_KEYS = [
  /-draft\.v\d+:/, // assessment drafts: `<form>-draft.v<N>:<client>:<record>`
  /^pt-os\.new-client\.draft\.v\d+$/,
  /^pt-os\.enroll\..+\.draft\.v\d+$/,
  /^619:exercise-draft:v\d+$/,
];

/** The signed-in identity drafts are filed under; null when nobody is signed in. */
export const DraftScopeContext = createContext<string | null>(null);

/** The scope for a user: their id and their studio, URL-encoded. */
export function draftScopeFor(user: { id?: string | null; organization_id?: string | null } | null | undefined): string | null {
  if (!user?.id) return null;
  return `${encodeURIComponent(user.id)}@${encodeURIComponent(user.organization_id ?? 'none')}`;
}

/** Where a draft for `key` lives for `scope`. */
export function scopedDraftKey(scope: string, key: string): string {
  return `${SCOPED_PREFIX}${scope}:${key}`;
}

function isUnscopedDraftKey(k: string): boolean {
  return UNSCOPED_DRAFT_KEYS.some((re) => re.test(k));
}

function removeKeys(match: (k: string) => boolean): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && match(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage unavailable — nothing was saved there either */
  }
}

/** Removes every draft from this browser, whoever wrote it — called at logout. */
export function clearAllDrafts(): void {
  removeKeys((k) => k.startsWith(SCOPED_PREFIX) || isUnscopedDraftKey(k));
}

/**
 * Removes every draft that `scope` cannot read — other users' and studios',
 * and every unscoped one. Called when someone signs
 * in, for the session that ended without a logout (a closed tab, an expired
 * cookie on a shared device).
 */
export function clearDraftsOutside(scope: string): void {
  const own = `${SCOPED_PREFIX}${scope}:`;
  removeKeys((k) => (k.startsWith(SCOPED_PREFIX) && !k.startsWith(own)) || isUnscopedDraftKey(k));
}

/** Debounced localStorage draft save + restore + clear, reusable across forms. */
export function useAutoSaveDraft<T>({ key: pageKey, data, isDirty, debounceMs = 2000 }: UseAutoSaveDraftOptions<T>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scope = useContext(DraftScopeContext);
  // No one signed in, no draft: nothing is written and nothing is restored.
  const key = scope ? scopedDraftKey(scope, pageKey) : null;

  useEffect(() => {
    if (!isDirty || !key) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // storage full/unavailable — non-fatal, drafts are a convenience, not a guarantee
      }
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, data, isDirty, debounceMs]);

  /**
   * The saved draft, if any. `notBefore` (epoch ms) discards a draft written
   * before that moment — pass the server copy's updated_at so a stale local
   * draft is never laid over newer saved data.
   */
  const restore = useCallback((opts?: { notBefore?: number }): T | null => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      if (!(Number(parsed?.savedAt) > Date.now() - DRAFT_TTL_MS)) {
        localStorage.removeItem(key);
        return null;
      }
      if (opts?.notBefore && !(Number(parsed?.savedAt) > opts.notBefore)) return null;
      return parsed?.data ?? null;
    } catch {
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    if (!key) return;
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }, [key]);

  /** Bypasses the debounce for an explicit "Save Draft" action. Returns true on success. */
  const saveNow = useCallback((): boolean => {
    if (!key) return false;
    try {
      const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }, [key, data]);

  return { restore, clear, saveNow };
}
