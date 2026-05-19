'use client';

/**
 * NavShell — Drop-in layout wrapper that pairs PremiumNav with page content.
 *
 * Usage (replace AppShell or wrap children in any page layout):
 *
 *   import NavShell from '@/components/nav/NavShell';
 *
 *   export default function DashboardLayout({ children }) {
 *     return <NavShell>{children}</NavShell>;
 *   }
 *
 * This component:
 *   - Adds the 56px top offset so content doesn't hide under the fixed nav.
 *   - Provides the gradient hero layer behind the navbar (seamless blend).
 *   - Adds padding-bottom for mobile bottom nav clearance.
 *   - Exposes `id="main-scroll"` for the scroll listener in PremiumNav.
 */

import PremiumNav from './PremiumNav';

interface NavShellProps {
  children: React.ReactNode;
  /** Dark ambient gradient behind the navbar + hero. Defaults to deep charcoal-purple. */
  heroGradient?: string;
  /** Extra className for the scroll container */
  className?: string;
}

export default function NavShell({
  children,
  heroGradient,
  className = '',
}: NavShellProps) {
  const gradient = heroGradient ??
    'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(124,58,237,0.14) 0%, transparent 65%)';

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0b' }}>
      {/* Ambient hero glow — sits behind nav, fades into content */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 pointer-events-none z-0"
        style={{ height: 280, background: gradient }}
      />

      {/* Fixed navbar */}
      <PremiumNav />

      {/* Scrollable content area */}
      <main
        id="main-scroll"
        className={['relative z-10 pt-14 pb-20 md:pb-6 overflow-y-auto', className].join(' ')}
        style={{ minHeight: '100dvh' }}
      >
        {children}
      </main>
    </div>
  );
}
