'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Search, LogOut, Bell, Settings, Building2, ShieldCheck, Fingerprint,
  Receipt, Palette, Zap, DatabaseBackup, User, HelpCircle, ChevronDown,
  Menu, X, CheckCheck, ExternalLink, ChevronRight,
} from 'lucide-react';
import { LazyMotion, domAnimation, AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import Sidebar from '@/components/sidebar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { api } from '@/lib/api';

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

const SEARCH_PAGES = [
  { label: 'PT OS', href: '/pt-os', keywords: 'personal training pt dashboard', category: 'nav' },
  { label: 'Attendance', href: '/attendance', keywords: 'attendance check-in sign-in', category: 'nav' },
  { label: 'Finance', href: '/finance/collected-payments', keywords: 'finance payments billing invoices', category: 'nav' },
  { label: 'Walk-in / Check-in', href: '/checkin', keywords: 'walk-in walkin drop-in checkin daily visit', category: 'nav' },
  { label: 'Staff', href: '/staff', keywords: 'staff employees trainers', category: 'nav' },
  { label: 'Trainers', href: '/trainers', keywords: 'trainers coaches instructors', category: 'nav' },
  { label: 'Reports', href: '/reports', keywords: 'reports analytics insights', category: 'nav' },
  { label: 'Settings', href: '/settings', keywords: 'settings configuration preferences', category: 'nav' },
  { label: 'Session Booking', href: '/pt-os/schedule-session', keywords: 'session booking schedule appointments', category: 'feature' },
  { label: 'Progress Tracking', href: '/pt-os/weekly-checkin', keywords: 'progress tracking measurements goals weekly check-in checkin', category: 'feature' },
  { label: 'Goals', href: '/pt-os/goals', keywords: 'goals objectives targets', category: 'feature' },
  { label: 'Assessment', href: '/pt-os/assessment', keywords: 'assessment evaluation fitness test', category: 'feature' },
  { label: 'Session Balance', href: '/pt-os/session-balance', keywords: 'session balance remaining credits', category: 'feature' },
  { label: 'Measurements', href: '/pt-os/measurements', keywords: 'measurements body stats metrics', category: 'feature' },
  { label: 'Strength Tracking', href: '/pt-os/strength-tracking', keywords: 'strength tracking lifts weights', category: 'feature' },
  { label: 'Progress Photos', href: '/pt-os/progress-photos', keywords: 'progress photos pictures transformation', category: 'feature' },
  { label: 'Commissions', href: '/pt-os/commissions', keywords: 'commissions incentives bonuses', category: 'feature' },
  { label: 'Automation', href: '/engagement/automation', keywords: 'automation workflows triggers', category: 'feature' },
  { label: 'Collected Payments', href: '/finance/collected-payments', keywords: 'payments transactions collected', category: 'feature' },
  { label: 'AI Coach', href: '/ai-coach', keywords: 'ai coach workout nutrition fitness chatbot assistant gpt', category: 'feature' },
  { label: 'QR Scanner', href: '/checkin/qr-scanner', keywords: 'qr scanner checkin scan code attendance', category: 'feature' },
  { label: 'Self-Check-In Kiosk', href: '/checkin/kiosk', keywords: 'kiosk checkin self service qr face biometric', category: 'feature' },
  { label: 'My Attendance', href: '/member/attendance', keywords: 'my attendance history streak visits calendar heatmap', category: 'feature' },
  { label: 'Attendance Reports', href: '/attendance/reports', keywords: 'attendance reports analytics', category: 'report' },
  { label: 'Communication', href: '/engagement/notifications', keywords: 'communication messaging notifications', category: 'report' },
  { label: 'Notifications', href: '/engagement/notifications', keywords: 'notifications alerts updates', category: 'report' },
  { label: 'Attendance Dashboard', href: '/checkin/dashboard', keywords: 'attendance dashboard live stats today visitors inside', category: 'report' },
];

const CATEGORY_LABELS: Record<string, string> = {
  nav: 'Navigation',
  feature: 'Features',
  report: 'Reports & Analytics',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AppShell({ children, title, headerLeft }: AppShellProps) {
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

  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read_at).length;

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

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await api.notifications.list() as { data: Notification[] } | Notification[];
      const items: Notification[] = Array.isArray(res) ? res : (res as { data: Notification[] }).data || [];
      setNotifications(items.slice(0, 20));
    } catch {
      // silently fail — notifications are non-critical
    } finally {
      setNotifLoading(false);
    }
  }, []);

  // Fetch notifications on mount
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Re-fetch when opening panel
  useEffect(() => { if (notifOpen) fetchNotifications(); }, [notifOpen, fetchNotifications]);

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

        {/* Mobile backdrop */}
        <div onClick={() => setMobileMenuOpen(false)}
          className={cn(
            'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
            mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
        />

        {/* Right column */}
        <div className={cn('flex flex-1 flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64 xl:pl-72')}>
          {/* ── Top header bar ── */}
          <header
            className="sticky top-0 z-40"
            style={{
              background: 'linear-gradient(135deg, #070510 0%, #0C0920 30%, #100D30 60%, #130F45 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            {/* Top inner highlight */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 70%, transparent 100%)' }} />
            {/* Bottom accent glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.4) 20%, rgba(99,102,241,0.6) 45%, rgba(59,130,246,0.5) 70%, transparent 100%)' }} />
            {/* Subtle noise texture overlay */}
            <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '150px 150px' }} />

            <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
              {/* Mobile menu toggle */}
              <button type="button" aria-label="Open navigation menu" onClick={() => setMobileMenuOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden">
                <Menu size={17} strokeWidth={1.5} />
              </button>

              {/* ── Search ── */}
              <div ref={searchRef} className="relative flex-1 max-w-[360px] lg:max-w-[420px]">
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 via-violet-500 to-cyan-400 p-[1.5px] opacity-50 transition-opacity duration-300 group-focus-within:opacity-100">
                    <div className="h-full w-full rounded-2xl" style={{ background: 'rgba(15,12,41,0.7)' }} />
                  </div>
                  <div className="relative flex items-center">
                    <Search size={14} strokeWidth={2}
                      className="absolute left-3 z-10 text-white/40 transition-colors duration-200 group-focus-within:text-purple-300" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => { if (searchQuery.trim()) setSearchOpen(searchResults.length > 0); }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search pages… (Ctrl K)"
                      className="relative w-full rounded-2xl border border-white/10 bg-white/5 py-[7px] pl-9 pr-8 text-[12px] text-white outline-none transition-all duration-200 placeholder-white/30 focus:border-transparent focus:bg-white/10 focus:shadow-[0_0_0_1.5px_#a78bfa,0_8px_24px_rgba(167,139,250,0.2)]"
                    />
                    {searchQuery && (
                      <button onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }}
                        className="absolute right-2.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-white/60 hover:bg-white/30 transition-colors">
                        <X size={9} />
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {searchOpen && searchResults.length > 0 && (
                    <motion.div
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
                                      ? 'bg-[var(--brand-soft)] text-[var(--brand)] pl-5'
                                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:pl-5',
                                  )}
                                >
                                  <span className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm',
                                    isActive
                                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
                                      : 'bg-gradient-to-br from-[var(--brand-lo)] to-[var(--brand)]',
                                  )}>
                                    {r.label.charAt(0)}
                                  </span>
                                  <span className="font-medium flex-1">{r.label}</span>
                                  {isActive && <ChevronRight size={12} className="text-[var(--brand)] opacity-70" />}
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Spacer */}
              <div className="hidden lg:block flex-1" />

              {/* ── Settings dropdown ── */}
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
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_12px_40px_var(--brand-glow)]"
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

              {/* ── Notification bell ── */}
              <div ref={notifRef} className="relative">
                <motion.button
                  type="button"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  onClick={() => setNotifOpen(s => !s)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
                  style={{
                    background: notifOpen ? 'rgba(251,113,133,0.15)' : 'rgba(255,255,255,0.06)',
                    boxShadow: notifOpen ? '0 4px 12px rgba(251,113,133,0.25)' : undefined,
                  }}
                >
                  <Bell size={16} strokeWidth={1.5} className={notifOpen ? 'text-rose-300' : 'text-white/60'} />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Profile dropdown ── */}
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
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_12px_40px_var(--brand-glow)]"
                    >
                      <div className="px-3 py-2.5 border-b border-[var(--border)]">
                        <p className="text-[12px] font-semibold text-[var(--text-primary)]">{user?.name || 'Admin'}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{user?.email || '—'}</p>
                        <span className="mt-1 inline-flex items-center rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--brand)]">
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

      {/* Mobile bottom navigation — hidden on lg+ */}
      <MobileBottomNav />
    </LazyMotion>
  );
}
