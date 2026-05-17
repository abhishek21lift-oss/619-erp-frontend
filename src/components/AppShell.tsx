'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 * Single-row premium navbar is 72px tall — pt matches exactly.
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
      {/* pt-[80px] = 72px navbar + 8px breathing gap */}
      <main className="mx-auto w-full max-w-[1600px] px-3 pb-8 pt-[80px] sm:px-5 lg:px-8">{children}</main>
    </div>
  );
}
