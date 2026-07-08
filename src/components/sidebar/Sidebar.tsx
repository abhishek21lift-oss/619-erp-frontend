'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  ChevronDown, X, LogOut, User, Settings,
  PanelLeft, PanelLeftClose,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { NAV_GROUPS, isVisibleForRole, isGroupVisibleForRole } from '@/lib/nav-config';
import { usePermissions } from '@/lib/permissions-context';
import {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User as UserIcon, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote, QrCode, Monitor, Shield, Zap, BookOpen,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User: UserIcon, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote, QrCode, Monitor, Shield, Zap, BookOpen,
};

// ── Design constants ──────────────────────────────────────────────────────────
const BRAND = '#a78bfa';
const THEME = {
  brand:        BRAND,
  iconBg:       'linear-gradient(135deg, #c084fc 0%, #a78bfa 100%)',
  activeBg:     'rgba(167,139,250,0.15)',
  subBorder:    'rgba(167,139,250,0.12)',
  subActiveBg:  'rgba(167,139,250,0.08)',
  inactiveText: 'rgba(255,255,255,0.52)',
  inactiveIcon: 'rgba(255,255,255,0.38)',
  hoverBg:      'rgba(167,139,250,0.08)',
  iconBgIdle:   'rgba(255,255,255,0.06)',
};

// Section headings — appear above these group IDs
const SECTION_LABELS: Record<string, string> = {
  'attendance':        'Workspace',
  'personal-training': 'Personal Training',
  'finance':           'Business',
  'ai-coach':          'Intelligence',
};

// Snappy spring-like easing
const EASE = [0.16, 1, 0.3, 1] as const;

