'use client';

/**
 * Sidebar — premium mobile navigation drawer.
 * Mobile: full-screen drawer (slides in from left, z-[200]).
 * Desktop (lg+): hidden — PremiumHeader takes over navigation.
 *
 * Design: luxury fitness operating system.
 * Soft white base · violet/crimson accents · glassmorphism sections
 * iOS-quality motion · spacious touch ergonomics · sticky header + footer
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Fuse from 'fuse.js';

import type { LucideIcon } from 'lucide-react';

import {
  LayoutDashboard, TrendingUp, Users, Dumbbell, ScanFace,
  CreditCard, IndianRupee, LineChart, Megaphone, Settings,
  Inbox, PlusCircle, Filter, PieChart,
  UserCheck, CalendarClock, UserX, Cake, UserPlus, User,
  UserCog, LayoutGrid, CalendarOff, Sparkles,
  ClipboardList, ClipboardCheck, Trophy,
  Layers, RefreshCw, CalendarDays,
  Wallet, AlertCircle, ArrowUpRight, BarChart3, Award,
  FileBarChart, Activity, RefreshCcw, Clock,
  Bell, MessageCircle, Send, Tag, Star,
  Building2, ShieldCheck, Fingerprint, Receipt, Palette, DatabaseBackup,
  ChevronDown, Search, LogOut, X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';

import {
  NAV_GROUPS,
  SETTINGS_GROUP,
  DASHBOARD_ITEM,
  allNavItems,
  isVisibleForRole,
  type NavItem,
} from '@/lib/nav-config';

// ─── Icon map ────────────────────────────────────────────────────────

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, TrendingUp, Users, Dumbbell, ScanFace,
  CreditCard, IndianRupee, LineChart, Megaphone, Settings,
  Inbox, PlusCircle, Filter, PieChart,
  UserCheck, CalendarClock, UserX, Cake, UserPlus, User,
  UserCog, LayoutGrid, CalendarOff, Sparkles,
  ClipboardList, ClipboardCheck, Trophy,
  Layers, RefreshCw, CalendarDays,
  Wallet, AlertCircle, ArrowUpRight, BarChart3, Award,
  FileBarChart, Activity, RefreshCcw, Clock,
  Bell, MessageCircle, Send, Tag, Star,
  Building2, ShieldCheck, Fingerprint, Receipt, Palette, DatabaseBackup,
};

function NavIcon({ name, size = 15 }: { name: string; size?: number }) {
  const C = ICONS[name];
  return C ? <C size={size} strokeWidth={1.7} /> : null;
}

// ─── Group accent colours (subtle, not garish) ───────────────────────

const GROUP_ACCENT: Record<string, { dot: string; bg: string; text: string }> = {
  sales:       { dot: 'bg-emerald-400', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  members:     { dot: 'bg-blue-400',    bg: 'bg-blue-50',     text: 'text-blue-700'    },
  training:    { dot: 'bg-violet-400',  bg: 'bg-violet-50',   text: 'text-violet-700'  },
  staff:       { dot: 'bg-rose-400',    bg: 'bg-rose-50',     text: 'text-rose-700'    },
  attendance:  { dot: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700'   },
  memberships: { dot: 'bg-teal-400',    bg: 'bg-teal-50',     text: 'text-teal-700'    },
  finance:     { dot: 'bg-indigo-400',  bg: 'bg-indigo-50',   text: 'text-indigo-700'  },
  insights:    { dot: 'bg-purple-400',  bg: 'bg-purple-50',   text: 'text-purple-700'  },
  engagement:  { dot: 'bg-pink-400',    bg: 'bg-pink-50',     text: 'text-pink-700'    },
  settings:    { dot: 'bg-slate-400',   bg: 'bg-slate-100',   text: 'text-slate-600'   },
};

const DEFAULT_ACCENT = { dot: 'bg-slate-300', bg: 'bg-slate-50', text: 'text-slate-500' };

// ─── Persistence helpers ──────────────────────────────────────────────

const GROUPS_KEY = '619_sidebar_groups';

function loadGroupState(): Record<string, boolean> {
  try { const raw = localStorage.getItem(GROUPS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function saveGroupState(s: Record<string, boolean>) {
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Props ────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const [groupState, setGroupState] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Touch-to-swipe-close state
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setGroupState(loadGroupState());
    setHydrated(true);
  }, []);

  // Close drawer on route change
  useEffect(() => { onMobileClose?.(); }, [path]);

  // ─── Swipe-to-close ──────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 60) { onMobileClose?.(); }
    touchStartX.current = null;
  }, [onMobileClose]);

  // ─── Data ─────────────────────────────────────────────────────────

  const visibleItems = useMemo(() =>
    allNavItems().filter((i) => i.href !== '/dashboard' && isVisibleForRole(i, user?.role) && !i.hidden),
    [user?.role]
  );

  const fuse = useMemo(() => new Fuse(visibleItems, { keys: ['label', 'groupLabel'], threshold: 0.35 }), [visibleItems]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return fuse.search(search).map((r) => r.item).slice(0, 8);
  }, [search, fuse]);

  // ─── Helpers ──────────────────────────────────────────────────────

  const isActive = useCallback((href: string) => {
    const cleanHref = href.split('?')[0];
    const cleanPath = path.split('?')[0];
    if (cleanHref === '/dashboard') return cleanPath === '/dashboard';
    return cleanPath === cleanHref || cleanPath.startsWith(cleanHref + '/');
  }, [path]);

  const toggleGroup = useCallback((id: string) => {
    setGroupState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveGroupState(next);
      return next;
    });
  }, []);

  const isGroupOpen = (id: string) => !(id in groupState) ? true : groupState[id];

  const initials = (user?.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // ─── Nav item ─────────────────────────────────────────────────────

  const renderItem = (item: NavItem, idx: number) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href + idx}
        href={item.comingSoon ? '#' : item.href}
        onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}
        aria-current={active ? 'page' : undefined}
        className={[
          'group relative flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[14px] font-medium transition-all duration-200 active:scale-[0.98]',
          active
            ? 'bg-gradient-to-r from-violet-600/10 to-indigo-600/8 text-violet-700 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.18)] font-semibold'
            : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900',
        ].join(' ')}
      >
        {/* Active left indicator bar */}
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-violet-600" />
        )}

        <span className={[
          'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200',
          active
            ? 'bg-violet-600/12 text-violet-600'
            : 'bg-slate-100/70 text-slate-500 group-hover:bg-slate-200/60 group-hover:text-slate-700',
        ].join(' ')}>
          <NavIcon name={item.icon} size={14} />
        </span>

        <span className="flex-1 truncate leading-none">{item.label}</span>

        {item.comingSoon && (
          <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
            Soon
          </span>
        )}
      </Link>
    );
  };

  // ─── Section block ────────────────────────────────────────────────

  const renderGroup = (
    group: { id: string; label: string; items: NavItem[] },
    filteredItems: NavItem[],
  ) => {
    if (filteredItems.length === 0) return null;
    const open = isGroupOpen(group.id);
    const accent = GROUP_ACCENT[group.id] ?? DEFAULT_ACCENT;
    const contentHeight = filteredItems.length * 52;

    return (
      <div key={group.id} className="mb-1">
        {/* Section header */}
        <button
          onClick={() => toggleGroup(group.id)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 transition-colors duration-150 hover:bg-slate-50 active:scale-[0.99]"
        >
          <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${accent.dot}`} />
          <span className="flex-1 text-left text-[10.5px] font-[750] uppercase tracking-[0.14em] text-slate-400">
            {group.label}
          </span>
          <ChevronDown
            size={12}
            strokeWidth={2.2}
            className={`shrink-0 text-slate-300 transition-transform duration-300 ${open ? 'rotate-0' : '-rotate-90'}`}
          />
        </button>

        {/* Items with smooth max-height transition */}
        <div
          className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ maxHeight: open ? `${contentHeight}px` : '0px', opacity: open ? 1 : 0 }}
        >
          <div className="px-1 pb-1">
            {filteredItems.map((item, idx) => renderItem(item, idx))}
          </div>
        </div>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────

  return (
    <>
      {/* Cinematic backdrop */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className="fixed inset-0 z-[190] transition-all duration-400 lg:hidden"
        style={{
          background: 'rgba(15,23,42,0.42)',
          backdropFilter: mobileOpen ? 'blur(8px) saturate(1.4)' : 'blur(0px)',
          WebkitBackdropFilter: mobileOpen ? 'blur(8px) saturate(1.4)' : 'blur(0px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
      />

      {/* ── Drawer ── */}
      <aside
        aria-label="Mobile navigation"
        aria-modal="true"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="fixed inset-y-0 left-0 z-[200] flex w-[310px] flex-col overflow-hidden bg-[#fafaf9] shadow-[20px_0_80px_rgba(15,23,42,0.14)] transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden"
        style={{
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-slate-100/80 bg-white/70 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">

            {/* Brand cluster */}
            <div className="flex items-center gap-3">
              {/* Logo pill */}
              <div className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-br from-rose-50 via-white to-violet-50 shadow-[0_2px_10px_rgba(124,58,237,0.13),inset_0_1px_0_rgba(255,255,255,0.9)]">
                <Image
                  src="/619-logo.png"
                  alt="619 Fitness"
                  width={30}
                  height={30}
                  className="object-contain"
                />
                {/* Live green dot */}
                <span className="absolute bottom-[4px] right-[4px] h-2 w-2 rounded-full border-[1.5px] border-white bg-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.25)]" />
              </div>

              <div>
                <div className="text-[14px] font-[850] tracking-[0.06em] text-slate-950">
                  619 FITNESS
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Studio OS
                  </span>
                  <span className="rounded-full bg-violet-100 px-1.5 py-0 text-[9px] font-[750] uppercase tracking-wide text-violet-600">
                    Pro
                  </span>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onMobileClose}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-slate-100/80 text-slate-500 transition-all duration-150 hover:bg-slate-200/70 hover:text-slate-700 active:scale-95"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Branch badge */}
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-slate-50/80 px-3 py-2 ring-1 ring-slate-200/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="flex-1 text-[11.5px] font-medium text-slate-600 truncate">
              {(user as any)?.branch_name || 'Main Branch'}
            </span>
            <span className="text-[10px] font-[600] uppercase tracking-wide text-slate-400">Active</span>
          </div>
        </div>

        {/* ── SEARCH ─────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <div
            className={[
              'flex items-center gap-2.5 rounded-[14px] border px-3.5 py-3 transition-all duration-200',
              searchFocused
                ? 'border-violet-300/60 bg-white shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_4px_12px_rgba(124,58,237,0.08)]'
                : 'border-slate-200/70 bg-white/80 shadow-[0_1px_4px_rgba(15,23,42,0.05)]',
            ].join(' ')}
          >
            <Search
              size={14}
              strokeWidth={2}
              className={searchFocused ? 'text-violet-500' : 'text-slate-400'}
            />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search pages, members, reports…"
              className="flex-1 bg-transparent text-[13.5px] font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-slate-300 hover:text-slate-500 transition-colors"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Search results */}
          {search.trim() && searchResults.length > 0 && (
            <div className="mt-2 rounded-[14px] border border-slate-200/70 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="px-2 py-1.5">
                <div className="px-2 pb-1 text-[10px] font-[700] uppercase tracking-[0.14em] text-slate-400">
                  Results
                </div>
                {searchResults.map((item, idx) => renderItem(item, idx))}
              </div>
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div className="mt-2 rounded-[14px] border border-slate-100 bg-white px-4 py-3 text-center text-[13px] text-slate-400">
              No pages found
            </div>
          )}
        </div>

        {/* ── NAV GROUPS — scrollable ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-1 scroll-smooth">

          {/* Dashboard — standalone top item */}
          <Link
            href="/dashboard"
            aria-current={path === '/dashboard' ? 'page' : undefined}
            className={[
              'group relative mb-2 flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-[14px] font-semibold transition-all duration-200 active:scale-[0.98]',
              path === '/dashboard'
                ? 'bg-gradient-to-r from-violet-600/10 to-indigo-600/8 text-violet-700 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.18)]'
                : 'text-slate-700 hover:bg-slate-50/80 hover:text-slate-900',
            ].join(' ')}
          >
            {path === '/dashboard' && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-violet-600" />
            )}
            <span className={[
              'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200',
              path === '/dashboard'
                ? 'bg-violet-600/12 text-violet-600'
                : 'bg-slate-100/70 text-slate-500 group-hover:bg-slate-200/60 group-hover:text-slate-700',
            ].join(' ')}>
              <LayoutDashboard size={14} strokeWidth={1.7} />
            </span>
            <span className="flex-1 truncate leading-none">Dashboard</span>
          </Link>

          {/* Divider */}
          <div className="mb-3 h-px bg-slate-100/80" />

          {/* Main nav groups */}
          {NAV_GROUPS.map((group) => {
            const groupItems = group.items.filter((i) => isVisibleForRole(i, user?.role) && !i.hidden);
            return renderGroup(group, groupItems);
          })}

          {/* Settings group */}
          {(() => {
            const items = SETTINGS_GROUP.items.filter((i) => isVisibleForRole(i, user?.role) && !i.hidden);
            return renderGroup(SETTINGS_GROUP, items);
          })()}

          {/* Bottom breathing room */}
          <div className="h-4" />
        </div>

        {/* ── PROFILE FOOTER ─────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-100/80 bg-white/70 p-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 rounded-[16px] bg-slate-50/80 px-3.5 py-3 ring-1 ring-slate-200/50 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">

            {/* Avatar */}
            <button
              onClick={() => { onMobileClose?.(); router.push('/settings'); }}
              aria-label="Go to settings"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-rose-500 via-violet-600 to-indigo-600 text-[13px] font-bold text-white shadow-[0_3px_10px_rgba(124,58,237,0.3)] transition-all duration-200 hover:shadow-[0_4px_14px_rgba(124,58,237,0.4)] active:scale-95"
            >
              {initials}
              {/* Online dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-[9px] w-[9px] rounded-full border-[1.5px] border-white bg-emerald-400" />
            </button>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-[650] leading-none text-slate-900">
                {user?.name || 'User'}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-[700] uppercase tracking-wide text-violet-600">
                  {user?.role || 'Staff'}
                </span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => { logout(); router.push('/login'); }}
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-slate-400 transition-all duration-150 hover:bg-rose-50 hover:text-rose-500 active:scale-95"
            >
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
