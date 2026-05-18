'use client';

/**
 * Sidebar — Ultra-Premium Mobile Navigation Drawer
 *
 * Mobile: luxury floating glass panel that slides in from the left.
 * Desktop (lg+): hidden — PremiumHeader handles navigation.
 *
 * Design philosophy: Apple × Linear × Stripe
 * — Warm frosted surfaces, layered depth, spring physics, iOS-quality touch.
 * — Every pixel intentional. Nothing generic.
 *
 * Routes, dropdowns, role logic, and all functionality are fully preserved.
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
  ChevronDown, Search, LogOut, X, Target, UsersRound,
  Zap, ChevronRight,
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

// ─── Icon map ─────────────────────────────────────────────────────────

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
  Target, UsersRound, Zap,
};

function NavIcon({ name, size = 15 }: { name: string; size?: number }) {
  const C = ICONS[name];
  return C ? <C size={size} strokeWidth={1.6} /> : null;
}

// ─── Section accent config — one identity per module ─────────────────

const GROUP_META: Record<string, {
  dot: string;
  ring: string;
  activeBg: string;
  activeText: string;
  iconActiveBg: string;
  label: string;
}> = {
  sales:       { dot: 'bg-emerald-400',  ring: 'ring-emerald-200/60', activeBg: 'from-emerald-500/[0.09] to-teal-500/[0.06]',     activeText: 'text-emerald-700',  iconActiveBg: 'bg-emerald-500/[0.12] text-emerald-600',  label: 'Revenue engine'    },
  members:     { dot: 'bg-sky-400',      ring: 'ring-sky-200/60',     activeBg: 'from-sky-500/[0.09] to-blue-500/[0.06]',         activeText: 'text-sky-700',      iconActiveBg: 'bg-sky-500/[0.12] text-sky-600',          label: 'People hub'        },
  training:    { dot: 'bg-violet-400',   ring: 'ring-violet-200/60',  activeBg: 'from-violet-500/[0.10] to-indigo-500/[0.07]',    activeText: 'text-violet-700',   iconActiveBg: 'bg-violet-500/[0.12] text-violet-600',    label: 'Performance'       },
  staff:       { dot: 'bg-rose-400',     ring: 'ring-rose-200/60',    activeBg: 'from-rose-500/[0.09] to-pink-500/[0.06]',        activeText: 'text-rose-700',     iconActiveBg: 'bg-rose-500/[0.12] text-rose-600',        label: 'Operations'        },
  attendance:  { dot: 'bg-amber-400',    ring: 'ring-amber-200/60',   activeBg: 'from-amber-500/[0.09] to-orange-500/[0.06]',     activeText: 'text-amber-700',    iconActiveBg: 'bg-amber-500/[0.12] text-amber-600',      label: 'Check-in system'   },
  memberships: { dot: 'bg-teal-400',     ring: 'ring-teal-200/60',    activeBg: 'from-teal-500/[0.09] to-cyan-500/[0.06]',        activeText: 'text-teal-700',     iconActiveBg: 'bg-teal-500/[0.12] text-teal-600',        label: 'Plans & subs'      },
  finance:     { dot: 'bg-indigo-400',   ring: 'ring-indigo-200/60',  activeBg: 'from-indigo-500/[0.09] to-blue-600/[0.06]',      activeText: 'text-indigo-700',   iconActiveBg: 'bg-indigo-500/[0.12] text-indigo-600',    label: 'Financials'        },
  insights:    { dot: 'bg-purple-400',   ring: 'ring-purple-200/60',  activeBg: 'from-purple-500/[0.10] to-violet-500/[0.07]',    activeText: 'text-purple-700',   iconActiveBg: 'bg-purple-500/[0.12] text-purple-600',    label: 'Analytics'         },
  engagement:  { dot: 'bg-pink-400',     ring: 'ring-pink-200/60',    activeBg: 'from-pink-500/[0.09] to-rose-500/[0.06]',        activeText: 'text-pink-700',     iconActiveBg: 'bg-pink-500/[0.12] text-pink-600',        label: 'Communication'     },
  settings:    { dot: 'bg-slate-400',    ring: 'ring-slate-200/60',   activeBg: 'from-slate-500/[0.07] to-slate-400/[0.05]',      activeText: 'text-slate-700',    iconActiveBg: 'bg-slate-200/70 text-slate-500',           label: 'Configuration'     },
};

const DEFAULT_META = {
  dot: 'bg-slate-300', ring: 'ring-slate-200/40',
  activeBg: 'from-slate-500/[0.07] to-slate-400/[0.05]',
  activeText: 'text-slate-700',
  iconActiveBg: 'bg-slate-100 text-slate-500',
  label: '',
};

// ─── localStorage helpers (group collapse state) ───────────────────────

const GROUPS_KEY = '619_sidebar_groups_v2';

function loadGroupState(): Record<string, boolean> {
  try { const r = localStorage.getItem(GROUPS_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function saveGroupState(s: Record<string, boolean>) {
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Tiny badge pill ──────────────────────────────────────────────────

function Badge({ label }: { label: string }) {
  return (
    <span className="ml-auto shrink-0 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-[700] tabular-nums text-rose-600 leading-none ring-1 ring-rose-200/50">
      {label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const [groupState, setGroupState] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Swipe-to-close touch tracking
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setGroupState(loadGroupState());
    setHydrated(true);
  }, []);

  // Auto-close on navigation
  useEffect(() => { onMobileClose?.(); }, [path]);

  // Focus search when drawer opens
  useEffect(() => {
    if (mobileOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 380);
      return () => clearTimeout(t);
    } else {
      setSearch('');
    }
  }, [mobileOpen]);

  // ─── Swipe-to-close ───────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 55) onMobileClose?.();
    touchStartX.current = null;
  }, [onMobileClose]);

  // ─── Search data ──────────────────────────────────────────────────

  const visibleItems = useMemo(() =>
    allNavItems().filter((i) => i.href !== '/dashboard' && isVisibleForRole(i, user?.role) && !i.hidden),
    [user?.role]
  );

  const fuse = useMemo(() =>
    new Fuse(visibleItems, { keys: ['label', 'groupLabel'], threshold: 0.35 }),
    [visibleItems]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return fuse.search(search).map((r) => r.item).slice(0, 8);
  }, [search, fuse]);

  // ─── Helpers ──────────────────────────────────────────────────────

  const isActive = useCallback((href: string) => {
    const h = href.split('?')[0];
    const p = path.split('?')[0];
    if (h === '/dashboard') return p === '/dashboard';
    return p === h || p.startsWith(h + '/');
  }, [path]);

  const toggleGroup = useCallback((id: string) => {
    setGroupState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveGroupState(next);
      return next;
    });
  }, []);

  const isGroupOpen = (id: string) => !(id in groupState) ? true : groupState[id];

  const initials = (user?.name || 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // ─── Nav item ─────────────────────────────────────────────────────

  const renderItem = (item: NavItem, idx: number, groupId = 'default', isChild = false) => {
    const active = isActive(item.href);
    const meta = GROUP_META[groupId] ?? DEFAULT_META;

    return (
      <Link
        key={item.href + idx}
        href={item.comingSoon ? '#' : item.href}
        onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}
        aria-current={active ? 'page' : undefined}
        className={[
          'group relative flex items-center gap-3 rounded-[13px] transition-all duration-200 active:scale-[0.975]',
          isChild ? 'px-3 py-2.5 ml-1' : 'px-3 py-[11px]',
          active
            ? `bg-gradient-to-r ${meta.activeBg} ${meta.activeText} font-[620] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.055)]`
            : 'text-slate-500 hover:bg-white/70 hover:text-slate-800',
        ].join(' ')}
      >
        {/* Active left edge indicator */}
        {active && !isChild && (
          <span className={`absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full ${meta.dot}`} />
        )}

        {/* Icon container */}
        <span className={[
          'flex shrink-0 items-center justify-center rounded-[9px] transition-all duration-200',
          isChild ? 'h-[26px] w-[26px]' : 'h-[30px] w-[30px]',
          active
            ? meta.iconActiveBg
            : 'bg-slate-100/60 text-slate-400 group-hover:bg-white group-hover:text-slate-600 group-hover:shadow-[0_1px_4px_rgba(15,23,42,0.08)]',
        ].join(' ')}>
          <NavIcon name={item.icon} size={isChild ? 12 : 13} />
        </span>

        {/* Label */}
        <span className={[
          'flex-1 truncate leading-none',
          isChild ? 'text-[12.5px]' : 'text-[13.5px]',
        ].join(' ')}>
          {item.label}
        </span>

        {/* Badges */}
        {item.isNew && (
          <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-[750] uppercase tracking-wide text-violet-600 ring-1 ring-violet-200/60">
            New
          </span>
        )}
        {item.comingSoon && (
          <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-[650] uppercase tracking-wide text-amber-600 ring-1 ring-amber-200/50">
            Soon
          </span>
        )}
      </Link>
    );
  };

  // ─── Section / group block ─────────────────────────────────────────

  const renderGroup = (
    group: { id: string; label: string; items: NavItem[] },
    filteredItems: NavItem[],
  ) => {
    if (filteredItems.length === 0) return null;
    const open = isGroupOpen(group.id);
    const meta = GROUP_META[group.id] ?? DEFAULT_META;

    // Estimate content height (child lists counted too)
    const contentHeight = filteredItems.reduce((acc, item) => {
      const base = 48;
      const childH = (item.children?.length ?? 0) * 40;
      return acc + base + childH;
    }, 0) + 8;

    return (
      <div key={group.id} className="mb-0.5">
        {/* Section header */}
        <button
          onClick={() => toggleGroup(group.id)}
          aria-expanded={open}
          className="group/header flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] transition-all duration-150 hover:bg-white/60 active:scale-[0.99]"
        >
          {/* Module color dot */}
          <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${meta.dot} opacity-80`} />

          {/* Section label */}
          <span className="flex-1 text-left text-[10px] font-[800] uppercase tracking-[0.16em] text-slate-380 text-slate-400">
            {group.label}
          </span>

          {/* Subtle label on hover */}
          <span className="hidden text-[9.5px] font-medium text-slate-300 transition-opacity duration-150 group-hover/header:inline">
            {meta.label}
          </span>

          <ChevronDown
            size={11}
            strokeWidth={2.5}
            className={`shrink-0 text-slate-300 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-0' : '-rotate-90'}`}
          />
        </button>

        {/* Items — smooth spring height */}
        <div
          className="overflow-hidden transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            maxHeight: open ? `${contentHeight}px` : '0px',
            opacity: open ? 1 : 0,
          }}
        >
          <div className="space-y-[1px] px-1 pb-1.5">
            {filteredItems.map((item, idx) => {
              const hasChildren = item.children && item.children.length > 0;
              if (!hasChildren) return renderItem(item, idx, group.id);

              // Parent with children — expandable
              const childOpen = isGroupOpen(`${group.id}__${item.href}`);
              const visibleChildren = item.children!.filter(
                (c) => isVisibleForRole(c, user?.role) && !c.hidden
              );

              return (
                <div key={item.href + idx}>
                  <button
                    onClick={() => toggleGroup(`${group.id}__${item.href}`)}
                    aria-expanded={childOpen}
                    className={[
                      'group relative flex w-full items-center gap-3 rounded-[13px] px-3 py-[11px] text-left transition-all duration-200 active:scale-[0.975]',
                      visibleChildren.some((c) => isActive(c.href))
                        ? `bg-gradient-to-r ${meta.activeBg} ${meta.activeText} font-[620]`
                        : 'text-slate-500 hover:bg-white/70 hover:text-slate-800',
                    ].join(' ')}
                  >
                    <span className={[
                      'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] transition-all duration-200',
                      visibleChildren.some((c) => isActive(c.href))
                        ? meta.iconActiveBg
                        : 'bg-slate-100/60 text-slate-400 group-hover:bg-white group-hover:text-slate-600',
                    ].join(' ')}>
                      <NavIcon name={item.icon} size={13} />
                    </span>
                    <span className="flex-1 truncate text-[13.5px] leading-none">{item.label}</span>
                    <ChevronRight
                      size={12}
                      strokeWidth={2}
                      className={`shrink-0 text-slate-300 transition-transform duration-250 ${childOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      maxHeight: childOpen ? `${visibleChildren.length * 40 + 8}px` : '0px',
                      opacity: childOpen ? 1 : 0,
                    }}
                  >
                    <div className="ml-3 mt-0.5 space-y-[1px] border-l border-slate-100 pl-2 pb-1.5">
                      {visibleChildren.map((child, ci) => renderItem(child, ci, group.id, true))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────

  return (
    <>
      {/* ── Cinematic backdrop ──────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className="fixed inset-0 z-[190] lg:hidden"
        style={{
          background: 'rgba(10,14,26,0.48)',
          backdropFilter: mobileOpen ? 'blur(10px) saturate(1.6)' : 'blur(0px)',
          WebkitBackdropFilter: mobileOpen ? 'blur(10px) saturate(1.6)' : 'blur(0px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 360ms cubic-bezier(0.16,1,0.3,1), backdrop-filter 360ms ease',
        }}
      />

      {/* ── Floating drawer panel ───────────────────────────────────── */}
      <aside
        aria-label="Mobile navigation"
        aria-modal="true"
        role="dialog"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="fixed z-[200] flex flex-col overflow-hidden lg:hidden"
        style={{
          /* Floating — inset from edges for luxury feel */
          top: 'calc(env(safe-area-inset-top) + 10px)',
          bottom: 'calc(env(safe-area-inset-bottom) + 10px)',
          left: '8px',
          width: 'min(308px, calc(100vw - 48px))',
          borderRadius: '22px',
          /* Layered glass surface */
          background: 'linear-gradient(160deg, rgba(255,255,255,0.97) 0%, rgba(248,249,252,0.96) 100%)',
          boxShadow: '0 32px 80px rgba(10,14,26,0.22), 0 8px 20px rgba(10,14,26,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          /* Spring slide animation */
          transform: mobileOpen ? 'translateX(0) scale(1)' : 'translateX(calc(-100% - 16px)) scale(0.97)',
          opacity: mobileOpen ? 1 : 0,
          transition: 'transform 420ms cubic-bezier(0.16,1,0.3,1), opacity 300ms ease',
          willChange: 'transform',
        }}
      >

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div
          className="relative shrink-0 overflow-hidden rounded-t-[21px] px-4 pb-3.5 pt-4"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(245,246,250,0.88) 100%)' }}
        >
          {/* Ambient mesh behind header */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 90% 0%, rgba(139,92,246,0.10) 0%, transparent 50%), radial-gradient(circle at 10% 100%, rgba(244,63,94,0.07) 0%, transparent 40%)',
            }}
          />

          <div className="relative flex items-center justify-between">
            {/* Brand cluster */}
            <div className="flex items-center gap-3">
              {/* Glass logo tile */}
              <div
                className="relative flex h-[44px] w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-[14px]"
                style={{
                  background: 'linear-gradient(135deg, #fff8f8 0%, #f5f0ff 100%)',
                  boxShadow: '0 2px 12px rgba(124,58,237,0.14), inset 0 1px 0 rgba(255,255,255,1)',
                  border: '1px solid rgba(255,255,255,0.8)',
                }}
              >
                <Image
                  src="/619-logo.png"
                  alt="619 Fitness"
                  width={30}
                  height={30}
                  className="object-contain"
                />
                {/* Live status dot */}
                <span
                  className="absolute bottom-[3px] right-[3px] h-[8px] w-[8px] rounded-full border-[1.5px] border-white bg-emerald-400"
                  style={{ boxShadow: '0 0 0 2.5px rgba(52,211,153,0.22)' }}
                />
              </div>

              <div>
                <div className="text-[14px] font-[875] tracking-[0.07em] text-slate-950 leading-none">
                  619 FITNESS
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9.5px] font-[700] uppercase tracking-[0.20em] text-slate-400 leading-none">
                    Studio OS
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[8.5px] font-[800] uppercase tracking-wide text-violet-600 leading-none"
                    style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.18)' }}
                  >
                    Pro
                  </span>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onMobileClose}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-[11px] text-slate-400 transition-all duration-150 active:scale-90"
              style={{ background: 'rgba(15,23,42,0.055)', border: '1px solid rgba(15,23,42,0.06)' }}
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>

          {/* Branch chip */}
          <div
            className="relative mt-3 flex items-center gap-2 rounded-[11px] px-3 py-2.5"
            style={{
              background: 'rgba(15,23,42,0.03)',
              border: '1px solid rgba(15,23,42,0.07)',
            }}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="flex-1 truncate text-[11.5px] font-[560] text-slate-600">
              {(user as any)?.branch_name || 'Main Branch'}
            </span>
            <span className="text-[9.5px] font-[700] uppercase tracking-[0.14em] text-slate-400">
              Active
            </span>
          </div>
        </div>

        {/* ── SEARCH ─────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pt-3 pb-1">
          <div
            className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 transition-all duration-250"
            style={{
              background: searchFocused ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.75)',
              border: searchFocused
                ? '1px solid rgba(139,92,246,0.32)'
                : '1px solid rgba(15,23,42,0.10)',
              boxShadow: searchFocused
                ? '0 0 0 3px rgba(139,92,246,0.10), 0 4px 14px rgba(124,58,237,0.09)'
                : '0 1px 4px rgba(15,23,42,0.04)',
            }}
          >
            <Search
              size={13.5}
              strokeWidth={2.2}
              className={`shrink-0 transition-colors duration-200 ${searchFocused ? 'text-violet-500' : 'text-slate-380 text-slate-400'}`}
            />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search pages, members, reports…"
              className="flex-1 bg-transparent text-[13px] font-medium text-slate-800 placeholder-slate-400 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="text-slate-300 transition-colors hover:text-slate-500"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Search results */}
          {search.trim() && searchResults.length > 0 && (
            <div
              className="mt-1.5 overflow-hidden rounded-[14px]"
              style={{
                background: 'rgba(255,255,255,0.97)',
                border: '1px solid rgba(15,23,42,0.09)',
                boxShadow: '0 10px 28px rgba(15,23,42,0.10)',
              }}
            >
              <div className="px-2.5 pt-2 pb-0.5">
                <span className="px-1 text-[9.5px] font-[750] uppercase tracking-[0.16em] text-slate-380 text-slate-400">
                  Results
                </span>
              </div>
              <div className="px-2 pb-2 space-y-[1px]">
                {searchResults.map((item, idx) => renderItem(item, idx, (item as any).groupId))}
              </div>
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div
              className="mt-1.5 rounded-[14px] px-4 py-3 text-center text-[13px] text-slate-400"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,23,42,0.07)' }}
            >
              No pages found
            </div>
          )}
        </div>

        {/* ── NAV — scrollable area ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth px-2.5 py-2">

          {/* Dashboard — standalone hero item */}
          <Link
            href="/dashboard"
            aria-current={path === '/dashboard' ? 'page' : undefined}
            className={[
              'group relative mb-2 flex items-center gap-3 rounded-[13px] px-3 py-[11px] text-[13.5px] font-[600] transition-all duration-200 active:scale-[0.975]',
              path === '/dashboard'
                ? 'bg-gradient-to-r from-violet-500/[0.10] to-indigo-500/[0.07] text-violet-700 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.12)]'
                : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
            ].join(' ')}
          >
            {path === '/dashboard' && (
              <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-violet-500" />
            )}
            <span className={[
              'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] transition-all duration-200',
              path === '/dashboard'
                ? 'bg-violet-500/[0.12] text-violet-600'
                : 'bg-slate-100/60 text-slate-400 group-hover:bg-white group-hover:text-slate-600 group-hover:shadow-[0_1px_4px_rgba(15,23,42,0.08)]',
            ].join(' ')}>
              <LayoutDashboard size={13} strokeWidth={1.6} />
            </span>
            <span className="flex-1 truncate leading-none">Dashboard</span>
            {path === '/dashboard' && (
              <Zap size={11} className="shrink-0 text-violet-400" strokeWidth={2} />
            )}
          </Link>

          {/* Section divider */}
          <div
            className="mx-1 mb-3 flex items-center gap-2"
            aria-hidden="true"
          >
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[8.5px] font-[700] uppercase tracking-[0.22em] text-slate-300">Modules</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* Main nav groups */}
          {NAV_GROUPS.map((group) => {
            const groupItems = group.items.filter(
              (i) => isVisibleForRole(i, user?.role) && !i.hidden
            );
            return renderGroup(group, groupItems);
          })}

          {/* Settings separator */}
          <div
            className="mx-1 my-3 flex items-center gap-2"
            aria-hidden="true"
          >
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-[8.5px] font-[700] uppercase tracking-[0.22em] text-slate-300">System</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* Settings group */}
          {(() => {
            const items = SETTINGS_GROUP.items.filter(
              (i) => isVisibleForRole(i, user?.role) && !i.hidden
            );
            return renderGroup(SETTINGS_GROUP, items);
          })()}

          <div className="h-4" />
        </div>

        {/* ── PROFILE FOOTER ─────────────────────────────────────────── */}
        <div
          className="shrink-0 rounded-b-[21px] px-3 pb-3.5 pt-2.5"
          style={{
            background: 'linear-gradient(180deg, rgba(248,249,252,0.70) 0%, rgba(255,255,255,0.92) 100%)',
            borderTop: '1px solid rgba(15,23,42,0.06)',
          }}
        >
          <div
            className="flex items-center gap-3 rounded-[16px] px-3.5 py-3"
            style={{
              background: 'rgba(255,255,255,0.80)',
              border: '1px solid rgba(15,23,42,0.07)',
              boxShadow: '0 1px 8px rgba(15,23,42,0.04)',
            }}
          >
            {/* Gradient avatar */}
            <button
              onClick={() => { onMobileClose?.(); router.push('/settings'); }}
              aria-label="Go to settings"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[13px] font-[750] text-white transition-all duration-200 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f43f5e 0%, #7c3aed 50%, #4f46e5 100%)',
                boxShadow: '0 4px 14px rgba(124,58,237,0.32)',
              }}
            >
              {initials}
              {/* Online indicator */}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-[9px] w-[9px] rounded-full border-[1.5px] border-white bg-emerald-400"
                style={{ boxShadow: '0 0 0 2px rgba(52,211,153,0.2)' }}
              />
            </button>

            {/* User info */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-[660] leading-none text-slate-900">
                {user?.name || 'User'}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-[750] uppercase tracking-wide text-violet-600 leading-none"
                  style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.16)' }}
                >
                  {user?.role || 'Staff'}
                </span>
                <span className="text-[9px] text-slate-400">•</span>
                <span className="text-[9.5px] text-slate-400">Online</span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => { logout(); router.push('/login'); }}
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-slate-400 transition-all duration-150 hover:bg-rose-50 hover:text-rose-500 active:scale-90"
            >
              <LogOut size={14} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
