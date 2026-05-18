'use client';

/**
 * Sidebar — premium Linear/Notion-style navigation.
 * Mobile: full-screen drawer (slides in from left, z-[200]).
 * Desktop (lg+): hidden — PremiumHeader takes over navigation.
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
  ChevronRight, Search, LogOut, PanelLeftClose, PanelLeftOpen, X,
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

function Icon({ name, size = 15 }: { name: string; size?: string | number }) {
  const C = ICONS[name];
  return C ? <C size={size} /> : null;
}

// ─── Persistence helpers ─────────────────────────────────────────────

const GROUPS_KEY = '619_sidebar_groups';

function loadGroupState(): Record<string, boolean> {
  try { const raw = localStorage.getItem(GROUPS_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function saveGroupState(s: Record<string, boolean>) {
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Props ───────────────────────────────────────────────────────────

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
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGroupState(loadGroupState());
    setHydrated(true);
  }, []);

  // Close drawer on route change
  useEffect(() => { onMobileClose?.(); }, [path]);

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

  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  // ─── Render item ──────────────────────────────────────────────────

  const renderItem = (item: NavItem, idx: number) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href + idx}
        href={item.comingSoon ? '#' : item.href}
        onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}
        aria-current={active ? 'page' : undefined}
        style={active
          ? { background: 'linear-gradient(135deg,#ede9fe,#e0e7ff)', color: '#5b21b6', fontWeight: 700 }
          : undefined
        }
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
      >
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center">
          <Icon name={item.icon} size={15} />
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  // ─── Drawer backdrop + panel ───────────────────────────────────────
  // We render this unconditionally and use CSS transitions so React
  // doesn't remount on every open/close.

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onMobileClose}
        className="fixed inset-0 z-[190] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
        style={{ opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? 'auto' : 'none' }}
      />

      {/* Drawer */}
      <aside
        aria-label="Mobile navigation"
        aria-modal="true"
        className="fixed inset-y-0 left-0 z-[200] flex w-[280px] flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden"
        style={{ transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {/* Drawer header */}
        <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-[36px] w-[36px] items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-violet-50 to-indigo-100">
              <Image src="/619-logo.png" alt="619 Fitness" width={28} height={28} style={{ objectFit: 'contain' }} />
            </div>
            <div>
              <div className="text-[13px] font-black tracking-[0.08em] text-slate-900">619 FITNESS</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.20em] text-slate-400">Studio</div>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-3 pt-3 pb-1">
          {searchOpen ? (
            <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/50 px-3 py-2">
              <Search size={13} className="shrink-0 text-violet-500" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages…"
                autoFocus
                className="flex-1 bg-transparent text-[13px] text-slate-800 placeholder-slate-400 outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-[13px] text-slate-400 transition-all hover:border-violet-200 hover:bg-violet-50/50 hover:text-slate-600"
            >
              <Search size={13} className="shrink-0" />
              <span>Search pages…</span>
            </button>
          )}
        </div>

        {/* Search results */}
        {search.trim() && searchResults.length > 0 && (
          <div className="shrink-0 px-3 pb-1">
            {searchResults.map((item, idx) => renderItem(item, idx))}
          </div>
        )}

        {/* Nav groups — scrollable */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {/* Dashboard quick link */}
          <Link
            href="/dashboard"
            className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-150 ${
              path === '/dashboard'
                ? 'bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Dashboard</span>
          </Link>

          {NAV_GROUPS.map((group) => {
            const groupItems = group.items.filter((i) => isVisibleForRole(i, user?.role) && !i.hidden);
            if (groupItems.length === 0) return null;
            const open = isGroupOpen(group.id);

            return (
              <div key={group.id} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-600"
                >
                  <span>{group.label}</span>
                  <ChevronRight
                    size={11}
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  />
                </button>

                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{ maxHeight: open ? `${groupItems.length * 44}px` : '0px' }}
                >
                  {groupItems.map((item, idx) => renderItem(item, idx))}
                </div>
              </div>
            );
          })}

          {/* Settings group */}
          {(() => {
            const settingsItems = SETTINGS_GROUP.items.filter((i) => isVisibleForRole(i, user?.role) && !i.hidden);
            if (!settingsItems.length) return null;
            const open = isGroupOpen(SETTINGS_GROUP.id);
            return (
              <div className="mb-1">
                <button
                  onClick={() => toggleGroup(SETTINGS_GROUP.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-600"
                >
                  <span>{SETTINGS_GROUP.label}</span>
                  <ChevronRight size={11} className="shrink-0 transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                </button>
                <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: open ? `${settingsItems.length * 44}px` : '0px' }}>
                  {settingsItems.map((item, idx) => renderItem(item, idx))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <button
              onClick={() => { onMobileClose?.(); router.push('/settings'); }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-[13px] font-bold text-white shadow-sm"
              aria-label="Go to settings"
            >
              {initials}
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-slate-900">{user?.name || 'User'}</div>
              <div className="text-[11px] capitalize text-slate-400">{user?.role || 'Staff'}</div>
            </div>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              aria-label="Sign out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
