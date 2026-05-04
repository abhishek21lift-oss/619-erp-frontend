'use client';
import TopNav from './TopNav';

interface Props {
  children: React.ReactNode;
}

/**
 * AppShell — wraps every authenticated page with the horizontal TopNav.
 * Replaces the old Sidebar + TopBar combination.
 */
export default function AppShell({ children }: Props) {
  return (
    <div className="shell-root">
      <TopNav />
      <main className="shell-main">
        {children}
      </main>
    </div>
  );
}
