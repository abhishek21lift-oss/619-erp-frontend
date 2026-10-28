'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
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
 * The public bar — a slim, translucent apple.com-style header. It sits over
 * the hero while the page is at the top and keeps the same 48px height once
 * content scrolls beneath it, so nothing jumps between the marketing pages,
 * Start Free and the sign-in doors.
 *
 * `items` exists so a second marketing page (/pt-os) can point at its own
 * sections without forking the bar.
 */
export default function LandingNav({
  items = NAV,
}: {
  items?: readonly { label: string; href: string }[];
} = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
        transition: 'background 240ms ease, border-color 240ms ease, backdrop-filter 240ms ease',
        background: scrolled ? HEADER.bg : HEADER.bgIdle,
        backdropFilter: scrolled ? HEADER.blur : HEADER.blurIdle,
        WebkitBackdropFilter: scrolled ? HEADER.blur : HEADER.blurIdle,
        borderBottom: `1px solid ${scrolled || open ? HEADER.border : 'transparent'}`,
      }}
    >
      <div className={HEADER.container}>
        <nav aria-label="Main" className={HEADER.bar}>
          <Link href="/" aria-label="MY PT STUDIO home" className={HEADER.chipClass}>
            <Wordmark size={22} priority />
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-7 lg:flex">
            {items.map((n) => (
              <a
                key={n.label}
                href={n.href}
                className="text-[12px] font-[400] transition-opacity hover:opacity-60"
                style={{ color: C.ink }}
              >
                {n.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-5 lg:flex">
            <Link
              href="/login"
              className="text-[12px] font-[400] transition-opacity hover:opacity-60"
              style={{ color: C.ink }}
            >
              Log in
            </Link>
            <Link
              href="/start-free"
              className="rounded-full px-4 py-1.5 text-[12px] font-[500] text-white transition-colors hover:brightness-110"
              style={{ background: C.blue }}
            >
              Start free
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
            className="rounded-lg p-1.5 transition-opacity hover:opacity-60 lg:hidden"
            style={{ color: C.ink }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {/* Mobile drawer */}
        <div id="landing-mobile-menu" data-no-pull-refresh hidden={!open} className="pb-5 lg:hidden">
          <div className="border-t pt-2" style={{ borderColor: C.lineSoft }}>
            {items.map((n) => (
              <a
                key={n.label}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block px-1 py-3 text-[17px] font-[500] transition-opacity hover:opacity-60"
                style={{ color: C.ink }}
              >
                {n.label}
              </a>
            ))}
            <div className="mt-3 flex gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border py-2.5 text-center text-[14px] font-[500]"
                style={{ color: C.ink, borderColor: C.line }}
              >
                Log in
              </Link>
              <Link
                href="/start-free"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full py-2.5 text-center text-[14px] font-[500] text-white"
                style={{ background: C.blue }}
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
