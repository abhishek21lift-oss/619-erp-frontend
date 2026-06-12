'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { NAV_GROUPS, isVisibleForRole, isGroupVisibleForRole } from '@/lib/nav-config';
import {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote,
};

type GroupTheme = {
  gradient: string;
  glow: string;
  borderColor: string;
  iconBg: string;
  activeBg: string;
  subBorder: string;
  subActiveBg: string;
  badgeBg: string;
  badgeText: string;
};

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const buildTheme = (color: string): GroupTheme => ({
  gradient: `linear-gradient(135deg, ${color} 0%, ${hexToRgba(color, 0.6)} 100%)`,
  glow: `0 0 20px ${hexToRgba(color, 0.3)}, 0 0 60px ${hexToRgba(color, 0.1)}`,
  borderColor: color,
  iconBg: `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.5)})`,
  activeBg: hexToRgba(color, 0.08),
  subBorder: hexToRgba(color, 0.2),
  subActiveBg: hexToRgba(color, 0.1),
  badgeBg: `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.6)})`,
  badgeText: '#ffffff',
});

const GROUP_THEMES: Record<string, GroupTheme> = {
  'attendance':          buildTheme('#06B6D4'),
  'personal-training':   buildTheme('#8B5CF6'),
  'trainer-management':  buildTheme('#F97316'),
  'session-management':  buildTheme('#0EA5E9'),
  'progress-tracking':   buildTheme('#EC4899'),
  'finance':             buildTheme('#14B8A6'),
  'communication':       buildTheme('#A855F7'),
  'reports':             buildTheme('#64748B'),
};

const DEFAULT_THEME = buildTheme('#3B82F6');

