'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { m, useScroll, useSpring } from 'framer-motion';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Wordmark } from './Wordmark';
import { C, HEADER } from './tokens';

const NAV = [
  { label: 'Product', href: '#product' },
  { label: 'AI', href: '#ai' },
  { label: 'Features', href: '#features' },
  { label: 'PT Business', href: '#for-pt-business' },
  { label: 'For Trainers', href: '#for-trainers' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#resources' },
] as const;

/**
 * Sticky landing nav. Transparent over the hero, then a blurred glass bar once
 * the page scrolls; a hairline scroll-progress indicator runs along the bottom
 * edge. Desktop links on md+, a keyboard-accessible drawer below.
 */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes the drawer; focus returns to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        paddingTop: HEADER.padTop,
        transition:
          'background 240ms ease, border-color 240ms ease, backdrop-filter 240ms ease, box-shadow 240ms ease',
        background: scrolled ? HEADER.bg : HEADER.bgIdle,
        backdropFilter: scrolled ? HEADER.blur : HEADER.blurIdle,
        WebkitBackdropFilter: scrolled ? HEADER.blur : HEADER.blurIdle,
        borderBottom: `1px solid ${HEADER.accentLine}`,
        boxShadow: open ? 'none' : HEADER.accentGlow,
      }}
    >
      <div className={HEADER.container}>
        <nav aria-label="Main" className={HEADER.bar}>
          <Link
            href="/"
            aria-label="MY PT STUDIO home"
            className={HEADER.chipClass}
            style={{
              backdropFilter: HEADER.chipBlur,
              WebkitBackdropFilter: HEADER.chipBlur,
              boxShadow: HEADER.chipShadow,
            }}
          >
            <Wordmark tile size={HEADER.logoSize} />
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className="rounded-lg px-3 py-2 text-[13.5px] font-[560] transition-colors text-slate-400 hover:text-[var(--saffron-500)]"
              >
                {n.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-[13.5px] font-[650] transition-colors text-slate-300 hover:bg-white/[0.06] hover:text-[var(--saffron-500)]"
            >
              Log In
            </Link>
            <Link
              href="/start-free"
              className="group inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13.5px] font-bold text-white transition-all hover:-translate-y-px"
              style={{
                background: `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)`,
                boxShadow: '0 6px 20px -8px rgba(0,103,224,0.6), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              Get Started
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="rounded-lg p-2 transition-colors hover:bg-white/[0.06] lg:hidden"
            style={{ color: C.ink }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {/* Mobile drawer */}
        <div id="landing-mobile-menu" data-no-pull-refresh hidden={!open} className="pb-4 lg:hidden">
          <div
            className="rounded-2xl border p-3"
            style={{ background: 'rgba(23,41,74,0.94)', borderColor: C.line, boxShadow: '0 24px 56px -20px rgba(0,0,0,0.7)' }}
          >
            {NAV.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3.5 py-3 text-[14px] font-[580] transition-colors text-slate-300 hover:bg-white/[0.05] hover:text-[var(--saffron-500)]"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2 border-t pt-3" style={{ borderColor: C.lineSoft }}>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border py-2.5 text-center text-[14px] font-[650]"
                style={{ color: C.ink, borderColor: C.line }}
              >
                Log In
              </Link>
              <Link
                href="/start-free"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-center text-[14px] font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)` }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll progress */}
      <m.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left"
        style={{
          scaleX: progress,
          background: `linear-gradient(90deg, ${C.blue} 0%, ${C.blueHi} 55%, ${C.gold} 100%)`,
        }}
      />
    </header>
  );
}