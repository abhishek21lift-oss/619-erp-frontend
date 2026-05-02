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
      {/* Drifting aurora orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: 560,
            height: 560,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 45, 85, 0.32) 0%, transparent 65%)',
            animation: 'float 9s ease-in-out infinite',
            filter: 'blur(20px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-5%',
            right: '-12%',
            width: 620,
            height: 620,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(124, 58, 237, 0.32) 0%, transparent 65%)',
            animation: 'float 11s ease-in-out infinite 2s',
            filter: 'blur(20px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-18%',
            right: '-8%',
            width: 520,
            height: 520,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(34, 211, 238, 0.22) 0%, transparent 65%)',
            animation: 'float 10s ease-in-out infinite 1s',
            filter: 'blur(20px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-14%',
            left: '-6%',
            width: 460,
            height: 460,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(236, 72, 153, 0.20) 0%, transparent 65%)',
            animation: 'float 13s ease-in-out infinite 3s',
            filter: 'blur(20px)',
          }}
        />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }} className="fade-up">
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '2rem',
          }}
        >
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <div
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)',
                animation: 'pulse-glow 2.5s ease-in-out infinite',
                filter: 'blur(8px)',
              }}
            />
            <BrandLogo size={92} />
          </div>

          <div
            className="display"
            style={{
              fontSize: 30,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            619 Fitness Studio
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
                background: 'linear-gradient(90deg, transparent, var(--brand-hi))',
              }}
            />
            <span>Aurora Operating System</span>
            <div
              style={{
                height: 1,
                width: 32,
                background: 'linear-gradient(90deg, var(--brand-hi), transparent)',
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.4px' }}>
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
