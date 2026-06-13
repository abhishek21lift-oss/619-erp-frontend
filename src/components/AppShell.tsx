'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Search, LogOut, Bell, Settings, Building2, ShieldCheck, Fingerprint, Receipt, Palette, Zap, DatabaseBackup, User, HelpCircle, ChevronDown, Menu } from 'lucide-react';
import { LazyMotion, domAnimation, AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import Sidebar from '@/components/sidebar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  headerLeft?: React.ReactNode;
}

export default function AppShell({ children, title, headerLeft }: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ label: string; href: string }[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const settingsLinks = [
    { href: '/settings/studio', label: 'Studio Settings', icon: Building2 },
    { href: '/settings/profile', label: 'My Profile', icon: User },
    { href: '/settings/branches', label: 'Branches', icon: Building2 },
    { href: '/settings/staff', label: 'Staff & Access', icon: ShieldCheck },
    { href: '/settings/biometric', label: 'Biometric & Face', icon: Fingerprint },
    { href: '/settings/billing', label: 'GST / Invoice', icon: Receipt },
    { href: '/settings/branding', label: 'Branding', icon: Palette },
    { href: '/settings/integrations', label: 'Integrations', icon: Zap },
    { href: '/settings/import-database', label: 'Import Database', icon: DatabaseBackup },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const globalPages = [
    { label: 'PT OS', href: '/pt-os', keywords: 'personal training pt dashboard' },
    { label: 'Attendance', href: '/attendance', keywords: 'attendance check-in sign-in' },
    { label: 'Session Booking', href: '/pt-os/schedule-session', keywords: 'session booking schedule appointments' },
    { label: 'Progress Tracking', href: '/pt-os/weekly-checkin', keywords: 'progress tracking measurements goals' },
    { label: 'Finance', href: '/finance/collected-payments', keywords: 'finance payments billing invoices' },
    { label: 'Collected Payments', href: '/finance/collected-payments', keywords: 'payments transactions collected' },
    { label: 'Walk-in', href: '/checkin', keywords: 'walk-in walkin drop-in' },
    { label: 'Check-in', href: '/checkin', keywords: 'checkin check-in daily visit' },
    { label: 'Staff', href: '/staff', keywords: 'staff employees trainers' },
    { label: 'Trainers', href: '/trainers', keywords: 'trainers coaches instructors' },
    { label: 'Goals', href: '/pt-os/goals', keywords: 'goals objectives targets' },
    { label: 'Assessment', href: '/pt-os/assessment', keywords: 'assessment evaluation fitness test' },
    { label: 'Session Balance', href: '/pt-os/session-balance', keywords: 'session balance remaining credits' },
    { label: 'Weekly Check-in', href: '/pt-os/weekly-checkin', keywords: 'weekly check-in checkin progress' },
    { label: 'Measurements', href: '/pt-os/measurements', keywords: 'measurements body stats metrics' },
    { label: 'Strength Tracking', href: '/pt-os/strength-tracking', keywords: 'strength tracking lifts weights' },
    { label: 'Progress Photos', href: '/pt-os/progress-photos', keywords: 'progress photos pictures transformation' },
    { label: 'Commissions', href: '/pt-os/commissions', keywords: 'commissions incentives bonuses' },
    { label: 'Automation', href: '/engagement/automation', keywords: 'automation workflows triggers' },
    { label: 'Attendance Reports', href: '/attendance/reports', keywords: 'attendance reports analytics' },
    { label: 'Communication', href: '/engagement/notifications', keywords: 'communication messaging notifications' },
    { label: 'Reports', href: '/reports', keywords: 'reports analytics insights' },
    { label: 'Notifications', href: '/engagement/notifications', keywords: 'notifications alerts updates' },
    { label: 'Settings', href: '/settings', keywords: 'settings configuration preferences' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [pathname]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results = globalPages.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.keywords.toLowerCase().includes(q) ||
        p.href.toLowerCase().includes(q)
    );
    setSearchResults(results);
    setSearchOpen(results.length > 0);
  };

  const navigateTo = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    router.push(href);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex min-h-screen bg-[var(--bg-canvas)]">
        {/* Sidebar — desktop */}
        <Sidebar collapsed={sidebarCollapsed} onExpand={() => setSidebarCollapsed(false)} onCollapse={() => setSidebarCollapsed(true)} />

        {/* Sidebar — mobile drawer */}
        <Sidebar variant="mobile" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Mobile backdrop */}
        <div onClick={() => setMobileMenuOpen(false)}
          className={cn(
            'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
            mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
        />

        {/* Right column */}
        <div className={cn('flex flex-1 flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64 xl:pl-72')}>
          {/* Top header bar — Premium Glassmorphic */}
          <header className="sticky top-0 z-40 border-b border-white/[0.06] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15,12,41,0.85) 0%, rgba(26,20,64,0.85) 40%, rgba(30,27,75,0.85) 70%, rgba(30,64,175,0.85) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            {/* Ambient gradient orbs */}
            <motion.div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }}
              animate={{ x: [0, 15, -10, 0], y: [0, -10, 5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="pointer-events-none absolute -right-8 -bottom-8 h-24 w-24 rounded-full opacity-15"
              style={{ background: 'radial-gradient(circle, #38bdf8, transparent 70%)' }}
              animate={{ x: [0, -10, 5, 0], y: [0, 8, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />

            <div className="relative flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-6">
              {/* Mobile menu toggle */}
              <button type="button" aria-label="Open navigation menu" onClick={() => setMobileMenuOpen(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white lg:hidden">
                <Menu size={17} strokeWidth={1.5} />
              </button>

              {/* Search */}
              <div ref={searchRef} className="relative flex-1 max-w-[300px] lg:max-w-[360px]">
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-cyan-500/20 p-[1px] opacity-60 transition-opacity duration-300 group-focus-within:opacity-100">
                    <div className="h-full w-full rounded-xl" style={{ background: 'rgba(15,12,41,0.6)' }} />
                  </div>
                  <div className="relative flex items-center">
                    <Search size={13} strokeWidth={2}
                      className="absolute left-3 z-10 text-white/35 transition-all duration-200 group-focus-within:text-purple-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => { if (searchQuery.trim()) setSearchOpen(searchResults.length > 0); }}
                      placeholder="Search pages, members, payments..."
                      className="relative w-full rounded-xl border border-white/[0.07] bg-white/[0.04] py-[7px] pl-9 pr-3 text-[12px] text-white/90 outline-none transition-all duration-200 placeholder-white/25 focus:border-purple-500/30 focus:bg-white/[0.08] focus:shadow-[0_0_0_1.5px_rgba(167,139,250,0.2),0_4px_16px_rgba(167,139,250,0.1)]"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {searchOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
                      style={{ background: 'rgba(15,12,41,0.92)', backdropFilter: 'blur(24px) saturate(180%)' }}
                    >
                      <div className="max-h-[280px] overflow-y-auto py-1.5">
                        {searchResults.length === 0 ? (
                          <div className="px-4 py-5 text-center text-[12px] text-white/30">
                            No results found
                          </div>
                        ) : (
                          searchResults.map((r) => (
                            <button
                              key={r.href}
                              onClick={() => navigateTo(r.href)}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12px] text-white/70 transition-all duration-150 hover:bg-white/[0.06] hover:text-white"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-[9px] font-bold text-white shadow-[0_2px_8px_rgba(167,139,250,0.25)]">
                                {r.label.charAt(0)}
                              </span>
                              <span className="font-medium">{r.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Spacer */}
              <div className="hidden lg:block flex-1" />

              {/* Settings dropdown */}
              <div ref={settingsRef} className="relative">
                <motion.button
                  type="button"
                  aria-label="Settings"
                  onClick={() => setSettingsOpen(s => !s)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 overflow-hidden border border-white/[0.06]"
                  style={{
                    background: settingsOpen
                      ? 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(99,102,241,0.15))'
                      : 'rgba(255,255,255,0.05)',
                    boxShadow: settingsOpen
                      ? '0 4px 16px rgba(167,139,250,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <motion.div
                    animate={settingsOpen ? { rotate: 90 } : { rotate: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={settingsOpen ? 'text-purple-300' : 'text-white/50'}
                  >
                    <Settings size={15} strokeWidth={settingsOpen ? 2 : 1.5} className="relative z-10" />
                  </motion.div>
                </motion.button>
                <AnimatePresence>
                  {settingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
                      style={{ background: 'rgba(15,12,41,0.92)', backdropFilter: 'blur(24px) saturate(180%)' }}
                    >
                      <div className="px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">Settings</div>
                      <div className="pb-2">
                        {settingsLinks.map((link) => {
                          const Icon = link.icon;
                          const active = pathname === link.href;
                          return (
                            <Link key={link.href} href={link.href} onClick={() => setSettingsOpen(false)}
                              className={cn('flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-all',
                                active ? 'bg-purple-500/10 text-purple-300' : 'text-white/50 hover:bg-white/[0.05] hover:text-white')}>
                              <Icon size={13} strokeWidth={1.5} />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notification bell */}
              <motion.button type="button" aria-label="Notifications"
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <Bell size={15} strokeWidth={1.5} className="text-white/50" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
              </motion.button>

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button onClick={() => setProfileOpen(s => !s)}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.06] pl-2 pr-2.5 py-1.5 transition-all duration-200 hover:bg-white/[0.04]"
                  style={{ background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden shadow-[0_2px_8px_rgba(167,139,250,0.3)]"
                    style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                    <Image src="/logo.png" alt="619" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[11px] font-semibold leading-tight text-white/90">619 FITNESS STUDIO</p>
                    <p className="text-[9px] leading-tight text-white/40 capitalize">{user?.role || '—'}</p>
                  </div>
                  <ChevronDown size={11} strokeWidth={2} className="text-white/30 shrink-0" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
                      style={{ background: 'rgba(15,12,41,0.92)', backdropFilter: 'blur(24px) saturate(180%)' }}
                    >
                      <div className="px-3.5 py-2.5 border-b border-white/[0.06]">
                        <p className="text-[12px] font-semibold text-white/90">{user?.name || 'Admin'}</p>
                        <p className="text-[10px] text-white/40 capitalize">{user?.email || '—'}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/settings" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-white/50 hover:bg-white/[0.05] hover:text-white transition-all">
                          <Settings size={13} strokeWidth={1.5} /> Account Settings
                        </Link>
                        <Link href="/help" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-white/50 hover:bg-white/[0.05] hover:text-white transition-all">
                          <HelpCircle size={13} strokeWidth={1.5} /> Help & Support
                        </Link>
                        <hr className="my-1 border-white/[0.06]" />
                        <button onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-rose-400 hover:bg-rose-500/10 transition-all">
                          <LogOut size={13} strokeWidth={1.5} /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {headerLeft && (
            <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 pt-4">
              {headerLeft}
            </div>
          )}

          <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
            {title && (
              <h1 className="mb-6 text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                {title}
              </h1>
            )}
            {children}
          </main>
        </div>
      </div>
    </LazyMotion>
  );
}
