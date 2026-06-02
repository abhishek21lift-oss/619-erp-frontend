'use client';

import { useState } from 'react';
import { ChevronDown, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/ThemeProvider';
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
  lightBg: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
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
  gradient: `linear-gradient(135deg, ${color} 0%, ${hexToRgba(color, 0.7)} 100%)`,
  lightBg: hexToRgba(color, 0.08),
  borderColor: color,
  iconBg: `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.75)})`,
  iconColor: '#ffffff',
  activeBg: hexToRgba(color, 0.1),
  subBorder: hexToRgba(color, 0.3),
  subActiveBg: hexToRgba(color, 0.1),
  badgeBg: `linear-gradient(135deg, ${color}, ${hexToRgba(color, 0.75)})`,
  badgeText: '#ffffff',
});

const GROUP_THEMES: Record<string, GroupTheme> = {
  'lead-crm':            buildTheme('#F59E0B'),
  'members':             buildTheme('#22C55E'),
  'attendance':          buildTheme('#06B6D4'),
  'personal-training':   buildTheme('#8B5CF6'),
  'trainer-management':  buildTheme('#F97316'),
  'session-management':  buildTheme('#0EA5E9'),
  'progress-tracking':   buildTheme('#EC4899'),
  'memberships':         buildTheme('#6366F1'),
  'finance':             buildTheme('#14B8A6'),
  'communication':       buildTheme('#A855F7'),
  'reports':             buildTheme('#64748B'),
};

const DEFAULT_THEME = buildTheme('#3B82F6');

