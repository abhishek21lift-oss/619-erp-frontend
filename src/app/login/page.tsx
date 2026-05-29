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
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <div className="w-10 h-10 rounded-full border-[3px] border-[#3B82F6] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_4px_16px_rgba(59,130,246,0.30)] mb-4">
            <Dumbbell size={28} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-[#0B0B0F]">619 Fitness <span className="text-[#3B82F6] text-[11px] ml-1">v4.0</span></h1>
          <p className="text-[13px] text-[#4A4E57] mt-1">Premium Command Center</p>
        </div>

        {/* Card - Glass effect */}
        <div className="rounded-[24px] bg-white/75 backdrop-blur-[20px] p-7 border border-white/25 shadow-[0_8px_32px_rgba(11,11,15,0.06),0_1px_2px_rgba(11,11,15,0.03)]">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.12)] px-4 py-3 text-[13px] font-medium text-[#EF4444] mb-5">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-[#0B0B0F] mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="w-full h-12 px-4 rounded-xl border border-[rgba(11,11,15,0.06)] bg-[#F1F5F9] text-[15px] text-[#0B0B0F] outline-none transition-all duration-150 placeholder:text-[#9CA3AF]/70 focus:border-[#3B82F6]/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-[#0B0B0F]">Password</label>
                <Link href="/reset-password" className="text-[12px] font-medium text-[#3B82F6] hover:text-[#2563EB] transition-colors">
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
                  className="w-full h-12 px-4 pr-11 rounded-xl border border-[rgba(11,11,15,0.06)] bg-[#F1F5F9] text-[15px] text-[#0B0B0F] outline-none transition-all duration-150 placeholder:text-[#9CA3AF]/70 focus:border-[#3B82F6]/30 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4E57] hover:text-[#0B0B0F] transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white text-[15px] font-semibold transition-all duration-150 hover:from-[#2563EB] hover:to-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(59,130,246,0.30)] hover:shadow-[0_6px_24px_rgba(59,130,246,0.40)]"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#4A4E57]">
            Having trouble? Contact your gym administrator.
          </p>
        </div>

        <p className="text-center mt-6 text-[11px] text-[#9CA3AF]/60 tracking-[0.03em]">
          &copy; {new Date().getFullYear()} 619 Fitness. All rights reserved.
        </p>
      </div>
    </div>
  );
}
