'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { hasRole, normaliseRole } from '@/lib/roles';
import { portalForRole, portalForPage, homeFor, mayEnterPortal } from '@/lib/portals';
import { signInPathFor } from '@/lib/public-paths';
import type { Role } from '@/lib/roles';

interface Props {
  children: React.ReactNode;
  role?: Role;
  roles?: Role[];
}

export default function Guard({ children, role, roles }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';

  // Which app this page belongs to, and which app this account belongs in.
  //
  // Checked before role/roles and independently of them, because the default —
  // a bare <Guard> — means "any authenticated user", and about a hundred staff
  // pages use it. A member with a valid session could therefore open
  // /pt-os/clients and be handed the entire staff shell: sidebar, nav, the
  // trainer's application. The API refuses them (requireStaff sits on the
  // mount, so the lists come back 403 rather than populated), but an empty
  // copy of somebody else's app is still the thing the client reported seeing
  // — and adding role props to a hundred pages is the kind of fix that is
  // correct on page 99 and forgotten on page 100.
  //
  // It runs in the other direction too: /member/payments is a bare <Guard>, so
  // without this a trainer could open a client's payments screen.
  const pagePortal = portalForPage(pathname);
  const userPortal = user ? portalForRole(user.role) : null;

  // ── The verdict is computed during render, not stored in state ─────────────
  //
  // This used to be `useState(false)` flipped to true by the effect below, so
  // the FIRST render pass of every Guard returned the splash regardless of
  // whether the answer was already known. Effects run after the commit, which
  // means that splash was committed to the DOM and painted, then replaced —
  // and 112 pages in this app nest their own <Guard> inside the one in the
  // chrome layout, so it happened on every single navigation.
  //
  // Two bugs came out of that one frame. The visible one was the blink. The
  // other was subtler: the splash is `minHeight: 100dvh`, so on every
  // navigation the document collapsed to roughly one viewport at exactly the
  // moment the browser tried to restore scroll — a saved offset of 720px
  // cannot be applied to a 700px document, so it was clamped to the top and
  // the real content arrived underneath an already-lost position.
  //
  // Deriving the verdict instead of storing it also makes the gate strictly
  // safer: `ready` was sticky, so a user whose role changed mid-session kept
  // passing until the component unmounted. This recomputes on every render.
  // mayEnterPortal rather than `userPortal !== pagePortal`, because the rule
  // stopped being symmetric when the Command Center became its own portal: the
  // operator may walk into a studio (that is the support job), and no studio
  // account may walk into the Command Center. Encoding that here rather than
  // as an `if (role === 'super_admin')` escape hatch keeps the exception in one
  // named function instead of scattered through the gates.
  const roleRequired = role !== undefined || roles !== undefined;
  const verdict: 'pending' | 'redirect' | 'pass' =
    loading ? 'pending'
      : (!user || userPortal === null) ? 'redirect'
        : !mayEnterPortal(userPortal, pagePortal) ? 'redirect'
          : (roleRequired && !hasRole(user.role, roles ?? role)) ? 'redirect'
            : 'pass';

  // The effect now carries only the side-effect — the navigation itself. It no
  // longer decides what is rendered.
  useEffect(() => {
    if (verdict !== 'redirect') return;

    if (!user || userPortal === null) {
      router.replace(signInPathFor(pathname));
      return;
    }

    // Either the account belongs to a different portal, or it lacks the role
    // this page requires. Both go home rather than to a sign-in page, which
    // would just detect the session and bounce straight back here.
    router.replace(homeFor(userPortal));
  }, [verdict, user, userPortal, router, pathname]);

  if (verdict === 'pending') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          background: 'var(--bg-canvas)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--brand-lo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px var(--brand-glow)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--brand-soft)', borderTopColor: 'var(--brand-lo)', animation: 'spin 0.8s linear infinite' }} />

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Loading
          </div>
        </div>
      </div>
    );
  }

  // A redirect is asynchronous, so render nothing while it is in flight rather
  // than a frame of a page this account may not see — a frame of the trainer's
  // sidebar is still a frame of it. This is the same check the effect above
  // acts on, which is why the two can no longer disagree: both read `verdict`.
  if (verdict === 'redirect') return null;

  return <>{children}</>;
}
