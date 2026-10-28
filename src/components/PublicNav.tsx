'use client';

import Link from 'next/link';
import { Wordmark } from '@/components/landing/Wordmark';
import { C, HEADER } from '@/components/landing/tokens';

/**
 * The bar above every signed-out page.
 *
 * Same system as the landing navbar — the 48px translucent strip and the same
 * container — so moving between the marketing site, Start Free and a sign-in
 * door never jumps. The only thing that changes is the action it offers: the
 * sign-in page links to /start-free and the signup page links to /login,
 * because a bar that links to the page you are already on is furniture.
 *
 * The clearance is what a page's own top padding should add below the fixed
 * bar: the bar itself plus breathing room.
 */
export const PUBLIC_NAV_CLEARANCE = 'calc(max(env(safe-area-inset-top), 0px) + 5.5rem)';

export default function PublicNav({ action }: { action: 'sign-in' | 'start-free' }) {
  const href = action === 'sign-in' ? '/login' : '/start-free';
  const label = action === 'sign-in' ? 'Sign in' : 'Start free';

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        paddingTop: HEADER.padTop,
        background: HEADER.bg,
        backdropFilter: HEADER.blur,
        WebkitBackdropFilter: HEADER.blur,
        borderBottom: `1px solid ${HEADER.border}`,
      }}
    >
      <div className={HEADER.container}>
        <nav className={HEADER.bar}>
          <Link href="/" aria-label="MY PT STUDIO home" className={HEADER.chipClass}>
            <Wordmark size={22} priority />
          </Link>

          <Link
            href={href}
            className="rounded-full px-4 py-1.5 text-[12px] font-[500] text-white transition-colors hover:brightness-110"
            style={{ background: C.blue }}
          >
            {label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
