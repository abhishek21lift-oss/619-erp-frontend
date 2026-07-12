'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Search, LogOut, Bell, Settings, Building2, ShieldCheck, Fingerprint,
  Receipt, Palette, Zap, DatabaseBackup, User, HelpCircle, ChevronDown,
  Menu, X, CheckCheck, ExternalLink, ChevronRight, KeyRound, Sun, Moon,
} from 'lucide-react';
import { LazyMotion, domAnimation, AnimatePresence, m } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import Sidebar from '@/components/sidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import FAB from '@/components/FAB';
import { api } from '@/lib/api';
import { allNavItems } from '@/lib/nav-config';
import { NavScrollProvider, useNavScroll } from '@/contexts/nav-scroll-context';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  headerLeft?: React.ReactNode;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read_at: string | null;
  created_at: string;
}

const NAV_KEYWORDS: Record<string, string> = {
  '/checkin':                    'walk-in walkin drop-in checkin daily visit attendance',
  '/checkin/kiosk':              'kiosk self service qr face biometric',
'/ai-coach':                   'ai coach chatbot gpt workout nutrition fitness assistant 619',
  '/ai/workout-generator':       'ai workout plan generator create programme training',
  '/ai/diet-generator':          'ai diet nutrition plan generator meal food macros calories',
  '/ai/progress-analysis':       'ai progress analysis analyzer client report insights',
  '/ai/business-insights':       'ai business insights report revenue kpi analytics',
  '/pt-os/weekly-checkin':       'progress tracking weekly check-in measurements goals',
  '/pt-os/schedule-session':     'session booking schedule appointments',
  '/pt-os/session-balance':      'session balance remaining credits',
  '/pt-os/measurements':         'measurements body stats metrics weight',
  '/pt-os/strength-tracking':    'strength tracking lifts weights lifting',
  '/pt-os/progress-photos':      'progress photos pictures transformation',
  '/pt-os/commissions':          'commissions incentives bonuses trainer earnings',
  '/engagement/automation':      'automation workflows triggers rules',
  '/finance/collected-payments': 'payments transactions collected',
  '/engagement/notifications':   'communication messaging notifications alerts',
  '/trainers':                   'trainers coaches instructors profiles staff',
  '/settings':                   'settings configuration preferences',
  '/reports':                    'reports analytics insights',
  '/attendance':                 'attendance check-in sign-in records',
};

const EXTRA_SEARCH_PAGES = [
  { label: 'QR Scanner',          href: '/checkin/qr-scanner', keywords: 'qr scanner checkin scan code attendance',               category: 'feature' },
  { label: 'Attendance Dashboard', href: '/checkin/dashboard',  keywords: 'attendance dashboard live stats today visitors inside',  category: 'report'  },
];

function navSearchCategory(groupId: string): string {
  if (groupId === 'settings') return 'nav';
  if (groupId === 'insights' || groupId === 'reports') return 'report';
  if (groupId === 'attendance') return 'nav';
  return 'feature';
}

const SEARCH_PAGES = [
  ...allNavItems()
    .filter(item => !item.hidden)
    .map(item => ({
      label: item.label,
      href: item.href,
      keywords: NAV_KEYWORDS[item.href] ?? item.label.toLowerCase(),
      category: navSearchCategory(item.groupId),
    })),
  ...EXTRA_SEARCH_PAGES,
];

