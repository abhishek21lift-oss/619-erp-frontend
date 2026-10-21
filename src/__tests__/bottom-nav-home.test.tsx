// The phone bar's first tab is Home, and Home is the studio dashboard.
//
// It used to be Today. That is a different screen: the dashboard is `/`, and
// /pt-os/today is the session queue. These pin the tab's destination and the
// aria-current state that tells a screen reader which page is open.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('framer-motion', () => ({
  m: {
    nav: ({ children, animate, initial, transition, ...rest }: Record<string, unknown>) => (
      <nav {...rest}>{children as React.ReactNode}</nav>
    ),
    span: ({ children, layoutId, whileTap, transition, ...rest }: Record<string, unknown>) => (
      <span {...rest}>{children as React.ReactNode}</span>
    ),
  },
}));

vi.mock('@/lib/features-context', () => ({
  useFeatures: () => ({ features: {}, enabled: () => true, loaded: true }),
}));

vi.mock('@/contexts/nav-scroll-context', () => ({
  useNavScroll: () => ({ reducedMotion: true, topBar: 'expanded' }),
}));

import MobileBottomNav from '@/components/MobileBottomNav';

describe('the mobile bottom bar', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('starts with Home, pointing at the dashboard route', () => {
    render(<MobileBottomNav />);

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('Home');
    expect(links[0]).toHaveAttribute('href', '/');
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('keeps the other tabs and their order', () => {
    render(<MobileBottomNav />);

    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/pt-os/clients',
      '/ai-coach',
      '/pt-os/my-schedule',
      '/checkin/qr-scanner',
    ]);
  });

  it('marks Home as the current page when the dashboard is open', () => {
    render(<MobileBottomNav />);

    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark Home as current on another page, but keeps that page current', () => {
    pathname.current = '/pt-os/clients';
    render(<MobileBottomNav />);

    expect(screen.getByRole('link', { name: /home/i })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /clients/i })).toHaveAttribute('aria-current', 'page');
  });
});
