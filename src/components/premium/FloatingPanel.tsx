'use client';

/**
 * The slide-over panel.
 *
 * ── What was wrong ─────────────────────────────────────────────────────────
 *
 * `pt-6` was the entire top clearance. On a notched phone the status bar is
 * around 54px, so the panel's title rendered UNDERNEATH the clock — the
 * session detail screen showed "3:18" overlapping a client's name, and the
 * close button sat behind the battery indicator where it could not reliably
 * be tapped.
 *
 * That is not a spacing tweak, it is the panel not knowing the device has a
 * notch. Everywhere else in the app already does: AppShell publishes
 * `--topbar-h` as `calc(46px + env(safe-area-inset-top))` and every page-level
 * sticky header aligns to it. This panel is fixed-position and full-bleed on a
 * phone, so it owns its own inset and had none.
 *
 * The bottom had the same gap in reverse: content ran under the home
 * indicator, so the last row of a long panel was partly obscured.
 *
 * ── Colours ────────────────────────────────────────────────────────────────
 *
 * The header chip was `bg-indigo-50 text-indigo-600` and the borders and text
 * were raw `slate-*`. Neither is in the five-colour system the rest of the app
 * uses, and indigo is not a colour this product has anywhere else — it slipped
 * past the palette guard because that scans for hex literals and these were
 * Tailwind class names. Now on the same CSS tokens as everything else, so the
 * panel follows the theme instead of pinning itself to one.
 */

import { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

type FloatingPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
};

/**
 * Clearance for the panel's own header.
 *
 * The inset plus a fixed gap, rather than a flat number: `env()` resolves to 0
 * on a desktop browser and on any phone without a notch, where a hard-coded
 * 54px would leave an obvious dead band at the top of the drawer.
 */
const HEADER_TOP = 'calc(env(safe-area-inset-top, 0px) + 1.15rem)';

export function FloatingPanel({ open, onClose, title, subtitle, icon, size = 'md', children }: FloatingPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // The body must not scroll behind an open panel. Without this the page
  // underneath scrolls when the panel's own content reaches its end, which on
  // a phone reads as the panel drifting.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const widths: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <m.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              'relative flex w-full flex-col overflow-hidden shadow-2xl',
              widths[size],
            )}
            style={{
              background: 'var(--bg-base)',
              borderLeft: '1px solid var(--border)',
            }}
          >
            {/*
              The panel's own top bar. Not sticky any more: it is a flex header
              over a scrolling body, so it cannot be pushed out of place by
              content and the safe-area padding is applied once rather than
              re-resolved on every scroll frame.
            */}
            <header
              className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 sm:px-6"
              style={{
                paddingTop: HEADER_TOP,
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                {icon && (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                  >
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h2
                    className="truncate text-[17px] font-[760] tracking-[-0.01em]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              {/*
                44px, and set in pixels rather than with h-11.
                globals.css sets a 14px root, so every rem-based size here
                lands at 87.5% of its name — `h-11` measures 38.5px, which is
                under the touch-target minimum it was chosen to satisfy. The
                tab strip carries the same note for the same reason.

                Size matters here more than most places: this is the only way
                out of a full-screen panel on a phone, and it previously sat at
                32px in the one corner the notch overlaps.
              */}
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-black/[0.05]"
                style={{ color: 'var(--text-muted)', height: 44, width: 44 }}
              >
                <X size={18} />
              </button>
            </header>

            {/*
              The scrolling body. Bottom padding carries the home-indicator
              inset, so the last row of a long panel is not half-hidden behind
              it — the mirror of the notch problem at the other end.
            */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 sm:px-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
              {children}
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
