'use client';

import { useState } from 'react';
import { ChevronDown, Moon, Sun, X, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/ThemeProvider';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { NAV_GROUPS, isVisibleForRole, isGroupVisibleForRole } from '@/lib/nav-config';
import {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
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
      {/* Dashboard */}
      <Link
        href="/dashboard"
        onClick={onLinkClick}
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold tracking-wide transition-all duration-300 overflow-hidden group',
          isActive('/dashboard') ? 'text-white' : 'text-[var(--text-muted)] hover:text-white',
        )}
        style={{
          background: isActive('/dashboard')
            ? 'linear-gradient(135deg, var(--brand-lo), var(--brand))'
            : 'transparent',
          boxShadow: isActive('/dashboard') ? '0 8px 32px var(--brand-glow)' : 'none',
        }}
      >
        {!isActive('/dashboard') && (
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
            style={{ background: 'var(--brand-soft)' }} />
        )}
        {isActive('/dashboard') && (
          <motion.div className="absolute inset-0 rounded-xl"
            animate={{ background: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
        )}
        <div className={cn(
          'flex h-[28px] w-[28px] items-center justify-center rounded-lg shrink-0 transition-all duration-300 relative z-10',
          isActive('/dashboard') ? 'bg-white/20 shadow-[0_0_14px_rgba(255,255,255,0.15)]' : 'group-hover:bg-[var(--brand-soft)]',
        )}>
          <LayoutDashboard size={15} strokeWidth={isActive('/dashboard') ? 2.5 : 1.8}
            className={cn('transition-colors duration-300', isActive('/dashboard') ? 'text-white' : 'text-[var(--sidebar-icon)] group-hover:text-[var(--brand)]')} />
        </div>
        <span className={cn('relative z-10 text-[13px]', isActive('/dashboard') && 'tracking-wide')}>
          Dashboard
        </span>
        {isActive('/dashboard') && (
          <div className="ml-auto flex gap-[3px] items-center relative z-10">
            {[0, 1, 2].map(i => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}
      </Link>

      {/* Divider */}
      <div className="px-1 pt-2 pb-1">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* Groups */}
      {navItems.slice(1).map(group => {
        const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
        const open = expanded[group.id] ?? anyChildActive(group.items);
        const hasActiveChild = anyChildActive(group.items);
        const theme = GROUP_THEMES[group.id] || DEFAULT_THEME;

        return (
          <div key={group.id} className="relative">
            <button
              onClick={() => toggleGroup(group.id)}
              className="group relative w-full rounded-xl transition-all duration-300 overflow-hidden"
              style={{
                background: hasActiveChild
                  ? theme.activeBg
                  : open
                    ? `linear-gradient(135deg, ${theme.borderColor}15, transparent)`
                    : 'transparent',
                boxShadow: hasActiveChild ? `0 2px 12px ${hexToRgba(theme.borderColor, 0.08)}` : 'none',
              }}
            >
              {/* Left glow strip */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                style={{
                  background: `linear-gradient(180deg, ${theme.borderColor}, ${theme.borderColor}66)`,
                  height: hasActiveChild || open ? '55%' : '0%',
                  opacity: hasActiveChild || open ? 1 : 0,
                  boxShadow: theme.glow,
                }}
              />
              {/* Hover bg */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
                style={{ background: theme.activeBg }} />

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
            </button>

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
                          {(item.badge || item.isNew) && (
                            <span className="ml-auto rounded-full px-[7px] py-[2px] text-[6.5px] font-extrabold uppercase tracking-wider shrink-0 relative z-10"
                              style={{
                                background: theme.badgeBg,
                                color: theme.badgeText,
                                boxShadow: `0 1px 4px ${hexToRgba(theme.borderColor, 0.25)}`,
                              }}>
                              {item.badge || 'NEW'}
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
  const { user, logout } = useAuth();

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
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[var(--brand-lo)] to-transparent opacity-70" />
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="h-[52px] w-[52px] rounded-xl bg-gradient-to-br from-[var(--brand-lo)] via-[var(--brand)] to-purple-500 p-[2px] shadow-[0_4px_20px_var(--brand-glow)] transition-all duration-300 group-hover:shadow-[0_6px_28px_var(--brand-glow-2)]">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[var(--bg-white)]">
                  <img src="/logo.png" alt="" className="h-10 w-10 rounded-lg object-cover" />
                </div>
              </div>
              <motion.span className="absolute -bottom-[2px] -right-[2px] flex h-3.5 w-3.5"
                animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-50" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[var(--success)] ring-[2.5px] ring-[var(--bg-white)] shadow-[0_0_8px_var(--success)]" />
              </motion.span>
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold tracking-tight text-[var(--text-primary)] leading-none">
                <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6, #60A5FA, #93C5FD)' }}>619</span>
                {' '}
                <span className="tracking-[0.04em] text-[14px]">FITNESS</span>
              </h2>
              <p className="mt-[3px] text-[10px] font-semibold text-[var(--text-muted)] tracking-[0.1em] uppercase">
                Studio Suite
              </p>
            </div>
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
        <SidebarNav onLinkClick={isMobile ? onMobileClose : undefined} />
      </div>

      {/* User profile + footer */}
      <div className="relative shrink-0 px-3 pb-4 pt-3">
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

        {/* User profile card */}
        <div className="mt-3 mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-[var(--brand-soft)] cursor-pointer group/profile"
          onClick={() => {}}>
          <div className="relative shrink-0">
            <div className="h-[34px] w-[34px] rounded-lg bg-gradient-to-br from-[var(--brand-lo)] to-[var(--brand)] flex items-center justify-center text-white text-xs font-bold shadow-[0_2px_8px_var(--brand-glow)]">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="absolute -bottom-[1px] -right-[1px] h-[10px] w-[10px] rounded-full bg-[var(--success)] ring-[2px] ring-[var(--bg-white)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[var(--text-primary)] truncate leading-tight">{user?.name || 'User'}</p>
            <p className="text-[9px] font-medium text-[var(--text-muted)] truncate tracking-wide uppercase">{user?.role || 'admin'}</p>
          </div>
          <Link href="/profile"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[var(--text-muted)] transition-all opacity-0 group-hover/profile:opacity-100 hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]">
            <Settings size={12} />
          </Link>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-[6px] w-[6px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-50" />
              <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-[var(--success)] shadow-[0_0_4px_var(--success)]" />
            </span>
            <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-[0.08em] uppercase">v4.0</span>
            <span className="text-[9px] text-[var(--text-disabled)]">·</span>
            <span className="text-[9px] font-medium text-[var(--text-disabled)]">Premium</span>
          </div>
          <div className="flex items-center gap-[2px]">
            <button onClick={toggle}
              aria-label="Toggle theme"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]">
              {theme === 'light' ? <Moon size={11} /> : <Sun size={11} />}
            </button>
            <button onClick={() => logout?.()}
              aria-label="Logout"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-lg text-[var(--text-muted)] transition-all hover:bg-red-50 hover:text-red-500">
              <LogOut size={11} />
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
