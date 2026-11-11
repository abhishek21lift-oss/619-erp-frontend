import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  auth: {
    user: null, loading: false,
    login: vi.fn(), loginWithGoogle: vi.fn(), linkGoogle: vi.fn(),
    loginWithPasskey: vi.fn(), loginWithDevice: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  },
  status: vi.fn(),
  sign: vi.fn(),
  forget: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));
vi.mock('next/image', () => ({
  default: ({ priority: _priority, ...props }: { priority?: boolean }) => <img alt="" {...props} />,
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useWebAuthn', () => ({
  isWebAuthnSupported: () => true,
  isBiometricAvailable: async () => false,
  webAuthnError: () => 'passkey failed',
}));
vi.mock('@/lib/device-auth', () => ({
  deviceAuthSupported: () => true,
  deviceAuthStatus: mocks.status,
  deviceAuthSign: mocks.sign,
  deviceAuthForget: mocks.forget,
}));

import SignInScreen from '@/components/auth/SignInScreen';

const DEVICE_ID = 'a'.repeat(32);
const fingerprintButton = () => screen.queryByRole('button', { name: /sign in with fingerprint/i });

beforeEach(() => {
  Object.values(mocks.auth).forEach((v) => { if (typeof v === 'function') v.mockReset(); });
  mocks.replace.mockReset();
  mocks.push.mockReset();
  mocks.status.mockReset();
  mocks.sign.mockReset();
  mocks.forget.mockReset();
  mocks.forget.mockResolvedValue(undefined);
  mocks.status.mockResolvedValue({ available: true, enrolled: true, deviceId: DEVICE_ID });
});

afterEach(() => vi.clearAllMocks());

it('offers fingerprint sign-in only when this phone is enrolled', async () => {
  mocks.status.mockResolvedValue({ available: true, enrolled: false, deviceId: null });
  render(<SignInScreen portal="trainer" />);
  await waitFor(() => expect(mocks.status).toHaveBeenCalled());
  expect(fingerprintButton()).toBeNull();
});

it('shows the fingerprint button and signs in with the trainer door', async () => {
  render(<SignInScreen portal="trainer" />);
  const button = await screen.findByRole('button', { name: /sign in with fingerprint/i });

  fireEvent.click(button);

  await waitFor(() => expect(mocks.auth.loginWithDevice).toHaveBeenCalledWith(DEVICE_ID, 'trainer'));
  expect(mocks.sign).not.toHaveBeenCalled();
});

it('passes the unified door on the combined sign-in screen', async () => {
  render(<SignInScreen unified />);
  fireEvent.click(await screen.findByRole('button', { name: /sign in with fingerprint/i }));

  await waitFor(() => expect(mocks.auth.loginWithDevice).toHaveBeenCalledWith(DEVICE_ID, 'unified'));
});

it('forgets a revoked credential and hides the button', async () => {
  mocks.auth.loginWithDevice.mockRejectedValueOnce(
    Object.assign(new Error('revoked'), { code: 'DEVICE_CREDENTIAL_REVOKED' })
  );
  mocks.status
    .mockResolvedValueOnce({ available: true, enrolled: true, deviceId: DEVICE_ID })
    .mockResolvedValue({ available: true, enrolled: false, deviceId: null });

  render(<SignInScreen portal="trainer" />);
  fireEvent.click(await screen.findByRole('button', { name: /sign in with fingerprint/i }));

  expect(await screen.findByText(/fingerprint sign-in was turned off for this phone/i)).toBeInTheDocument();
  expect(mocks.forget).toHaveBeenCalled();
  await waitFor(() => expect(fingerprintButton()).toBeNull());
});

it('hides the button when the phone key was invalidated', async () => {
  mocks.auth.loginWithDevice.mockRejectedValueOnce(
    Object.assign(new Error('invalidated'), { code: 'DEVICE_AUTH_INVALIDATED' })
  );
  mocks.status
    .mockResolvedValueOnce({ available: true, enrolled: true, deviceId: DEVICE_ID })
    .mockResolvedValue({ available: true, enrolled: false, deviceId: null });

  render(<SignInScreen portal="trainer" />);
  fireEvent.click(await screen.findByRole('button', { name: /sign in with fingerprint/i }));

  expect(await screen.findByText(/no longer valid on this phone/i)).toBeInTheDocument();
  // The shell deleted the key itself; forgetting again would be a second,
  // pointless native round-trip.
  expect(mocks.forget).not.toHaveBeenCalled();
  await waitFor(() => expect(fingerprintButton()).toBeNull());
});

it('leaves the password form usable when the prompt is cancelled', async () => {
  mocks.auth.loginWithDevice.mockRejectedValueOnce(
    Object.assign(new Error('cancelled'), { code: 'DEVICE_AUTH_CANCELLED' })
  );

  render(<SignInScreen portal="trainer" />);
  fireEvent.click(await screen.findByRole('button', { name: /sign in with fingerprint/i }));

  expect(await screen.findByText(/fingerprint not recognised\. use your password\./i)).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toBeEnabled();
  expect(screen.getByRole('button', { name: /^log in/i })).toBeEnabled();
});
