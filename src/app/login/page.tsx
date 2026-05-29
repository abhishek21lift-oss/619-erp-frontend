'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

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
      <div className="flex items-center justify-center h-screen bg-[#0B0B0F]">
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#F59E0B] via-[#EF4444] to-[#DC2626] shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden"
          >
            <img src="/logo.png" alt="619" className="h-14 w-14 object-contain" />
          </motion.div>
          <div className="w-8 h-8 rounded-full border-[2px] border-[#F59E0B] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex overflow-hidden relative">
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-[rgba(245,158,11,0.10)] via-[rgba(239,68,68,0.06)] to-transparent blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[rgba(239,68,68,0.08)] via-[rgba(59,130,246,0.04)] to-transparent blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[rgba(245,158,11,0.05)] to-transparent blur-[100px]" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-30%] left-[30%] w-[80%] h-[80%] rounded-full border border-[rgba(245,158,11,0.04)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-[-20%] right-[20%] w-[60%] h-[60%] rounded-full border border-[rgba(239,68,68,0.03)]"
        />
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 flex w-full items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px]"
        >
          {/* ── Logo Hero ── */}
          <div className="flex flex-col items-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-6"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#F59E0B] via-[#EF4444] to-[#DC2626] shadow-[0_8px_40px_rgba(245,158,11,0.25)] overflow-hidden">
                <img src="/logo.png" alt="619 Fitness" className="h-16 w-16 object-contain" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-4 rounded-[30px] bg-gradient-to-br from-[#F59E0B]/20 via-[#EF4444]/10 to-transparent blur-[20px] -z-10"
              />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[28px] font-extrabold text-white tracking-tight"
            >
              619 FITNESS{' '}
              <span className="bg-gradient-to-r from-[#F59E0B] via-[#EF4444] to-[#DC2626] bg-clip-text text-transparent">
                STUDIO
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-[13px] text-[#6B7280] mt-1.5 font-medium tracking-[0.02em]"
            >
              Premium Fitness Management Platform
            </motion.p>
          </div>

          {/* ── Form Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="relative rounded-[24px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-[40px] p-[1px] shadow-[0_24px_80px_rgba(0,0,0,0.40)]"
          >
            <div className="rounded-[23px] bg-[rgba(11,11,15,0.85)] backdrop-blur-[40px] p-7 sm:p-8">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2.5 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-4 py-3 text-[13px] font-medium text-[#EF4444] mb-5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(239,68,68,0.15)] text-[9px] font-bold">!</span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B7280] mb-1.5 uppercase tracking-[0.06em]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@619fitness.com"
                    required
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[14px] text-white outline-none transition-all duration-200 placeholder:text-[#4A4E57]/50 focus:border-[rgba(245,158,11,0.30)] focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.06)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-[0.06em]">Password</label>
                    <button type="button" className="text-[11px] font-medium text-[#F59E0B] hover:text-[#FBBF24] transition-colors">
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••••"
                      required
                      className="w-full h-11 px-4 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[14px] text-white outline-none transition-all duration-200 placeholder:text-[#4A4E57]/50 focus:border-[rgba(245,158,11,0.30)] focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.06)]"
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full h-11 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#EF4444] to-[#DC2626] text-white text-[14px] font-bold tracking-[0.01em] overflow-hidden transition-all duration-200 shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-[2px] border-white/30 border-t-white animate-spin" />
                        Signing in&hellip;
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Sign In
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-[11px] text-[#6B7280]">
                  Having trouble?{' '}
                  <button type="button" className="font-semibold text-[#F59E0B] hover:text-[#FBBF24] transition-colors">Contact support</button>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <p className="text-[11px] text-[#4A4E57]">
              Demo: <span className="font-medium text-[#6B7280]">admin@619fitness.com</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 text-center"
          >
            <p className="text-[10px] text-[#4A4E57] tracking-[0.03em]">
              &copy; {new Date().getFullYear()} 619 Fitness Studio. All rights reserved.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
