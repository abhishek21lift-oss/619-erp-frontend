'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, X, LogOut, User, Settings,
  PanelLeft, PanelLeftClose,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import FounderBadge from '@/components/FounderBadge';
import { useFounder } from '@/lib/use-founder';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import StudioMark from '@/components/StudioMark';
import { NAV_GROUPS, isVisibleForRole, isGroupVisibleForRole, isVisibleForFeature, isGroupVisibleForFeature } from '@/lib/nav-config';
import { usePermissions } from '@/lib/permissions-context';
import { useFeatures } from '@/lib/features-context';
import { roleLabel } from '@/lib/roles';
import {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User as UserIcon, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote, QrCode, Monitor, Shield, Zap, BookOpen, HeartPulse, Salad,
  Flag, Move, Accessibility, ShieldCheck, FileSignature,
  Receipt, Smartphone, UserRound, UserSearch, ScrollText, ToggleRight, ShieldAlert, LifeBuoy, HardDrive,
  CalendarDays,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User: UserIcon, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote, QrCode, Monitor, Shield, Zap, BookOpen, HeartPulse, Salad,
  Flag, Move, Accessibility, ShieldCheck, FileSignature, CalendarDays,
  // An icon name that is not registered here renders with NO icon at all —
  // the map is an allowlist, not a lookup with a fallback. Anything added to
  // nav-config.ts must be added here too.
  Receipt, Smartphone, UserRound, UserSearch, ScrollText, ToggleRight, ShieldAlert, LifeBuoy, HardDrive,
};

// ── Design constants ──────────────────────────────────────────────────────────
const BRAND = '#7fb4ff';

export const SIDEBAR_GROUNDS = {
  /** Top of the gradient. */
  dark: '#0F172A',
  /** Bottom — the worst case for a light foreground, and where sub-items sit. */
  blue: '#002D61',
} as const;

/**
 * The drawer footer's foregrounds, and the ground they sit on.
 *
 * Exported so the contrast can be asserted rather than eyeballed: these three
 * controls were at 2.59:1, 2.59:1 and 1.09:1 against DRAWER_DARKEST, which is
 * why they were reported as invisible. sidebar-footer-contrast.test.ts
 * recomputes every pairing and fails below 4.5:1, so changing one of these to
 * something prettier cannot quietly put them back.
 */
export const FOOTER_COLORS = {
  /**
   * The bottom of the drawer's gradient — the worst case for a light fore.
   * Reads SIDEBAR_GROUNDS rather than repeating the value: when the gradient
   * was darkened to fix the navigation above, a second literal here would have
   * left the footer's tests measuring against a background that no longer
   * exists, and passing for the wrong reason.
   */
  drawerGround: SIDEBAR_GROUNDS.blue,
  /** Translucent white fills the Profile and Settings buttons sit on. */
  neutralFill: 'rgba(255,255,255,0.10)',
  neutralFore: 'rgba(255,255,255,0.92)',
  /** Red fails on blue: #EF4444 is 2.03:1 here, #FCA5A5 only 4.02:1. */
  dangerFill: 'rgba(239,68,68,0.22)',
  dangerFore: '#FECACA',
  /** Sits directly on the drawer, not on a fill. */
  emailFore: 'rgba(255,255,255,0.72)',
} as const;
/**
 * The drawer's foregrounds, and the two grounds they sit on.
 *
 * ── Why these numbers are what they are ────────────────────────────────────
 *
 * The background is a gradient: near-black at the top, brand blue from 65%
 * down. Every value here was originally chosen against the dark end, and the
 * lower half of the drawer — where the expanded sub-items and the chevrons
 * live — is the light end. Measured against it, the whole navigation failed:
 *
 *   section label   1.65:1      nav icon    2.37:1
 *   chevron         1.89:1      nav label   3.20:1
 *
 * AA wants 4.5:1. Four of those failed against the DARK end too, so they were
 * never adequate; the blue only made it obvious.
 *
 * The fix is in two parts, and the first matters more. The blue end moved from
 * blue[700] to blue[900].
 *
 * blue[700] was bright enough that white at 52% — an unremarkable value on a
 * dark navigation — measured 3.20:1 on it. blue[900] takes that to 4.70:1, so
 * an ordinary value works without being derived. That is the difference
 * between fixing today's numbers and fixing the surface: whatever is added to
 * this file next inherits a ground that already behaves.
 *
 * It is a palette value, not a hand-mixed one. The first pass solved for the
 * darkness numerically and produced a blue that was not in the five families;
 * the palette guard rejected it, correctly, because a sixth blue is exactly
 * what that rule exists to prevent. blue[900] sits within a couple of points
 * of the computed answer and was already in the system.
 *
 * Still unmistakably blue: a 52-point margin between its blue channel and its
 * next highest.
 *
 * sidebar-contrast.test.ts recomputes all of it against BOTH ends.
 */
