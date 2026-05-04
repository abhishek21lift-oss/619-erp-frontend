'use client';
import Sidebar from './Sidebar';
import PremiumHeader from './PremiumHeader';

interface Props {
  children: React.ReactNode;
  title?: string;
}

/**
 * AppShell — wraps every authenticated page with a vertical Sidebar and top PremiumHeader.
 * Layout: Sidebar (left) + PremiumHeader (top) + main content (scrollable).
 */
export default function AppShell({ children, title }: Props) {
  return (
    <div className="shell-root">
      <Sidebar />
      <div className="shell-body">
        <PremiumHeader title={title} />
        <main className="shell-main">
          {children}
        </main>
      </div>
    </div>
  );
}
