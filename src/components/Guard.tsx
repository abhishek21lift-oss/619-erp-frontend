'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/nav-config';

interface Props {
  children: React.ReactNode;
  role?: Role;
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

    // Admins can access any role-restricted page; non-admins must match exactly.
    if (role && user.role !== role && user.role !== 'admin') {
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

  if (!user || (role && user.role !== role && user.role !== 'admin')) {
    return null;
  }

  return <>{children}</>;
}
