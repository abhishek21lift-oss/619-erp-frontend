// Where the badge gets its number, and why there are two sources.
//
// The session is the right place for it, and the backend change that puts it
// there is merged. It has never reached the server — every deploy since has
// failed before it could SSH to the box — so in production the session carries
// no founder fields, the badge is handed undefined, and it renders nothing for
// two studios that really are founders (#1 Sachin PT Studio, #2 NK FITNESS).
//
// /api/subscription/status has returned is_founder and founder_number since
// 24 July and is already deployed, so reading from it makes the badge appear
// today. The moment the backend does deploy, this hook stops making that
// request at all — the session answers first.
//
// Three properties matter and each fails in a way nobody would notice:
//   - the session must win, or the bridge never removes itself;
//   - five badges must share one request, not make five per navigation;
//   - the cache must clear on logout, or studio B shows studio A's badge.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const status = vi.fn();
vi.mock('@/lib/api', () => ({ api: { subscription: { status: () => status() } } }));

const authUser = { current: null as unknown };
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: authUser.current }) }));

// Imported after the mocks so the hook picks them up.
const load = async () => {
  vi.resetModules();
  return import('@/lib/use-founder');
};

beforeEach(() => {
  status.mockReset();
  authUser.current = { id: 'u1', name: 'A' };
});
afterEach(() => vi.clearAllMocks());

describe('the session wins', () => {
  it('never calls the API when the session already carries the number', async () => {
    // This is what makes the fallback self-removing: once the backend is
    // deployed, the request stops happening on its own.
    const { useFounder } = await load();
    authUser.current = { id: 'u1', founder_number: 7 };

    const { result } = renderHook(() => useFounder());

    expect(result.current).toBe(7);
    expect(status).not.toHaveBeenCalled();
  });

  it('does not call the API for a signed-out visitor', async () => {
    const { useFounder } = await load();
    authUser.current = null;
    renderHook(() => useFounder());
    expect(status).not.toHaveBeenCalled();
  });
});

describe('the fallback', () => {
  it('reads the number from the live subscription endpoint', async () => {
    status.mockResolvedValue({ data: { founder_number: 2, is_founder: true } });
    const { useFounder } = await load();

    const { result } = renderHook(() => useFounder());

    await waitFor(() => expect(result.current).toBe(2));
    expect(status).toHaveBeenCalledTimes(1);
  });

  it('returns null for a studio that is not a founder', async () => {
    status.mockResolvedValue({ data: { founder_number: null, is_founder: false } });
    const { useFounder } = await load();

    const { result } = renderHook(() => useFounder());

    await waitFor(() => expect(status).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('shares one request across every badge on the page', async () => {
    // The badge renders in the sidebar on every screen plus the dashboard,
    // profile, billing and team screens. One request per badge would be five
    // per navigation.
    status.mockResolvedValue({ data: { founder_number: 1 } });
    const { useFounder } = await load();

    const hooks = [renderHook(() => useFounder()), renderHook(() => useFounder()), renderHook(() => useFounder())];

    await waitFor(() => expect(hooks[0].result.current).toBe(1));
    expect(status).toHaveBeenCalledTimes(1);
  });

  it('shows no badge when the request fails, rather than guessing', async () => {
    // Showing a badge to a non-founder devalues it for the twenty who paid;
    // showing none costs a founder a decoration. The safe failure is none.
    status.mockRejectedValue(new Error('401'));
    const { useFounder } = await load();

    const { result } = renderHook(() => useFounder());

    await waitFor(() => expect(status).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('retries on the next navigation after a failure', async () => {
    // A failure is not cached: one bad response must not write the badge off
    // for the rest of the session.
    status.mockRejectedValueOnce(new Error('network'));
    const { useFounder } = await load();

    const first = renderHook(() => useFounder());
    await waitFor(() => expect(status).toHaveBeenCalledTimes(1));
    first.unmount();

    status.mockResolvedValue({ data: { founder_number: 4 } });
    const second = renderHook(() => useFounder());
    await waitFor(() => expect(second.result.current).toBe(4));
  });
});

describe('switching accounts', () => {
  it('does not serve one studio the previous studio\'s badge', async () => {
    // The cache is keyed by user id, so a different account cannot read the
    // first one's answer. Doing this by having auth-context clear the cache
    // would have made an import cycle — auth-context imports this hook, this
    // hook imports useAuth from auth-context.
    status.mockResolvedValue({ data: { founder_number: 1 } });
    const { useFounder } = await load();

    authUser.current = { id: 'founder-studio' };
    const a = renderHook(() => useFounder());
    await waitFor(() => expect(a.result.current).toBe(1));
    a.unmount();

    status.mockResolvedValue({ data: { founder_number: null } });
    authUser.current = { id: 'other-studio' };
    const b = renderHook(() => useFounder());

    await waitFor(() => expect(status).toHaveBeenCalledTimes(2));
    expect(b.result.current).toBeNull();
  });

  it('reuses the cache for the same account across navigations', async () => {
    status.mockResolvedValue({ data: { founder_number: 3 } });
    const { useFounder } = await load();

    authUser.current = { id: 'same' };
    const first = renderHook(() => useFounder());
    await waitFor(() => expect(first.result.current).toBe(3));
    first.unmount();

    const second = renderHook(() => useFounder());
    await waitFor(() => expect(second.result.current).toBe(3));
    expect(status).toHaveBeenCalledTimes(1);
  });
});
