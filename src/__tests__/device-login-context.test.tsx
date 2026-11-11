// The device door on the real AuthProvider: the web half must sign the exact
// server message and adopt the returned user, with no token anywhere in JS.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { useAuth, AuthProvider } from '@/lib/auth-context';

const mocks = vi.hoisted(() => ({
  mockHttp: vi.fn(),
  mockLoginOptions: vi.fn(),
  mockLoginVerify: vi.fn(),
  mockSign: vi.fn(),
  mockRouterReplace: vi.fn(),
  mockResetLock: vi.fn(),
  mockRefreshSession: vi.fn(),
  mockClearImpersonation: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    auth: {},
    webauthn: {},
    deviceAuth: {
      loginOptions: mocks.mockLoginOptions,
      loginVerify: mocks.mockLoginVerify,
    },
  },
  http: mocks.mockHttp,
}));
vi.mock('@/lib/http', () => ({
  resetRedirectLock: () => mocks.mockResetLock(),
  refreshSession: () => mocks.mockRefreshSession(),
  clearImpersonation: () => mocks.mockClearImpersonation(),
}));
vi.mock('@/lib/device-auth', () => ({ deviceAuthSign: mocks.mockSign }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.mockRouterReplace, push: vi.fn() }),
  usePathname: () => '/',
}));

const DEVICE_ID = 'a'.repeat(32);
const CHALLENGE = 'b'.repeat(64);
const USER = { id: 'u1', name: 'Device Coach', email: 'coach@x.com', role: 'trainer' };

function CaptureApi() {
  const api = useAuth();
  (CaptureApi as unknown as { api: typeof api }).api = api;
  return null;
}
const captured = () => (CaptureApi as unknown as { api: ReturnType<typeof useAuth> }).api;

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.mockHttp.mockResolvedValue({});
  mocks.mockLoginOptions.mockResolvedValue({ challenge: CHALLENGE });
  mocks.mockSign.mockResolvedValue('signature-1');
  mocks.mockLoginVerify.mockResolvedValue({ user: USER });
  sessionStorage.clear();
});

describe('loginWithDevice', () => {
  it('requests a fresh challenge, signs the exact message, and adopts the user', async () => {
    render(<AuthProvider><CaptureApi /></AuthProvider>);
    await waitFor(() => expect(captured().loading).toBe(false));

    await act(async () => { await captured().loginWithDevice(DEVICE_ID, 'trainer'); });

    expect(mocks.mockLoginOptions).toHaveBeenCalledWith({ deviceId: DEVICE_ID });
    expect(mocks.mockSign).toHaveBeenCalledWith(`MPS-DEVICE-LOGIN-V1\n${CHALLENGE}`);
    expect(mocks.mockLoginVerify).toHaveBeenCalledWith({
      deviceId: DEVICE_ID,
      challenge: CHALLENGE,
      signature: 'signature-1',
      portal: 'trainer',
    });
    expect(captured().user?.id).toBe('u1');
    expect(captured().user?.email).toBe('coach@x.com');
    expect(mocks.mockResetLock).toHaveBeenCalled();
  });

  it('fetches a new challenge on every call instead of reusing one', async () => {
    render(<AuthProvider><CaptureApi /></AuthProvider>);
    await waitFor(() => expect(captured().loading).toBe(false));

    await act(async () => { await captured().loginWithDevice(DEVICE_ID, 'trainer'); });
    mocks.mockLoginOptions.mockResolvedValueOnce({ challenge: 'c'.repeat(64) });
    await act(async () => { await captured().loginWithDevice(DEVICE_ID, 'trainer'); });

    expect(mocks.mockLoginOptions).toHaveBeenCalledTimes(2);
    expect(mocks.mockSign).toHaveBeenLastCalledWith(`MPS-DEVICE-LOGIN-V1\n${'c'.repeat(64)}`);
  });
});
