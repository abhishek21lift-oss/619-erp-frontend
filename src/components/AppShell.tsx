'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 *
 * Issue #3 FIX — Hydration-safe matchMedia (useSyncExternalStore)
 * Issue #20 FIX — LazyMotion + domAnimation (smaller bundle)
 * Issue #XX FIX — Reverted dark bg (#0a0a0e) that hid all page content;
 *                 page content uses Tailwind light-mode classes (slate-50,
 *                 text-slate-900, etc.), so the shell must use a light bg.
 */
import { useState, useEffect, useSyncExternalStore } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import Sidebar from './Sidebar';
import PremiumHeader from './PremiumHeader';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

// ─── Hydration-safe matchMedia hook ──────────────────────────────────────────
function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function getSnapshot():       boolean { return typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false; }
function getServerSnapshot(): boolean { return false; }
function useIsDesktop():      boolean { return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot); }

export default function AppShell({ children, title: _title }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => { if (isDesktop) setMobileOpen(false); }, [isDesktop]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Light shell — content pages use Tailwind light-mode (slate-*) classes */}
      <div className="relative min-h-screen bg-slate-50">

        <PremiumHeader onMenuClick={() => setMobileOpen(true)} />

        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main
          id="main-content"
          className="relative z-10 mx-auto w-full max-w-[1600px] px-3 pb-24 pt-[88px] sm:px-5 sm:pb-8 sm:pt-[100px] lg:px-8 lg:pt-[116px]"
        >
          {children}
        </main>
      </div>
    </LazyMotion>
  );
}