const CATEGORY_LABELS: Record<string, string> = {
  nav: 'Navigation',
  feature: 'Features',
  report: 'Reports & Analytics',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AppShellContent({ children, title, headerLeft }: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof SEARCH_PAGES>([]);
  const [searchFocusIdx, setSearchFocusIdx] = useState(-1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifLastFetchedRef = useRef<number>(0);
  const [darkMode, setDarkMode] = useState(false);

  // Persist dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('619-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('619-theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Unified scroll state — shared with MobileBottomNav via context
  const { topBar, reducedMotion } = useNavScroll();
  // Spec: transform 280ms cubic-bezier(0.22, 1, 0.36, 1)
  const EASE = [0.22, 1, 0.36, 1] as const;
  const dur  = reducedMotion ? 0 : 0.28;
  const transConfig = { duration: dur, ease: EASE };


  const settingsLinks = [
    { href: '/settings/studio',          label: 'Studio Settings',       icon: Building2 },
    { href: '/settings/profile',         label: 'My Profile',            icon: User },
    { href: '/settings/staff',           label: 'Staff & Access',        icon: ShieldCheck },
    { href: '/settings/biometric',       label: 'Biometric & Face',      icon: Fingerprint },
    { href: '/settings/passkeys',        label: 'Passkeys / Face ID Login', icon: KeyRound },
    { href: '/settings/billing',         label: 'GST / Invoice',         icon: Receipt },
    { href: '/settings/branding',        label: 'Branding',              icon: Palette },
    { href: '/settings/integrations',    label: 'Integrations',          icon: Zap },
    { href: '/settings/import-database', label: 'Import Database',       icon: DatabaseBackup },
  ];


  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const fetchNotifications = useCallback(async (force = false) => {
    if (!force && Date.now() - notifLastFetchedRef.current < 30_000) return;
    setNotifLoading(true);
    try {
      const res = await api.notifications.list() as { data: Notification[] } | Notification[];
      const items: Notification[] = Array.isArray(res) ? res : (res as { data: Notification[] }).data || [];
      setNotifications(items.slice(0, 20));
      notifLastFetchedRef.current = Date.now();
    } catch {
      // silently fail — notifications are non-critical
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Fetch notifications on mount
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Re-fetch when opening panel (force if cache is > 60 s stale)
  useEffect(() => {
    if (notifOpen) fetchNotifications(Date.now() - notifLastFetchedRef.current > 60_000);
  }, [notifOpen, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch { /* ignore */ }
  };

  const markOneRead = async (n: Notification) => {
    if (!n.read_at) {
      try {
        await api.notifications.markRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      } catch { /* ignore */ }
    }
    if (n.link) { setNotifOpen(false); router.push(n.link); }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchFocusIdx(-1);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(searchResults.length > 0);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchFocusIdx(-1);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [searchResults.length]);

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocusIdx(-1);
  }, [pathname]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSearchFocusIdx(-1);
    if (!query.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    const q = query.toLowerCase();
    const results = SEARCH_PAGES.filter(
      p => p.label.toLowerCase().includes(q) || p.keywords.toLowerCase().includes(q) || p.href.toLowerCase().includes(q)
    );
    setSearchResults(results);
    setSearchOpen(results.length > 0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchFocusIdx(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchFocusIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = searchFocusIdx >= 0 ? searchResults[searchFocusIdx] : searchResults[0];
      if (target) navigateTo(target.href);
    }
  };

  const navigateTo = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocusIdx(-1);
    router.push(href);
  };

  // Group search results by category, preserving flat index for keyboard nav
  const indexedResults = searchResults.map((r, i) => ({ ...r, flatIdx: i }));
  const groupedResults: Record<string, typeof indexedResults> = {};
  for (const r of indexedResults) {
    if (!groupedResults[r.category]) groupedResults[r.category] = [];
    groupedResults[r.category].push(r);
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="flex min-h-screen bg-[var(--bg-canvas)]">
        {/* Sidebar — desktop */}
        <Sidebar collapsed={sidebarCollapsed} onExpand={() => setSidebarCollapsed(false)} onCollapse={() => setSidebarCollapsed(true)} />

        {/* Sidebar — mobile drawer */}
        <Sidebar variant="mobile" mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

        {/* Right column — blur overlay when mobile drawer is open */}
        <div
          className={cn('relative flex flex-1 flex-col min-w-0 overflow-x-hidden', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64 xl:pl-72')}
          style={{
            isolation: 'isolate',
            transition: 'padding-left 300ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Scoped blur overlay — background stays in place, only blurs + dims */}
          <div
            className="absolute inset-0 z-50 lg:hidden"
            style={{
              background: 'rgba(5,8,22,0.50)',
              backdropFilter: mobileMenuOpen ? 'blur(12px)' : 'blur(0px)',
              WebkitBackdropFilter: mobileMenuOpen ? 'blur(12px)' : 'blur(0px)',
              opacity: mobileMenuOpen ? 1 : 0,
              pointerEvents: mobileMenuOpen ? 'auto' : 'none',
              transition: 'opacity 0.32s cubic-bezier(0.32,0.72,0,1), backdrop-filter 0.32s cubic-bezier(0.32,0.72,0,1)',
            }}
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* ── Top header bar ── */}
          <m.header
            className={cn(
              'fixed top-0 right-0 z-40',
              sidebarCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-64 xl:left-72',
            )}
            style={{
              background: 'var(--topbar-bg)',
              borderBottom: '1px solid var(--topbar-border)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              transition: 'left 300ms cubic-bezier(0.16,1,0.3,1)',
              willChange: 'transform',
            }}
            animate={{
              y: 0,
              boxShadow: topBar === 'compact'
                ? darkMode ? '0 1px 4px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
                : darkMode ? '0 2px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'  : '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
            }}
            transition={transConfig}
            initial={false}
          >

            <m.div
              className="flex items-center gap-3 px-3 sm:px-4 lg:px-6"
              animate={{ height: topBar === 'compact' ? 32 : 46 }}
              transition={transConfig}
            >
              {/* Mobile menu toggle */}
              <button type="button" aria-label="Open navigation menu" onClick={() => setMobileMenuOpen(true)}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 lg:hidden',
                  darkMode ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                )}>
                <Menu size={17} strokeWidth={1.5} />
              </button>

              {/* ── Search ── */}
              <div ref={searchRef} className="relative flex-1 max-w-[360px] lg:max-w-[420px]">
                <div className="group relative">
                  <div className="relative flex items-center">
                    <Search size={14} strokeWidth={2}
                      className={cn('absolute left-3 z-10 transition-colors duration-200', darkMode ? 'text-slate-500 group-focus-within:text-slate-300' : 'text-slate-400 group-focus-within:text-slate-600')} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => { if (searchQuery.trim()) setSearchOpen(searchResults.length > 0); }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search pages… (Ctrl K)"
                      className={cn(
                        'relative w-full rounded-2xl py-[7px] pl-9 pr-8 text-[13px] outline-none transition-all duration-300',
                        darkMode
                          ? 'border border-white/10 bg-white/8 text-slate-100 placeholder:text-slate-500 focus:border-white/25 focus:bg-white/12 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]'
                          : 'border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]',
                      )}
                    />
                    {searchQuery && (
                      <button onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }}
                        className="absolute right-2.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-all duration-200">
                        <X size={9} />
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {searchOpen && searchResults.length > 0 && (
                    <m.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_16px_48px_rgba(0,0,0,0.15)]"
                    >
                      <div className="max-h-[340px] overflow-y-auto py-2">
                        {Object.entries(groupedResults).map(([cat, items]) => (
                          <div key={cat}>
                            <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-disabled)]">
                              {CATEGORY_LABELS[cat] || cat}
                            </div>
                            {items.map((r) => {
                              const isActive = r.flatIdx === searchFocusIdx;
                              return (
                                <button
                                  key={r.href + r.label}
                                  onClick={() => navigateTo(r.href)}
                                  className={cn(
                                    'flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] transition-all duration-100',
                                    isActive
                                      ? 'bg-[rgba(212,175,55,0.08)] pl-5'
                                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:pl-5',
                                  )}
                                  style={isActive ? { color: '#D4AF37' } : undefined}
                                >
                                  <span
                                    className={cn(
                                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold shadow-sm',
                                      isActive ? 'text-[#050816]' : 'text-white',
                                    )}
                                    style={isActive
                                      ? { background: 'linear-gradient(135deg, #D4AF37 0%, #F7E7A1 100%)' }
                                      : { background: 'linear-gradient(135deg, var(--brand-lo), var(--brand))' }
                                    }
                                  >
                                    {r.label.charAt(0)}
                                  </span>
                                  <span className="font-medium flex-1">{r.label}</span>
                                  {isActive && <ChevronRight size={12} style={{ color: '#D4AF37', opacity: 0.8 }} />}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                        <div className="border-t border-[var(--border)] mt-1 px-4 py-2 flex items-center gap-1.5">
                          <span className="text-[10px] text-[var(--text-disabled)]">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
                          <span className="ml-auto text-[10px] text-[var(--text-disabled)]">↑↓ navigate · ↵ open</span>
                        </div>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Spacer */}
              <div className="hidden lg:block flex-1" />

              {/* ── Dark / Light toggle ── */}
              <m.button
                type="button"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={toggleDark}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200', darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
                style={{ background: 'transparent', color: darkMode ? '#94A3B8' : '#64748B' }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <m.div key={darkMode ? 'moon' : 'sun'}
                    initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    {darkMode ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
                  </m.div>
                </AnimatePresence>
              </m.button>

              {/* ── Settings dropdown ── */}
              <div ref={settingsRef} className="relative">
                <m.button
                  type="button"
                  aria-label="Settings"
                  onClick={() => setSettingsOpen(s => !s)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all duration-200', darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
                  style={{
                    background: settingsOpen ? (darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : 'transparent',
                  }}
                >
                  <m.div
                    animate={settingsOpen ? { rotate: 90 } : { rotate: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ color: settingsOpen ? (darkMode ? '#F8FAFC' : '#0F172A') : (darkMode ? '#94A3B8' : '#64748B') }}
                  >
                    <Settings size={16} strokeWidth={settingsOpen ? 2 : 1.5} />
                  </m.div>
                </m.button>
                <AnimatePresence>
                  {settingsOpen && (
                    <m.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_12px_40px_rgba(212,175,55,0.12)]"
                    >
                      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-disabled)]">Settings</div>
                      <div className="pb-2">
                        {settingsLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link key={link.href} href={link.href} onClick={() => setSettingsOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                              <Icon size={14} strokeWidth={1.5} />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Notification bell ── */}
              <div ref={notifRef} className="relative">
                <m.button
                  type="button"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  onClick={() => setNotifOpen(s => !s)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200', darkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100')}
                  style={{
                    background: notifOpen ? (darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : 'transparent',
                  }}
                >
                  <Bell size={16} strokeWidth={1.5} style={{ color: notifOpen ? (darkMode ? '#F8FAFC' : '#0F172A') : (darkMode ? '#94A3B8' : '#64748B') }} />
                  {unreadCount > 0 && (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </m.span>
                  )}
                </m.button>

                <AnimatePresence>
                  {notifOpen && (
                    <m.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="notif-panel absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_16px_48px_rgba(0,0,0,0.15)]"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="flex h-4.5 items-center rounded-full bg-rose-500/15 px-1.5 text-[10px] font-bold text-rose-500">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead}
                            className="flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:text-[var(--text-primary)] transition-colors">
                            <CheckCheck size={12} />
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-[320px] overflow-y-auto">
                        {notifLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--brand)]" />
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-10">
                            <Bell size={28} strokeWidth={1} className="text-[var(--text-disabled)]" />
                            <p className="text-[12px] text-[var(--text-disabled)]">All caught up!</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => markOneRead(n)}
                              className={cn(
                                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]',
                                !n.read_at && 'bg-[var(--brand-soft)]/40',
                              )}
                            >
                              {/* Unread dot */}
                              <div className="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                                {!n.read_at && (
                                  <span className="block h-2 w-2 rounded-full bg-[var(--brand)] shadow-[0_0_6px_var(--brand-glow)]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-[12px] font-medium leading-snug truncate', !n.read_at ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
                                  {n.title}
                                </p>
                                {n.body && (
                                  <p className="mt-0.5 text-[11px] text-[var(--text-disabled)] line-clamp-2">{n.body}</p>
                                )}
                                <p className="mt-1 text-[10px] text-[var(--text-disabled)]">{timeAgo(n.created_at)}</p>
                              </div>
                              {n.link && (
                                <ExternalLink size={12} className="mt-1 shrink-0 text-[var(--text-disabled)]" />
                              )}
                            </button>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-[var(--border)] px-4 py-2.5">
                        <Link href="/engagement/notifications" onClick={() => setNotifOpen(false)}
                          className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[var(--brand)] hover:text-[var(--text-primary)] transition-colors">
                          View all notifications
                          <ChevronRight size={11} />
                        </Link>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Profile dropdown ── */}
              <div ref={profileRef} className="relative">
                <button onClick={() => setProfileOpen(s => !s)}
                  className="flex items-center gap-2.5 pl-3 transition-all duration-200 hover:opacity-80"
                  style={{ borderLeft: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                      boxShadow: '0 0 0 1.5px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.15)',
                    }}>
                    <Image src="/logo.png" alt="Coach Abhishek" width={20} height={20} className="h-5 w-5 object-contain" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className={cn('text-[12px] font-semibold leading-tight', darkMode ? 'text-slate-100' : 'text-slate-800')}>COACH ABHISHEK</p>
                    <p className={cn('text-[10px] leading-tight capitalize', darkMode ? 'text-slate-400' : 'text-slate-500')}>{user?.role || '—'}</p>
                  </div>
                  <ChevronDown size={12} strokeWidth={1.5} className={cn('shrink-0', darkMode ? 'text-slate-500' : 'text-slate-400')} />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <m.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_12px_40px_rgba(212,175,55,0.10)]"
                    >
                      <div className="px-3 py-2.5 border-b border-[var(--border)]">
                        <p className="text-[12px] font-semibold text-[var(--text-primary)]">{user?.name || 'Admin'}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{user?.email || '—'}</p>
                        <span className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                          style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                          {user?.role || 'admin'}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link href="/settings/profile" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                          <User size={14} strokeWidth={1.5} /> My Profile
                        </Link>
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
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </m.div>
          </m.header>

          {/* Spacer — tracks fixed header height so content always starts below it.
              marginTop (not paddingTop) for the safe-area inset: box-sizing:border-box
              means an explicit `height` clamps the box to that height regardless of
              padding, so padding-based inset would get silently swallowed on notched
              devices. margin sits outside the height calculation, so it's additive. */}
          <m.div
            aria-hidden="true"
            className="flex-shrink-0 pointer-events-none"
            style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
            animate={{ height: topBar === 'compact' ? 32 : 46 }}
            transition={transConfig}
            initial={false}
          />

          {headerLeft && (
            <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8">
              {headerLeft}
            </div>
          )}

          {/* Width/max-width/margin/padding all come from .shell-main in globals.css —
              the equivalent Tailwind utilities (mx-auto w-full max-w-[1440px] px-4
              sm:px-6 lg:px-8) were dead here: same-specificity CSS declared later in
              globals.css always won, so they never actually took effect. */}
          <main id="main-content" className="flex-1 min-w-0 overflow-x-hidden shell-main"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <m.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                {title && (
                  <h1 className="mb-6 text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    {title}
                  </h1>
                )}
                {children}
              </m.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation — hidden when sidebar drawer is open */}
      <MobileBottomNav sidebarOpen={mobileMenuOpen} />

      {/* Floating Action Button — mobile only */}
      <FAB />
    </LazyMotion>
  );
}

export default function AppShell(props: AppShellProps) {
  return (
    <NavScrollProvider>
      <AppShellContent {...props} />
    </NavScrollProvider>
  );
}
