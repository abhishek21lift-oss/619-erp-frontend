// The Profile hub's two new pieces: the membership/balance card and the
// profile error state. Both were silent before — a failed profile left the
// hero pulsing forever, and the plan's balance was only on Home.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const apiMocks = vi.hoisted(() => ({
  profile: vi.fn(),
  membership: vi.fn(),
  sessionBalance: vi.fn(),
  setPhoto: vi.fn(),
  achievements: vi.fn(),
}));

// The page renders the reduced-motion variant: stats land on their final
// values immediately and the header title is visible without scroll.
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

const hapticMock = vi.hoisted(() => ({ triggerHaptic: vi.fn() }));
vi.mock('@/components/common/PullToRefresh/utils', () => ({ triggerHaptic: hapticMock.triggerHaptic }));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
const shellMock = vi.hoisted(() => ({ headerPaysTopInset: undefined as boolean | undefined }));
vi.mock('@/components/member/MemberShell', () => ({
  default: ({ children, headerPaysTopInset }: {
    children: React.ReactNode; headerPaysTopInset?: boolean;
  }) => {
    shellMock.headerPaysTopInset = headerPaysTopInset;
    return <>{children}</>;
  },
}));
vi.mock('@/components/member/CoachCard', () => ({ default: () => null }));
vi.mock('@/components/member/InstallAppCard', () => ({ default: () => null }));
vi.mock('@/components/member/PayBalanceButton', () => ({
  default: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));
vi.mock('@/components/member/memberNotifications', () => ({
  loadMemberNotifications: async () => [],
}));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('@/components/pt-os/PhotoCropModal', () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: (d: string) => void }) =>
    open ? <button type="button" onClick={() => onConfirm('data:image/png;base64,AAAA')}>crop confirm</button> : null,
}));
vi.mock('@/lib/api', () => ({
  api: {
    me: {
      profile: (...a: unknown[]) => apiMocks.profile(...a),
      membership: (...a: unknown[]) => apiMocks.membership(...a),
      sessionBalance: (...a: unknown[]) => apiMocks.sessionBalance(...a),
      achievements: (...a: unknown[]) => apiMocks.achievements(...a),
      coach: async () => ({ data: null }),
      messagesUnread: async () => ({ data: { unread: 0 } }),
      setPhoto: (...a: unknown[]) => apiMocks.setPhoto(...a),
    },
  },
}));

import MemberMorePage from '@/app/(bare)/member/more/page';
import { ToastProvider } from '@/lib/toast';

const profile = {
  id: 'c1', member_code: 'M-1', name: 'Asha Rao', email: null, mobile: null, whatsapp: null,
  gender: null, dob: null, photo_url: null, address: null, package_type: 'Personal Training',
  goal: null, height: null, weight: null, joining_date: null, pt_start_date: '2026-03-12',
  pt_end_date: '2027-03-12', duration_months: 12, status: 'active', trainer_name: null,
  trainer_photo: null, trainer_specialization: null, studio_name: 'Iron House',
  studio_logo: '/uploads/iron.png',
  studio_phone: null, studio_address: null, studio_hours: null,
};

const membership = {
  id: 'm1', package_type: 'Personal Training', base_amount: '20000', discount: '0',
  final_amount: '20000', paid_amount: '18800', balance_amount: '1200', monthly_pt_amount: '0',
  pt_start_date: '2026-03-12', pt_end_date: '2027-03-12', duration_months: 12, status: 'active',
};

function renderPage() {
  return render(<ToastProvider><MemberMorePage /></ToastProvider>);
}

beforeEach(() => {
  apiMocks.profile.mockReset().mockResolvedValue({ data: profile });
  apiMocks.membership.mockReset().mockResolvedValue({ data: membership });
  apiMocks.sessionBalance.mockReset().mockResolvedValue({ data: [] });
  apiMocks.setPhoto.mockReset().mockResolvedValue({ data: { photo_url: '/uploads/new.png' } });
  apiMocks.achievements.mockReset().mockResolvedValue({
    data: { totals: { sessions: 12, prs: 3 }, training: { current: 2 } },
  });
});

describe('<MemberMorePage /> membership card', () => {
  it('shows the loaded balance, end date, pay action and studio logo', async () => {
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(within(card).getByText('₹1,200')).toBeTruthy();
    expect(within(card).getByText('Ends 12 Mar 2027')).toBeTruthy();
    expect(within(card).getByRole('button', { name: /Pay ₹1,200/ })).toBeTruthy();
    expect(screen.getByAltText('Iron House')).toHaveAttribute('src', '/uploads/iron.png');
  });

  it('says Paid up when nothing is owed', async () => {
    apiMocks.membership.mockResolvedValue({ data: { ...membership, balance_amount: '0' } });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(within(card).getByText('Paid up')).toBeTruthy();
    expect(within(card).queryByRole('button', { name: /^Pay / })).toBeNull();
  });

  it('shows a dash, not Paid up, when the membership record failed', async () => {
    apiMocks.membership.mockRejectedValue(new Error('offline'));
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(within(card).getByText('—')).toBeTruthy();
    expect(within(card).queryByText('Paid up')).toBeNull();
  });
});

