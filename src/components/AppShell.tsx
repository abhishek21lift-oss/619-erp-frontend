'use client';
/**
 * AppShell — root layout wrapper for every authenticated page.
 *
 * Issue #3  FIX — Hydration-safe matchMedia (useSyncExternalStore)
 * Issue #20 FIX — LazyMotion + domAnimation (smaller bundle)
 * Issue #XX FIX — Reverted dark bg that hid all page content
 * Issue #YY FIX — Sidebar rendered via React Portal to escape stacking
 *                  context; fixes iOS Safari fixed-position blink/flicker.
 */
import { useState, useEffect, useSyncExternalStore, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const isDesktop = useIsDesktop();

  // Wait for client mount before portaling (avoid SSR mismatch)
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => { if (isDesktop) setMobileOpen(false); }, [isDesktop]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  const sidebar = (
    <Sidebar
      mobileOpen={mobileOpen}
      onMobileClose={handleMobileClose}
    />
  );

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Light shell — content pages use Tailwind light-mode (slate-*) classes */}
      <div className="relative min-h-screen bg-slate-50">

        <PremiumHeader onMenuClick={() => setMobileOpen(true)} />

        {/*
          Sidebar is portaled to document.body so it escapes this div's
          stacking context. This prevents iOS Safari fixed+transform blink.
          On SSR / before mount, render inline as fallback.
        */}
        {mounted ? createPortal(sidebar, document.body) : sidebar}

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
