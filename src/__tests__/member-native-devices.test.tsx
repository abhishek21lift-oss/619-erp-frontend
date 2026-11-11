import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    webauthn: {
      listCredentials: mocks.list,
      deleteCredential: mocks.del,
    },
  },
}));

import MemberNativeDevices from '@/components/member/MemberNativeDevices';

const NATIVE = {
  id: 'row-1', credential_id: `native:${'a'.repeat(32)}`, device_name: 'Pixel 8',
  device_type: 'android_native', backed_up: false, is_active: true,
  created_at: '2026-11-01T00:00:00Z', last_used_at: null,
};
const PASSKEY = {
  ...NATIVE, id: 'row-2', credential_id: 'web-credential', device_name: 'MacBook',
  device_type: 'platform',
};

beforeEach(() => {
  mocks.list.mockReset();
  mocks.del.mockReset();
  mocks.list.mockResolvedValue({ credentials: [] });
  mocks.del.mockResolvedValue({ success: true });
});

afterEach(() => cleanup());

it('renders nothing when the account has no native devices', async () => {
  const { container } = render(<MemberNativeDevices />);
  await waitFor(() => expect(mocks.list).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

it('lists only Android biometric devices and revokes after confirmation', async () => {
  mocks.list.mockResolvedValue({ credentials: [NATIVE, PASSKEY] });
  render(<MemberNativeDevices />);

  expect(await screen.findByText('Pixel 8')).toBeInTheDocument();
  expect(screen.queryByText('MacBook')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /revoke/i }));
  expect(mocks.del).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

  await waitFor(() => expect(mocks.del).toHaveBeenCalledWith('row-1'));
  await waitFor(() => expect(screen.queryByText('Pixel 8')).toBeNull());
});
