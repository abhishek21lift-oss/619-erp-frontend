'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Wordmark } from '@/components/landing/Wordmark';
import { HEADER } from '@/components/landing/tokens';

/**
 * The bar that sits above every signed-out page.
 *
 * Lifted out of /start-free so /login can use the same one. Without it these
 * pages begin flush against the status bar and their first element sits under
 * the notch — which is what a floating "← Home" pill was working around on
 * /login, badly: a pill overlapping the content is not a header, and it left
 * no way back to the marketing site that looked like navigation.
 *
 * The header SYSTEM is the landing page navbar's, verbatim: same top reserve,
 * same 64px bar, same container width and gutters, same glass chrome, and —
 * on `dark` — the same logo chip with the Wordmark tile. All header
 * dimensions come from the shared HEADER tokens (components/landing/tokens.ts)
 * so Start Free, Sign In and the Command Center door occupy exactly the same
 * vertical space as the marketing site.
 *
 * `action` is the one thing that differs by page — it names the action the
 * bar offers: the sign-in page passes "start-free" (links to /start-free) and
 * the signup page passes "sign-in" (links to /login), because a bar that
 * links to the page you are already on is furniture rather than navigation.
 *
 * `dark` is the auth-page variant: the same glass bar in the landing page's
 * near-black navy, so the redesigned login and signup surfaces keep the same
 * navigation as the marketing site without a light strip cutting across the
 * dark canvas. Labels and hrefs are identical in both themes.
 */
export const PUBLIC_NAV_CLEARANCE = 'calc(max(env(safe-area-inset-top), 2.75rem) + 5.5rem)';

export default function PublicNav({ action, dark = false }: { action: 'sign-in' | 'start-free'; dark?: boolean }) {
  const href = action === 'sign-in' ? '/login' : '/start-free';
  const label = action === 'sign-in' ? 'Sign in' : 'Start free';

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        // Same notch reserve as the landing navbar — identical header height.
        paddingTop: HEADER.padTop,
        background: dark ? HEADER.bg : 'rgba(255,255,255,0.88)',
        backdropFilter: dark ? HEADER.blur : 'blur(20px)',
        WebkitBackdropFilter: dark ? HEADER.blur : 'blur(20px)',
        borderBottom: dark ? `1px solid ${HEADER.border}` : '1px solid rgba(0,103,224,0.07)',
      }}
    >
      <div className={HEADER.container}>
        <nav className={HEADER.bar}>
          {dark ? (
            // Identical logo lockup to the landing navbar: chip + Wordmark tile.
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
          ) : (
            <Link href="/" aria-label="MY PT STUDIO home" className="inline-flex items-center gap-2.5">
              <Image
                src="/mypt-logo.png"
                alt=""
                width={HEADER.logoSize}
                height={HEADER.logoSize}
                priority
                className="shrink-0 object-contain"
                style={{ width: HEADER.logoSize, height: HEADER.logoSize }}
              />
              <span className="text-[15px] font-[800] tracking-[-0.02em]">
                <span style={{ color: '#0067E0' }}>MY PT</span>{' '}
                <span style={{ color: '#0F172A' }}>STUDIO</span>
              </span>
            </Link>
          )}

          <Link
            href={href}
            className={`rounded-lg px-4 py-2 text-[13.5px] transition-colors ${
              dark ? 'font-[650] hover:bg-white/[0.06] hover:text-white' : 'font-[650] hover:bg-black/[0.04]'
            }`}
            style={{ color: dark ? '#CBD5E1' : '#0F172A' }}
          >
            {label}
          </Link>
        </nav>
      </div>
    </header>
  );
}