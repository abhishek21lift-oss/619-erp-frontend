'use client';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  // Redirect already-authenticated users from a side effect
  // (avoid setState-during-render warning).
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/dashboard');
    } catch (err: any) {
      const msg: string = err?.message || '';
      const lower = msg.toLowerCase();
      if (lower.includes('database') || lower.includes('connection')) {
        setError('Cannot reach the database. Please try again in a moment.');
      } else if (lower.includes('configuration') || lower.includes('jwt')) {
        setError('Server configuration error. Please contact the administrator.');
      } else if (
        lower.includes('fetch') ||
        lower.includes('network') ||
        lower.includes('failed to fetch')
      ) {
        setError('Cannot reach the server. Check your connection and try again.');
      } else if (lower.includes('too many')) {
        setError('Too many login attempts. Please wait 15 minutes and try again.');
      } else {
        setError(msg || 'Login failed. Check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (user) return null;

  return (
    <div className="login-shell">
      {/* Soft accent halos for the light theme */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: 520,
            height: 520,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(225, 29, 72, 0.10) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            right: '-8%',
            width: 540,
            height: 540,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(124, 58, 237, 0.10) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      <div
        style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}
        className="fade-up"
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ position: 'relative', marginBottom: '1.1rem' }}>
            <div
              style={{
                position: 'absolute',
                inset: -14,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(225, 29, 72, 0.15) 0%, transparent 70%)',
                filter: 'blur(10px)',
              }}
            />
            {/* Larger, well-padded logo tile so the gym mark reads clearly */}
            <BrandLogo size={108} />
          </div>

          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            619 FITNESS STUDIO
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 10.5,
              color: 'var(--muted)',
              letterSpacing: '2.6px',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            <div
              style={{
                height: 1,
                width: 32,
                background:
                  'linear-gradient(90deg, transparent, var(--brand))',
              }}
            />
            <span>Premium Strength Studio</span>
            <div
              style={{
                height: 1,
                width: 32,
                background:
                  'linear-gradient(90deg, var(--brand), transparent)',
              }}
            />
          </div>
        </div>

        {/* Login card */}
        <div className="login-card">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.1rem' }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div>
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@619fitness.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    transition: 'color 0.15s',
                  }}
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pulse" style={{ fontSize: 14 }}>●</span>
                  Signing in
                </span>
              ) : (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    letterSpacing: '0.4px',
                  }}
                >
                  Sign In
                  <span style={{ fontSize: 16 }}>→</span>
                </span>
              )}
            </button>
          </form>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: 10.5,
            color: 'var(--muted-2)',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <div style={{ height: 1, width: 28, background: 'var(--line-2)' }} />
          © {new Date().getFullYear()} 619 FITNESS STUDIO · ALL RIGHTS RESERVED
          <div style={{ height: 1, width: 28, background: 'var(--line-2)' }} />
        </div>
      </div>
    </div>
  );
}
