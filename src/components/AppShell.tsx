'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 *
 * Updated: dark luxury aesthetic — ambient violet glow behind navbar,
 * deep charcoal page background, mobile bottom-nav safe-area padding.
 *
 * Issue #3 FIX — Hydration-safe matchMedia (useSyncExternalStore)
 * Issue #20 FIX — LazyMotion + domAnimation (smaller bundle)
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
      {/*
       * Dark luxury shell.
       * bg-[#0a0a0e] = deep charcoal base.
       * The ambient glow is a fixed pseudo-layer so it stays behind nav
       * even when page content scrolls.
       */}
      <div className="relative min-h-screen" style={{ background: '#0a0a0e' }}>

        {/* Ambient violet glow — fixed, behind everything, pointer-events-none */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-0"
          style={{
            height: 320,
            background: 'radial-gradient(ellipse 80% 45% at 50% -5%, rgba(124,58,237,0.16) 0%, transparent 70%)',
          }}
        />

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
