'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { m, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, ArrowRight, Fingerprint, Loader2, Dumbbell } from 'lucide-react';
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
      <div className="flex items-center justify-center h-screen" style={{ background: '#0A0F1E' }}>
        <div className="flex flex-col items-center gap-5">
          <m.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CoachLogo size={72} />
          </m.div>
          <div
            className="animate-spin"
            style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid rgba(59,130,246,0.3)', borderTopColor: '#3B82F6' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex overflow-hidden relative"
      style={{ background: '#0A0F1E', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Back to home ── */}
      <Link
        href="/"
        style={{
          position: 'absolute', top: 20, left: 20, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 7,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 980, padding: '7px 14px',
          color: 'rgba(148,163,184,0.9)', fontSize: 12, fontWeight: 600,
          textDecoration: 'none', transition: 'all 200ms',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#f1f5f9'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(148,163,184,0.9)'; }}
      >
        ← Home
      </Link>

      {/* ── Radial glow backgrounds ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left blue glow */}
        <div style={{
          position: 'absolute', top: -120, left: -120,
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        {/* Bottom-right subtle glow */}
        <div style={{
          position: 'absolute', bottom: -80, right: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
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
            background: 'rgba(15,23,42,0.90)',
            border: '1px solid rgba(59,130,246,0.20)',
            borderRadius: 24,
            boxShadow: '0 0 0 1px rgba(59,130,246,0.08), 0 32px 64px rgba(0,0,0,0.60), 0 0 80px rgba(59,130,246,0.06)',
            backdropFilter: 'blur(24px)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top accent line */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.6) 25%, rgba(96,165,250,1) 50%, rgba(59,130,246,0.6) 75%, transparent 100%)',
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
                  {/* Outer glow */}
                  <div style={{
                    position: 'absolute', inset: -24, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 70%)',
                    filter: 'blur(16px)',
                  }} />
                  {/* Ring border */}
                  <div style={{
                    position: 'absolute', inset: -6, borderRadius: '50%',
                    border: '1px solid rgba(59,130,246,0.28)',
                  }} />
                  <div style={{
                    position: 'absolute', inset: -12, borderRadius: '50%',
                    border: '1px solid rgba(59,130,246,0.10)',
                  }} />
                  <CoachLogo size={88} />
                </m.div>

                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  style={{ textAlign: 'center' }}
                >
                  <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                    <span style={{ color: '#f1f5f9' }}>COACH </span>
                    <span style={{
                      background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #93C5FD 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>ABHISHEK</span>
                  </h1>
                  <p style={{
                    marginTop: 6, fontSize: 10.5, fontWeight: 600,
                    letterSpacing: '0.20em', color: 'rgba(148,163,184,0.75)',
                    textTransform: 'uppercase',
                  }}>
                    Personal Training Suite
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
                      background: 'rgba(239,68,68,0.10)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      padding: '10px 14px', marginBottom: 20,
                    }}
                  >
                    <span style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(239,68,68,0.20)',
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
                      color: 'rgba(148,163,184,0.8)', marginBottom: 8,
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
                          background: focused === 'email' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.05)',
                          border: focused === 'email' ? '1px solid rgba(59,130,246,0.50)' : '1px solid rgba(255,255,255,0.10)',
                          boxShadow: focused === 'email' ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                          color: '#f1f5f9', fontSize: 14, outline: 'none',
                          transition: 'all 200ms',
                        }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{
                        color: focused === 'email' ? 'rgba(96,165,250,0.7)' : 'rgba(100,116,139,0.5)',
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
                      color: 'rgba(148,163,184,0.8)', marginBottom: 8,
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
                          background: focused === 'password' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.05)',
                          border: focused === 'password' ? '1px solid rgba(59,130,246,0.50)' : '1px solid rgba(255,255,255,0.10)',
                          boxShadow: focused === 'password' ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
                          color: '#f1f5f9', fontSize: 14, outline: 'none',
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
                      ? 'rgba(59,130,246,0.35)'
                      : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 45%, #1D4ED8 100%)',
                    border: '1px solid rgba(96,165,250,0.30)',
                    boxShadow: busy ? 'none' : '0 8px 32px rgba(37,99,235,0.40), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.14)',
                    color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                    letterSpacing: '0.04em', cursor: busy ? 'not-allowed' : 'pointer',
                    transition: 'all 280ms cubic-bezier(0.16,1,0.3,1)',
                    overflow: 'hidden',
                  }}
                >
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
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
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
                      background: passkeyBusy ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)',
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
                <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', lineHeight: 1.6 }}>
                  Having trouble signing in?{' '}
                  <button
                    type="button"
                    style={{ color: 'rgba(96,165,250,0.80)', fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'color 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#60A5FA')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(96,165,250,0.80)')}
                  >
                    Contact Coach Abhishek
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
              color: 'rgba(100,116,139,0.7)', letterSpacing: '0.03em',
            }}
          >
            &copy; {new Date().getFullYear()} Coach Abhishek. All rights reserved.
          </m.p>
        </m.div>
      </div>
    </div>
  );
}

/* ── Coach Logo — dumbbell inside a circle ── */
function CoachLogo({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-grad" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="db-grad" x1="20" y1="44" x2="68" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="50%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
        <linearGradient id="shine" x1="10" y1="10" x2="50" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {/* Drop shadow */}
      <circle cx="44" cy="48" r="38" fill="rgba(37,99,235,0.35)" filter="url(#glow)" />
      {/* Background circle */}
      <circle cx="44" cy="44" r="40" fill="url(#bg-grad)" />
      {/* Shine overlay */}
      <ellipse cx="36" cy="28" rx="20" ry="14" fill="url(#shine)" />
      {/* Border ring */}
      <circle cx="44" cy="44" r="39" stroke="rgba(96,165,250,0.35)" strokeWidth="1" fill="none" />
      {/* ── Dumbbell icon ── */}
      {/* Left weight block outer */}
      <rect x="14" y="36" width="10" height="16" rx="2.5" fill="url(#db-grad)" />
      {/* Left weight block inner */}
      <rect x="16" y="39" width="6" height="10" rx="1.5" fill="rgba(30,58,138,0.5)" />
      {/* Left collar */}
      <rect x="23" y="39.5" width="5" height="9" rx="1.5" fill="#60A5FA" />
      {/* Right weight block outer */}
      <rect x="64" y="36" width="10" height="16" rx="2.5" fill="url(#db-grad)" />
      {/* Right weight block inner */}
      <rect x="66" y="39" width="6" height="10" rx="1.5" fill="rgba(30,58,138,0.5)" />
      {/* Right collar */}
      <rect x="60" y="39.5" width="5" height="9" rx="1.5" fill="#60A5FA" />
      {/* Bar */}
      <rect x="27" y="42" width="34" height="4" rx="2" fill="#93C5FD" />
      {/* Center grip highlight */}
      <rect x="39" y="42.5" width="10" height="3" rx="1.5" fill="rgba(255,255,255,0.25)" />
      {/* 'A' monogram below */}
      <text x="44" y="72" textAnchor="middle" fill="rgba(147,197,253,0.85)" fontSize="9" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="1">ABHISHEK</text>
    </svg>
  );
}
