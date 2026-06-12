'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Search, LogOut, Bell, Settings, Building2, ShieldCheck, Fingerprint, Receipt, Palette, Zap, DatabaseBackup, User, HelpCircle, ChevronDown } from 'lucide-react';
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

  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const settingsLinks = [
    { href: '/settings', label: 'General', icon: Settings },
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
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} onExpand={() => setSidebarCollapsed(false)} onCollapse={() => setSidebarCollapsed(true)} />

        {/* Right column */}
        <div className={cn('flex flex-1 flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64 xl:pl-72')}>
          {/* Top header bar */}
          <header className="sticky top-0 z-30 border-b border-transparent"
            style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1440 40%, #1e1b4b 70%, #1e40af 100%)' }}
          >
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
              {/* Search */}
              <div ref={searchRef} className="relative flex-1 max-w-[360px] lg:max-w-[400px]">
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 via-violet-500 to-cyan-400 p-[1.5px] opacity-50 transition-opacity duration-300 group-focus-within:opacity-100">
                    <div className="h-full w-full rounded-2xl" style={{ background: 'rgba(15,12,41,0.7)' }} />
                  </div>
                  <div className="relative flex items-center">
                    <Search size={14} strokeWidth={2}
                      className="absolute left-3 z-10 text-white/40 transition-colors duration-200 group-focus-within:text-purple-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => { if (searchQuery.trim()) setSearchOpen(searchResults.length > 0); }}
                      placeholder="Search pages, members, payments..."
                      className="relative w-full rounded-2xl border border-white/10 bg-white/5 py-[7px] pl-9 pr-3 text-[12px] text-white outline-none transition-all duration-200 placeholder-white/30 focus:border-transparent focus:bg-white/10 focus:shadow-[0_0_0_1.5px_#a78bfa,0_8px_24px_rgba(167,139,250,0.2)]"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {searchOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                    >
                      <div className="max-h-[300px] overflow-y-auto py-2">
                        {searchResults.length === 0 ? (
                          <div className="px-4 py-6 text-center text-[13px] text-[var(--text-disabled)]">
                            No results found
                          </div>
                        ) : (
                          searchResults.map((r) => (
                            <button
                              key={r.href}
                              onClick={() => navigateTo(r.href)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--brand-soft)] hover:pl-5"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand-lo)] to-[var(--brand)] text-[10px] font-bold text-white shadow-[0_2px_6px_var(--brand-glow)]">
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
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    background: settingsOpen ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
                    boxShadow: settingsOpen ? '0 4px 12px rgba(167,139,250,0.3)' : undefined,
                  }}
                >
                  <motion.div
                    animate={settingsOpen ? { rotate: 90 } : { rotate: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className={settingsOpen ? 'text-purple-300' : 'text-white/60'}
                  >
                    <Settings size={16} strokeWidth={settingsOpen ? 2 : 1.5} className="relative z-10" />
                  </motion.div>
                </motion.button>
                <AnimatePresence>
                  {settingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_12px_40px_var(--brand-glow)]"
                    >
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-disabled)]">Settings</div>
                      <div className="pb-2">
                        {settingsLinks.map((link) => {
                          const Icon = link.icon;
                          const active = pathname === link.href;
                          return (
                            <Link key={link.href} href={link.href} onClick={() => setSettingsOpen(false)}
                              className={cn('flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-colors',
                                active ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]')}>
                              <Icon size={14} strokeWidth={1.5} />
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
              <button type="button" aria-label="Notifications"
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                <Bell size={17} strokeWidth={1.5} />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
              </button>

              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button onClick={() => setProfileOpen(s => !s)}
                  className="flex items-center gap-2 border-l border-white/10 pl-3 transition-colors hover:opacity-80">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg shadow-[0_2px_6px_rgba(167,139,250,0.4)] overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                    <Image src="/logo.png" alt="619" width={20} height={20} className="h-5 w-5 object-contain" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[12px] font-semibold leading-tight text-white">619 FITNESS STUDIO</p>
                    <p className="text-[10px] leading-tight text-white/50 capitalize">{user?.role || '—'}</p>
                  </div>
                  <ChevronDown size={12} strokeWidth={1.5} className="text-white/40 shrink-0" />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_12px_40px_var(--brand-glow)]"
                    >
                      <div className="px-3 py-2.5 border-b border-[var(--border)]">
                        <p className="text-[12px] font-semibold text-[var(--text-primary)]">{user?.name || 'Admin'}</p>
                        <p className="text-[10px] text-[var(--text-muted)] capitalize">{user?.email || '—'}</p>
                      </div>
                      <div className="py-1">
                        <Link href="/settings" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                          <Settings size={14} strokeWidth={1.5} /> Account Settings
                        </Link>
                        <Link href="/help" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                          <HelpCircle size={14} strokeWidth={1.5} /> Help & Support
                        </Link>
                        <hr className="my-1 border-[var(--border)]" />
                        <button onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--danger)] hover:bg-[var(--danger)]/5 transition-colors">
                          <LogOut size={14} strokeWidth={1.5} /> Logout
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
