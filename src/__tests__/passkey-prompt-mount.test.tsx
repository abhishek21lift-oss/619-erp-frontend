import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/member/MemberNav', () => ({
  default: () => null,
  MEMBER_NAV_CLEARANCE: 0,
}));
vi.mock('@/components/auth/PasskeySetupPrompt', () => ({
  default: () => <div>passkey prompt</div>,
}));

// AppShell's chrome is not what this test is about. Render the shell itself
// (so the prompt's position in the tree is real) with its heavy children and
// data sources stubbed.
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Test Trainer', role: 'trainer', organization_name: 'Test Studio' },
    logout: vi.fn(),
  }),
}));
vi.mock('@/lib/features-context', () => ({ useFeatures: () => ({ features: {} }) }));
vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light', toggle: vi.fn() }) }));
vi.mock('@/contexts/nav-scroll-context', () => ({
  useNavScroll: () => ({ topBar: 'expanded', reducedMotion: true }),
}));
vi.mock('@/lib/api', () => ({
  api: {
    notifications: {
      list: async () => ({ data: [] }),
      markAllRead: async () => {},
      markRead: async () => {},
    },
  },
}));
vi.mock('@/components/sidebar', () => ({ default: () => null }));
vi.mock('@/components/MobileBottomNav', () => ({ default: () => null }));
vi.mock('@/components/search/GlobalSearch', () => ({ default: () => null }));
vi.mock('@/components/search/recent', () => ({ clearSearchHistory: vi.fn() }));
vi.mock('@/components/common/PullToRefresh', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ImpersonationBanner', () => ({ default: () => null }));
vi.mock('@/components/TrialBanner', () => ({ default: () => null }));
vi.mock('@/components/StudioMark', () => ({ default: () => null }));
vi.mock('@/components/UserPhoto', () => ({ default: () => null }));
vi.mock('@/hooks/useViewportDesyncFix', () => ({ default: () => {} }));

import MemberShell from '@/components/member/MemberShell';
import AppShell from '@/components/AppShell';

it('renders the prompt above member page content', () => {
  render(<MemberShell><div>page content</div></MemberShell>);
  expect(screen.getByText('passkey prompt')).toBeInTheDocument();
  expect(screen.getByText('page content')).toBeInTheDocument();
});

it('mounts the prompt in the studio shell too', () => {
  render(<AppShell><div>page content</div></AppShell>);
  expect(screen.getByText('passkey prompt')).toBeInTheDocument();
  expect(screen.getByText('page content')).toBeInTheDocument();
});
