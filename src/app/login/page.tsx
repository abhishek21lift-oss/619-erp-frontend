'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [show, setShow]         = useState(false);

  if (user) { router.replace('/dashboard'); return null; }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg: string = err.message || '';
      // Give the user a human-readable explanation for common errors
      if (msg.toLowerCase().includes('database') || msg.toLowerCase().includes('connection')) {
        setError('Cannot reach the database. Please try again in a moment.');
      } else if (msg.toLowerCase().includes('configuration') || msg.toLowerCase().includes('jwt')) {
        setError('Server configuration error. Please contact the administrator.');
      } else if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')) {
        setError('Cannot reach the server. Check your internet connection or try again later.');
      } else if (msg.toLowerCase().includes('too many')) {
        setError('Too many login attempts. Please wait 15 minutes and try again.');
      } else {
        setError(msg || 'Login failed. Please check your credentials and try again.');
      }
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Animated background orbs ── */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
      }}>
        {/* Top-left coral orb */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-8%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,138,61,0.30) 0%, transparent 65%)',
          animation: 'float 8s ease-in-out infinite',
        }} />
        {/* Top-right red orb */}
        <div style={{
          position: 'absolute', top: '-5%', right: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,71,87,0.22) 0%, transparent 65%)',
          animation: 'float 10s ease-in-out infinite 2s',
        }} />
        {/* Bottom-right lime orb */}
        <div style={{
          position: 'absolute', bottom: '-12%', right: '-5%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(132,204,22,0.18) 0%, transparent 65%)',
          animation: 'float 9s ease-in-out infinite 1s',
        }} />
        {/* Bottom-left teal orb */}
        <div style={{
          position: 'absolute', bottom: '-8%', left: '-8%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.14) 0%, transparent 65%)',
          animation: 'float 11s ease-in-out infinite 3s',
        }} />
      </div>

      {/* ── Main container ── */}
      <div style={{
        width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
      }} className="fade-up">

        {/* ── Logo section ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', marginBottom: '2.25rem',
        }}>
          {/* Logo with glow ring */}
          <div style={{
            position: 'relative',
            marginBottom: '1.5rem',
          }}>
            {/* Outer glow ring */}
            <div style={{
              position: 'absolute', inset: -12,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,71,87,0.20) 0%, transparent 70%)',
              animation: 'pulse-glow 2.5s ease-in-out infinite',
            }} />
            {/* Inner glow ring */}
            <div style={{
              position: 'absolute', inset: -4,
              borderRadius: '50%',
              border: '1px solid rgba(255,71,87,0.25)',
              animation: 'pulse-glow 2.5s ease-in-out infinite 0.5s',
            }} />
            <BrandLogo size={110} />
          </div>

          {/* Studio name */}
          <div style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, var(--text) 0%, var(--brand) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 6, textAlign: 'center',
          }}>
            619 Fitness Studio
          </div>

          {/* Tagline */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              height: 1, width: 40,
              background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.50))',
            }} />
            <span style={{
              fontSize: 11, color: 'var(--muted)',
              letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 700,
            }}>
              Member Portal
            </span>
            <div style={{
              height: 1, width: 40,
              background: 'linear-gradient(90deg, rgba(59,130,246,0.50), transparent)',
            }} />
          </div>
        </div>

        {/* ── Login card ── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: 24,
          padding: '2.25rem 2rem',
          boxShadow: '0 24px 60px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.05)',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Card top accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg, var(--brand), var(--accent), var(--lime))',
            pointerEvents: 'none',
          }} />

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Email field */}
            <div>
              <label style={{ marginBottom: 8 }}>Email Address</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@619fitness.com"
                required autoFocus
              />
            </div>

            {/* Password field */}
            <div>
              <label style={{ marginBottom: 8 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: 16, padding: 6,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                >
                  {show ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="pulse" style={{ fontSize: 18 }}>●</span>
                  Signing in…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Sign In
                  <span style={{ fontSize: 16 }}>→</span>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: '1.75rem',
          fontSize: 11, color: 'var(--muted2)', letterSpacing: '0.5px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ height: 1, width: 30, background: 'var(--glass-border)' }} />
          © {new Date().getFullYear()} 619 Fitness Studio. All rights reserved.
          <div style={{ height: 1, width: 30, background: 'var(--glass-border)' }} />
        </div>
      </div>
    </div>
  );
}