// Permission helper (unchanged)
function canSeeByPermission(href: string, groupId: string, can: (f: string) => boolean): boolean {
  if (href === '/pt-os/commissions') return can('commissions');
  if (href === '/finance/record-payment') return can('record_payment');
  if (groupId === 'finance' || href.startsWith('/finance')) return can('finance');
  if (groupId === 'insights' || groupId === 'reports' || href.startsWith('/reports') || href.startsWith('/insights')) return can('reports');
  if (href.startsWith('/staff') || href === '/attendance/staff') return can('staff_view');
  if (href.startsWith('/pt-os') || groupId === 'personal-training' || groupId === 'session-management' || groupId === 'progress-tracking') return can('pt_module');
  if (href.startsWith('/settings')) return can('settings');
  return true;
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function SidebarNav({ collapsed, onLinkClick }: { collapsed?: boolean; onLinkClick?: () => void }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isAdmin) return;
    Promise.allSettled([
      fetch('/api/trainers/leave?status=pending', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/finance/dues', { credentials: 'include' }).then(r => r.json()),
    ]).then(([leavesRes, duesRes]) => {
      const counts: Record<string, number> = {};
      if (leavesRes.status === 'fulfilled') {
        const d = leavesRes.value;
        counts.pendingLeaves = Array.isArray(d?.data) ? d.data.length : Array.isArray(d) ? d.length : (d?.count ?? 0);
      }
      if (duesRes.status === 'fulfilled') {
        const d = duesRes.value;
        counts.duesCount = Array.isArray(d?.data) ? d.data.length : Array.isArray(d) ? d.length : (d?.count ?? 0);
      }
      setBadgeCounts(counts);
    }).catch(() => {});
  }, [isAdmin]);

  const filterItem = (i: { href: string; role?: string; roles?: string[] }, groupId: string): boolean => {
    if (!isVisibleForRole(i as Parameters<typeof isVisibleForRole>[0], user?.role)) return false;
    return canSeeByPermission(i.href, groupId, isAdmin ? () => true : can);
  };

  const navItems = NAV_GROUPS
    .filter(g => isGroupVisibleForRole(g, user?.role))
    .map(g => ({
      ...g,
      items: g.items.filter(i => filterItem(i, g.id)).flatMap(i =>
        i.children ? i.children.filter(c => filterItem(c, g.id)) : [i]
      ),
      single: false,
      href: '',
    }))
    .filter(g => g.items.length > 0);

  const toggleGroup = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const anyChildActive = (items: { href?: string; children?: { href?: string }[] }[]) =>
    items.some(i => isActive(i.href || '') || i.children?.some(c => isActive(c.href || '')));

  return (
    <nav role="navigation" aria-label="Main navigation" className="px-2.5 py-1">
      {navItems.map((group, groupIndex) => {
        const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
        const open = expanded[group.id] ?? anyChildActive(group.items);
        const hasActiveChild = anyChildActive(group.items);
        const sectionLabel = SECTION_LABELS[group.id];

        return (
          <div key={group.id}>
            {/* Section heading — expanded mode */}
            {sectionLabel && !collapsed && (
              <div className={groupIndex === 0 ? 'pb-1' : 'pt-5 pb-1'}>
                {groupIndex > 0 && (
                  <div
                    className="mb-3 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.18), transparent)' }}
                  />
                )}
                <p className="px-3 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  {sectionLabel}
                </p>
              </div>
            )}

            {/* Section divider — collapsed icon-rail */}
            {sectionLabel && collapsed && groupIndex > 0 && (
              <div className="my-2.5 mx-auto w-5 h-px" style={{ background: 'rgba(167,139,250,0.14)' }} />
            )}

            <div className="relative mb-px">
              {/* Group button */}
              <button
                onClick={() => { if (!collapsed) toggleGroup(group.id); }}
                aria-expanded={!collapsed ? open : undefined}
                aria-label={group.label}
                title={collapsed ? group.label : undefined}
                className={cn(
                  'relative w-full rounded-xl transition-all duration-200 overflow-hidden',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(167,139,250,0.55)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
                  collapsed ? 'flex justify-center px-0 py-2' : '',
                )}
                style={{ background: hasActiveChild ? THEME.activeBg : 'transparent' }}
              >
                {/* Active left accent */}
                {!collapsed && (hasActiveChild || open) && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                    style={{
                      background: `linear-gradient(180deg, ${BRAND}, ${BRAND}88)`,
                      height: hasActiveChild ? '55%' : '38%',
                      opacity: hasActiveChild ? 1 : 0.5,
                      boxShadow: hasActiveChild ? `0 0 10px ${BRAND}55` : 'none',
                    }}
                  />
                )}

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-150 rounded-xl pointer-events-none"
                  style={{ background: THEME.hoverBg }}
                />

                {collapsed ? (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200"
                    style={{
                      background: hasActiveChild ? THEME.iconBg : THEME.iconBgIdle,
                      boxShadow: hasActiveChild ? `0 0 16px ${BRAND}28` : 'none',
                    }}
                  >
                    <GroupIcon
                      size={17}
                      strokeWidth={hasActiveChild ? 2.5 : 1.5}
                      style={{ color: hasActiveChild ? '#fff' : THEME.inactiveIcon }}
                    />
                  </div>
                ) : (
                  <div
                    className="relative flex items-center gap-2.5 px-3 py-2.5"
                    style={{ color: hasActiveChild ? BRAND : THEME.inactiveText }}
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-all duration-200"
                      style={{ background: hasActiveChild || open ? THEME.iconBg : THEME.iconBgIdle }}
                    >
                      <GroupIcon
                        size={14}
                        strokeWidth={hasActiveChild ? 2.2 : 1.5}
                        style={{ color: hasActiveChild || open ? '#fff' : THEME.inactiveIcon }}
                      />
                    </div>
                    <span className="flex-1 text-left text-[12.5px] font-semibold tracking-tight whitespace-nowrap">
                      {group.label}
                    </span>
                    <ChevronDown
                      size={12}
                      strokeWidth={2.5}
                      className="shrink-0 transition-transform duration-300"
                      style={{
                        color: hasActiveChild ? BRAND : 'rgba(255,255,255,0.28)',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </div>
                )}
              </button>

              {/* Sub-items */}
              {!collapsed && (
                <AnimatePresence initial={false}>
                  {open && (
                    <m.div
                      key={`${group.id}-items`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div
                        className="ml-[22px] mt-1 space-y-px border-l pl-2.5 pb-1"
                        style={{ borderColor: THEME.subBorder }}
                      >
                        {group.items.map((item) => {
                          const ItemIcon = ICON_MAP[item.icon];
                          const active = isActive(item.href);
                          const isDisabled = !!item.comingSoon;
                          const badgeCount = item.badge ? (badgeCounts[item.badge] ?? 0) : 0;

                          const inner = (
                            <>
                              {active && !isDisabled && (
                                <m.div
                                  layoutId={`sidebar-active-${group.id}`}
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                                  style={{
                                    background: `linear-gradient(180deg, ${BRAND}, ${BRAND}55)`,
                                    boxShadow: `0 0 8px ${BRAND}45`,
                                  }}
                                />
                              )}
                              <div
                                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-150 rounded-lg pointer-events-none"
                                style={{ background: !active && !isDisabled ? THEME.hoverBg : undefined }}
                              />
                              <div
                                className="flex h-5 w-5 items-center justify-center rounded-md shrink-0 transition-all duration-200 relative z-10"
                                style={{ background: active && !isDisabled ? THEME.iconBg : 'transparent' }}
                              >
                                {ItemIcon && (
                                  <ItemIcon
                                    size={11}
                                    strokeWidth={active && !isDisabled ? 2.5 : 1.5}
                                    style={{ color: active && !isDisabled ? '#fff' : THEME.inactiveIcon }}
                                  />
                                )}
                              </div>
                              <span
                                className="truncate relative z-10 text-[11.5px] flex-1"
                                style={{ color: active && !isDisabled ? BRAND : THEME.inactiveText }}
                              >
                                {item.label}
                              </span>
                              {isDisabled && (
                                <span
                                  className="relative z-10 ml-1 shrink-0 rounded-full px-1.5 py-px text-[8px] font-bold uppercase tracking-wider"
                                  style={{ background: 'rgba(148,163,184,0.12)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.2)' }}
                                >
                                  SOON
                                </span>
                              )}
                              {!isDisabled && item.isNew && badgeCount === 0 && (
                                <span
                                  className="relative z-10 ml-1 shrink-0 block h-1.5 w-1.5 rounded-full"
                                  style={{ background: '#22C55E', boxShadow: '0 0 5px rgba(34,197,94,0.5)' }}
                                />
                              )}
                              {!isDisabled && badgeCount > 0 && (
                                <span
                                  className="relative z-10 ml-1 shrink-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                                  style={{ background: BRAND }}
                                >
                                  {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                              )}
                            </>
                          );

                          if (isDisabled) {
                            return (
                              <div
                                key={item.href}
                                className="relative flex items-center gap-2 rounded-lg px-3 py-[7px] overflow-hidden cursor-default select-none"
                                style={{ opacity: 0.4 }}
                              >
                                {inner}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onLinkClick}
                              className={cn(
                                'relative flex items-center gap-2 rounded-lg px-3 py-[7px] transition-all duration-150 overflow-hidden',
                                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(167,139,250,0.55)]',
                                active && 'font-semibold',
                              )}
                              style={{ background: active ? THEME.subActiveBg : 'transparent' }}
                            >
                              {inner}
                            </Link>
                          );
                        })}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// ── User profile footer ───────────────────────────────────────────────────────
function SidebarProfile({ collapsed, onClose }: { collapsed?: boolean; onClose?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  const handleLogout = async () => {
    onClose?.();
    await logout();
    router.push('/login');
  };

  if (collapsed) {
    return (
      <div className="shrink-0 flex flex-col items-center gap-2 border-t border-[var(--sidebar-border)] py-3">
        <Link
          href="/settings/profile"
          title={`${user?.name || 'Profile'} · ${user?.role || 'member'}`}
          className="relative"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white select-none"
            style={{ background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)' }}
          >
            {initials}
          </div>
          <span
            className="absolute -bottom-[1px] -right-[1px] block h-2 w-2 rounded-full border-[1.5px]"
            style={{ background: '#22C55E', borderColor: '#070510' }}
          />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:bg-red-500/15 hover:text-red-400"
          style={{ color: 'rgba(255,255,255,0.30)' }}
        >
          <LogOut size={13} strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[var(--sidebar-border)] p-3">
      <div
        className="rounded-xl p-3"
        style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(124,58,237,0.05) 100%)',
          border: '1px solid rgba(167,139,250,0.12)',
        }}
      >
        {/* Avatar + name + email */}
        <div className="flex items-center gap-3 mb-2.5">
          <div className="relative shrink-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-bold text-white select-none"
              style={{
                background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                boxShadow: '0 2px 10px rgba(245,158,11,0.22)',
              }}
            >
              {initials}
            </div>
            <span
              className="absolute -bottom-[1px] -right-[1px] block h-2.5 w-2.5 rounded-full border-2"
              style={{ background: '#22C55E', borderColor: '#0a0820' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[12.5px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {user?.name || 'User'}
            </p>
            <p className="truncate text-[10px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.36)' }}>
              {user?.email || user?.role || 'member'}
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div className="mb-2.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(167,139,250,0.15)', color: BRAND, border: '1px solid rgba(167,139,250,0.2)' }}
          >
            {user?.role || 'member'}
          </span>
        </div>

        {/* Quick actions: Profile | Settings | Logout */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/settings/profile"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-[6px] text-[10.5px] font-medium transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.42)' }}
            onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'rgba(255,255,255,0.09)'; t.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'rgba(255,255,255,0.05)'; t.style.color = 'rgba(255,255,255,0.42)'; }}
          >
            <User size={11} strokeWidth={1.5} />
            Profile
          </Link>
          <Link
            href="/settings"
            title="Settings"
            className="flex items-center justify-center rounded-lg p-[6px] transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.42)' }}
            onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'rgba(255,255,255,0.09)'; t.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'rgba(255,255,255,0.05)'; t.style.color = 'rgba(255,255,255,0.42)'; }}
          >
            <Settings size={11} strokeWidth={1.5} />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="flex items-center justify-center rounded-lg p-[6px] transition-all duration-150"
            style={{ background: 'rgba(239,68,68,0.07)', color: 'rgba(239,68,68,0.48)' }}
            onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'rgba(239,68,68,0.14)'; t.style.color = '#f87171'; }}
            onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'rgba(239,68,68,0.07)'; t.style.color = 'rgba(239,68,68,0.48)'; }}
          >
            <LogOut size={11} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({
  collapsed = false,
  onExpand,
  onCollapse,
  mobileOpen = false,
  onMobileClose,
  variant = 'desktop',
}: SidebarProps) {
  const isMobile = variant === 'mobile';
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pin: when true, sidebar stays expanded permanently
  const [isPinned, setIsPinned] = useState(false);
  useEffect(() => {
    try { setIsPinned(localStorage.getItem('sidebar-pinned') === 'true'); } catch {}
  }, []);

  // Expand on mount if user had pinned it
  useEffect(() => {
    if (!isMobile) {
      try {
        if (localStorage.getItem('sidebar-pinned') === 'true') onExpand?.();
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePin = useCallback(() => {
    const next = !isPinned;
    setIsPinned(next);
    try { localStorage.setItem('sidebar-pinned', String(next)); } catch {}
    if (next) onExpand?.();
    else onCollapse?.();
  }, [isPinned, onExpand, onCollapse]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (collapsed) onExpand?.();
  }, [collapsed, onExpand]);

  const handleMouseLeave = useCallback(() => {
    if (isPinned) return;
    hoverTimer.current = setTimeout(() => {
      if (!collapsed) onCollapse?.();
    }, 300);
  }, [collapsed, onCollapse, isPinned]);

  return (
    <aside
      data-sidebar={variant}
      data-theme="dark"
      onMouseEnter={!isMobile ? handleMouseEnter : undefined}
      onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      className={cn(
        !isMobile && [
          'fixed inset-y-0 left-0 z-40 hidden flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'lg:flex',
          collapsed ? 'w-16' : 'w-64 xl:w-72',
          'border-r border-[var(--sidebar-border)]',
        ],
        isMobile && [
          'fixed left-0 z-50 flex flex-col',
          'w-[240px]',
          'transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ],
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(249,115,22,0.07) 0%, rgba(249,115,22,0.02) 18%, transparent 38%), linear-gradient(160deg, #070510 0%, #0C0920 30%, #100D30 65%, #130F45 100%)',
        paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : 'env(safe-area-inset-top, 0px)',
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined,
        willChange: isMobile ? 'transform' : undefined,
        top: isMobile ? '0' : undefined,
        bottom: isMobile ? '0' : undefined,
        borderRadius: isMobile ? '0 16px 16px 0' : undefined,
        boxShadow: isMobile
          ? '6px 0 24px rgba(0,0,0,0.30), 2px 0 8px rgba(0,0,0,0.20)'
          : 'inset 0 0 0 1px rgba(167,139,250,0.05), 4px 0 24px rgba(0,0,0,0.35)',
      }}
    >
      {/* Brand header */}
      <div className={cn('relative shrink-0', collapsed ? 'px-3 pb-2 pt-3' : 'px-4 pb-2.5 pt-3.5')}>
        {!collapsed && (
          <div className="absolute top-0 left-3 right-3 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-40" />
        )}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <Link href="/" className={cn('flex items-center group', collapsed ? 'justify-center' : 'gap-2.5')}>
            <div className="relative shrink-0">
              <div
                className="h-9 w-9 rounded-xl p-[2px] transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #7C3AED 100%)',
                  boxShadow: '0 2px 12px rgba(245,158,11,0.30)',
                }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[var(--bg-white)]">
                  <Image
                    src="/logo.png"
                    alt="619 Fitness"
                    width={collapsed ? 24 : 28}
                    height={collapsed ? 24 : 28}
                    className={cn('rounded-lg object-cover', collapsed ? 'h-6 w-6' : 'h-7 w-7')}
                  />
                </div>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <m.div
                  key="brand-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.18 } }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  className="overflow-hidden"
                >
                  <h2 className="text-[15px] font-extrabold tracking-tight leading-none whitespace-nowrap">
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: 'linear-gradient(135deg, #FCD34D, #F59E0B, #D97706)' }}
                    >619</span>
                    {' '}
                    <span className="text-[var(--text-primary)] tracking-[0.05em] text-[12.5px]">FITNESS</span>
                  </h2>
                  <p className="mt-[2px] text-[9px] font-semibold text-[var(--text-muted)] tracking-[0.12em] uppercase whitespace-nowrap">
                    Studio Suite
                  </p>
                </m.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Pin toggle (desktop expanded only) */}
          {!collapsed && !isMobile && (
            <button
              type="button"
              onClick={togglePin}
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-all duration-150"
              style={{ color: isPinned ? BRAND : 'rgba(255,255,255,0.28)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {isPinned
                ? <PanelLeftClose size={13} strokeWidth={2} />
                : <PanelLeft size={13} strokeWidth={1.5} />
              }
            </button>
          )}

          {/* Mobile close */}
          {isMobile && (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onMobileClose}
              className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.40)' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden py-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(167,139,250,0.15) transparent' }}
      >
        <SidebarNav collapsed={collapsed} onLinkClick={isMobile ? onMobileClose : undefined} />
      </div>

      {/* User profile */}
      <SidebarProfile collapsed={collapsed} onClose={isMobile ? onMobileClose : undefined} />
    </aside>
  );
}

interface SidebarProps {
  collapsed?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  variant?: 'desktop' | 'mobile';
}
