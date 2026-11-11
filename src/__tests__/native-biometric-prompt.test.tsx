import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  user: { id: 'u1', name: 'Coach' } as { id: string; name: string } | null,
  impersonation: null as unknown,
  supported: vi.fn(() => true),
  status: vi.fn(),
  enroll: vi.fn(),
  sign: vi.fn(),
  options: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/http', () => ({ getImpersonation: () => mocks.impersonation }));
vi.mock('@/lib/device-auth', () => ({
  deviceAuthSupported: mocks.supported,
  deviceAuthStatus: mocks.status,
  deviceAuthEnroll: mocks.enroll,
  deviceAuthSign: mocks.sign,
}));
vi.mock('@/lib/api', () => ({
  api: {
    deviceAuth: {
      registerOptions: mocks.options,
      registerVerify: mocks.verify,
    },
  },
}));

import NativeBiometricPrompt from '@/components/auth/NativeBiometricPrompt';

const DEVICE_ID = 'a'.repeat(32);
const CHALLENGE = 'b'.repeat(64);

beforeEach(() => {
  Object.values(mocks).forEach((v) => { if (typeof v === 'function' && 'mockReset' in v) v.mockReset(); });
  mocks.user = { id: 'u1', name: 'Coach' };
  mocks.impersonation = null;
  mocks.supported.mockReturnValue(true);
  mocks.status.mockResolvedValue({ available: true, enrolled: false, deviceId: null });
  mocks.options.mockResolvedValue({ challenge: CHALLENGE });
  mocks.enroll.mockResolvedValue({ deviceId: DEVICE_ID, publicKey: 'pk', label: 'Pixel 8' });
  mocks.sign.mockResolvedValue('sig');
  mocks.verify.mockResolvedValue({ success: true, deviceId: DEVICE_ID });
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => cleanup());

it('renders nothing in a browser without the bridge', async () => {
  mocks.supported.mockReturnValue(false);
  render(<NativeBiometricPrompt />);
  await waitFor(() => expect(mocks.supported).toHaveBeenCalled());
  expect(screen.queryByText(/enable fingerprint sign-in/i)).toBeNull();
  expect(mocks.status).not.toHaveBeenCalled();
});

it('renders nothing when this phone is already enrolled', async () => {
  mocks.status.mockResolvedValue({ available: true, enrolled: true, deviceId: DEVICE_ID });
  render(<NativeBiometricPrompt />);
  await waitFor(() => expect(mocks.status).toHaveBeenCalled());
  expect(screen.queryByText(/enable fingerprint sign-in/i)).toBeNull();
});

it('offers enrollment, signs the registration challenge, and reports success', async () => {
  render(<NativeBiometricPrompt />);
  const enable = await screen.findByRole('button', { name: /enable fingerprint sign-in/i });

  fireEvent.click(enable);

  await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith({
    challenge: CHALLENGE,
    deviceId: DEVICE_ID,
    publicKey: 'pk',
    label: 'Pixel 8',
    signature: 'sig',
  }));
  expect(mocks.sign).toHaveBeenCalledWith(`MPS-DEVICE-REGISTER-V1\n${CHALLENGE}`);
  expect(await screen.findByText(/fingerprint sign-in enabled/i)).toBeInTheDocument();
  expect(mocks.status).toHaveBeenCalledTimes(2);
});

it('snoozes for a week and stays hidden on the next visit', async () => {
  render(<NativeBiometricPrompt />);
  fireEvent.click(await screen.findByRole('button', { name: /not now/i }));
  await waitFor(() => expect(screen.queryByText(/enable fingerprint sign-in/i)).toBeNull());

  mocks.status.mockClear();
  render(<NativeBiometricPrompt />);
  await waitFor(() => expect(mocks.supported).toHaveBeenCalled());
  expect(screen.queryByText(/enable fingerprint sign-in/i)).toBeNull();
  expect(mocks.status).not.toHaveBeenCalled();
});

it('never enrolls into an impersonated account', () => {
  mocks.impersonation = { targetUserId: 'u2' };
  render(<NativeBiometricPrompt />);
  expect(screen.queryByText(/enable fingerprint sign-in/i)).toBeNull();
  expect(mocks.supported).not.toHaveBeenCalled();
  expect(mocks.status).not.toHaveBeenCalled();
});
