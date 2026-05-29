'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Search, LogOut, Bell, Settings, Building2, ShieldCheck, Fingerprint, Receipt, Palette, Zap, DatabaseBackup, User, HelpCircle, ChevronDown } from 'lucide-react';
import { LazyMotion, domAnimation, AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import Sidebar from './sidebar/Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ label: string; href: string }[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    { label: 'Dashboard', href: '/dashboard', keywords: 'dashboard home overview analytics' },
    { label: 'Leads', href: '/leads', keywords: 'leads prospects inquiries' },
    { label: 'Members', href: '/members', keywords: 'members clients customers' },
    { label: 'Attendance', href: '/attendance', keywords: 'attendance check-in sign-in' },
    { label: 'Session Booking', href: '/session-booking', keywords: 'session booking schedule appointments' },
    { label: 'Progress Tracking', href: '/progress-tracking', keywords: 'progress tracking measurements goals' },
    { label: 'Finance', href: '/finance', keywords: 'finance payments billing invoices' },
    { label: 'Payments', href: '/payments', keywords: 'payments transactions revenue' },
    { label: 'Plans', href: '/plans', keywords: 'plans packages memberships' },
    { label: 'Membership', href: '/membership', keywords: 'membership subscriptions renewals' },
    { label: 'Renewal', href: '/renewal', keywords: 'renewal expiry' },
    { label: 'Enquiry', href: '/enquiry', keywords: 'enquiry inquiries questions' },
    { label: 'Walk-in', href: '/walkin', keywords: 'walk-in walkin drop-in' },
    { label: 'Enrollment', href: '/enrollment', keywords: 'enrollment registration joining' },
    { label: 'Check-in', href: '/checkin', keywords: 'checkin check-in daily visit' },
    { label: 'Staff', href: '/staff', keywords: 'staff employees trainers' },
    { label: 'Trainers', href: '/trainers', keywords: 'trainers coaches instructors' },
    { label: 'Goals', href: '/goals', keywords: 'goals objectives targets' },
    { label: 'Assessment', href: '/assessment', keywords: 'assessment evaluation fitness test' },
    { label: 'Packages', href: '/packages', keywords: 'packages offerings plans' },
    { label: 'Session Balance', href: '/session-balance', keywords: 'session balance remaining credits' },
    { label: 'Weekly Check-in', href: '/weekly-checkin', keywords: 'weekly check-in checkin progress' },
    { label: 'Measurements', href: '/measurements', keywords: 'measurements body stats metrics' },
    { label: 'Strength Tracking', href: '/strength-tracking', keywords: 'strength tracking lifts weights' },
    { label: 'Progress Photos', href: '/progress-photos', keywords: 'progress photos pictures transformation' },
    { label: 'Commissions', href: '/commissions', keywords: 'commissions incentives bonuses' },
    { label: 'Trial Sessions', href: '/trial-sessions', keywords: 'trial sessions free demo' },
    { label: 'Automation', href: '/automation', keywords: 'automation workflows triggers' },
    { label: 'Attendance Reports', href: '/attendance-reports', keywords: 'attendance reports analytics' },
    { label: 'Communication', href: '/communication', keywords: 'communication messaging notifications' },
    { label: 'Reports', href: '/reports', keywords: 'reports analytics insights' },
    { label: 'Notifications', href: '/notifications', keywords: 'notifications alerts updates' },
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
      <div className="flex min-h-screen bg-[#F8FAFC]">
        {/* Desktop sidebar — always visible on lg+ */}
        <div className="hidden lg:block">
          <Sidebar variant="desktop" />
        </div>

        {/* Mobile sidebar — overlay */}
        <Sidebar
          variant="mobile"
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex flex-1 flex-col lg:pl-64 xl:pl-72">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[rgba(0,0,0,0.04)] bg-white/80 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              type="button"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#86868b] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f] lg:hidden"
            >
              <Menu size={18} />
            </button>

            {/* Premium colorful search bar */}
            <div ref={searchRef} className="relative flex-1 max-w-[520px]">
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] p-[1px]">
                  <div className="h-full w-full rounded-xl bg-white" />
                </div>
                <div className="flex items-center">
                  <Search
                    size={16}
                    className="absolute left-3.5 z-10 text-[#4A4E57] hidden sm:block"
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim()) setSearchOpen(searchResults.length > 0);
                    }}
                    placeholder="Search..."
                    className="relative w-full rounded-xl border-0 bg-[#F1F5F9] py-2.5 sm:pl-10 pl-3 pr-4 text-[13px] text-[#0B0B0F] outline-none transition-all duration-200 focus:bg-white focus:shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_4px_16px_rgba(59,130,246,0.12)] placeholder-[#94A3B8]"
                  />
                </div>
              </div>

              {/* Search dropdown */}
              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
                  >
                    <div className="max-h-[280px] overflow-y-auto py-1.5">
                      {searchResults.map((r) => (
                        <button
                          key={r.href}
                          onClick={() => navigateTo(r.href)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] text-[#0B0B0F] transition-colors hover:bg-[rgba(59,130,246,0.06)]"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#3B82F6]/10 to-[#8B5CF6]/10 text-[10px] font-medium text-[#4A4E57]">
                            {r.label.charAt(0)}
                          </span>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

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
                  background: settingsOpen
                    ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                    : undefined,
                  boxShadow: settingsOpen
                    ? '0 4px 12px rgba(59,130,246,0.30)'
                    : undefined,
                }}
              >
                {/* Default state gradient border */}
                {!settingsOpen && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3B82F6]/20 via-[#8B5CF6]/15 to-[#06B6D4]/20 p-[1.5px]">
                    <div className="h-full w-full rounded-[10.5px] bg-white" />
                  </div>
                )}
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-[#3B82F6]/10 via-[#8B5CF6]/8 to-[#06B6D4]/10" />
                {/* Active glow ring */}
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#3B82F6]/20 via-[#8B5CF6]/15 to-[#06B6D4]/20 animate-pulse"
                  />
                )}
                <motion.div
                  animate={settingsOpen ? { rotate: 90 } : { rotate: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={settingsOpen ? 'text-white' : 'text-[#86868b]'}
                >
                  <Settings
                    size={16}
                    strokeWidth={settingsOpen ? 2 : 1.5}
                    className="relative z-10"
                  />
                </motion.div>
              </motion.button>
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                  >
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
                      Settings
                    </div>
                    <div className="pb-2">
                      {settingsLinks.map((link) => {
                        const Icon = link.icon;
                        const active = pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setSettingsOpen(false)}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-colors',
                              active
                                ? 'bg-[rgba(59,130,246,0.08)] text-[#3B82F6]'
                                : 'text-[#4A4E57] hover:bg-[rgba(59,130,246,0.04)] hover:text-[#0B0B0F]',
                            )}
                          >
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
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#86868b] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f]"
            >
              <Bell size={17} strokeWidth={1.5} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
            </button>

            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(s => !s)}
                className="flex items-center gap-2 border-l border-[rgba(0,0,0,0.06)] pl-3 transition-colors hover:opacity-80"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2563EB] shadow-[0_2px_6px_rgba(59,130,246,0.25)] overflow-hidden">
                  <img src="/logo.png" alt="619" className="h-5 w-5 object-contain" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[12px] font-semibold leading-tight text-[#0B0B0F]">619 FITNESS STUDIO</p>
                  <p className="text-[10px] leading-tight text-[#4A4E57] capitalize">{user?.role || '—'}</p>
                </div>
                <ChevronDown size={12} strokeWidth={1.5} className="text-[#9CA3AF] shrink-0" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                  >
                    <div className="px-3 py-2.5 border-b border-[rgba(0,0,0,0.04)]">
                      <p className="text-[12px] font-semibold text-[#0B0B0F]">{user?.name || 'Admin'}</p>
                      <p className="text-[10px] text-[#4A4E57] capitalize">{user?.email || '—'}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/settings/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[#4A4E57] hover:bg-[rgba(59,130,246,0.04)] hover:text-[#0B0B0F] transition-colors">
                        <User size={14} strokeWidth={1.5} /> My Profile
                      </Link>
                      <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[#4A4E57] hover:bg-[rgba(59,130,246,0.04)] hover:text-[#0B0B0F] transition-colors">
                        <Settings size={14} strokeWidth={1.5} /> Account Settings
                      </Link>
                      <Link href="/settings/staff" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[#4A4E57] hover:bg-[rgba(59,130,246,0.04)] hover:text-[#0B0B0F] transition-colors">
                        <ShieldCheck size={14} strokeWidth={1.5} /> Manage Users
                      </Link>
                      <Link href="/help" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[#4A4E57] hover:bg-[rgba(59,130,246,0.04)] hover:text-[#0B0B0F] transition-colors">
                        <HelpCircle size={14} strokeWidth={1.5} /> Help & Support
                      </Link>
                      <hr className="my-1 border-[rgba(0,0,0,0.04)]" />
                      <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[#EF4444] hover:bg-[rgba(239,68,68,0.04)] transition-colors">
                        <LogOut size={14} strokeWidth={1.5} /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>

          <main
            id="main-content"
            className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-8"
          >
            {title && (
              <h1 className="mb-6 text-[22px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
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
