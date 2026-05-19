'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 *
 * Issue #3 FIX — Hydration-safe matchMedia:
 *   window.matchMedia called inside a useEffect (client-only) previously, but
 *   any future refactor that moves it to render-time would cause an SSR mismatch.
 *   We now use useSyncExternalStore with a server snapshot of `false` — React
 *   guarantees identical output on server and first client render, then
 *   re-subscribes after hydration. This permanently eliminates the class of
 *   hydration mismatch warnings this pattern is prone to.
 *
 * Issue #20 FIX — LazyMotion:
 *   framer-motion's full bundle (~100 kB) loads by default. Using LazyMotion
 *   + domAnimation limits the shipped feature set to what 99 % of UIs need,
 *   reducing the chunk by ~40 kB gzipped.
 */
import { useState, useEffect, useSyncExternalStore } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import Sidebar from './Sidebar';
import PremiumHeader from './PremiumHeader';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

// ─── Hydration-safe matchMedia hook ──────────────────────────────────
function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 1024px)').matches;
}
/** Always returns false on the server — matches first client render. */
function getServerSnapshot(): boolean { return false; }

function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function AppShell({ children, title: _title }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useIsDesktop();

  // Auto-close the mobile drawer when viewport grows to desktop width.
  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  // Prevent body scroll when mobile drawer is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    // LazyMotion scopes framer-motion to domAnimation features only.
    // Replace <motion.div> with <m.div> anywhere inside AppShell children
    // to benefit from the smaller bundle (see Issue #20).
    <LazyMotion features={domAnimation} strict>
      <div className="min-h-screen bg-[var(--bg-canvas)]">
        <PremiumHeader
          onMenuClick={() => setMobileOpen(true)}
        />
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1600px] px-3 pb-6 pt-[88px] sm:px-5 sm:pb-8 sm:pt-[100px] lg:px-8 lg:pt-[116px]"
        >
          {children}
        </main>
      </div>
    </LazyMotion>
  );
}
