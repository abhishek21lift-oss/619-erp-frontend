'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  LogOut, Bell, Settings,
  Zap, User, HelpCircle, ChevronDown, CreditCard,
  Menu, CheckCheck, ExternalLink, ChevronRight, KeyRound, Sun, Moon,
} from 'lucide-react';
import { LazyMotion, domAnimation, AnimatePresence, m } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/ThemeProvider';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import Sidebar from '@/components/sidebar';
import StudioMark from '@/components/StudioMark';
import MobileBottomNav from '@/components/MobileBottomNav';
import AiAssistant from '@/components/ai/AiAssistant';
import { api } from '@/lib/api';
import { roleLabel } from '@/lib/roles';
import { allNavItems, isVisibleForFeature } from '@/lib/nav-config';
import { useFeatures } from '@/lib/features-context';
import { useNavScroll } from '@/contexts/nav-scroll-context';
import { PullRefreshRegistryProvider } from '@/contexts/pull-refresh-context';
import PullToRefresh from '@/components/common/PullToRefresh';
import OrgSwitcher from '@/components/OrgSwitcher';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import TrialBanner from '@/components/TrialBanner';
import GlobalSearch, { type PageEntry } from '@/components/search/GlobalSearch';
import useViewportDesyncFix from '@/hooks/useViewportDesyncFix';
import { clearSearchHistory } from '@/components/search/recent';

interface AppShellProps {
  children: React.ReactNode;
}

// The top bar's two heights, in px, excluding the safe-area inset.
//
// EXPANDED is also the layout reserve: the spacer below the fixed header is
// this tall at all times, never the compact height. That is deliberate — see
// the spacer for what animating it cost.
const TOPBAR_EXPANDED_H = 46;
const TOPBAR_COMPACT_H = 32;

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
  // 'kiosk' and 'self service' are searched for by name, and the QR scanner is
  // now the only thing they can mean — so they resolve here rather than to a
  // dead route.
  '/checkin/qr-scanner':         'walk-in walkin drop-in checkin daily visit attendance qr scanner scan code kiosk self service',
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

// 'QR Scanner' used to live here as its own entry, pointing at the same route
// the Attendance group's 'Check In' item now also points to — since removing
// the face check-in hub, they'd otherwise show as two identical search
// results. Its keywords were folded into NAV_KEYWORDS['/checkin/qr-scanner']
// above instead.
const EXTRA_SEARCH_PAGES: PageEntry[] = [
  { label: 'Attendance Dashboard', href: '/checkin/dashboard',  keywords: 'attendance dashboard live stats today visitors inside' },
];

