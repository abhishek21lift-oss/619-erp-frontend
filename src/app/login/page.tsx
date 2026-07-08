'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { m, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, ArrowRight, Fingerprint, Loader2 } from 'lucide-react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { isWebAuthnSupported, isBiometricAvailable, webAuthnError } from '@/hooks/useWebAuthn';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export default function LoginPage() {
  const { user, login, loginWithGoogle, loginWithPasskey, loading } = useAuth();
  const router = useRouter();

  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [showPw,         setShowPw]         = useState(false);
  const [error,          setError]          = useState('');
  const [busy,           setBusy]           = useState(false);
  const [focused,        setFocused]        = useState<'email' | 'password' | null>(null);
  const [passkeyReady,   setPasskeyReady]   = useState(false);
  const [passkeyBusy,    setPasskeyBusy]    = useState(false);

  useEffect(() => {
    if (isWebAuthnSupported()) {
      isBiometricAvailable().then(setPasskeyReady);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'trainer') router.replace('/trainer/dashboard');
      else if (user.role === 'member') router.replace('/member/dashboard');
      else router.replace('/pt-os');
    }
  }, [user, loading, router]);

  async function handlePasskeyLogin() {
    setError('');
    setPasskeyBusy(true);
    try {
      await loginWithPasskey(email.trim() || undefined);
    } catch (err: unknown) {
      setError(webAuthnError(err));
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle(response.credential);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email is required.');
    if (!password)     return setError('Password is required.');
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-subtle)' }}>
        <div className="flex flex-col items-center gap-5">
          <m.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldLogo size={72} />
          </m.div>
          <div
            className="animate-spin"
            style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid rgba(220,38,38,0.3)', borderTopColor: '#DC2626' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Back to home ── */}
      <Link
        href="/"
        style={{
          position: 'absolute', top: 20, left: 20, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 980, padding: '7px 14px',
          color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
          textDecoration: 'none', transition: 'all 200ms',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#111827'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; }}
      >
        ← Home
      </Link>

      {/* ── Subtle dot grid background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ── Bottom-Left Brush Strokes ── */}
      <div className="absolute bottom-0 left-0 pointer-events-none select-none">
        <svg width="340" height="280" viewBox="0 0 340 280" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 250 C50 230 90 175 130 155 C170 135 195 85 235 65 C270 48 305 18 335 0 L340 0 L340 280 L0 280 Z"
            fill="#DC2626" opacity="0.14" />
          <path d="M0 262 C35 248 70 218 105 200 C140 182 165 140 200 120 C235 100 265 72 295 52 L340 25 L340 280 L0 280 Z"
            fill="#991B1B" opacity="0.18" />
          <path d="M0 272 C25 260 50 238 80 222 C110 206 130 172 162 152 C194 132 222 105 255 85 L340 45 L340 280 L0 280 Z"
            fill="#DC2626" opacity="0.07" />
          {/* Glowing edge line */}
          <path d="M0 252 C50 232 90 177 130 157 C170 137 195 87 235 67 C270 50 305 20 335 2"
            stroke="#EF4444" strokeWidth="1" opacity="0.3" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* ── Top Right Corner Accent ── */}
      <div className="absolute top-0 right-0 pointer-events-none select-none">
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          <path d="M180 0 C180 0 145 18 125 45 C105 72 115 95 95 115 C75 135 45 145 35 165 C25 185 35 180 35 180 L180 180 Z"
            fill="url(#tr-g)" opacity="0.6" />
          <defs>
            <linearGradient id="tr-g" x1="180" y1="0" x2="35" y2="180">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#DC2626" stopOpacity="0.04" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 flex w-full items-center justify-center p-6">
        <m.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* ── Login Card ── */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.5) 25%, rgba(239,68,68,1) 50%, rgba(220,38,38,0.5) 75%, transparent 100%)',
            }} />

            <div className="px-8 py-10 sm:px-10 sm:py-12 relative" style={{ zIndex: 1 }}>

              {/* ── Logo & Brand ── */}
              <div className="flex flex-col items-center" style={{ marginBottom: 36 }}>
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ marginBottom: 22, position: 'relative' }}
                >
                  {/* Outer atmosphere */}
                  <div style={{
                    position: 'absolute', inset: -20, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(220,38,38,0.22) 0%, transparent 70%)',
                    filter: 'blur(12px)',
                  }} />
                  {/* Ring border */}
                  <div style={{
                    position: 'absolute', inset: -5, borderRadius: '50%',
                    border: '1px solid rgba(220,38,38,0.22)',
                  }} />
                  <div style={{
                    position: 'absolute', inset: -10, borderRadius: '50%',
                    border: '1px solid rgba(220,38,38,0.08)',
                  }} />
                  <ShieldLogo size={88} />
                </m.div>

                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  style={{ textAlign: 'center' }}
                >
                  <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                    <span style={{ color: 'var(--text-primary)' }}>619 FITNESS </span>
                    <span style={{
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #FF7070 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>STUDIO</span>
                  </h1>
                  <p style={{
                    marginTop: 6, fontSize: 10.5, fontWeight: 600,
                    letterSpacing: '0.20em', color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>
                    Management Suite
                  </p>
                </m.div>
              </div>

              {/* ── Error Alert ── */}
              <AnimatePresence mode="wait">
                {error && (
                  <m.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      borderRadius: 12,
                      background: 'rgba(220,38,38,0.09)',
                      border: '1px solid rgba(220,38,38,0.22)',
                      padding: '10px 14px', marginBottom: 20,
                    }}
                  >
                    <span style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(239,68,68,0.2)',
                      fontSize: 10, fontWeight: 800, color: '#FCA5A5', flexShrink: 0,
                    }}>!</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#FCA5A5', lineHeight: 1.4 }}>{error}</span>
                  </m.div>
                )}
              </AnimatePresence>

              {/* ── Form ── */}
              <form onSubmit={submit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Email field */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: 11, fontWeight: 600,
                      color: 'var(--text-muted)', marginBottom: 8,
                      letterSpacing: '0.09em', textTransform: 'uppercase',
                    }}>Email address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                        autoComplete="email"
                        placeholder="your@email.com"
                        required
                        style={{
                          width: '100%', height: 50,
                          paddingLeft: 16, paddingRight: 44,
                          borderRadius: 12,
                          background: 'var(--bg-card)',
                          border: focused === 'email' ? '1px solid rgba(220,38,38,0.45)' : '1px solid #d1d5db',
                          boxShadow: focused === 'email' ? '0 0 0 3px rgba(220,38,38,0.09)' : 'none',
                          color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                          transition: 'all 200ms',
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{
                        color: focused === 'email' ? 'rgba(239,68,68,0.55)' : 'rgba(100,116,139,0.4)',
                        transition: 'color 200ms',
                      }}>
                        <Mail size={17} />
                      </div>
                    </div>
                  </div>

                  {/* Password field */}
                  <div>
                    <label style={{
                      display: 'block', fontSize: 11, fontWeight: 600,
                      color: 'var(--text-muted)', marginBottom: 8,
                      letterSpacing: '0.09em', textTransform: 'uppercase',
                    }}>Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused(null)}
                        autoComplete="current-password"
                        placeholder="••••••••••"
                        required
                        style={{
                          width: '100%', height: 50,
                          paddingLeft: 16, paddingRight: 44,
                          borderRadius: 12,
                          background: 'var(--bg-card)',
                          border: focused === 'password' ? '1px solid rgba(220,38,38,0.45)' : '1px solid #d1d5db',
                          boxShadow: focused === 'password' ? '0 0 0 3px rgba(220,38,38,0.09)' : 'none',
                          color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                          transition: 'all 200ms',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{
                          color: focused === 'password' ? 'rgba(148,163,184,0.65)' : 'rgba(100,116,139,0.45)',
                          transition: 'color 200ms',
                        }}
                      >
                        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sign In Button */}
                <m.button
                  type="submit"
                  disabled={busy}
                  whileHover={!busy ? { scale: 1.015, y: -1 } : {}}
                  whileTap={!busy ? { scale: 0.985 } : {}}
                  style={{
                    position: 'relative', width: '100%', height: 52, marginTop: 24,
                    borderRadius: 14,
                    background: busy
                      ? 'rgba(220,38,38,0.35)'
                      : 'linear-gradient(135deg, #EF4444 0%, #DC2626 45%, #C41E1E 100%)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    boxShadow: busy ? 'none' : '0 8px 32px rgba(220,38,38,0.32), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.14)',
                    color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                    letterSpacing: '0.04em', cursor: busy ? 'not-allowed' : 'pointer',
                    transition: 'all 280ms cubic-bezier(0.16,1,0.3,1)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Shimmer sweep */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)',
                      transform: busy ? 'translateX(0)' : 'translateX(-100%)',
                      transition: 'transform 0s',
                    }}
                  />
                  <span className="relative flex items-center justify-center gap-2.5">
                    {busy ? (
                      <>
                        <div
                          className="animate-spin"
                          style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff' }}
                        />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight size={16} strokeWidth={2.5} style={{ opacity: 0.85 }} />
                      </>
                    )}
                  </span>
                </m.button>

                {/* ── Divider ── */}
                {(GOOGLE_CLIENT_ID || passkeyReady) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.10)' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(71,85,105,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.10)' }} />
                  </div>
                )}

                {/* Google Sign-In */}
                {GOOGLE_CLIENT_ID && (
                  <div className="flex justify-center" style={{ marginBottom: passkeyReady ? 12 : 0 }}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google sign-in was cancelled or failed.')}
                      theme="filled_black"
                      size="large"
                      shape="rectangular"
                      text="signin_with"
                      logo_alignment="left"
                      width="358"
                    />
                  </div>
                )}

                {/* ── Passkey / Biometric Sign-In ── */}
                {passkeyReady && (
                  <m.button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={passkeyBusy || busy}
                    whileHover={!passkeyBusy ? { scale: 1.012 } : {}}
                    whileTap={!passkeyBusy  ? { scale: 0.988 } : {}}
                    style={{
                      position: 'relative',
                      width: '100%', height: 50,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      borderRadius: 14,
                      background: passkeyBusy
                        ? 'rgba(124,58,237,0.12)'
                        : 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.30)',
                      boxShadow: passkeyBusy ? 'none' : '0 0 16px rgba(124,58,237,0.10)',
                      color: '#C4B5FD', fontSize: 14, fontWeight: 700,
                      letterSpacing: '0.03em',
                      cursor: passkeyBusy ? 'not-allowed' : 'pointer',
                      transition: 'all 250ms ease',
                    }}
                  >
                    {passkeyBusy ? (
                      <>
                        <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Waiting for biometric…</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint size={18} style={{ opacity: 0.85 }} />
                        <span>Sign in with Fingerprint / Face ID</span>
                      </>
                    )}
                    {/* Inner glow */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 'inherit',
                      background: 'radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.08) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }} />
                  </m.button>
                )}
              </form>

              {/* Support link */}
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Having trouble?{' '}
                  <button
                    type="button"
                    style={{ color: 'rgba(239,68,68,0.80)', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(239,68,68,0.80)')}
                  >
                    Contact your gym administrator
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              marginTop: 28, textAlign: 'center', fontSize: 11,
              color: 'var(--text-muted)', letterSpacing: '0.03em',
            }}
          >
            &copy; {new Date().getFullYear()} 619 FITNESS STUDIO. All rights reserved.
          </m.p>
        </m.div>
      </div>
    </div>
  );
}

