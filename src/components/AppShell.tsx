'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 *
 * Header height breakdown:
 *   Row 1 (brand + actions): 62px
 *   Row 2 (nav buttons):     ~52px (pt-1.5 + button h-[38px] + pb-2)
 *   Border:                   1px
 *   Total:                   ~115px
 *
 *   pt-[120px] gives a clean 5px breathing gap below the header.
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
      {/* Mobile: only row-1 visible (~62px) + 8px gap = pt-[70px]
          Desktop: row-1 + row-2 (~115px) + 5px gap = pt-[120px] */}
      <main className="mx-auto w-full max-w-[1600px] px-3 pb-8 pt-[70px] sm:px-5 lg:px-8 lg:pt-[120px]">{children}</main>
    </div>
  );
}