describe('<MemberMorePage /> profile states', () => {
  it('offers a retry when the profile fails, and recovers', async () => {
    apiMocks.profile.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    expect(screen.queryByRole('region', { name: 'Your membership' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Asha Rao')).toBeTruthy();
    expect(screen.queryByText('We could not load your profile')).toBeNull();
  });

  it('opens the crop flow from the hero avatar and saves the photo', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add profile photo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'crop confirm' }));
    expect(await screen.findByText('Photo updated')).toBeTruthy();
    expect(hapticMock.triggerHaptic).toHaveBeenCalledWith(8);
    expect(apiMocks.setPhoto).toHaveBeenCalledWith('data:image/png;base64,AAAA');
    expect(await screen.findByAltText('Asha Rao')).toHaveAttribute('src', '/uploads/new.png');
  });
});

describe('<MemberMorePage /> sessions and payments', () => {
  it('shows each active package with its own remaining count and end date', async () => {
    apiMocks.sessionBalance.mockResolvedValue({
      data: [{
        package_name: 'PT 12', total_sessions: 12, used_sessions: 4, remaining_sessions: 8,
        start_date: '2026-10-01', end_date: '2026-12-31', status: 'active',
      }],
    });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(await within(card).findByText('8 of 12 sessions left')).toBeTruthy();
    expect(within(card).getByText(/ends 31 Dec 2026/)).toBeTruthy();
  });

  it('shows no session line when the studio does not track packages', async () => {
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(within(card).queryByText(/sessions left/)).toBeNull();
  });

  it('keeps the balance and plan dates when the session read fails', async () => {
    apiMocks.sessionBalance.mockRejectedValue(new Error('offline'));
    renderPage();
    const card = await screen.findByRole('region', { name: 'Your membership' });
    expect(within(card).getByText('₹1,200')).toBeTruthy();
    expect(within(card).getByText('Ends 12 Mar 2027')).toBeTruthy();
    expect(within(card).queryByText(/sessions left/)).toBeNull();
  });

  it('links to Payments and Book from the membership group', async () => {
    renderPage();
    expect((await screen.findByRole('link', { name: /Payments/ })).getAttribute('href')).toBe('/member/payments');
    expect((await screen.findByRole('link', { name: /Book a session/ })).getAttribute('href')).toBe('/member/book');
  });
});

describe('<MemberMorePage /> heading and stats', () => {
  it('keeps the Profile heading in a sticky header when the profile read fails', async () => {
    apiMocks.profile.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    const heading = screen.getByRole('heading', { level: 1, name: 'Profile' });
    expect(heading.closest('header')?.className).toContain('sticky');
    expect(shellMock.headerPaysTopInset).toBe(true);
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows final stat values under reduced motion', async () => {
    renderPage();
    const hero = await screen.findByRole('region', { name: 'Your profile' });
    expect(await within(hero).findByText('12')).toBeTruthy();
    expect(within(hero).getByText('3')).toBeTruthy();
  });

  it('shows a dash, never zero, when achievements fail to load', async () => {
    apiMocks.achievements.mockResolvedValue({ data: { totals: {}, training: {} } });
    renderPage();
    const hero = await screen.findByRole('region', { name: 'Your profile' });
    expect(within(hero).getAllByText('—')).toHaveLength(3);
  });
});

describe('<MemberMorePage /> studio contact', () => {
  it('shows the phone, address and hours the studio published', async () => {
    apiMocks.profile.mockResolvedValue({
      data: {
        ...profile,
        studio_phone: '9876543210', studio_address: 'MG Road', studio_hours: 'Mon–Sat 6am–9pm',
      },
    });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Studio contact' });
    expect(within(card).getByText('9876543210')).toBeTruthy();
    expect(within(card).getByText('MG Road')).toBeTruthy();
    expect(within(card).getByText('Mon–Sat 6am–9pm')).toBeTruthy();
  });

  it('renders no studio card when nothing is published', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'Your membership' });
    expect(screen.queryByRole('region', { name: 'Studio contact' })).toBeNull();
  });

  it('drops only the rows that are empty', async () => {
    apiMocks.profile.mockResolvedValue({
      data: { ...profile, studio_phone: '9876543210', studio_address: null, studio_hours: null },
    });
    renderPage();
    const card = await screen.findByRole('region', { name: 'Studio contact' });
    expect(within(card).getByText('9876543210')).toBeTruthy();
    // One row, not three: an unpublished field must not render as a blank line.
    expect(within(card).getAllByRole('listitem')).toHaveLength(1);
  });
});
