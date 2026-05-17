'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 * Premium left sidebar + sticky utility topbar + main content area.
 */
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* Close mobile drawer on breakpoint change */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const listener = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return (
    <div className="shell-root">
      {/* ── Sidebar ── */}
      <div
        className={[
          'shell-sidebar',
          sidebarCollapsed ? 'collapsed' : '',
          mobileOpen ? 'drawer-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop visible"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Body ── */}
      <div
        className={[
          'shell-body',
          sidebarCollapsed ? 'sidebar-collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Sticky utility topbar */}
        <div className="shell-topbar">
          <TopBar
            title={title}
            onMenuClick={() => setMobileOpen((v) => !v)}
          />
        </div>

        {/* Page content */}
        <main className="shell-main">
          {children}
        </main>
      </div>
    </div>
  );
}
