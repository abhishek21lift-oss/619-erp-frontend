'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/nav-config';

interface Props {
  children: React.ReactNode;
  role?: Role;
}

/**
 * Normalise legacy role aliases so Guard comparisons are consistent.
 *
 * FIX (Route Integrity R-04):
 * nav-config.ts maps 'receptionist' → 'reception' when deciding nav visibility,
 * but Guard was doing a raw string comparison. A user whose JWT contained
 * role='receptionist' (old tokens or direct DB values) would fail the Guard
 * check for pages that declare role="reception", bouncing them to /dashboard.
 *
 * We apply the same normalisation here so Guard + nav-config + backend all
 * agree on the canonical role string.
 */
function normaliseRole(role: string | undefined): string | undefined {
  if (role === 'receptionist') return 'reception';
  return role;
}

export default function Guard({ children, role }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const userRole = normaliseRole(user.role);
    const requiredRole = normaliseRole(role);

    // Admins can access any role-restricted page; non-admins must match exactly.
    if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    setReady(true);
  }, [user, loading, role, router]);

  if (loading || !ready) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-1)',
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
              background:
                'linear-gradient(135deg, var(--brand) 0%, var(--brand-lo) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              boxShadow: '0 8px 24px var(--brand-glow)',
              animation: 'pulse-glow 1.4s ease-in-out infinite',
            }}
          >
            🏋️
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
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

  const userRole = normaliseRole(user?.role);
  const requiredRole = normaliseRole(role);

  if (!user || (requiredRole && userRole !== requiredRole && userRole !== 'admin')) {
    return null;
  }

  return <>{children}</>;
}
