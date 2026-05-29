'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Dumbbell } from 'lucide-react';

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
      <div className="flex items-center justify-center h-screen bg-[#F5F5F7]">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#dc2626] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1d1d1f] shadow-lg mb-4">
            <Dumbbell size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#1d1d1f]">619 Fitness <span style={{color:'#dc2626',fontSize:11}}>v4.0</span></h1>
          <p className="text-[13px] text-[#86868b] mt-1">Studio Management Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.12)] px-4 py-3 text-[13px] font-medium text-[#dc2626] mb-5">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-[#1d1d1f] mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="w-full h-12 px-4 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#f5f5f7] text-[15px] text-[#1d1d1f] outline-none transition-all duration-150 placeholder:text-[#86868b]/50 focus:border-[#dc2626]/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(220,38,38,0.06)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-[#1d1d1f]">Password</label>
                <Link href="/reset-password" className="text-[12px] font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  required
                  className="w-full h-12 px-4 pr-11 rounded-xl border border-[rgba(0,0,0,0.04)] bg-[#f5f5f7] text-[15px] text-[#1d1d1f] outline-none transition-all duration-150 placeholder:text-[#86868b]/50 focus:border-[#dc2626]/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(220,38,38,0.06)]"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-[#dc2626] text-white text-[15px] font-semibold transition-all duration-150 hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(220,38,38,0.25)]"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#86868b]">
            Having trouble? Contact your gym administrator.
          </p>
        </div>

        <p className="text-center mt-6 text-[11px] text-[#86868b]/60 tracking-[0.03em]">
          &copy; {new Date().getFullYear()} 619 Fitness. All rights reserved.
        </p>
      </div>
    </div>
  );
}
