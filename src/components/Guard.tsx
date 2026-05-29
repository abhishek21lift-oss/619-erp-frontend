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
          minHeight: '100dvh',
          background: '#F8FAFC',
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
                'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59,130,246,0.25)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(59,130,246,0.15)', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite' }} />

          <div
            style={{
              fontSize: 11,
              color: '#6B7280',
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
