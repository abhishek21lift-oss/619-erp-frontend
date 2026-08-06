'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { hasRole, normaliseRole } from '@/lib/roles';
import { portalForRole, portalForPage, homeFor } from '@/lib/portals';
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
  const [ready, setReady] = useState(false);

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

  useEffect(() => {
    if (loading) return;

    if (!user || userPortal === null) {
      router.replace(signInPathFor(pathname));
      return;
    }

    if (userPortal !== pagePortal) {
      router.replace(homeFor(userPortal));
      return;
    }

    // When no role constraint is specified, any authenticated user passes.
    // hasRole(x, undefined) returns false for everyone — so we must skip the
    // check when neither `role` nor `roles` was provided.
    const roleRequired = role !== undefined || roles !== undefined;
    if (roleRequired && !hasRole(user.role, roles ?? role)) {
      // User is logged in but lacks the required role — send them home rather
      // than to a sign-in page, which would just detect the session and bounce
      // straight back here.
      router.replace(homeFor(userPortal));
      return;
    }

    setReady(true);
  }, [user, loading, role, roles, router, pathname, userPortal, pagePortal]);

  if (loading || !ready) {
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

  // Belt and braces for the render pass: the effect above navigates, but a
  // navigation is asynchronous and the children would otherwise paint once in
  // between. The portal check is repeated here for the same reason the role
  // check is — a frame of the trainer's sidebar is still a frame of it.
  const roleRequired = role !== undefined || roles !== undefined;
  if (!user || userPortal !== pagePortal || (roleRequired && !hasRole(user.role, roles ?? role))) {
    return null;
  }

  return <>{children}</>;
}
