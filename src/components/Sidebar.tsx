'use client';
/**
 * Sidebar — Premium luxury left navigation.
 * Linear × Arc × Notion inspired. Violet/indigo active states.
 * 3 states: expanded (desktop), compact icon-only (tablet), mobile drawer.
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
  ChevronRight, Search, LogOut, PanelLeftClose, PanelLeftOpen,
  Zap, Target, BarChart2,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';

import {
  NAV_GROUPS,
  isVisibleForRole,
  type NavItem,
} from '@/lib/nav-config';

// ─── Icon map ──────────────────────────────────────────────────────
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
  Zap, Target, BarChart2,
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const C = ICONS[name];
  return C ? <C size={size} strokeWidth={1.8} /> : null;
}

// ─── Nav items flat list ────────────────────────────────────────────
const TOP_NAV: NavItem[] = [
  { href: '/dashboard',   icon: 'LayoutDashboard', label: 'Dashboard'  },
  { href: '/sales',       icon: 'TrendingUp',      label: 'Sales'      },
  { href: '/members',     icon: 'Users',           label: 'Members'    },
  { href: '/training',    icon: 'Dumbbell',        label: 'Training'   },
  { href: '/staff',       icon: 'UserCog',         label: 'Staff'      },
  { href: '/attendance',  icon: 'ScanFace',        label: 'Attendance' },
  { href: '/memberships', icon: 'CreditCard',      label: 'Memberships'},
  { href: '/finance',     icon: 'IndianRupee',     label: 'Finance'    },
  { href: '/insights',    icon: 'LineChart',       label: 'Insights'   },
  { href: '/engagement',  icon: 'Megaphone',       label: 'Engagement' },
];

const BOTTOM_NAV: NavItem[] = [
  { href: '/settings', icon: 'Settings', label: 'Settings' },
];

// ─── Storage helpers ────────────────────────────────────────────────
const COLLAPSED_KEY = '619_sidebar_collapsed';

function loadCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
}
function saveCollapsed(v: boolean) {
  try { localStorage.setItem(COLLAPSED_KEY, String(v)); } catch {}
}

// ─── Props ──────────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────────
export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed: collapsedProp,
  onCollapsedChange,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();

  const [collapsedLocal, setCollapsedLocal] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const collapsed = collapsedProp !== undefined ? collapsedProp : collapsedLocal;

  useEffect(() => {
    const v = loadCollapsed();
    setCollapsedLocal(v);
    onCollapsedChange?.(v);
    setHydrated(true);
  }, []);

  /* Close drawer on route change */
  useEffect(() => { onMobileClose?.(); }, [path]);

  const isActive = useCallback(
    (href: string) => {
      const a = href.split('?')[0];
      const b = path.split('?')[0];
      if (a === '/dashboard') return b === '/dashboard';
      return b === a || b.startsWith(a + '/');
    },
    [path]
  );

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    setCollapsedLocal(next);
    saveCollapsed(next);
    onCollapsedChange?.(next);
  }, [collapsed, onCollapsedChange]);

  const initials = (user?.name || 'U')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Render a single nav pill ──────────────────────────────────────
  const NavPill = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    if (!isVisibleForRole(item, user?.role)) return null;

    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`sb-pill${active ? ' active' : ''}`}
      >
        {/* Icon container */}
        <span className="sb-pill-icon">
          <Icon name={item.icon} size={17} />
        </span>

        {/* Label — hidden when collapsed */}
        {!collapsed && (
          <span className="sb-pill-label">{item.label}</span>
        )}

        {/* Tooltip when collapsed */}
        {collapsed && (
          <span className="sb-tooltip">{item.label}</span>
        )}
      </Link>
    );
  };

  if (!hydrated) return null;

  return (
    <aside
      className={[
        'sb-shell',
        collapsed ? 'collapsed' : '',
        mobileOpen ? 'mobile-open' : '',
      ].filter(Boolean).join(' ')}
      aria-label="Main navigation"
    >
      {/* ── Background orbs (decorative) ── */}
      <div className="sb-orb sb-orb-1" aria-hidden="true" />
      <div className="sb-orb sb-orb-2" aria-hidden="true" />

      {/* ══ HEADER ════════════════════════════════════════════ */}
      <div className="sb-header">
        {/* Logo container */}
        <div className="sb-logo-wrap">
          <div className="sb-logo">
            <Image
              src="/619-logo.png"
              alt="619 Fitness"
              width={28}
              height={28}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(124,58,237,0.4))' }}
            />
          </div>
        </div>

        {/* Brand text */}
        {!collapsed && (
          <div className="sb-brand">
            <span className="sb-brand-name">619 FITNESS</span>
            <span className="sb-brand-sub">Management OS</span>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          className="sb-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <PanelLeftOpen size={14} strokeWidth={2} />
            : <PanelLeftClose size={14} strokeWidth={2} />}
        </button>
      </div>

      {/* ══ NAV SCROLL AREA ═══════════════════════════════════ */}
      <div className="sb-scroll">

        {/* Top nav group */}
        <div className="sb-group">
          {!collapsed && (
            <span className="sb-group-label">Navigation</span>
          )}
          {TOP_NAV.map((item) => (
            <NavPill key={item.href} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="sb-divider" />

        {/* Sub-nav from NAV_GROUPS (extra items not in top list) */}
        {NAV_GROUPS.map((group) => {
          const extras = group.items.filter(
            (i) =>
              isVisibleForRole(i, user?.role) &&
              !i.hidden &&
              !TOP_NAV.some((t) => t.href === i.href) &&
              !BOTTOM_NAV.some((b) => b.href === i.href)
          );
          if (extras.length === 0) return null;
          return (
            <div key={group.id} className="sb-group">
              {!collapsed && (
                <span className="sb-group-label">{group.label}</span>
              )}
              {extras.map((item) => (
                <NavPill key={item.href} item={item} />
              ))}
            </div>
          );
        })}

      </div>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <div className="sb-footer">
        {/* Settings pill */}
        {BOTTOM_NAV.map((item) => (
          <NavPill key={item.href} item={item} />
        ))}

        {/* Divider */}
        <div className="sb-divider" style={{ marginBlock: '8px' }} />

        {/* User card */}
        <div
          className="sb-user"
          onClick={() => router.push('/settings')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && router.push('/settings')}
        >
          <div className="sb-avatar">{initials}</div>

          {!collapsed && (
            <div className="sb-user-info">
              <span className="sb-user-name">{user?.name || 'User'}</span>
              <span className="sb-user-role" style={{ textTransform: 'capitalize' }}>
                {user?.role || 'Staff'}
              </span>
            </div>
          )}

          {!collapsed && (
            <button
              className="sb-logout"
              onClick={(e) => {
                e.stopPropagation();
                logout();
                router.push('/login');
              }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