function SidebarNav({ onLinkClick }: { onLinkClick?: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const navItems = [
    { items: [], label: 'Dashboard', id: 'dashboard', icon: 'LayoutDashboard', single: true, href: '/dashboard' },
    ...NAV_GROUPS.filter(g => isGroupVisibleForRole(g, user?.role)).map(g => ({
      ...g,
      items: g.items.filter(i => isVisibleForRole(i, user?.role)).flatMap(i =>
        i.children
          ? i.children.filter(c => isVisibleForRole(c, user?.role))
          : [i]
      ),
      single: false, href: '',
    })).filter(g => g.items.length > 0),
  ];

  const toggleGroup = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const anyChildActive = (items: { href?: string; children?: { href?: string }[] }[]) =>
    items.some(i => isActive(i.href || '') || (i.children?.some(c => isActive(c.href || ''))));

  return (
    <div className="space-y-[3px] px-2">
      {/* Dashboard — premium hero link */}
      <Link
        href="/dashboard"
        onClick={onLinkClick}
        className={cn(
          'relative flex items-center gap-3 rounded-[12px] px-3 py-3 text-[13px] font-bold tracking-wide transition-all duration-300 overflow-hidden group',
          isActive('/dashboard')
            ? 'text-white shadow-[0_8px_28px_var(--brand-glow)]'
            : 'text-[var(--text-muted)] hover:text-white',
        )}
        style={{
          background: isActive('/dashboard')
            ? 'var(--brand-lo)'
            : 'transparent',
        }}
      >
        <div
          className="absolute inset-0 rounded-[12px] opacity-0 group-hover:opacity-100 transition-all duration-500"
          style={{
            background: !isActive('/dashboard')
              ? 'var(--brand-soft)'
              : undefined,
          }}
        />
        {isActive('/dashboard') && (
          <motion.div
            className="absolute inset-0 rounded-[12px]"
            animate={{ background: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.08)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {isActive('/dashboard') && (
          <div
            className="absolute -inset-[1px] rounded-[13px] opacity-60"
            style={{
              background: 'var(--brand-lo)',
              zIndex: -1,
              filter: 'blur(6px)',
            }}
          />
        )}
        <div
          className={cn(
            'flex h-[28px] w-[28px] items-center justify-center rounded-[8px] shrink-0 transition-all duration-300 relative z-10',
            isActive('/dashboard')
              ? 'bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
              : 'group-hover:bg-[var(--brand-soft)] group-hover:shadow-[0_0_12px_var(--brand-glow)]',
          )}
        >
          <LayoutDashboard
            size={16}
            strokeWidth={isActive('/dashboard') ? 2.5 : 1.8}
            className={cn(
              'transition-colors duration-300',
              isActive('/dashboard') ? 'text-white' : 'text-[var(--sidebar-icon)] group-hover:text-[var(--brand)]',
            )}
          />
        </div>
        <span className={cn('relative z-10', isActive('/dashboard') ? 'font-extrabold tracking-wide' : 'font-bold')}>
          Dashboard
        </span>
        {isActive('/dashboard') && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 z-10">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </Link>

      {/* Section divider */}
      <div className="px-1 pt-1 pb-[2px]">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* Group buttons with dropdowns */}
      {navItems.slice(1).map(group => {
        const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
        const open = expanded[group.id] ?? anyChildActive(group.items);
        const hasActiveChild = anyChildActive(group.items);
        const theme = GROUP_THEMES[group.id] || DEFAULT_THEME;

        return (
          <div key={group.id} className="relative">
            <button
              onClick={() => toggleGroup(group.id)}
              className={cn(
                'group relative w-full rounded-[11px] transition-all duration-300 overflow-hidden',
                hasActiveChild && 'shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
              )}
              style={{
                background: hasActiveChild
                  ? theme.activeBg
                  : open
                    ? theme.gradient
                    : undefined,
              }}
            >
              {/* Left color strip */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                style={{
                  background: `linear-gradient(180deg, ${theme.borderColor}, ${theme.borderColor}88)`,
                  height: hasActiveChild || open ? '60%' : '0%',
                  opacity: hasActiveChild || open ? 1 : 0,
                  boxShadow: `0 0 10px ${theme.borderColor}50`,
                }}
              />

              {/* Hover gradient overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[11px]"
                style={{ background: theme.lightBg }}
              />

              {/* Active shimmer scan */}
              {hasActiveChild && (
                <motion.div
                  className="absolute inset-0 rounded-[11px]"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    background: `linear-gradient(90deg, transparent, ${theme.borderColor}08, transparent)`,
                  }}
                />
              )}

              <div
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                  hasActiveChild ? 'font-semibold tracking-wide' : '',
                )}
                style={{
                  color: hasActiveChild ? theme.borderColor : 'var(--text-muted)',
                }}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    'flex h-[28px] w-[28px] items-center justify-center rounded-[8px] shrink-0 transition-all duration-300',
                    (hasActiveChild || open)
                      ? 'shadow-[0_0_10px_rgba(0,0,0,0.08)]'
                      : 'group-hover:bg-white/10',
                  )}
                  style={{
                    background: (hasActiveChild || open) ? theme.iconBg : 'transparent',
                  }}
                >
                  <GroupIcon
                    size={15}
                    strokeWidth={hasActiveChild ? 2.2 : 1.5}
                    style={{
                      color: hasActiveChild || open ? theme.iconColor : 'var(--sidebar-icon)',
                      filter: hasActiveChild ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 'none',
                    }}
                  />
                </div>

                {/* Label */}
                <span className="flex-1 text-left">{group.label}</span>

                {/* Chevron */}
                <ChevronDown
                  size={13}
                  strokeWidth={2}
                  className="shrink-0 transition-transform duration-300"
                  style={{
                    color: hasActiveChild ? theme.borderColor : 'var(--text-disabled)',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key={`${group.id}-items`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div
                    className="ml-6 mt-1 space-y-[2px] border-l-2 pl-2"
                    style={{ borderColor: theme.subBorder }}
                  >
                    {group.items.map((item, idx) => {
                      const ItemIcon = ICON_MAP[item.icon];
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onLinkClick}
                          className={cn(
                            'relative flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[12px] font-medium transition-all duration-200 overflow-hidden',
                            active && 'font-semibold',
                          )}
                          style={{
                            color: active ? theme.borderColor : 'var(--text-muted)',
                            background: active ? theme.subActiveBg : 'transparent',
                          }}
                        >
                          {/* Active accent bar */}
                          {active && (
                            <motion.div
                              layoutId={`sidebar-active-${group.id}`}
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                              style={{
                                background: `linear-gradient(180deg, ${theme.borderColor}, ${theme.borderColor}88)`,
                                boxShadow: `0 0 8px ${theme.borderColor}60`,
                              }}
                            />
                          )}

                          {/* Hover highlight */}
                          <div
                            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-150 rounded-[8px]"
                            style={{
                              background: !active ? theme.lightBg : undefined,
                            }}
                          />

                          {/* Icon */}
                          <div
                            className={cn(
                              'flex h-[22px] w-[22px] items-center justify-center rounded-[6px] shrink-0 transition-all duration-200 relative z-10',
                              active && 'shadow-[0_0_6px_rgba(0,0,0,0.06)]',
                            )}
                            style={{
                              background: active ? theme.iconBg : 'transparent',
                            }}
                          >
                            {ItemIcon && (
                              <ItemIcon
                                size={13}
                                strokeWidth={active ? 2.2 : 1.5}
                                style={{
                                  color: active ? '#ffffff' : 'var(--sidebar-icon)',
                                }}
                              />
                            )}
                          </div>

                          {/* Label */}
                          <span
                            className={cn(
                              'truncate relative z-10 transition-all duration-200',
                              active && 'font-semibold tracking-wide',
                            )}
                            style={{
                              color: active
                                ? theme.borderColor
                                : 'var(--text-muted)',
                            }}
                          >
                            {item.label}
                          </span>

                          {/* Badge / NEW indicator */}
                          {(item.badge || item.isNew) && (
                            <span
                              className="ml-auto rounded-full px-[7px] py-[3px] text-[7px] font-extrabold uppercase tracking-wider shrink-0 relative z-10"
                              style={{
                                background: theme.badgeBg,
                                color: theme.badgeText,
                                boxShadow: `0 1px 4px rgba(0,0,0,0.10)`,
                              }}
                            >
                              {item.badge || (item.isNew ? 'NEW' : '')}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
  variant = 'desktop',
}: SidebarProps) {
  const isMobile = variant === 'mobile';
  const { theme, toggle } = useTheme();

  return (
    <aside
      data-sidebar={variant}
      className={cn(
        !isMobile && [
          'fixed inset-y-0 left-0 z-30 hidden w-64 flex-col',
          'lg:flex xl:w-72',
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
      <div className="relative shrink-0 px-5 pb-3 pt-6">
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-[var(--brand-lo)] via-[#60A5FA] to-[var(--brand-lo)] opacity-70" />
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-[var(--brand-lo)] to-[var(--brand)] p-[2px] shadow-[0_4px_16px_var(--brand-glow)] transition-all duration-300 group-hover:shadow-[0_4px_20px_var(--brand-glow-2)]">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[var(--bg-white)]">
                  <img
                    src="/logo.png"
                    alt="619 Fitness"
                    className="h-11 w-11 rounded-[8px] object-cover"
                  />
                </div>
              </div>
              <motion.span
                className="absolute -bottom-0.5 -right-0.5 flex h-[14px] w-[14px]"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-50" />
                <span className="relative inline-flex h-[14px] w-[14px] rounded-full bg-[var(--success)] ring-2 ring-[var(--bg-white)] shadow-[0_0_6px_var(--success)]" />
              </motion.span>
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold tracking-tight text-[var(--text-primary)] leading-none">
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #93C5FD 100%)' }}
                >619</span>
                {' '}
                <span className="tracking-[0.04em]">FITNESS</span>
              </h2>
              <p className="mt-[3px] text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.08em] uppercase">
                Studio Management
              </p>
            </div>
          </Link>
          {isMobile && (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onMobileClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation scroll area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-thin scrollbar-thumb-[var(--border)]">
        <SidebarNav onLinkClick={isMobile ? onMobileClose : undefined} />
      </div>

      {/* Footer */}
      <div className="relative shrink-0 px-4 pb-4 pt-3">
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)] shadow-[0_0_6px_var(--success)]" />
              </span>
              Premium · v4.0
            </span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-all hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            >
              {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  variant?: 'desktop' | 'mobile';
}