// The page index. This used to BE the search: the box filtered this array in
// the browser and nothing else. It is now a secondary group inside
// GlobalSearch — typing "reports" still jumps you there — while the primary
// answer comes from the server.
//
// It used to be built once at module scope, because the nav was static. It no
// longer is: a studio's feature flags decide which pages exist for it, so this
// is rebuilt per session instead. Searching a page the studio does not have
// would only lead to a 403.
function buildSearchPages(features: Record<string, boolean>): PageEntry[] {
  return [
    ...allNavItems()
      .filter(item => !item.hidden)
      .filter(item => isVisibleForFeature(item, features))
      .map(item => ({
        label: item.label,
        href: item.href,
        keywords: NAV_KEYWORDS[item.href] ?? item.label.toLowerCase(),
      })),
    ...EXTRA_SEARCH_PAGES,
  ];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AppShellContent({ children }: AppShellProps) {
  // Every page in the shell has fields, so the iOS keyboard-dismiss gap is a
  // shell-level problem, not a per-page one.
  //
  // Two mechanisms, and they cover different halves of the same bug:
  //  · useViewportDesyncFix re-asserts the DOCUMENT's scroll position, which
  //    makes Safari recompute — but only works where there is a document
  //    scroll to re-assert, so it cannot help a viewport-height page like the
  //    AI Coach console.
  //
  // There was a second mechanism here — useVisualViewportAnchor — which
  // measured the layout/visual viewport gap and offset the bottom chrome by
  // it. It is gone: both signs of that measurement moved the nav when nothing
  // was wrong. BOTTOM-NAV.md has the full account.
  useViewportDesyncFix();

  const { features } = useFeatures();
  const searchPages = useMemo(() => buildSearchPages(features), [features]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // Desktop sidebar starts expanded; the user's manual collapse/expand choice
  // is restored from localStorage by the Sidebar on mount. No hover auto-toggle.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifLastFetchedRef = useRef<number>(0);
  // Theme comes from ThemeProvider — this component does NOT keep its own copy.
  //
  // It used to: local `darkMode` state, its own mount effect, and a toggle that
  // wrote localStorage['619-theme'], while ThemeProvider and the pre-paint
  // script used localStorage['theme']. Two systems, two keys, no connection.
  // Pressing this button changed the page but left every useTheme() consumer
  // stale (the diet-plan charts kept their light palette in dark mode), and on
  // the next load the pre-paint script found nothing under 'theme' and fell
  // back to the system preference — throwing away the choice the user had just
  // made. See public/theme-init.js for the one-time migration of the old key.
  const { theme, toggle: toggleDark } = useTheme();
  const darkMode = theme === 'dark';

  const { user, logout } = useAuth();
  const studioName = user?.organization_name || 'PT Studio';
  const router = useRouter();
  const pathname = usePathname();

  // App-wide pull-to-refresh: bumping this key remounts the current page's
  // subtree, so its data-loading effects re-run. Pages that wrap themselves
  // in their own PullToRefresh take over the gesture (via the registry) and
  // this global fallback stays disabled for them.
  const [refreshKey, setRefreshKey] = useState(0);
  const globalRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Hold the refreshing stage briefly while the remounted page kicks off
    // its own fetches; the indicator then plays its success + retract.
    return new Promise<void>((resolve) => setTimeout(resolve, 450));
  }, []);

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


  // My Profile intentionally lives only in the profile dropdown (avatar menu),
  // not here in the settings (gear) menu.
  const settingsLinks = [
    { href: '/settings/passkeys',        label: 'Passkeys / Face ID Login', icon: KeyRound },
    { href: '/settings/integrations',    label: 'Integrations',          icon: Zap },
  ];


  const handleLogout = async () => {
    // Search history is one person's names and phone numbers. On a shared
    // studio machine it must not greet the next person who signs in.
    clearSearchHistory();
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
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <ImpersonationBanner />
      <div className="flex min-h-dvh bg-[var(--bg-canvas)]">
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
            // Live top-bar height for page-level sticky headers (.below-topbar):
            // tracks the expanded/compact animation so stuck headers never
            // slide under (or paint over) the fixed shell header.
            ['--topbar-h' as string]: `calc(${topBar === 'compact' ? TOPBAR_COMPACT_H : TOPBAR_EXPANDED_H}px + env(safe-area-inset-top, 0px))`,
          }}
        >
          {/* Scoped blur overlay — background stays in place, only blurs + dims */}
          <div
            className="absolute inset-0 z-50 lg:hidden"
            data-no-pull-refresh
            style={{
              background: 'rgba(15,23,42,0.50)',
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
              className="flex items-center gap-1.5 px-3 sm:gap-2.5 sm:px-4 lg:gap-3 lg:px-6"
              animate={{ height: topBar === 'compact' ? TOPBAR_COMPACT_H : TOPBAR_EXPANDED_H }}
              transition={transConfig}
            >
              {/* Mobile menu toggle.
                  Carries the logo's blue rather than the neutral grey of the
                  other topbar icons — it's the only way into navigation on a
                  phone, so it earns being the one coloured control up here.
                  The tokens flip with the theme, so no darkMode branch. */}
              <button type="button" aria-label="Open navigation menu" onClick={() => setMobileMenuOpen(true)}
                className="menu-toggle flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 lg:hidden">
                <Menu size={17} strokeWidth={2} />
              </button>

              {/* ── Global search ──
                  Owns its own state, requests and keyboard handling. Renders as
                  an inline combobox from sm up and as a full-screen sheet on a
                  phone, where an inline field would be ~140px wide. */}
              <GlobalSearch pages={searchPages} darkMode={darkMode} />

              {/* Spacer — pushes the icon cluster right. Needed at every width
                  now: on a phone the search is a 36px button, so nothing else
                  in the row grows to fill the space. */}
              <div className="flex-1" />

              {/* ── Platform org-switcher (super_admin only; renders null otherwise) ── */}
              <OrgSwitcher />

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
                      // The notification list owns every vertical drag inside
                      // it; pulling the page down behind it is wrong at any
                      // scroll position.
                      data-no-pull-refresh
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
                      {/* overscroll-contain: without it, reaching this list's
                          scroll boundary chains the drag to the page behind
                          the open notification panel. */}
                      <div className="max-h-[320px] overflow-y-auto overscroll-contain">
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
                  <StudioMark name={studioName} logoUrl={user?.organization_logo_url} size={28} radius={8} />
                  <div className="hidden sm:block text-left">
                    <p className={cn('max-w-[150px] truncate text-[12px] font-semibold uppercase leading-tight', darkMode ? 'text-slate-100' : 'text-slate-800')}>{studioName}</p>
                    <p className={cn('text-[10px] leading-tight capitalize', darkMode ? 'text-slate-400' : 'text-slate-500')}>{roleLabel(user?.role) || '—'}</p>
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
                          style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                          {/* Was `{user?.role}` — the raw identifier, so this badge
                              read "super_admin" on every page for the operator and
                              "admin" for a studio owner. */}
                          {roleLabel(user?.role) || 'Trainer'}
                        </span>
                      </div>
                      <div className="py-1">
                        <Link href="/settings/profile" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                          <User size={14} strokeWidth={1.5} /> My Profile
                        </Link>
                        {user?.role === 'super_admin' && (
                          <Link href="/settings" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                            <Settings size={14} strokeWidth={1.5} /> Account Settings
                          </Link>
                        )}
                        {user?.role !== 'super_admin' && user?.organization_name && (
                          <Link href="/subscription" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                            <CreditCard size={14} strokeWidth={1.5} /> Subscription &amp; Billing
                          </Link>
                        )}
                        <Link href="/help" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors">
                          <HelpCircle size={14} strokeWidth={1.5} /> Help & Support
                        </Link>
                        <hr className="my-1 border-[var(--border)]" />
                        <button onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--danger-text)] hover:bg-[var(--danger)]/5 transition-colors">
                          <LogOut size={14} strokeWidth={1.5} /> Logout
                        </button>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </m.div>
          </m.header>

          {/* Spacer — reserves the room the fixed header occupies, so content
              starts below it.

              Fixed at the EXPANDED height, and not animated. It used to track
              the header (46 ↔ 32), which meant every scroll-direction change
              moved this in-flow box by 14px and pushed the entire page's
              content with it — a layout shift on a plain scroll, hundreds of
              times a session. Scroll is not an input CLS forgives, so it
              scored too.

              The header still shrinks; only the reserve is constant. The 14px
              band that opens under a compact bar is never actually seen: the
              bar is only compact while scrolling mid-document, where the
              content behind it has already scrolled up under it. At the top of
              the page — the one place a gap would show — the state machine
              always reports 'expanded'.

              marginTop (not paddingTop) for the safe-area inset:
              box-sizing:border-box means an explicit `height` clamps the box
              to that height regardless of padding, so a padding-based inset
              would get silently swallowed on notched devices. margin sits
              outside the height calculation, so it is additive. */}
          <div
            aria-hidden="true"
            className="flex-shrink-0 pointer-events-none"
            style={{ height: TOPBAR_EXPANDED_H, marginTop: 'env(safe-area-inset-top, 0px)' }}
          />

          {/* Width/max-width/margin/padding all come from .shell-main in globals.css —
              the equivalent Tailwind utilities (mx-auto w-full max-w-[1440px] px-4
              sm:px-6 lg:px-8) were dead here: same-specificity CSS declared later in
              globals.css always won, so they never actually took effect. */}
          <main id="main-content" className="flex-1 min-w-0 overflow-x-hidden shell-main"
          >
            {pathname === '/' && <TrialBanner />}
            {/* Keyed on pathname so each route fades in on arrival. There is
                deliberately no AnimatePresence and no exit animation here.
                There used to be one — `mode="popLayout"`, a 0.1s fade out —
                and it had never run once: this whole subtree was destroyed
                with the page on every navigation, so nothing was left mounted
                to animate out. Now that the shell is a layout and does
                persist, that exit WOULD start running, which is a new
                transition nobody has looked at on a device — and the exiting
                page is absolutely positioned over the arriving one while it
                plays. Enabling it is a UI change, not part of moving the
                shell, so what shipped for years is what still ships. */}
            <m.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <PullToRefresh global onRefresh={globalRefresh}>
                <div key={refreshKey}>{children}</div>
              </PullToRefresh>
            </m.div>
          </main>

          {/* Mobile bottom navigation — hidden when sidebar drawer is open.
              Rendered inside this isolated stacking context (not as a sibling
              of it) so its z-index is actually compared against page-level
              fixed footers (e.g. form Save/Submit bars) instead of always
              painting on top of them regardless of their z-index. */}
          <MobileBottomNav sidebarOpen={mobileMenuOpen} />

          {/* The assistant sits inside this stacking context for the same
              reason the bottom nav does — so its z-index is compared against
              page-level fixed bars rather than always winning or always
              losing against them. */}
          <AiAssistant />
        </div>
      </div>
    </LazyMotion>
  );
}

export default function AppShell(props: AppShellProps) {
  // Mounted once, from src/app/(chrome)/layout.tsx — see the note there. It
  // used to be rendered by each of 97 pages instead, which destroyed and
  // rebuilt the entire shell on every navigation.
  //
  // NavScrollProvider is the one piece that still lives further up, in
  // app/layout.tsx: the member portal has no AppShell at all and still needs
  // the scroll state.
  return (
    <PullRefreshRegistryProvider>
      <AppShellContent {...props} />
    </PullRefreshRegistryProvider>
  );
}
