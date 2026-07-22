// src/lib/active-org.ts
//
// Platform org-switcher state. A super_admin can pin the whole app to one
// tenant organization; the selection is persisted in localStorage and
// forwarded by the http client as the `x-org-id` header (see http.ts), which
// the backend's tenantScope() honours ONLY for super_admins. Clearing it puts
// the super_admin back in platform-wide "see everything" mode.
//
// Not a React context on purpose: the http layer needs a synchronous read at
// request time, so localStorage is the source of truth and components
// subscribe to change events.

import { ACTIVE_ORG_KEY } from './http';

const NAME_KEY = '619_active_org_name';
const CHANGE_EVENT = 'active-org-changed';

export type ActiveOrg = { id: string; name: string } | null;

export function getActiveOrg(): ActiveOrg {
  if (typeof window === 'undefined') return null;
  try {
    const id = localStorage.getItem(ACTIVE_ORG_KEY);
    if (!id) return null;
    return { id, name: localStorage.getItem(NAME_KEY) || 'Organization' };
  } catch {
    return null;
  }
}

export function setActiveOrg(org: ActiveOrg): void {
  if (typeof window === 'undefined') return;
  try {
    if (org) {
      localStorage.setItem(ACTIVE_ORG_KEY, org.id);
      localStorage.setItem(NAME_KEY, org.name);
    } else {
      localStorage.removeItem(ACTIVE_ORG_KEY);
      localStorage.removeItem(NAME_KEY);
    }
  } catch {
    /* storage unavailable — ignore */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Subscribe to org-switch changes (same tab via CustomEvent, other tabs via
 *  the native `storage` event). Returns an unsubscribe function. */
export function subscribeActiveOrg(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
