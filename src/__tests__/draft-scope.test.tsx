// Drafts belong to the person and studio that typed them.
//
// The New Client draft was stored under one key for everyone on the browser
// ('pt-os.new-client.draft.v2'), and neither it nor the Enrol draft matched
// the logout purge. So studio A's half-typed client — name, date of birth,
// mobile, address, emergency contact — was restored ("Restored your unsaved
// draft") into whoever signed in next, from any studio.
//
// Now every draft is filed under `draft:<user>@<studio>:<key>`, nothing is
// saved or restored with no one signed in, logout removes every draft, and
// signing in removes every draft its identity cannot read.
import type React from 'react';
import { act, renderHook } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAllDrafts, clearDraftsOutside, draftScopeFor, DraftScopeContext, scopedDraftKey, useAutoSaveDraft,
} from '@/hooks/useAutoSaveDraft';

const A = draftScopeFor({ id: 'user-a', organization_id: 'studio-a' })!;
const B = draftScopeFor({ id: 'user-b', organization_id: 'studio-b' })!;

const as = (scope: string | null) => function Wrapper({ children }: { children: React.ReactNode }) {
  return <DraftScopeContext.Provider value={scope}>{children}</DraftScopeContext.Provider>;
};
const CLIENT = { name: 'Ravi Kumar', dob: '1990-01-01', mobile: '9876543210', address: '12 MG Road' };
const NEW_CLIENT_KEY = 'pt-os.new-client.draft.v2';

/** Type a draft as `scope`, and return the hook for that identity. */
function typeAs(scope: string | null, key = NEW_CLIENT_KEY) {
  const hook = renderHook(() => useAutoSaveDraft({ key, data: CLIENT, isDirty: true }), { wrapper: as(scope) });
  let saved = false;
  act(() => { saved = hook.result.current.saveNow(); });
  return { hook, saved };
}
const restoreAs = (scope: string | null, key = NEW_CLIENT_KEY) =>
  renderHook(() => useAutoSaveDraft({ key, data: {}, isDirty: false }), { wrapper: as(scope) }).result.current.restore();

beforeEach(() => localStorage.clear());

describe('a draft is readable only by the identity that wrote it', () => {
  it('the same user in the same studio gets their draft back', () => {
    typeAs(A);
    expect(restoreAs(A)).toEqual(CLIENT);
  });

  it('another user on the same browser does not', () => {
    typeAs(A);
    expect(restoreAs(B)).toBeNull();
  });

  it('the same user id in another studio does not', () => {
    typeAs(A);
    expect(restoreAs(draftScopeFor({ id: 'user-a', organization_id: 'studio-z' }))).toBeNull();
  });

  it('with no one signed in, nothing is written and nothing is restored', () => {
    const { saved } = typeAs(null);
    expect(saved).toBe(false);
    expect(localStorage.length).toBe(0);
    localStorage.setItem(NEW_CLIENT_KEY, JSON.stringify({ data: CLIENT, savedAt: Date.now() }));
    expect(restoreAs(null)).toBeNull();
  });

  it('the stored key carries the scope, never the bare page key', () => {
    typeAs(A);
    expect(localStorage.getItem(NEW_CLIENT_KEY)).toBeNull();
    expect(localStorage.getItem(scopedDraftKey(A, NEW_CLIENT_KEY))).not.toBeNull();
  });

  it('a legacy unscoped draft left on the device is never restored', () => {
    localStorage.setItem(NEW_CLIENT_KEY, JSON.stringify({ data: CLIENT, savedAt: Date.now() }));
    expect(restoreAs(A)).toBeNull();
  });

  it('a user id with reserved characters cannot reach into another scope', () => {
    const tricky = draftScopeFor({ id: 'user-a@studio-a:x', organization_id: 'o' })!;
    expect(tricky).not.toContain(':');
    expect(tricky.startsWith(`${A}:`)).toBe(false);
  });
});

describe('logout removes every draft on the device', () => {
  it('scoped drafts of every identity, and every unscoped draft — and nothing else', () => {
    typeAs(A);
    typeAs(B, 'parq-draft.v1:c1:new');
    localStorage.setItem(NEW_CLIENT_KEY, '{}');
    localStorage.setItem('pt-os.enroll.c9.draft.v1', '{}');
    localStorage.setItem('informed-consent-draft.v1:c9', '{}');
    localStorage.setItem('619:exercise-draft:v1', '{}');
    localStorage.setItem('theme', 'dark');

    clearAllDrafts();

    expect(Object.keys(localStorage)).toEqual(['theme']);
  });
});

describe('signing in removes what the new identity cannot read', () => {
  it('keeps its own drafts, removes everyone else\'s and every unscoped one', () => {
    typeAs(A);
    typeAs(B);
    localStorage.setItem(NEW_CLIENT_KEY, '{}');
    localStorage.setItem('pt-os.enroll.c9.draft.v1', '{}');

    clearDraftsOutside(A);

    expect(Object.keys(localStorage)).toEqual([scopedDraftKey(A, NEW_CLIENT_KEY)]);
  });
});

describe('the auth provider wires it up', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'auth-context.tsx'), 'utf8');

  it('logout clears every draft', () => {
    const clearSession = src.slice(src.indexOf('const _clearSession'), src.indexOf('useEffect(', src.indexOf('const _clearSession')));
    expect(clearSession).toMatch(/clearAllDrafts\(\)/);
  });

  it('signing in purges drafts the new identity cannot read', () => {
    const adopt = src.slice(src.indexOf('const _adoptSession'), src.indexOf('const login = '));
    expect(adopt).toMatch(/clearDraftsOutside\(scope\)/);
  });

  it('every page under the provider gets the signed-in user + studio as its scope', () => {
    expect(src).toMatch(/<DraftScopeContext\.Provider value=\{draftScopeFor\(user\)\}>/);
  });

  it('the studio id survives a hard refresh, so a refreshed page finds its draft', () => {
    expect(src).toMatch(/organization_id: u\.organization_id \?\? null/);
    expect(src).toMatch(/organization_id: partial\.organization_id \?\? null/);
  });
});
