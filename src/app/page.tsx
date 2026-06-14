'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import PtOsDashboard from '@/components/dashboards/PtOsDashboard';
import LandingPage from '@/components/LandingPage';
import BrandLogo from '@/components/BrandLogo';

export default function Root() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (user) {
        setReady(true);
      }
    }
  }, [user, loading]);

  if (loading) {
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
          <div
            className="display"
            style={{ fontSize: 22, marginBottom: 8 }}
          >
            619 FITNESS STUDIO
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              letterSpacing: '2.4px',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            Initialising …
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <Guard>
      <AppShell>
        <PtOsDashboard />
      </AppShell>
    </Guard>
  );
}
