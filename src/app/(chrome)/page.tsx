'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Guard from '@/components/Guard';
import PtOsDashboard from '@/components/dashboards/PtOsDashboard';
import LandingPage from '@/components/LandingPage';
import BrandLogo from '@/components/BrandLogo';

// Must stay comfortably ABOVE the auth bootstrap's own abort timeout
// (auth-context.tsx aborts /api/auth/me at 10s). Both used to be 10s, so they
// raced: auth-context handles a slow or unreachable API by keeping the cached
// session and resolving — the graceful path — while this timer was declaring a
// hard "Connection problem" on the same deadline. Whichever won decided
// whether the user got the app or a dead end. This net is only for auth never
// resolving at all; a slow API is already somebody else's job.
const INIT_TIMEOUT_MS = 20_000;

export default function Root() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // This used to bounce every super_admin off the studio dashboard to
  // /platform. It is gone, for two reasons that arrived together.
  //
  // It BREAKS once the Command Center has its own hostname: /platform is not
  // served on the studio's domain any more (see src/proxy.ts), so the redirect
  // sends the operator from a page that works to a 404.
  //
  // And it was already fighting a real workflow. An operator reaches this
  // dashboard deliberately — with the org-switcher pinned to one tenant, to
  // see what that studio sees — and an unconditional redirect made the studio
  // home the one studio page they could not open.
  //
  // Nothing is lost by removing it. Signing in at the Command Center's door
  // lands on the console (SignInScreen routes by portal), and Guard still
  // refuses every studio account at /platform. What the operator no longer has
  // is a redirect deciding, on their behalf, which of the two products they
  // meant to open.

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
      <div
        className="login-shell"
        aria-busy="true"
        role="status"
        style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        {/* No "MY PT STUDIO" heading under the mark: the logo artwork already
            carries the wordmark, so the text was the brand name printed twice,
            one above the other. Dropping it lets the mark itself carry the
            screen, which is why it is sized up here. */}
        {/* Flex column rather than text-align on inline-blocks: an inline-block
            sits on a text baseline, so the line box left descender space under
            the mark and nudged the whole group off true centre. */}
        <div
          className="fade-up"
          style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
        >
          <div style={{ position: 'relative', display: 'flex', marginBottom: '1.75rem' }}>
            <div
              style={{
                position: 'absolute',
                inset: -24,
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)',
                filter: 'blur(14px)',
                animation: 'pulse-glow 1.8s ease-in-out infinite',
              }}
            />
            <BrandLogo size={140} />
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
      <div
        className="login-shell"
        role="alert"
        style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
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
    return <LandingPage />;
  }

  // The blank frame that paired with the redirect removed above is gone too.
  // With nothing redirecting, holding the page empty for a super_admin would
  // just be a permanently blank dashboard — so the operator gets the studio
  // home, scoped by the API to whichever tenant they have pinned.
  return (
    <Guard>
      <PtOsDashboard />
    </Guard>
  );
}
