'use client';

/**
 * Sidebar — Ultra-Premium Luxury Navigation Drawer
 *
 * Mobile: cinematic floating glass control panel.
 * Desktop (lg+): hidden — PremiumHeader handles navigation.
 *
 * Aesthetic: Apple Vision Pro × Linear × Stripe Enterprise
 * — Pearl-white frosted surfaces, deep ambient layers, spring physics,
 *   illuminated active states, executive typography.
 * — Every pixel intentional. Nothing generic.
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
  Zap, ChevronRight, Command,
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

function NavIcon({ name, size = 14 }: { name: string; size?: number }) {
  const C = ICONS[name];
  return C ? <C size={size} strokeWidth={1.5} /> : null;
}

// ─── Section identity system ──────────────────────────────────────────

const GROUP_META: Record<string, {
  dot: string;
  dotColor: string;
  activeBg: string;
  activeText: string;
  iconActiveBg: string;
  activeEdge: string;
  glowColor: string;
  label: string;
}> = {
  sales: {
    dot: 'bg-emerald-400',
    dotColor: '#34d399',
    activeBg: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(20,184,166,0.07) 100%)',
    activeText: '#065f46',
    iconActiveBg: 'rgba(16,185,129,0.12)',
    activeEdge: '#10b981',
    glowColor: 'rgba(16,185,129,0.18)',
    label: 'Revenue engine',
  },
  members: {
    dot: 'bg-sky-400',
    dotColor: '#38bdf8',
    activeBg: 'linear-gradient(135deg, rgba(14,165,233,0.10) 0%, rgba(59,130,246,0.07) 100%)',
    activeText: '#0c4a6e',
    iconActiveBg: 'rgba(14,165,233,0.12)',
    activeEdge: '#0ea5e9',
    glowColor: 'rgba(14,165,233,0.18)',
    label: 'People hub',
  },
  training: {
    dot: 'bg-violet-400',
    dotColor: '#a78bfa',
    activeBg: 'linear-gradient(135deg, rgba(139,92,246,0.11) 0%, rgba(99,102,241,0.07) 100%)',
    activeText: '#4c1d95',
    iconActiveBg: 'rgba(139,92,246,0.12)',
    activeEdge: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.20)',
    label: 'Performance',
  },
  staff: {
    dot: 'bg-rose-400',
    dotColor: '#fb7185',
    activeBg: 'linear-gradient(135deg, rgba(244,63,94,0.10) 0%, rgba(236,72,153,0.07) 100%)',
    activeText: '#881337',
    iconActiveBg: 'rgba(244,63,94,0.11)',
    activeEdge: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.16)',
    label: 'Operations',
  },
  attendance: {
    dot: 'bg-amber-400',
    dotColor: '#fbbf24',
    activeBg: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(249,115,22,0.07) 100%)',
    activeText: '#78350f',
    iconActiveBg: 'rgba(245,158,11,0.11)',
    activeEdge: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.18)',
    label: 'Check-in system',
  },
  memberships: {
    dot: 'bg-teal-400',
    dotColor: '#2dd4bf',
    activeBg: 'linear-gradient(135deg, rgba(20,184,166,0.10) 0%, rgba(6,182,212,0.07) 100%)',
    activeText: '#134e4a',
    iconActiveBg: 'rgba(20,184,166,0.12)',
    activeEdge: '#14b8a6',
    glowColor: 'rgba(20,184,166,0.18)',
    label: 'Plans & subs',
  },
  finance: {
    dot: 'bg-indigo-400',
    dotColor: '#818cf8',
    activeBg: 'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(79,70,229,0.07) 100%)',
    activeText: '#1e1b4b',
    iconActiveBg: 'rgba(99,102,241,0.12)',
    activeEdge: '#6366f1',
    glowColor: 'rgba(99,102,241,0.18)',
    label: 'Financials',
  },
  insights: {
    dot: 'bg-purple-400',
    dotColor: '#c084fc',
    activeBg: 'linear-gradient(135deg, rgba(168,85,247,0.11) 0%, rgba(139,92,246,0.07) 100%)',
    activeText: '#3b0764',
    iconActiveBg: 'rgba(168,85,247,0.12)',
    activeEdge: '#a855f7',
    glowColor: 'rgba(168,85,247,0.20)',
    label: 'Analytics',
  },
  engagement: {
    dot: 'bg-pink-400',
    dotColor: '#f472b6',
    activeBg: 'linear-gradient(135deg, rgba(236,72,153,0.10) 0%, rgba(244,63,94,0.07) 100%)',
    activeText: '#831843',
    iconActiveBg: 'rgba(236,72,153,0.11)',
    activeEdge: '#ec4899',
    glowColor: 'rgba(236,72,153,0.16)',
    label: 'Communication',
  },
  settings: {
    dot: 'bg-slate-400',
    dotColor: '#94a3b8',
    activeBg: 'linear-gradient(135deg, rgba(100,116,139,0.09) 0%, rgba(71,85,105,0.06) 100%)',
    activeText: '#1e293b',
    iconActiveBg: 'rgba(100,116,139,0.10)',
    activeEdge: '#64748b',
    glowColor: 'rgba(100,116,139,0.14)',
    label: 'Configuration',
  },
};

const DEFAULT_META = {
  dot: 'bg-slate-300',
  dotColor: '#cbd5e1',
  activeBg: 'linear-gradient(135deg, rgba(100,116,139,0.08) 0%, rgba(71,85,105,0.05) 100%)',
  activeText: '#1e293b',
  iconActiveBg: 'rgba(100,116,139,0.09)',
  activeEdge: '#94a3b8',
  glowColor: 'rgba(100,116,139,0.12)',
  label: '',
};

// ─── localStorage helpers ──────────────────────────────────────────────

const GROUPS_KEY = '619_sidebar_groups_v3';

function loadGroupState(): Record<string, boolean> {
  try { const r = localStorage.getItem(GROUPS_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function saveGroupState(s: Record<string, boolean>) {
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Badge pill ────────────────────────────────────────────────────────

function Badge({ label }: { label: string }) {
  return (
    <span
      className="ml-auto shrink-0 rounded-full px-[7px] py-[3px] text-[9px] font-[800] tabular-nums leading-none tracking-wide"
      style={{
        background: 'rgba(244,63,94,0.09)',
        color: '#be123c',
        border: '1px solid rgba(244,63,94,0.18)',
      }}
    >
      {label}
    </span>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const [groupState, setGroupState] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setGroupState(loadGroupState());
    setHydrated(true);
  }, []);

  // Close on navigation
  useEffect(() => { onMobileClose?.(); }, [onMobileClose, path]);

  // Focus search when drawer opens
  useEffect(() => {
    if (mobileOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 420);
      return () => clearTimeout(t);
    } else {
      setSearch('');
    }
  }, [mobileOpen]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) onMobileClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen, onMobileClose]);

  // ─── Swipe-to-close ─────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 55) onMobileClose?.();
    touchStartX.current = null;
  }, [onMobileClose]);

  // ─── Search ──────────────────────────────────────────────────────────

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

  // ─── Helpers ─────────────────────────────────────────────────────────

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

  // ─── Nav item ────────────────────────────────────────────────────────

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
          'group relative flex items-center gap-3 transition-all duration-200 active:scale-[0.972]',
          isChild ? 'rounded-[11px] px-3 py-2.5 ml-1' : 'rounded-[15px] px-3.5 py-[11px]',
        ].join(' ')}
        style={{
          background: active ? meta.activeBg : undefined,
          boxShadow: active && !isChild
            ? `0 2px 16px ${meta.glowColor}, inset 0 0 0 1px rgba(0,0,0,0.045)`
            : undefined,
          color: active ? meta.activeText : undefined,
          fontWeight: active ? 620 : 480,
        }}
      >
        {/* Active left-edge accent */}
        {active && !isChild && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
            style={{
              width: '3px',
              height: '18px',
              background: meta.activeEdge,
              boxShadow: `0 0 8px ${meta.glowColor}`,
            }}
          />
        )}

        {/* Hover highlight layer */}
        {!active && (
          <span
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            style={{ background: 'rgba(15,23,42,0.032)' }}
          />
        )}

        {/* Icon container */}
        <span
          className="relative flex shrink-0 items-center justify-center transition-all duration-200"
          style={{
            width: isChild ? '26px' : '30px',
            height: isChild ? '26px' : '30px',
            borderRadius: isChild ? '8px' : '10px',
            background: active
              ? meta.iconActiveBg
              : 'rgba(15,23,42,0.042)',
            boxShadow: active
              ? `0 1px 6px ${meta.glowColor}, inset 0 1px 0 rgba(255,255,255,0.6)`
              : 'inset 0 1px 0 rgba(255,255,255,0.7)',
            color: active ? meta.activeText : 'rgba(71,85,105,0.75)',
          }}
        >
          <NavIcon name={item.icon} size={isChild ? 11.5 : 13} />
        </span>

        {/* Label */}
        <span
          className="flex-1 truncate leading-none"
          style={{
            fontSize: isChild ? '12.5px' : '13.5px',
            letterSpacing: '-0.01em',
            color: active ? meta.activeText : 'rgb(51,65,85)',
          }}
        >
          {item.label}
        </span>

        {/* Badges */}
        {item.isNew && (
          <span
            className="shrink-0 rounded-full px-[7px] py-[3px] text-[9px] font-[800] uppercase leading-none tracking-wider"
            style={{
              background: 'rgba(139,92,246,0.10)',
              color: '#6d28d9',
              border: '1px solid rgba(139,92,246,0.20)',
            }}
          >
            New
          </span>
        )}
        {item.comingSoon && (
          <span
            className="shrink-0 rounded-full px-[7px] py-[3px] text-[9px] font-[700] uppercase leading-none tracking-wider"
            style={{
              background: 'rgba(245,158,11,0.09)',
              color: '#92400e',
              border: '1px solid rgba(245,158,11,0.20)',
            }}
          >
            Soon
          </span>
        )}
      </Link>
    );
  };

  // ─── Section / group block ────────────────────────────────────────────

  const renderGroup = (
    group: { id: string; label: string; items: NavItem[] },
    filteredItems: NavItem[],
  ) => {
    if (filteredItems.length === 0) return null;
    const open = isGroupOpen(group.id);
    const meta = GROUP_META[group.id] ?? DEFAULT_META;

    const contentHeight = filteredItems.reduce((acc, item) => {
      const base = 50;
      const childH = (item.children?.length ?? 0) * 42;
      return acc + base + childH;
    }, 0) + 12;

    return (
      <div key={group.id} className="mb-0.5">
        {/* Section header button */}
        <button
          onClick={() => toggleGroup(group.id)}
          aria-expanded={open}
          className="group/hdr relative flex w-full items-center gap-2.5 rounded-[12px] px-3 py-[9px] transition-all duration-150 active:scale-[0.99]"
          style={{ color: 'rgb(100,116,139)' }}
        >
          {/* Hover state */}
          <span
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 group-hover/hdr:opacity-100"
            style={{ background: 'rgba(15,23,42,0.028)' }}
          />

          {/* Color identity dot */}
          <span
            className="relative shrink-0 rounded-full"
            style={{
              width: '5px',
              height: '5px',
              background: meta.dotColor,
              boxShadow: `0 0 5px ${meta.glowColor}`,
            }}
          />

          {/* Label */}
          <span
            className="flex-1 text-left font-[800] uppercase leading-none"
            style={{ fontSize: '9.5px', letterSpacing: '0.175em', color: 'rgb(148,163,184)' }}
          >
            {group.label}
          </span>

          {/* Hover sub-label */}
          <span
            className="hidden font-[600] leading-none opacity-0 transition-opacity duration-200 group-hover/hdr:inline group-hover/hdr:opacity-100"
            style={{ fontSize: '9px', color: 'rgb(203,213,225)' }}
          >
            {meta.label}
          </span>

          {/* Chevron */}
          <ChevronDown
            size={10}
            strokeWidth={2.8}
            className="shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              color: 'rgb(203,213,225)',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          />
        </button>

        {/* Items — spring height reveal */}
        <div
          className="overflow-hidden transition-all duration-380 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            maxHeight: open ? `${contentHeight}px` : '0px',
            opacity: open ? 1 : 0,
          }}
        >
          <div className="space-y-[2px] px-1 pb-2">
            {filteredItems.map((item, idx) => {
              const hasChildren = item.children && item.children.length > 0;
              if (!hasChildren) return renderItem(item, idx, group.id);

              const childOpen = isGroupOpen(`${group.id}__${item.href}`);
              const visibleChildren = item.children!.filter(
                (c) => isVisibleForRole(c, user?.role) && !c.hidden
              );
              const parentActive = visibleChildren.some((c) => isActive(c.href));

              return (
                <div key={item.href + idx}>
                  <button
                    onClick={() => toggleGroup(`${group.id}__${item.href}`)}
                    aria-expanded={childOpen}
                    className="group relative flex w-full items-center gap-3 rounded-[15px] px-3.5 py-[11px] text-left transition-all duration-200 active:scale-[0.972]"
                    style={{
                      background: parentActive ? meta.activeBg : undefined,
                      boxShadow: parentActive
                        ? `0 2px 16px ${meta.glowColor}, inset 0 0 0 1px rgba(0,0,0,0.045)`
                        : undefined,
                      color: parentActive ? meta.activeText : 'rgb(51,65,85)',
                      fontWeight: parentActive ? 620 : 480,
                    }}
                  >
                    {/* Hover */}
                    {!parentActive && (
                      <span
                        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{ background: 'rgba(15,23,42,0.032)' }}
                      />
                    )}

                    <span
                      className="relative flex shrink-0 items-center justify-center transition-all duration-200"
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '10px',
                        background: parentActive ? meta.iconActiveBg : 'rgba(15,23,42,0.042)',
                        boxShadow: parentActive
                          ? `0 1px 6px ${meta.glowColor}, inset 0 1px 0 rgba(255,255,255,0.6)`
                          : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                        color: parentActive ? meta.activeText : 'rgba(71,85,105,0.75)',
                      }}
                    >
                      <NavIcon name={item.icon} size={13} />
                    </span>

                    <span
                      className="flex-1 truncate leading-none"
                      style={{ fontSize: '13.5px', letterSpacing: '-0.01em' }}
                    >
                      {item.label}
                    </span>

                    <ChevronRight
                      size={11}
                      strokeWidth={2.2}
                      className="shrink-0 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
                      style={{
                        color: 'rgb(203,213,225)',
                        transform: childOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>

                  {/* Children — staggered reveal */}
                  <div
                    className="overflow-hidden transition-all duration-320 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      maxHeight: childOpen ? `${visibleChildren.length * 42 + 10}px` : '0px',
                      opacity: childOpen ? 1 : 0,
                    }}
                  >
                    <div
                      className="ml-4 mt-0.5 space-y-[2px] pb-1.5 pl-2.5"
                      style={{
                        borderLeft: `1.5px solid rgba(${meta.dotColor.replace('#', '').match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',') ?? '148,163,184'},0.20)`,
                      }}
                    >
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

  // ─── Main render ──────────────────────────────────────────────────────

  return (
    <>
      {/* ── Cinematic backdrop ────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className="fixed inset-0 z-[190] lg:hidden"
        style={{
          background: 'rgba(8,12,22,0.52)',
          backdropFilter: mobileOpen ? 'blur(12px) saturate(0.7)' : 'blur(0px)',
          WebkitBackdropFilter: mobileOpen ? 'blur(12px) saturate(0.7)' : 'blur(0px)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 380ms cubic-bezier(0.16,1,0.3,1), backdrop-filter 380ms ease',
        }}
      />

      {/* ── Floating luxury panel ─────────────────────────────────────── */}
      <aside
        aria-label="Mobile navigation"
        aria-modal="true"
        role="dialog"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="fixed z-[200] flex flex-col overflow-hidden lg:hidden"
        style={{
          top: 'calc(env(safe-area-inset-top) + 12px)',
          bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          left: '10px',
          width: 'min(312px, calc(100vw - 52px))',
          borderRadius: '24px',
          /* Layered pearl glass surface */
          background: [
            'linear-gradient(160deg, rgba(255,255,255,0.975) 0%, rgba(246,247,251,0.965) 100%)',
          ].join(', '),
          boxShadow: [
            '0 40px 100px rgba(8,12,22,0.26)',
            '0 12px 28px rgba(8,12,22,0.12)',
            '0 0 0 1px rgba(255,255,255,0.75)',
            'inset 0 1px 0 rgba(255,255,255,1)',
            'inset 0 -1px 0 rgba(15,23,42,0.04)',
          ].join(', '),
          backdropFilter: 'blur(28px) saturate(2.0)',
          WebkitBackdropFilter: 'blur(28px) saturate(2.0)',
          transform: mobileOpen ? 'translateX(0) scale(1)' : 'translateX(calc(-100% - 20px)) scale(0.96)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'transform 440ms cubic-bezier(0.16,1,0.3,1), opacity 300ms ease',
          willChange: 'transform',
        }}
      >

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <div
          className="relative shrink-0 overflow-hidden rounded-t-[23px] px-4 pb-4 pt-[18px]"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,249,253,0.90) 100%)',
            borderBottom: '1px solid rgba(15,23,42,0.055)',
          }}
        >
          {/* Ambient mesh — restrained, not loud */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: [
                'radial-gradient(ellipse at 85% 0%, rgba(139,92,246,0.09) 0%, transparent 48%)',
                'radial-gradient(ellipse at 15% 100%, rgba(236,72,153,0.06) 0%, transparent 40%)',
                'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.03) 0%, transparent 60%)',
              ].join(', '),
            }}
          />

          {/* Brand + Close row */}
          <div className="relative flex items-center justify-between">
            {/* Holographic logo tile + wordmark */}
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[14px]"
                style={{
                  background: 'linear-gradient(145deg, #fef9ff 0%, #f0ebff 50%, #eef4ff 100%)',
                  boxShadow: [
                    '0 3px 14px rgba(124,58,237,0.16)',
                    '0 1px 4px rgba(15,23,42,0.06)',
                    'inset 0 1px 0 rgba(255,255,255,1)',
                    'inset 0 0 0 1px rgba(139,92,246,0.10)',
                  ].join(', '),
                }}
              >
                <Image
                  src="/619-logo.png"
                  alt="619 Fitness"
                  width={30}
                  height={30}
                  className="object-contain"
                  priority
                />
                {/* Live status beacon */}
                <span className="absolute bottom-[4px] right-[4px] flex h-[9px] w-[9px]">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span
                    className="relative h-[9px] w-[9px] rounded-full bg-emerald-400"
                    style={{
                      border: '1.5px solid rgba(255,255,255,0.95)',
                      boxShadow: '0 0 0 2px rgba(52,211,153,0.20)',
                    }}
                  />
                </span>
              </div>

              <div>
                <div
                  className="leading-none"
                  style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    color: 'rgb(15,23,42)',
                  }}
                >
                  619 FITNESS
                </div>
                <div className="mt-[6px] flex items-center gap-1.5">
                  <span
                    className="leading-none"
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'rgb(148,163,184)',
                    }}
                  >
                    Studio OS
                  </span>
                  <span
                    className="rounded-full leading-none"
                    style={{
                      padding: '2.5px 6px',
                      fontSize: '8px',
                      fontWeight: 900,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: '#6d28d9',
                      background: 'rgba(139,92,246,0.09)',
                      border: '1px solid rgba(139,92,246,0.18)',
                    }}
                  >
                    Pro
                  </span>
                </div>
              </div>
            </div>

            {/* Premium close button */}
            <button
              onClick={onMobileClose}
              aria-label="Close navigation"
              className="flex h-9 w-9 items-center justify-center rounded-[12px] transition-all duration-150 active:scale-[0.88]"
              style={{
                background: 'rgba(15,23,42,0.048)',
                border: '1px solid rgba(15,23,42,0.07)',
                color: 'rgb(100,116,139)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              <X size={14} strokeWidth={2.3} />
            </button>
          </div>

          {/* Branch status capsule */}
          <div
            className="relative mt-3.5 flex items-center gap-2.5 rounded-[13px] px-3.5 py-[11px] transition-all duration-200 active:scale-[0.99]"
            style={{
              background: 'rgba(15,23,42,0.028)',
              border: '1px solid rgba(15,23,42,0.065)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
            }}
          >
            {/* Animated pulse */}
            <span className="relative flex h-[8px] w-[8px] shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-35" style={{ animationDuration: '2s' }} />
              <span
                className="relative h-[8px] w-[8px] rounded-full bg-emerald-400"
                style={{ boxShadow: '0 0 0 2.5px rgba(52,211,153,0.18)' }}
              />
            </span>
            <span
              className="flex-1 truncate"
              style={{ fontSize: '11.5px', fontWeight: 560, color: 'rgb(51,65,85)', letterSpacing: '-0.005em' }}
            >
              {(user as any)?.branch_name || 'Main Branch'}
            </span>
            <span
              className="shrink-0 rounded-full"
              style={{
                padding: '2px 8px',
                fontSize: '9px',
                fontWeight: 750,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgb(16,185,129)',
                background: 'rgba(16,185,129,0.09)',
                border: '1px solid rgba(16,185,129,0.18)',
              }}
            >
              Live
            </span>
          </div>
        </div>

        {/* ── SEARCH ────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pt-3 pb-1.5">
          <div
            className="relative flex items-center gap-3 rounded-[15px] px-3.5 py-3 transition-all duration-250"
            style={{
              background: searchFocused ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.70)',
              border: searchFocused
                ? '1px solid rgba(139,92,246,0.30)'
                : '1px solid rgba(15,23,42,0.090)',
              boxShadow: searchFocused
                ? '0 0 0 3.5px rgba(139,92,246,0.09), 0 6px 20px rgba(124,58,237,0.10)'
                : '0 1px 4px rgba(15,23,42,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            {/* Animated search / command icon */}
            {searchFocused ? (
              <Command
                size={13}
                strokeWidth={2}
                className="shrink-0 transition-all duration-200"
                style={{ color: '#7c3aed' }}
              />
            ) : (
              <Search
                size={13}
                strokeWidth={2.1}
                className="shrink-0"
                style={{ color: 'rgb(148,163,184)' }}
              />
            )}
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search pages, members, reports…"
              className="flex-1 bg-transparent outline-none"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgb(15,23,42)',
                letterSpacing: '-0.01em',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full transition-all duration-150 active:scale-90"
                style={{
                  background: 'rgba(15,23,42,0.07)',
                  color: 'rgb(100,116,139)',
                }}
              >
                <X size={9} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Search results */}
          {search.trim() && searchResults.length > 0 && (
            <div
              className="mt-1.5 overflow-hidden rounded-[16px]"
              style={{
                background: 'rgba(255,255,255,0.98)',
                border: '1px solid rgba(15,23,42,0.08)',
                boxShadow: '0 12px 34px rgba(15,23,42,0.12)',
              }}
            >
              <div className="px-3.5 pt-2.5 pb-0.5">
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgb(148,163,184)',
                  }}
                >
                  Results
                </span>
              </div>
              <div className="px-2 pb-2 space-y-[2px]">
                {searchResults.map((item, idx) => renderItem(item, idx, (item as any).groupId))}
              </div>
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <div
              className="mt-1.5 rounded-[14px] px-4 py-3 text-center"
              style={{
                background: 'rgba(255,255,255,0.80)',
                border: '1px solid rgba(15,23,42,0.07)',
                fontSize: '13px',
                color: 'rgb(148,163,184)',
              }}
            >
              No pages found
            </div>
          )}
        </div>

        {/* ── NAV SCROLL AREA ───────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain scroll-smooth px-2.5 py-2"
          style={{ scrollbarWidth: 'none' }}
        >
          <style>{`
            .sidebar-scroll::-webkit-scrollbar { display: none; }
          `}</style>

          {/* Dashboard — hero standalone item */}
          <Link
            href="/dashboard"
            aria-current={path === '/dashboard' ? 'page' : undefined}
            className="group relative mb-2.5 flex items-center gap-3 rounded-[15px] px-3.5 py-[12px] transition-all duration-200 active:scale-[0.972]"
            style={{
              background: path === '/dashboard'
                ? 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.08) 100%)'
                : undefined,
              boxShadow: path === '/dashboard'
                ? '0 2px 18px rgba(139,92,246,0.20), inset 0 0 0 1px rgba(139,92,246,0.10)'
                : undefined,
              color: path === '/dashboard' ? '#4c1d95' : 'rgb(51,65,85)',
              fontWeight: path === '/dashboard' ? 640 : 500,
            }}
          >
            {path !== '/dashboard' && (
              <span
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{ background: 'rgba(15,23,42,0.030)' }}
              />
            )}
            {path === '/dashboard' && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                style={{
                  width: '3px',
                  height: '18px',
                  background: '#7c3aed',
                  boxShadow: '0 0 8px rgba(139,92,246,0.40)',
                }}
              />
            )}
            <span
              className="relative flex shrink-0 items-center justify-center"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '10px',
                background: path === '/dashboard' ? 'rgba(139,92,246,0.12)' : 'rgba(15,23,42,0.042)',
                boxShadow: path === '/dashboard'
                  ? '0 1px 6px rgba(139,92,246,0.20), inset 0 1px 0 rgba(255,255,255,0.6)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                color: path === '/dashboard' ? '#6d28d9' : 'rgba(71,85,105,0.75)',
              }}
            >
              <LayoutDashboard size={13} strokeWidth={1.5} />
            </span>
            <span
              className="flex-1 truncate leading-none"
              style={{ fontSize: '13.5px', letterSpacing: '-0.01em' }}
            >
              Dashboard
            </span>
            {path === '/dashboard' && (
              <Zap
                size={10}
                strokeWidth={2.2}
                style={{ color: '#8b5cf6', flexShrink: 0 }}
              />
            )}
          </Link>

          {/* Modules divider */}
          <div className="mx-1 mb-3 flex items-center gap-2.5" aria-hidden="true">
            <div className="h-px flex-1" style={{ background: 'rgba(15,23,42,0.07)' }} />
            <span
              style={{
                fontSize: '8.5px',
                fontWeight: 800,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgb(203,213,225)',
              }}
            >
              Modules
            </span>
            <div className="h-px flex-1" style={{ background: 'rgba(15,23,42,0.07)' }} />
          </div>

          {/* Main nav groups */}
          {NAV_GROUPS.map((group) => {
            const groupItems = group.items.filter(
              (i) => isVisibleForRole(i, user?.role) && !i.hidden
            );
            return renderGroup(group, groupItems);
          })}

          {/* System divider */}
          <div className="mx-1 my-3 flex items-center gap-2.5" aria-hidden="true">
            <div className="h-px flex-1" style={{ background: 'rgba(15,23,42,0.07)' }} />
            <span
              style={{
                fontSize: '8.5px',
                fontWeight: 800,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgb(203,213,225)',
              }}
            >
              System
            </span>
            <div className="h-px flex-1" style={{ background: 'rgba(15,23,42,0.07)' }} />
          </div>

          {/* Settings group */}
          {(() => {
            const items = SETTINGS_GROUP.items.filter(
              (i) => isVisibleForRole(i, user?.role) && !i.hidden
            );
            return renderGroup(SETTINGS_GROUP, items);
          })()}

          <div className="h-5" />
        </div>

        {/* ── EXECUTIVE PROFILE FOOTER ─────────────────────────────────── */}
        <div
          className="shrink-0 rounded-b-[23px] px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-2.5"
          style={{
            background: 'linear-gradient(180deg, rgba(248,249,253,0.72) 0%, rgba(255,255,255,0.95) 100%)',
            borderTop: '1px solid rgba(15,23,42,0.055)',
          }}
        >
          <div
            className="flex items-center gap-3 rounded-[18px] px-3.5 py-3 transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid rgba(15,23,42,0.068)',
              boxShadow: [
                '0 2px 10px rgba(15,23,42,0.05)',
                'inset 0 1px 0 rgba(255,255,255,0.9)',
              ].join(', '),
            }}
          >
            {/* Gradient avatar */}
            <button
              onClick={() => { onMobileClose?.(); router.push('/settings'); }}
              aria-label="Go to settings"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[13px] font-[800] text-white transition-all duration-200 active:scale-[0.92]"
              style={{
                background: 'linear-gradient(135deg, #f43f5e 0%, #7c3aed 55%, #4f46e5 100%)',
                boxShadow: '0 4px 16px rgba(124,58,237,0.32)',
                letterSpacing: '0.02em',
              }}
            >
              {initials}
              {/* Online dot */}
              <span
                className="absolute flex"
                style={{
                  bottom: '-2px',
                  right: '-2px',
                  width: '10px',
                  height: '10px',
                }}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" style={{ animationDuration: '2.5s' }} />
                <span
                  className="relative h-[10px] w-[10px] rounded-full bg-emerald-400"
                  style={{
                    border: '1.5px solid rgba(255,255,255,1)',
                    boxShadow: '0 0 0 2px rgba(52,211,153,0.18)',
                  }}
                />
              </span>
            </button>

            {/* User identity */}
            <div className="min-w-0 flex-1">
              <div
                className="truncate leading-none"
                style={{ fontSize: '13px', fontWeight: 680, color: 'rgb(15,23,42)', letterSpacing: '-0.01em' }}
              >
                {user?.name || 'User'}
              </div>
              <div className="mt-[7px] flex items-center gap-1.5">
                <span
                  className="rounded-full leading-none"
                  style={{
                    padding: '2.5px 7px',
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: '#6d28d9',
                    background: 'rgba(139,92,246,0.09)',
                    border: '1px solid rgba(139,92,246,0.16)',
                  }}
                >
                  {user?.role || 'Staff'}
                </span>
                <span style={{ fontSize: '9px', color: 'rgb(203,213,225)' }}>·</span>
                <span style={{ fontSize: '9.5px', color: 'rgb(148,163,184)', fontWeight: 500 }}>Online</span>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => { logout(); router.push('/login'); }}
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] transition-all duration-150 active:scale-[0.88]"
              style={{
                background: 'transparent',
                color: 'rgb(148,163,184)',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.07)';
                (e.currentTarget as HTMLElement).style.color = '#e11d48';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'rgb(148,163,184)';
                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
              }}
            >
              <LogOut size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
