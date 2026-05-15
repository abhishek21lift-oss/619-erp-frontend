'use client';

/**
 * Sidebar — premium Linear/Notion-style navigation.
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
  LayoutDashboard,
  TrendingUp,
  Users,
  Dumbbell,
  ScanFace,

  CreditCard,
  IndianRupee,
  LineChart,
  Megaphone,
  Settings,

  Inbox,
  PlusCircle,
  Filter,
  PieChart,

  UserCheck,
  CalendarClock,
  UserX,
  Cake,
  UserPlus,
  User,

  UserCog,
  LayoutGrid,
  CalendarOff,
  Sparkles,

  ClipboardList,
  ClipboardCheck,
  Trophy,

  Layers,
  RefreshCw,
  CalendarDays,

  Wallet,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Award,

  FileBarChart,
  Activity,
  RefreshCcw,
  Clock,

  Bell,
  MessageCircle,
  Send,
  Tag,
  Star,

  Building2,
  ShieldCheck,
  Fingerprint,
  Receipt,
  Palette,

  ChevronRight,
  Search,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
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

// ─────────────────────────────────────────────────────────────────────
// Icon map
// ─────────────────────────────────────────────────────────────────────

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  TrendingUp,
  Users,
  Dumbbell,
  ScanFace,

  CreditCard,
  IndianRupee,
  LineChart,
  Megaphone,
  Settings,

  Inbox,
  PlusCircle,
  Filter,
  PieChart,

  UserCheck,
  CalendarClock,
  UserX,
  Cake,
  UserPlus,
  User,

  UserCog,
  LayoutGrid,
  CalendarOff,
  Sparkles,

  ClipboardList,
  ClipboardCheck,
  Trophy,

  Layers,
  RefreshCw,
  CalendarDays,

  Wallet,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Award,

  FileBarChart,
  Activity,
  RefreshCcw,
  Clock,

  Bell,
  MessageCircle,
  Send,
  Tag,
  Star,

  Building2,
  ShieldCheck,
  Fingerprint,
  Receipt,
  Palette,
};

function Icon({
  name,
  size = 15,
}: {
  name: string;
  size?: string | number;
}) {
  const C = ICONS[name];

  return C ? <C size={size} /> : null;
}

// ─────────────────────────────────────────────────────────────────────
// Local storage helpers
// ─────────────────────────────────────────────────────────────────────

const COLLAPSED_KEY = '619_sidebar_collapsed';
const GROUPS_KEY = '619_sidebar_groups';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveCollapsed(v: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(v));
  } catch {}
}

function loadGroupState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);

    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGroupState(s: Record<string, boolean>) {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(s));
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const path = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);

  const [groupState, setGroupState] = useState<
    Record<string, boolean>
  >({});

  const [hydrated, setHydrated] = useState(false);

  const [search, setSearch] = useState('');

  const [searchOpen, setSearchOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    setCollapsed(loadCollapsed());
    setGroupState(loadGroupState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    onMobileClose?.();
  }, [path, onMobileClose]);

  // ─────────────────────────────────────────────────────────────────

  const visibleItems = useMemo(() => {
    return allNavItems().filter((i) => i.href !== '/dashboard' && isVisibleForRole(i, user?.role) && !i.hidden);
  }, [user?.role]);

  const fuse = useMemo(() => {
    return new Fuse(visibleItems, {
      keys: ['label', 'groupLabel'],
      threshold: 0.35,
    });
  }, [visibleItems]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];

    return fuse
      .search(search)
      .map((r) => r.item)
      .slice(0, 8);
  }, [search, fuse]);

  // ─────────────────────────────────────────────────────────────────

  const isActive = useCallback(
    (href: string) => {
      const cleanHref = href.split('?')[0];
      const cleanPath = path.split('?')[0];

      if (cleanHref === '/dashboard') {
        return cleanPath === '/dashboard';
      }

      return (
        cleanPath === cleanHref ||
        cleanPath.startsWith(cleanHref + '/')
      );
    },
    [path]
  );

  const toggleGroup = useCallback((id: string) => {
    setGroupState((prev) => {
      const next = {
        ...prev,
        [id]: !prev[id],
      };

      saveGroupState(next);

      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      saveCollapsed(!v);

      return !v;
    });
  }, []);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isGroupOpen = (id: string) =>
    !(id in groupState) ? true : groupState[id];

  // ─────────────────────────────────────────────────────────────────

  const renderItem = (item: NavItem, idx: number) => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.href + idx}
        href={item.comingSoon ? '#' : item.href}
        className={`sidebar-item${active ? ' active' : ''}`}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={
          item.comingSoon
            ? (e) => e.preventDefault()
            : undefined
        }
      >
        <span className="sidebar-item-icon">
          <Icon name={item.icon} size={15} />
        </span>

        <span className="sidebar-item-label">
          {item.label}
        </span>
      </Link>
    );
  };

  // ─────────────────────────────────────────────────────────────────

  const sidebarCls = [
    'sidebar',
    collapsed ? 'collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const wrapCls = [
    'shell-sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'drawer-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={`sidebar-backdrop${
          mobileOpen ? ' visible' : ''
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      <aside
        className={wrapCls}
        aria-label="Main navigation"
      >
        <nav className={sidebarCls}>
          {/* Header */}

          <div className="sidebar-header">
            <div className="sidebar-logo"><Image src="/619-logo.png" alt="619 Fitness" width={36} height={36} style={{ objectFit: "contain", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }} /></div>

            <div className="sidebar-brand">
              <div className="sidebar-brand-name" style={{letterSpacing:"0.03em"}}>
                619 FITNESS
              </div>
              <div className="sidebar-brand-sub" style={{letterSpacing:"0.08em",fontSize:9,fontWeight:700}}>
                STUDIO
              </div>
            </div>

            <button
              className="sidebar-toggle"
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={13} />
            </button>
          </div>

          {/* Expand button */}

          {collapsed && (
            <button
              className="sidebar-toggle"
              onClick={toggleCollapsed}
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={13} />
            </button>
          )}

          {/* Scrollable nav area */}
          <div className="sidebar-nav">

          {/* Search */}

          {!collapsed && (
            <div style={{ padding: '8px 10px 4px' }}>
              {searchOpen ? (
                <div className="search-bar">
                  <Search size={13} />

                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search…"
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  className="sidebar-search-btn"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={13} />

                  <span>Search…</span>
                </button>
              )}
            </div>
          )}

          {/* Dashboard */}

          {isVisibleForRole(
            DASHBOARD_ITEM,
            user?.role
          ) && renderItem(DASHBOARD_ITEM, 0)}

          {/* Groups */}

          {NAV_GROUPS.map((group) => {
            const groupItems = group.items.filter(
              (i) =>
                isVisibleForRole(i, user?.role) &&
                !i.hidden
            );

            if (groupItems.length === 0) {
              return null;
            }

            const open = isGroupOpen(group.id);

            return (
              <div
                key={group.id}
                className="sidebar-group"
              >
                <button
                  className="sidebar-group-btn"
                  onClick={() =>
                    toggleGroup(group.id)
                  }
                  aria-expanded={open}
                >
                  {collapsed ? (
                    <Icon
                      name={group.icon}
                      size={15}
                    />
                  ) : (
                    <>
                      <span className="sidebar-group-label">
                        {group.label}
                      </span>

                      <span
                        className={`sidebar-group-chevron${
                          open ? ' open' : ''
                        }`}
                      >
                        <ChevronRight size={12} />
                      </span>
                    </>
                  )}
                </button>

                <div
                  className="sidebar-group-items"
                  style={{
                    maxHeight: open
                      ? `${groupItems.length * 42}px`
                      : '0px',
                  }}
                >
                  {groupItems.map((item, idx) =>
                    renderItem(item, idx)
                  )}
                </div>
              </div>
            );
          })}

          </div>{/* end sidebar-nav */}

          {/* Footer */}

          <div className="sidebar-footer">
            <div
              className="sidebar-avatar"
              title={user?.name || 'User'}
              onClick={() =>
                router.push('/settings')
              }
            >
              {initials}
            </div>

            {!collapsed && (
              <>
                <div className="sidebar-user">
                  <div className="sidebar-user-name">
                    {user?.name || 'User'}
                  </div>

                  <div
                    className="sidebar-user-role"
                    style={{
                      textTransform: 'capitalize',
                    }}
                  >
                    {user?.role || 'Staff'}
                  </div>
                </div>

                <button
                  className="sidebar-logout"
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}