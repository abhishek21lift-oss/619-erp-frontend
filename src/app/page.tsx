'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import PtOsDashboard from '@/components/dashboards/PtOsDashboard';
import BrandLogo from '@/components/BrandLogo';

const INIT_TIMEOUT_MS = 10_000;

export default function Root() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // 10-second safety net: if auth never resolves, bail out with an error screen
  // instead of spinning forever.
  useEffect(() => {
    if (!loading) return;
    console.debug('[root] auth loading — starting 10s timeout fallback');
    const t = setTimeout(() => {
      console.error('[root] auth init timed out after 10s — showing error screen');
      setTimedOut(true);
    }, INIT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading && !timedOut) {
    return (
      <div className="login-shell" aria-busy="true" role="status">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }} className="fade-up">
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
            <div
              style={{
                position: 'absolute',
                inset: -16,
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)',
                filter: 'blur(10px)',
                animation: 'pulse-glow 1.8s ease-in-out infinite',
              }}
            />
            <BrandLogo size={84} />
          </div>
          <div className="display" style={{ fontSize: 22, marginBottom: 8 }}>
            619 FITNESS STUDIO
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '2.4px', textTransform: 'uppercase', fontWeight: 700 }}>
            Initialising …
          </div>
        </div>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="login-shell" role="alert">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380, padding: '0 24px' }} className="fade-up">
          <BrandLogo size={64} />
          <div className="display" style={{ fontSize: 20, marginTop: '1.5rem', marginBottom: 8 }}>
            Connection problem
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Could not reach the server. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 12, border: 'none',
              background: 'var(--brand-lo)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  return (
    <Guard>
      <AppShell>
        <PtOsDashboard />
      </AppShell>
    </Guard>
  );
}