function SidebarNav({ collapsed, onLinkClick }: { collapsed?: boolean; onLinkClick?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const navItems = [
    ...NAV_GROUPS.filter(g => isGroupVisibleForRole(g, user?.role)).map(g => ({
      ...g,
      items: g.items.filter(i => isVisibleForRole(i, user?.role)).flatMap(i =>
        i.children ? i.children.filter(c => isVisibleForRole(c, user?.role)) : [i]
      ),
      single: false, href: '',
    })).filter(g => g.items.length > 0),
  ];

  const toggleGroup = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const anyChildActive = (items: { href?: string; children?: { href?: string }[] }[]) =>
    items.some(i => isActive(i.href || '') || i.children?.some(c => isActive(c.href || '')));

  return (
    <div className="space-y-[2px] px-3">
      {/* Groups */}
      {navItems.slice(0).map(group => {
        const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
        const open = expanded[group.id] ?? anyChildActive(group.items);
        const hasActiveChild = anyChildActive(group.items);
        const theme = GROUP_THEMES[group.id] || DEFAULT_THEME;

        return (
          <div key={group.id} className="relative group/group">
            <button
              onClick={() => { if (!collapsed) toggleGroup(group.id); }}
              className={cn(
                'relative w-full rounded-xl transition-all duration-300 overflow-hidden',
                collapsed ? 'flex justify-center px-0 py-2' : '',
              )}
              style={{
                background: hasActiveChild
                  ? theme.activeBg
                  : open && !collapsed
                    ? `linear-gradient(135deg, ${theme.borderColor}15, transparent)`
                    : 'transparent',
                boxShadow: hasActiveChild ? `0 2px 12px ${hexToRgba(theme.borderColor, 0.08)}` : 'none',
              }}
              title={collapsed ? group.label : undefined}
            >
              {/* Left glow strip */}
              {!collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                  style={{
                    background: `linear-gradient(180deg, ${theme.borderColor}, ${theme.borderColor}66)`,
                    height: hasActiveChild || open ? '55%' : '0%',
                    opacity: hasActiveChild || open ? 1 : 0,
                    boxShadow: theme.glow,
                  }}
                />
              )}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
                style={{ background: theme.activeBg }} />

              {collapsed ? (
                <div className={cn(
                  'flex h-[32px] w-[32px] items-center justify-center rounded-lg transition-all duration-300',
                  (hasActiveChild) && 'shadow-[0_0_12px_rgba(0,0,0,0.08)]',
                )}
                  style={{ background: hasActiveChild ? theme.iconBg : 'transparent' }}>
                  <GroupIcon size={16} strokeWidth={hasActiveChild ? 2.5 : 1.5}
                    style={{
                      color: hasActiveChild || open ? '#ffffff' : 'var(--sidebar-icon)',
                    }} />
                </div>
              ) : (
                <div className="relative flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-200"
                  style={{ color: hasActiveChild ? theme.borderColor : 'var(--text-muted)' }}>
                  <div className={cn(
                    'flex h-[28px] w-[28px] items-center justify-center rounded-lg shrink-0 transition-all duration-300',
                    (hasActiveChild || open) && 'shadow-[0_0_12px_rgba(0,0,0,0.08)]',
                  )}
                    style={{ background: (hasActiveChild || open) ? theme.iconBg : 'transparent' }}>
                    <GroupIcon size={14} strokeWidth={hasActiveChild ? 2.2 : 1.5}
                      style={{
                        color: hasActiveChild || open ? '#ffffff' : 'var(--sidebar-icon)',
                        filter: hasActiveChild ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 'none',
                      }} />
                  </div>
                  <span className="flex-1 text-left text-[13px] font-semibold tracking-tight">{group.label}</span>
                  <ChevronDown size={12} strokeWidth={2.5}
                    className="shrink-0 transition-transform duration-300"
                    style={{
                      color: hasActiveChild ? theme.borderColor : 'var(--text-disabled)',
                      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    }} />
                </div>
              )}
            </button>

            {!collapsed && (
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key={`${group.id}-items`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="ml-7 mt-1 space-y-[1px] border-l-[1.5px] pl-2"
                      style={{ borderColor: theme.subBorder }}>
                      {group.items.map((item) => {
                        const ItemIcon = ICON_MAP[item.icon];
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onLinkClick}
                            className={cn(
                              'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all duration-200 overflow-hidden',
                              active && 'font-semibold',
                            )}
                            style={{
                              color: active ? theme.borderColor : 'var(--text-muted)',
                              background: active ? theme.subActiveBg : 'transparent',
                            }}
                          >
                            {active && (
                              <motion.div layoutId={`sidebar-active-${group.id}`}
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                                style={{
                                  background: `linear-gradient(180deg, ${theme.borderColor}, ${theme.borderColor}66)`,
                                  boxShadow: `0 0 8px ${theme.borderColor}50`,
                                }} />
                            )}
                            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-150 rounded-lg"
                              style={{ background: !active ? theme.activeBg : undefined }} />
                            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md shrink-0 transition-all duration-200 relative z-10"
                              style={{ background: active ? theme.iconBg : 'transparent' }}>
                              {ItemIcon && (
                                <ItemIcon size={12} strokeWidth={active ? 2.5 : 1.5}
                                  style={{ color: active ? '#ffffff' : 'var(--sidebar-icon)' }} />
                              )}
                            </div>
                            <span className="truncate relative z-10 text-[12px]">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

  const handleMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (collapsed) onExpand?.();
  }, [collapsed, onExpand]);

  const handleMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => {
      if (!collapsed) onCollapse?.();
    }, 300);
  }, [collapsed, onCollapse]);

  return (
    <aside
      data-sidebar={variant}
      onMouseEnter={!isMobile ? handleMouseEnter : undefined}
      onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      className={cn(
        !isMobile && [
          'fixed inset-y-0 left-0 z-30 hidden flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'lg:flex',
          collapsed ? 'w-16' : 'w-64 xl:w-72',
          'bg-[var(--sidebar-bg)] backdrop-blur-[24px] saturate-[180%]',
          'border-r border-[var(--sidebar-border)]',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_16px_48px_rgba(11,11,15,0.08)]',
          'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_16px_48px_rgba(0,0,0,0.3)]',
        ],
        isMobile && [
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'bg-[var(--sidebar-bg)] backdrop-blur-[24px]',
          'border-r border-[var(--sidebar-border)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ],
      )}
    >
      {/* Brand header */}
      <div className={cn('relative shrink-0', collapsed ? 'px-3 pb-2 pt-4' : 'px-5 pb-3 pt-6')}>
        {!collapsed && <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[var(--brand-lo)] to-transparent opacity-70" />}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <Link href="/" className={cn('flex items-center group', collapsed ? 'justify-center' : 'gap-3')}>
            <div className="relative">
              <div className={cn('rounded-xl bg-gradient-to-br from-[var(--brand-lo)] via-[var(--brand)] to-purple-500 p-[2px] shadow-[0_4px_20px_var(--brand-glow)] transition-all duration-300 group-hover:shadow-[0_6px_28px_var(--brand-glow-2)]',
                collapsed ? 'h-10 w-10' : 'h-[52px] w-[52px]')}>
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[var(--bg-white)]">
                  <Image src="/logo.png" alt="619 Fitness" width={collapsed ? 28 : 40} height={collapsed ? 28 : 40} className={cn('rounded-lg object-cover', collapsed ? 'h-7 w-7' : 'h-10 w-10')} />
                </div>
              </div>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h2 className="text-[17px] font-extrabold tracking-tight text-[var(--text-primary)] leading-none whitespace-nowrap">
                  <span className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6, #60A5FA, #93C5FD)' }}>619</span>
                  {' '}
                  <span className="tracking-[0.04em] text-[14px]">FITNESS</span>
                </h2>
                <p className="mt-[3px] text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase whitespace-nowrap">
                  Studio Suite
                </p>
              </div>
            )}
          </Link>
          {isMobile && (
            <button type="button" aria-label="Close sidebar" onClick={onMobileClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 scrollbar-thin scrollbar-thumb-[var(--border)]">
        <SidebarNav collapsed={collapsed} onLinkClick={isMobile ? onMobileClose : undefined} />
      </div>
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
