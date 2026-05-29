'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Dumbbell, Sparkles, Shield, Zap, TrendingUp } from 'lucide-react';

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
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="619" className="h-14 w-14 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-pulse" />
          <div className="w-8 h-8 rounded-full border-[2px] border-[#3B82F6] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  const features = [
    { icon: Dumbbell, label: 'Member Management', desc: 'Full lifecycle CRM' },
    { icon: Zap, label: 'PT & Sessions', desc: 'Schedule & track' },
    { icon: TrendingUp, label: 'Analytics', desc: 'Real-time insights' },
    { icon: Shield, label: 'Secure Access', desc: 'Role-based control' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex overflow-hidden">
      {/* ── Left: Brand Panel ── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0B0F] via-[#0F1117] to-[#13151C]" />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[rgba(59,130,246,0.12)] to-transparent blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[rgba(6,182,212,0.08)] to-transparent blur-[100px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')]" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_8px_24px_rgba(59,130,246,0.25)] overflow-hidden">
              <img src="/logo.png" alt="619" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-white tracking-tight leading-none">619 FITNESS</h2>
              <p className="text-[11px] text-[#9CA3AF] tracking-[0.06em] font-semibold mt-0.5">STUDIO</p>
            </div>
          </div>

          <div className="max-w-[480px]">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-[38px] sm:text-[44px] font-extrabold text-white leading-[1.1] tracking-[-0.03em]"
            >
              Welcome to the{' '}
              <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent">
                Future
              </span>{' '}
              of Fitness
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[15px] text-[#6B7280] mt-4 leading-relaxed"
            >
              Premium gym management platform. Manage members, track progress, and grow your studio with powerful tools.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 grid grid-cols-2 gap-4"
            >
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4 backdrop-blur-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/20">
                      <Icon size={16} className="text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white">{f.label}</p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[12px] text-[#6B7280]">
            &copy; {new Date().getFullYear()} 619 Fitness Studio. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right: Login Panel ── */}
      <div className="flex-1 relative flex items-center justify-center p-6 lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0B0F] to-[#13151C] lg:from-[#0F1117] lg:to-[#0B0B0F]" />
        <div className="absolute top-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-[rgba(59,130,246,0.06)] to-transparent blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_8px_24px_rgba(59,130,246,0.25)] overflow-hidden mb-4">
              <img src="/logo.png" alt="619" className="h-11 w-11 object-contain" />
            </div>
            <h1 className="text-[22px] font-bold text-white">619 Fitness</h1>
            <p className="text-[13px] text-[#6B7280] mt-1">Premium Command Center</p>
          </div>

          {/* Form card */}
          <div className="relative rounded-[28px] bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-[40px] p-[1px] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="rounded-[27px] bg-[rgba(11,11,15,0.80)] backdrop-blur-[40px] p-8">
              {/* Desktop decorative header */}
              <div className="hidden lg:flex items-center gap-3 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_4px_12px_rgba(59,130,246,0.20)] overflow-hidden">
                  <img src="/logo.png" alt="619" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <p className="text-[14px] font-extrabold text-white tracking-tight">619 FITNESS</p>
                  <p className="text-[10px] text-[#6B7280] tracking-[0.05em] font-semibold">STUDIO · v4.0</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 rounded-xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-4 py-3 text-[13px] font-medium text-[#EF4444] mb-5"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(239,68,68,0.15)] text-[10px] font-bold">!</span>
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#9CA3AF] mb-2 tracking-[0.02em]">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@619fitness.com"
                    required
                    className="w-full h-12 px-4 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[14px] text-white outline-none transition-all duration-200 placeholder:text-[#4A4E57]/60 focus:border-[rgba(59,130,246,0.30)] focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[12px] font-semibold text-[#9CA3AF] tracking-[0.02em]">Password</label>
                    <button type="button" className="text-[11px] font-medium text-[#3B82F6] hover:text-[#60A5FA] transition-colors">
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
                      className="w-full h-12 px-4 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[14px] text-white outline-none transition-all duration-200 placeholder:text-[#4A4E57]/60 focus:border-[rgba(59,130,246,0.30)] focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)]"
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="relative w-full h-12 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white text-[14px] font-bold tracking-[0.01em] overflow-hidden transition-all duration-200 shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-[2px] border-white/30 border-t-white animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Sign in
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-[12px] text-[#6B7280]">
                  Having trouble?{' '}
                  <button type="button" className="font-medium text-[#3B82F6] hover:text-[#60A5FA] transition-colors">Contact support</button>
                </p>
              </div>
            </div>
          </div>

          {/* Login credentials hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <p className="text-[11px] text-[#4A4E57]">
              Demo: <span className="font-medium text-[#6B7280]">admin@619fitness.com</span>
            </p>
          </motion.div>

          <div className="lg:hidden text-center mt-6">
            <p className="text-[11px] text-[#4A4E57]">
              &copy; {new Date().getFullYear()} 619 Fitness. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
