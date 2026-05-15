'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'trainer') router.replace('/trainer/dashboard');
      else if (user.role === 'member') router.replace('/member/dashboard');
      else router.replace('/dashboard');
    }
  }, [user, loading, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email is required.');
    if (!password)     return setError('Password is required.');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#e8e4df' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #dc2626', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden',
      /* Concrete/stone texture via CSS */
      background: `
        radial-gradient(ellipse at 20% 50%, rgba(180,170,160,0.4) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(160,150,140,0.3) 0%, transparent 40%),
        radial-gradient(ellipse at 60% 80%, rgba(140,130,120,0.2) 0%, transparent 40%),
        #d6d0c8
      `,
    }}>

      {/* Concrete texture overlay */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`, opacity: 0.6, pointerEvents: 'none' }} />

      {/* Cracks / lines overlay */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Cpath d='M120 80 Q200 150 180 250 Q160 320 220 400' stroke='rgba(100,80,60,0.12)' fill='none' strokeWidth='1.5'/%3E%3Cpath d='M450 20 Q480 100 460 200 Q440 280 500 380' stroke='rgba(100,80,60,0.08)' fill='none' strokeWidth='1'/%3E%3Cpath d='M600 100 Q650 180 640 300' stroke='rgba(80,60,40,0.1)' fill='none' strokeWidth='1'/%3E%3C/svg%3E")`, pointerEvents: 'none', opacity: 0.8 }} />

      {/* Deer watermark — top right */}
      <div aria-hidden style={{ position: 'absolute', top: '-5%', right: '-5%', width: '42vw', maxWidth: 520, opacity: 0.09, pointerEvents: 'none', transform: 'scaleX(-1)' }}>
        <Image src="/619-logo.png" alt="" width={520} height={520} style={{ width: '100%', height: 'auto', filter: 'grayscale(1)' }} />
      </div>

      {/* Red + black brush strokes — bottom left */}
      <div aria-hidden style={{ position: 'absolute', bottom: '-2%', left: '-2%', width: '38vw', maxWidth: 480, pointerEvents: 'none', zIndex: 0 }}>
        <svg viewBox="0 0 480 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="160" cy="130" rx="180" ry="55" fill="#dc2626" fillOpacity="0.85" transform="rotate(-12 160 130)"/>
          <ellipse cx="200" cy="155" rx="140" ry="35" fill="#991b1b" fillOpacity="0.7" transform="rotate(-8 200 155)"/>
          <ellipse cx="80" cy="160" rx="100" ry="28" fill="#1a1a1a" fillOpacity="0.75" transform="rotate(-15 80 160)"/>
          <ellipse cx="120" cy="175" rx="80" ry="18" fill="#0a0a0a" fillOpacity="0.6" transform="rotate(-10 120 175)"/>
        </svg>
      </div>

      {/* Login card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440 }}>

        {/* Logo + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <Image
            src="/619-logo.png"
            alt="619 Fitness Studio"
            width={110}
            height={110}
            style={{ objectFit: 'contain', marginBottom: 14, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }}
          />
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '0.18em',
            color: '#1a1a1a',
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
          }}>
            619 FITNESS STUDIO
          </h1>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 16,
          border: '2px solid #dc2626',
          padding: '32px 32px 24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(220,38,38,0.15)',
        }}>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 18, fontWeight: 500 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 44px 12px 14px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 10, fontSize: 15,
                    outline: 'none', transition: 'border-color 150ms',
                    fontFamily: 'Inter, sans-serif',
                    background: '#fafafa',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
                <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 44px 12px 14px',
                    border: '1.5px solid #d1d5db',
                    borderRadius: 10, fontSize: 15,
                    outline: 'none', transition: 'border-color 150ms',
                    fontFamily: 'Inter, sans-serif',
                    background: '#fafafa',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2 }}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%', padding: '14px',
                background: busy ? '#ef4444' : '#dc2626',
                color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 16,
                fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
                letterSpacing: '0.02em',
                transition: 'background 150ms, transform 100ms',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
              }}
              onMouseEnter={e => !busy && (e.currentTarget.style.background = '#b91c1c')}
              onMouseLeave={e => !busy && (e.currentTarget.style.background = '#dc2626')}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Help text */}
          <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            Having trouble? Contact your gym administrator.
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.03em' }}>
          © {new Date().getFullYear()} 619 FITNESS STUDIO. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { outline: none; }
      `}</style>
    </div>
  );
}