/* ── Premium Red Shield Logo ── */
function ShieldLogo({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg" x1="44" y1="2" x2="44" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="55%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id="shi" x1="20" y1="8" x2="68" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="sdrop">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#DC2626" floodOpacity="0.45" />
        </filter>
      </defs>
      {/* Drop shadow */}
      <path
        d="M44 2 C44 2 12 14 6 20 C0 26 0 30 2 38 C4 46 10 58 18 68 C26 78 34 82 40 86 C42 87 46 87 48 86 C54 82 62 78 70 68 C78 58 84 46 86 38 C88 30 88 26 82 20 C76 14 44 2 44 2 Z"
        fill="rgba(0,0,0,0.5)" transform="translate(0,4)" filter="url(#sdrop)"
      />
      {/* Shield body */}
      <path
        d="M44 2 C44 2 12 14 6 20 C0 26 0 30 2 38 C4 46 10 58 18 68 C26 78 34 82 40 86 C42 87 46 87 48 86 C54 82 62 78 70 68 C78 58 84 46 86 38 C88 30 88 26 82 20 C76 14 44 2 44 2 Z"
        fill="url(#sg)"
      />
      {/* Inner highlight */}
      <path
        d="M44 8 C44 8 16 18 11 23 C6 28 6 32 8 39 C10 46 15 57 22 66 C29 75 36 79 41 82 C43 83 45 83 47 82 C52 79 59 75 66 66 C73 57 78 46 80 39 C82 32 82 28 77 23 C72 18 44 8 44 8 Z"
        fill="url(#shi)"
      />
      {/* Deer body */}
      <path
        d="M44 30 C40 30 37 33 36 36 C35 39 33 42 30 44 C27 46 24 50 23 54 C22 58 21 62 22 65 C23 68 26 70 30 72 C34 74 39 75 44 76 C49 75 54 74 58 72 C62 70 65 68 66 65 C67 62 66 58 65 54 C64 50 61 46 58 44 C55 42 53 39 52 36 C51 33 48 30 44 30 Z"
        fill="#1A0808" opacity="0.92"
      />
      {/* Antlers */}
      <path d="M33 38 C30 32 28 26 29 20 C29 16 32 14 35 16 C38 18 40 22 39 27 C38 32 36 36 35 38" fill="#1A0808" opacity="0.92" />
      <path d="M55 38 C58 32 60 26 59 20 C59 16 56 14 53 16 C50 18 48 22 49 27 C50 32 52 36 53 38" fill="#1A0808" opacity="0.92" />
      {/* 619 text */}
      <text x="44" y="68" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="1">619</text>
    </svg>
  );
}
