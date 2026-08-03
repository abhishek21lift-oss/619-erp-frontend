'use client';

import Link from 'next/link';
import Image from 'next/image';

/**
 * The bar that sits above every signed-out page.
 *
 * Lifted out of /start-free so /login can use the same one. Without it these
 * pages begin flush against the status bar and their first element sits under
 * the notch — which is what a floating "← Home" pill was working around on
 * /login, badly: a pill overlapping the content is not a header, and it left
 * no way back to the marketing site that looked like navigation.
 *
 * Same fixed, blurred, full-bleed treatment as the landing page's own nav, so
 * moving between the marketing site and these pages does not feel like landing
 * in a different product. The section links are dropped — there are no sections
 * to jump to here.
 *
 * `action` is the one thing that differs by page: /login offers "Start free"
 * and /start-free offers "Sign in", because a bar that links to the page you
 * are already on is furniture rather than navigation.
 */
export const PUBLIC_NAV_CLEARANCE = 'calc(max(env(safe-area-inset-top), 2.75rem) + 5.5rem)';

export default function PublicNav({ action }: { action: 'sign-in' | 'start-free' }) {
  const href = action === 'sign-in' ? '/login' : '/start-free';
  const label = action === 'sign-in' ? 'Sign in' : 'Start free';

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        // Floor the reserve at 2.75rem so the bar still clears the status bar
        // where env(safe-area-inset-top) resolves to 0 — some in-app browsers
        // and non-cover viewports report no inset at all.
        paddingTop: 'max(env(safe-area-inset-top), 2.75rem)',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,103,224,0.07)',
      }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <nav className="flex items-center justify-between py-3">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="MY PT STUDIO home">
            <Image
              src="/mypt-logo.png"
              alt=""
              width={38}
              height={38}
              priority
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="text-[15px] font-[800] tracking-[-0.02em]">
              <span style={{ color: '#0067E0' }}>MY PT</span>{' '}
              <span style={{ color: '#0F172A' }}>STUDIO</span>
            </span>
          </Link>

          <Link
            href={href}
            className="rounded-xl px-3.5 py-2 text-[13.5px] font-[650] transition-colors hover:bg-black/[0.04]"
            style={{ color: '#0F172A' }}
          >
            {label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
