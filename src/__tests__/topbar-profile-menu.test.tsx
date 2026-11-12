// The top-bar account menu: My Profile and Account Settings open the profile
// page, Logout is confirmed, and Escape puts focus back on the avatar.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const authMocks = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { name: 'Asha Rao', email: 'asha@example.com', avatar_url: null },
    logout: authMocks.logout,
  }),
}));

import TopbarProfileMenu from '@/components/TopbarProfileMenu';

function renderMenu(open = false) {
  const onOpenChange = vi.fn();
  const utils = render(<TopbarProfileMenu open={open} onOpenChange={onOpenChange} />);
  return { ...utils, onOpenChange };
}

beforeEach(() => {
  authMocks.logout.mockReset();
  authMocks.logout.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the topbar profile menu', () => {
  it('is a labelled, collapsed trigger until opened', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Account menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'My Profile' })).not.toBeInTheDocument();
  });

  it('shows the three account destinations when open', () => {
    renderMenu(true);

    expect(screen.getByRole('button', { name: 'Account menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', '/settings/profile');
    expect(screen.getByRole('link', { name: 'Account Settings' })).toHaveAttribute('href', '/settings/profile?tab=preferences');
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
  });

  it('asks before ending the session', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderMenu(true);

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(confirm).toHaveBeenCalled();
    expect(authMocks.logout).not.toHaveBeenCalled();
  });

  it('logs out once the confirmation is accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onOpenChange } = renderMenu(true);

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    await Promise.resolve();
    expect(authMocks.logout).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape and returns focus to the avatar', () => {
    const { onOpenChange } = renderMenu(true);
    const trigger = screen.getByRole('button', { name: 'Account menu' });
    trigger.focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(trigger).toHaveFocus();
  });
});
