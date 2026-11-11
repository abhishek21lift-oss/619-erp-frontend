import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  supported: vi.fn(() => true),
  status: vi.fn(),
  enroll: vi.fn(),
  sign: vi.fn(),
  forget: vi.fn(),
  options: vi.fn(),
  registerVerify: vi.fn(),
  list: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/lib/device-auth', () => ({
  deviceAuthSupported: mocks.supported,
  deviceAuthStatus: mocks.status,
  deviceAuthEnroll: mocks.enroll,
  deviceAuthSign: mocks.sign,
  deviceAuthForget: mocks.forget,
}));
vi.mock('@/lib/api', () => ({
  api: {
    deviceAuth: {
      registerOptions: mocks.options,
      registerVerify: mocks.registerVerify,
    },
    webauthn: {
      listCredentials: mocks.list,
      deleteCredential: mocks.del,
    },
  },
}));

import AccountDeviceCard from '@/components/auth/AccountDeviceCard';

const DEVICE_ID = 'a'.repeat(32);
const CHALLENGE = 'b'.repeat(64);
const NATIVE_ROW = {
  id: 'row-1', credential_id: `native:${DEVICE_ID}`, device_name: 'Pixel 8',
  device_type: 'android_native', backed_up: false, is_active: true,
  created_at: '2026-11-01T00:00:00Z', last_used_at: null,
};

beforeEach(() => {
  Object.values(mocks).forEach((v) => { if (typeof v === 'function' && 'mockReset' in v) v.mockReset(); });
  mocks.supported.mockReturnValue(true);
  mocks.status.mockResolvedValue({ available: true, enrolled: false, deviceId: null });
  mocks.options.mockResolvedValue({ challenge: CHALLENGE });
  mocks.enroll.mockResolvedValue({ deviceId: DEVICE_ID, publicKey: 'pk', label: 'Pixel 8' });
  mocks.sign.mockResolvedValue('sig');
  mocks.registerVerify.mockResolvedValue({ success: true, deviceId: DEVICE_ID });
  mocks.list.mockResolvedValue({ credentials: [] });
  mocks.del.mockResolvedValue({ success: true });
  mocks.forget.mockResolvedValue(undefined);
});

afterEach(() => cleanup());

it('renders nothing without the Android bridge', () => {
  mocks.supported.mockReturnValue(false);
  const { container } = render(<AccountDeviceCard />);
  expect(container).toBeEmptyDOMElement();
  expect(mocks.list).not.toHaveBeenCalled();
});

it('enables fingerprint sign-in on this phone', async () => {
  render(<AccountDeviceCard />);
  fireEvent.click(await screen.findByRole('button', { name: /enable fingerprint sign-in/i }));

  await waitFor(() => expect(mocks.registerVerify).toHaveBeenCalledWith({
    challenge: CHALLENGE,
    deviceId: DEVICE_ID,
    publicKey: 'pk',
    label: 'Pixel 8',
    signature: 'sig',
  }));
  expect(await screen.findByText(/fingerprint sign-in is on for this phone/i)).toBeInTheDocument();
});

it('turns it off on this phone by deleting the server row, then the local key', async () => {
  mocks.status.mockResolvedValue({ available: true, enrolled: true, deviceId: DEVICE_ID });
  mocks.list.mockResolvedValue({ credentials: [NATIVE_ROW] });

  render(<AccountDeviceCard />);
  fireEvent.click(await screen.findByRole('button', { name: /turn off on this phone/i }));

  await waitFor(() => expect(mocks.del).toHaveBeenCalledWith('row-1'));
  expect(mocks.forget).toHaveBeenCalled();
  expect(await screen.findByText(/fingerprint sign-in is off for this phone/i)).toBeInTheDocument();
});

it('offers enable when the phone is enrolled locally but the server row is gone', async () => {
  mocks.status.mockResolvedValue({ available: true, enrolled: true, deviceId: DEVICE_ID });
  mocks.list.mockResolvedValue({ credentials: [] });

  render(<AccountDeviceCard />);
  expect(await screen.findByRole('button', { name: /enable fingerprint sign-in/i })).toBeInTheDocument();
});