const THEME = {
  brand:        BRAND,
  iconBg:       'linear-gradient(135deg, #7fb4ff 0%, #3b8df5 100%)',
  activeBg:     'rgba(127,180,255,0.15)',
  subBorder:    'rgba(127,180,255,0.12)',
  subActiveBg:  'rgba(127,180,255,0.08)',
  inactiveText: 'rgba(255,255,255,0.82)',
  inactiveIcon: 'rgba(255,255,255,0.70)',
  hoverBg:      'rgba(127,180,255,0.08)',
  iconBgIdle:   'rgba(255,255,255,0.06)',
  /** Group headings. Were 0.22 — 1.65:1 on the blue, effectively absent. */
  sectionLabel: 'rgba(255,255,255,0.62)',
  /** The expand/collapse arrows. Were 0.28 — 1.89:1. */
  chevron:      'rgba(255,255,255,0.65)',
};

/**
 * Every foreground the navigation draws, for the contrast test to walk.
 *
 * Listed explicitly rather than derived from THEME: THEME also holds fills,
 * borders and a gradient, and asserting 4.5:1 on a hover background would be
 * meaningless. These are the values a person has to actually read.
 */
export const SIDEBAR_FOREGROUNDS = {
  sectionLabel: THEME.sectionLabel,
  navLabel:     THEME.inactiveText,
  navIcon:      THEME.inactiveIcon,
  chevron:      THEME.chevron,
  activeLabel:  BRAND,
} as const;

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
  if (href.startsWith('/pt-os') || groupId === 'personal-training' || groupId === 'session-management' || groupId === 'progress-tracking') return can('pt_module');
  if (href.startsWith('/settings')) return can('settings');
  return true;
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function SidebarNav({ collapsed, onLinkClick }: { collapsed?: boolean; onLinkClick?: () => void }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { features } = useFeatures();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Nav badge counts, via the api client rather than hand-written fetch so they
  // inherit the 401 refresh and the x-org-id header every other call gets.
  //
  // Both URLs used to be wrong. /api/finance/dues does not exist — there is no
  // /api/finance mount at all, the route is /api/reports/dues. And
  // /api/trainers/leave is not a route either: it matched /api/trainers/:id
  // with id='leave' and answered 404 "Trainer not found"; the leave list lives
  // at /api/leave. Neither failure surfaced — allSettled never rejects, the
  // shape-sniffing fell through to `?? 0`, and the trailing .catch swallowed
  // whatever was left, so both badges read zero indefinitely. Rejections are
  // logged now for exactly that reason: a counter that quietly reports
  // "nothing pending" is worse than no counter at all.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    Promise.allSettled([
      api.leave.list({ status: 'pending' }),
      api.reports.dues(),
    ]).then(([leavesRes, duesRes]) => {
      if (cancelled) return;
      if (leavesRes.status === 'rejected') console.warn('[sidebar] pending-leave count failed', leavesRes.reason);
      if (duesRes.status === 'rejected') console.warn('[sidebar] dues count failed', duesRes.reason);
      setBadgeCounts({
        pendingLeaves: leavesRes.status === 'fulfilled' ? leavesRes.value.length : 0,
        duesCount: duesRes.status === 'fulfilled' ? duesRes.value.length : 0,
      });
    });

    return () => { cancelled = true; };
  }, [isAdmin]);

  // The whole nav tree, rebuilt only when something it actually reads changes.
  //
  // This ran on EVERY render, and this component re-renders on every
  // navigation because it reads usePathname() to mark the active item. So a
  // route change walked all of NAV_GROUPS and, for every item and every
  // child, re-ran three predicates — role, feature flag, and
  // canSeeByPermission, the last doing its own lookup per item. None of that
  // can change as a result of the pathname changing: it depends on the user's
  // role, their permissions, and the feature flags.
  //
  // The dependency list is exactly what the computation reads. `can` and
  // `features` come from their own contexts, so this recomputes when
  // permissions or flags finish loading, and not on navigation.
  const navItems = useMemo(() => {
    const filterItem = (
      i: { href: string; role?: string; roles?: string[]; feature?: string },
      groupId: string,
    ): boolean => {
      if (!isVisibleForRole(i as Parameters<typeof isVisibleForRole>[0], user?.role)) return false;
      // Feature flags sit alongside role and permission checks, never replacing
      // them: an item has to clear all three. Fails open, so a studio never
      // loses nav to a slow or failed /api/features.
      if (!isVisibleForFeature(i, features)) return false;
      return canSeeByPermission(i.href, groupId, isAdmin ? () => true : can);
    };

    return NAV_GROUPS
      .filter(g => isGroupVisibleForRole(g, user?.role))
      .filter(g => isGroupVisibleForFeature(g, features))
      .map(g => ({
        ...g,
        items: g.items.filter(i => filterItem(i, g.id)).flatMap(i =>
          i.children ? i.children.filter(c => filterItem(c, g.id)) : [i]
        ),
        single: false,
        href: '',
      }))
      .filter(g => g.items.length > 0);
  }, [user?.role, features, isAdmin, can]);

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
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(127,180,255,0.18), transparent)' }}
                  />
                )}
                <p className="px-3 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: THEME.sectionLabel }}>
                  {sectionLabel}
                </p>
              </div>
            )}

            {/* Section divider — collapsed icon-rail */}
            {sectionLabel && collapsed && groupIndex > 0 && (
              <div className="my-2.5 mx-auto w-5 h-px" style={{ background: 'rgba(127,180,255,0.14)' }} />
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(127,180,255,0.55)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
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
                        color: hasActiveChild ? BRAND : THEME.chevron,
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
                                  style={{ background: '#10B981', boxShadow: '0 0 5px rgba(16,185,129,0.5)' }}
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
                                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(127,180,255,0.55)]',
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
          onClick={onClose}
          title={`${user?.name || 'Profile'} · ${roleLabel(user?.role) || 'Trainer'}`}
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
            style={{ background: '#10B981', borderColor: '#0F172A' }}
          />
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 hover:bg-red-500/15 hover:text-red-400"
          style={{ color: THEME.inactiveIcon }}
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
          background: 'linear-gradient(135deg, rgba(127,180,255,0.08) 0%, rgba(0,103,224,0.05) 100%)',
          border: '1px solid rgba(127,180,255,0.12)',
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
              style={{ background: '#10B981', borderColor: '#0f172a' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[12.5px] font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {user?.name || 'User'}
            </p>
            <p className="truncate text-[10.5px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {user?.email || user?.role || 'member'}
            </p>
          </div>
        </div>

        {/* Role badge */}
        <div className="mb-2.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(127,180,255,0.15)', color: BRAND, border: '1px solid rgba(127,180,255,0.2)' }}
          >
            {roleLabel(user?.role) || 'Trainer'}
          </span>
        </div>

        {/*
          Profile | Settings | Logout.

          These were unreadable, and measurably so. The drawer's background is
          a gradient ending at #0050AD, and these three sat on the blue end at
          rgba(255,255,255,0.42) and rgba(239,68,68,0.48) — 2.59:1 and 1.09:1
          against it, where AA wants 4.5:1. The logout icon was a ghost.

          The compounding mistake was recovering contrast on onMouseEnter.
          This drawer is the MOBILE navigation; a touch device never fires
          hover, so on the only screen these render, they sat at their faintest
          value permanently. Hover is now a CSS enhancement over a base that is
          already legible, rather than the only way to read the control.

          Red is the other lesson: it does not survive a saturated blue ground.
          #EF4444 manages 2.03:1 here and even #FCA5A5 only 4.02:1. red[200] is
          the first step that clears AA at 5.28:1, so the icon is pale and the
          destructive signal comes from the red-tinted fill and border instead.

          44px targets, set in pixels — a 14px root makes every rem-based size
          land at 87.5% of its name. These were about 24px tall.
        */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/settings/profile"
            onClick={onClose}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg text-[12px] font-[600] text-white/[0.92] transition-colors duration-150 hover:bg-white/[0.18] hover:text-white"
            style={{ background: 'rgba(255,255,255,0.10)', height: 44 }}
          >
            <User size={14} strokeWidth={1.9} />
            Profile
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            title="Settings"
            aria-label="Settings"
            className="flex items-center justify-center rounded-lg text-white/[0.92] transition-colors duration-150 hover:bg-white/[0.18] hover:text-white"
            style={{ background: 'rgba(255,255,255,0.10)', height: 44, width: 44 }}
          >
            <Settings size={16} strokeWidth={1.9} />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="flex items-center justify-center rounded-lg transition-colors duration-150 hover:bg-[rgba(239,68,68,0.34)]"
            style={{
              background: 'rgba(239,68,68,0.22)',
              border: '1px solid rgba(254,202,202,0.34)',
              color: '#FECACA',
              height: 44,
              width: 44,
            }}
          >
            <LogOut size={16} strokeWidth={1.9} />
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
  const { user } = useAuth();
  const studioName = user?.organization_name || 'PT Studio';
  const founderNumber = useFounder();
  const studioOwner = user?.name || '';

  // Restore the user's manual expanded/collapsed preference on mount. There is
  // NO hover auto-expand/auto-collapse — the desktop sidebar only changes width
  // when the user clicks the toggle. Defaults to expanded.
  useEffect(() => {
    if (isMobile) return;
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') onCollapse?.();
      else onExpand?.();
    } catch { onExpand?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed;
    try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { /* noop */ }
    if (next) onCollapse?.(); else onExpand?.();
  }, [collapsed, onExpand, onCollapse]);

  return (
    <aside
      data-sidebar={variant}
      data-theme="dark"
      data-no-pull-refresh
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
        background: 'linear-gradient(180deg, rgba(245,158,11,0.07) 0%, rgba(245,158,11,0.02) 18%, transparent 38%), linear-gradient(160deg, #0F172A 0%, #0F172A 30%, #002D61 65%, #002D61 100%)',
        paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : 'env(safe-area-inset-top, 0px)',
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : undefined,
        willChange: isMobile ? 'transform' : undefined,
        top: isMobile ? '0' : undefined,
        bottom: isMobile ? '0' : undefined,
        borderRadius: isMobile ? '0 16px 16px 0' : undefined,
        boxShadow: isMobile
          ? '6px 0 24px rgba(0,0,0,0.30), 2px 0 8px rgba(0,0,0,0.20)'
          : 'inset 0 0 0 1px rgba(127,180,255,0.05), 4px 0 24px rgba(0,0,0,0.35)',
      }}
    >
      {/* Brand header */}
      <div className={cn('relative shrink-0', collapsed ? 'px-3 pb-2 pt-3' : 'px-4 pb-2.5 pt-3.5')}>
        {!collapsed && (
          <div className="absolute top-0 left-3 right-3 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-40" />
        )}
        <div className={cn('flex items-center', collapsed ? 'flex-col gap-2' : 'justify-between')}>
          {/* Closes the drawer on the way out, like every other link in it.
              Without this the brand header navigated to the dashboard and left
              the drawer sitting open on top of it — the one navigation path in
              the sidebar that did not close itself, because it is the only one
              that is not a SidebarItem or part of SidebarProfile, so neither
              onLinkClick nor onClose reached it.

              isMobile-gated to match the siblings below: on desktop the
              sidebar is not a drawer and there is nothing to close. */}
          <Link
            href="/"
            onClick={isMobile ? onMobileClose : undefined}
            className={cn('flex items-center group', collapsed ? 'justify-center' : 'gap-2.5')}
          >
            <div className="relative shrink-0">
              {/* White, explicitly. This drawer is navy in both themes, so the
                  default --bg-white plate goes dark with the theme and hides
                  the black half of a two-tone logo. */}
              <StudioMark
                name={studioName}
                logoUrl={user?.organization_logo_url}
                size={collapsed ? 32 : 38}
                background="#FFFFFF"
              />
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
                  <h2 className="max-w-[160px] truncate text-[13px] font-extrabold uppercase tracking-tight leading-none text-[var(--text-primary)]">
                    {studioName}
                  </h2>
                  {/* Was the `compact` variant, which existed only because
                      "Founder #7/20" did not fit beside a studio name clamped
                      to 160px. Without the number the full badge fits. */}
                  {founderNumber != null && (
                    <FounderBadge number={founderNumber} size="sm" className="mt-[5px]" />
                  )}
                  {studioOwner && (
                    <p className="mt-[3px] max-w-[160px] truncate text-[9.5px] font-semibold text-[var(--text-muted)] tracking-[0.06em]">
                      {studioOwner}
                    </p>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </Link>

          {/* Manual collapse/expand toggle (desktop — both states, no hover auto behavior) */}
          {!isMobile && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex h-6 w-6 items-center justify-center rounded-md transition-all duration-150"
              style={{ color: 'rgba(255,255,255,0.40)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(127,180,255,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {collapsed
                ? <PanelLeft size={13} strokeWidth={1.5} />
                : <PanelLeftClose size={13} strokeWidth={2} />
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
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(127,180,255,0.15) transparent' }}
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
