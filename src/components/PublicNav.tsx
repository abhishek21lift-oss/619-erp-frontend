'use client';

import Link from 'next/link';
import { Wordmark } from '@/components/landing/Wordmark';
import { C, HEADER } from '@/components/landing/tokens';

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
 * There used to be a `dark` variant here, and a light one, because the auth
 * surfaces were a near-black navy and the rest of the site was not — a light
 * strip cutting across a dark canvas was the thing it existed to avoid. The
 * public surface is one soft light material now, so the two branches rendered
 * the same bar in two slightly different ways for no remaining reason. There
 * is one bar, and it is the landing navbar's: same reserve, same 64px row,
 * same container, same extruded logo chip.
 */
export const PUBLIC_NAV_CLEARANCE = 'calc(max(env(safe-area-inset-top), 2.75rem) + 5.5rem)';

export default function PublicNav({ action }: { action: 'sign-in' | 'start-free' }) {
  const href = action === 'sign-in' ? '/login' : '/start-free';
  const label = action === 'sign-in' ? 'Sign in' : 'Start free';

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        // Same notch reserve as the landing navbar — identical header height.
        paddingTop: HEADER.padTop,
        background: HEADER.bg,
        backdropFilter: HEADER.blur,
        WebkitBackdropFilter: HEADER.blur,
        borderBottom: `1px solid ${HEADER.accentLine}`,
        boxShadow: HEADER.accentGlow,
      }}
    >
      <div className={HEADER.container}>
        <nav className={HEADER.bar}>
          {/* Identical logo lockup to the landing navbar: chip + Wordmark tile. */}
          <Link
            href="/"
            aria-label="MY PT STUDIO home"
            className={HEADER.chipClass}
            style={{ boxShadow: HEADER.chipShadow }}
          >
            <Wordmark tile size={HEADER.logoSize} />
          </Link>

          <Link
            href={href}
            className="rounded-lg px-4 py-2 text-[13.5px] font-[650] transition-shadow"
            style={{ color: C.body }}
          >
            {label}
          </Link>
        </nav>
      </div>
    </header>
  );
}