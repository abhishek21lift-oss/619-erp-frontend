// The platform operator's only reachable 2FA surface. /settings/profile is a
// studio route and refuses a platform session, so this card has to carry the
// whole flow: status, enrolment, recovery codes and a password-confirmed
// disable. The link in ErrorState used to point at the refused page, which is
// what made 2FA unreachable from the console at all.

import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({
  me: vi.fn(),
  setup: vi.fn(),
  verify: vi.fn(),
  disable: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    profile: {
      me: () => m.me(),
      mfa: {
        setup: () => m.setup(),
        verify: (code: string) => m.verify(code),
        disable: (password: string) => m.disable(password),
      },
    },
  },
}));

vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { success: m.success, error: m.error } }),
}));

import MyMfaCard from '@/components/platform/my-mfa-card';
import { ApiError } from '@/lib/http';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the operator can manage their own second factor', () => {
  it('shows an enabled account and asks for the password before disabling', async () => {
    m.me.mockResolvedValue({ mfaEnabled: true });
    m.disable.mockResolvedValue({ message: 'ok' });
    render(<MyMfaCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Disable 2FA' }));
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'correct-horse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and disable' }));

    await waitFor(() => expect(m.disable).toHaveBeenCalledWith('correct-horse'));
    await waitFor(() => expect(m.success).toHaveBeenCalledWith('Two-factor authentication disabled'));
  });

  it('enrols: setup secret, verification, then the one-time recovery codes', async () => {
    m.me.mockResolvedValue({ mfaEnabled: false });
    m.setup.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      qrUrl: 'otpauth://totp/MY%20PT%20STUDIO:operator@myptstudio.com?secret=JBSWY3DPEHPK3PXP',
    });
    m.verify.mockResolvedValue({ recoveryCodes: ['AAAA-BBBB', 'CCCC-DDDD'] });
    render(<MyMfaCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Set up two-factor' }));
    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and enable' }));

    await waitFor(() => expect(m.verify).toHaveBeenCalledWith('123456'));
    expect(await screen.findByText('AAAA-BBBB')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Save your recovery codes' })).toBeInTheDocument();
  });

  it('keeps the server message on screen when a code is rejected', async () => {
    m.me.mockResolvedValue({ mfaEnabled: false });
    m.setup.mockResolvedValue({ secret: 'JBSWY3DPEHPK3PXP', qrUrl: 'otpauth://totp/x' });
    m.verify.mockRejectedValue(new ApiError('Invalid code', 400));
    render(<MyMfaCard />);

    fireEvent.click(await screen.findByRole('button', { name: 'Set up two-factor' }));
    await screen.findByText('JBSWY3DPEHPK3PXP');
    fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and enable' }));

    expect(await screen.findByText('Invalid code')).toBeInTheDocument();
  });
});

describe('a 2FA error sends the operator somewhere they can actually go', () => {
  it('links to the console Security tab, not the studio profile page', () => {
    const ui = readFileSync(join(process.cwd(), 'src/app/(platform)/platform/_shared/ui.tsx'), 'utf8');
    expect(ui).toContain("window.location.href = '/platform?tab=security'");
    expect(ui).not.toContain("window.location.href = '/settings/profile'");
  });
});
