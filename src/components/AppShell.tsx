'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = usePathname();

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Auto-collapse sidebar on tablet
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setCollapsed(true);
    };
    if (mq.matches) setCollapsed(true);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleToggle = useCallback(() => setCollapsed(c => !c), []);
  const handleMobileOpen = useCallback(() => setMobileOpen(true), []);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  const sidebarWidth = collapsed ? 72 : 280;

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* ── Main body — offset by sidebar width ── */}
      <div
        className="app-shell__body"
        style={{
          '--sidebar-offset': `${sidebarWidth}px`,
        } as React.CSSProperties}
      >
        <TopBar onMenuOpen={handleMobileOpen} sidebarCollapsed={collapsed} />

        <main className="app-shell__main">
          {children}
        </main>
      </div>
    </div>
  );
}
