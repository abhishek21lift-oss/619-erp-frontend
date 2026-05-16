'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 * Sidebar (fixed + collapsible), sticky topbar, main content area.
 */
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import PremiumHeader from './PremiumHeader';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const listener = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      <PremiumHeader onMenuClick={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="mx-auto w-full max-w-[1600px] px-3 pb-6 pt-[96px] sm:px-5 sm:pb-8 sm:pt-[110px] lg:px-8 lg:pt-[132px]">{children}</main>
    </div>
  );
}
