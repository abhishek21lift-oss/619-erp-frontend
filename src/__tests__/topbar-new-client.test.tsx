// The top bar's New Client action: one tap from any screen to the intake form.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Test Trainer', role: 'trainer' },
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
vi.mock('@/components/common/PullToRefresh', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ImpersonationBanner', () => ({ default: () => null }));
vi.mock('@/components/TrialBanner', () => ({ default: () => null }));
vi.mock('@/components/auth/PasskeySetupPrompt', () => ({ default: () => null }));
vi.mock('@/components/auth/NativeBiometricPrompt', () => ({ default: () => null }));
vi.mock('@/components/UserPhoto', () => ({ default: () => null }));
vi.mock('@/hooks/useViewportDesyncFix', () => ({ default: () => {} }));

import AppShell from '@/components/AppShell';

describe('the topbar new-client button', () => {
  it('opens the intake form from any screen', () => {
    render(<AppShell><div>page content</div></AppShell>);

    expect(screen.getByRole('link', { name: 'Add new client' })).toHaveAttribute('href', '/pt-os/new-client');
  });
});
