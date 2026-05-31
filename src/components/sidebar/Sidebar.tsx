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

interface GroupTheme {
  label: string;
  gradient: string;
  gradientHover: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  activeBg: string;
  subBorder: string;
  subActiveBg: string;
  badgeBg: string;
  badgeText: string;
}

const GROUP_THEMES: Record<string, GroupTheme> = {
  'lead-crm': {
    label: 'Lead CRM',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(249,115,22,0.12))',
    borderColor: '#F59E0B',
    iconBg: 'linear-gradient(135deg, #F59E0B, #F97316)',
    iconColor: '#FEF3C7',
    activeBg: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(249,115,22,0.10))',
    subBorder: 'rgba(245,158,11,0.20)',
    subActiveBg: 'rgba(245,158,11,0.10)',
    badgeBg: 'linear-gradient(135deg, #F59E0B, #F97316)',
    badgeText: '#FFFFFF',
  },
  'members': {
    label: 'Members',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(5,150,105,0.12))',
    borderColor: '#10B981',
    iconBg: 'linear-gradient(135deg, #10B981, #059669)',
    iconColor: '#ECFDF5',
    activeBg: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.10))',
    subBorder: 'rgba(16,185,129,0.20)',
    subActiveBg: 'rgba(16,185,129,0.10)',
    badgeBg: 'linear-gradient(135deg, #10B981, #059669)',
    badgeText: '#FFFFFF',
  },
  'attendance': {
    label: 'Attendance',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(6,182,212,0.22), rgba(14,165,233,0.12))',
    borderColor: '#06B6D4',
    iconBg: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    iconColor: '#ECFEFF',
    activeBg: 'linear-gradient(135deg, rgba(6,182,212,0.18), rgba(14,165,233,0.10))',
    subBorder: 'rgba(6,182,212,0.20)',
    subActiveBg: 'rgba(6,182,212,0.10)',
    badgeBg: 'linear-gradient(135deg, #06B6D4, #0891B2)',
    badgeText: '#FFFFFF',
  },
  'personal-training': {
    label: 'PT System',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(168,85,247,0.12))',
    borderColor: '#8B5CF6',
    iconBg: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
    iconColor: '#F5F3FF',
    activeBg: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(168,85,247,0.10))',
    subBorder: 'rgba(139,92,246,0.20)',
    subActiveBg: 'rgba(139,92,246,0.10)',
    badgeBg: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
    badgeText: '#FFFFFF',
  },
  'trainer-management': {
    label: 'Trainers',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(249,115,22,0.22), rgba(234,88,12,0.12))',
    borderColor: '#F97316',
    iconBg: 'linear-gradient(135deg, #F97316, #EA580C)',
    iconColor: '#FFF7ED',
    activeBg: 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,88,12,0.10))',
    subBorder: 'rgba(249,115,22,0.20)',
    subActiveBg: 'rgba(249,115,22,0.10)',
    badgeBg: 'linear-gradient(135deg, #F97316, #EA580C)',
    badgeText: '#FFFFFF',
  },
  'session-management': {
    label: 'Sessions',
    gradient: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(14,165,233,0.22), rgba(99,102,241,0.12))',
    borderColor: '#0EA5E9',
    iconBg: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
    iconColor: '#F0F9FF',
    activeBg: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(99,102,241,0.10))',
    subBorder: 'rgba(14,165,233,0.20)',
    subActiveBg: 'rgba(14,165,233,0.10)',
    badgeBg: 'linear-gradient(135deg, #0EA5E9, #6366F1)',
    badgeText: '#FFFFFF',
  },
  'progress-tracking': {
    label: 'Progress',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,63,94,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(244,63,94,0.12))',
    borderColor: '#EC4899',
    iconBg: 'linear-gradient(135deg, #EC4899, #F43F5E)',
    iconColor: '#FDF2F8',
    activeBg: 'linear-gradient(135deg, rgba(236,72,153,0.18), rgba(244,63,94,0.10))',
    subBorder: 'rgba(236,72,153,0.20)',
    subActiveBg: 'rgba(236,72,153,0.10)',
    badgeBg: 'linear-gradient(135deg, #EC4899, #F43F5E)',
    badgeText: '#FFFFFF',
  },
  'memberships': {
    label: 'Memberships',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(79,70,229,0.12))',
    borderColor: '#6366F1',
    iconBg: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    iconColor: '#EEF2FF',
    activeBg: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(79,70,229,0.10))',
    subBorder: 'rgba(99,102,241,0.20)',
    subActiveBg: 'rgba(99,102,241,0.10)',
    badgeBg: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    badgeText: '#FFFFFF',
  },
  'finance': {
    label: 'Finance',
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(16,185,129,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(20,184,166,0.22), rgba(16,185,129,0.12))',
    borderColor: '#14B8A6',
    iconBg: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    iconColor: '#F0FDFA',
    activeBg: 'linear-gradient(135deg, rgba(20,184,166,0.18), rgba(16,185,129,0.10))',
    subBorder: 'rgba(20,184,166,0.20)',
    subActiveBg: 'rgba(20,184,166,0.10)',
    badgeBg: 'linear-gradient(135deg, #14B8A6, #0D9488)',
    badgeText: '#FFFFFF',
  },
  'communication': {
    label: 'Communication',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(217,70,239,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(217,70,239,0.12))',
    borderColor: '#A855F7',
    iconBg: 'linear-gradient(135deg, #A855F7, #D946EF)',
    iconColor: '#FAF5FF',
    activeBg: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(217,70,239,0.10))',
    subBorder: 'rgba(168,85,247,0.20)',
    subActiveBg: 'rgba(168,85,247,0.10)',
    badgeBg: 'linear-gradient(135deg, #A855F7, #D946EF)',
    badgeText: '#FFFFFF',
  },
  'reports': {
    label: 'Reports',
    gradient: 'linear-gradient(135deg, rgba(100,116,139,0.15), rgba(71,85,105,0.08))',
    gradientHover: 'linear-gradient(135deg, rgba(100,116,139,0.22), rgba(71,85,105,0.12))',
    borderColor: '#64748B',
    iconBg: 'linear-gradient(135deg, #64748B, #475569)',
    iconColor: '#F1F5F9',
    activeBg: 'linear-gradient(135deg, rgba(100,116,139,0.18), rgba(71,85,105,0.10))',
    subBorder: 'rgba(100,116,139,0.20)',
    subActiveBg: 'rgba(100,116,139,0.10)',
    badgeBg: 'linear-gradient(135deg, #64748B, #475569)',
    badgeText: '#FFFFFF',
  },
};

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
    <div className="space-y-1 px-2">
      {/* Dashboard — premium hero link */}
      <Link
        href="/dashboard"
        onClick={onLinkClick}
        className={cn(
          'relative flex items-center gap-3 rounded-[12px] px-3 py-3 text-[13px] font-bold tracking-wide transition-all duration-300 overflow-hidden group',
          isActive('/dashboard')
            ? 'text-white shadow-[0_8px_28px_rgba(59,130,246,0.35)]'
            : 'text-[var(--text-muted)] hover:text-white',
        )}
        style={{
          background: isActive('/dashboard')
            ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #7C3AED 100%)'
            : 'transparent',
        }}
      >
        {/* Animated gradient border glow */}
        <div
          className="absolute inset-0 rounded-[12px] opacity-0 group-hover:opacity-100 transition-all duration-500"
          style={{
            background: !isActive('/dashboard')
              ? 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(124,58,237,0.08), rgba(59,130,246,0.04))'
              : undefined,
          }}
        />
        {/* Active overlay shimmer */}
        {isActive('/dashboard') && (
          <motion.div
            className="absolute inset-0 rounded-[12px]"
            animate={{ background: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {/* Glowing ring */}
        {isActive('/dashboard') && (
          <div
            className="absolute -inset-[1px] rounded-[13px] opacity-60"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.5), rgba(167,139,250,0.3))',
              zIndex: -1,
              filter: 'blur(6px)',
            }}
          />
        )}
        {/* Dashboard icon */}
        <div
          className={cn(
            'flex h-[28px] w-[28px] items-center justify-center rounded-[8px] shrink-0 transition-all duration-300 relative z-10',
            isActive('/dashboard')
              ? 'bg-white/20 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
              : 'group-hover:bg-[rgba(59,130,246,0.12)] group-hover:shadow-[0_0_12px_rgba(59,130,246,0.1)]',
          )}
        >
          <LayoutDashboard
            size={16}
            strokeWidth={isActive('/dashboard') ? 2.5 : 1.8}
            className={cn(
              'transition-colors duration-300',
              isActive('/dashboard') ? 'text-white' : 'text-[#6B7280] group-hover:text-[#60A5FA]',
            )}
          />
        </div>
        <span className={cn('relative z-10', isActive('/dashboard') ? 'font-extrabold tracking-wide' : 'font-bold')}>
          Dashboard
        </span>
        {/* Active pulsing indicators */}
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
      <div className="px-1 pt-2 pb-1">
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(11,11,15,0.06)] to-transparent dark:via-white/5" />
      </div>

      {/* Group buttons with dropdowns */}
      {navItems.slice(1).map(group => {
        const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
        const open = expanded[group.id] ?? anyChildActive(group.items);
        const hasActiveChild = anyChildActive(group.items);
        const theme = GROUP_THEMES[group.id];

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
              {/* Left color strip — taller, glow */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-300"
                style={{
                  background: `linear-gradient(180deg, ${theme.borderColor}, ${theme.borderColor}88)`,
                  height: hasActiveChild || open ? '60%' : '0%',
                  opacity: hasActiveChild || open ? 1 : 0,
                  boxShadow: `0 0 10px ${theme.borderColor}50`,
                }}
              />

              {/* Hover gradient overlay — stronger than before */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[11px]"
                style={{ background: theme.gradientHover }}
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
                {/* Colorful icon container — solid gradient when active */}
                <div
                  className={cn(
                    'flex h-[28px] w-[28px] items-center justify-center rounded-[8px] shrink-0 transition-all duration-300',
                    hasActiveChild || open
                      ? 'shadow-[0_0_10px_rgba(0,0,0,0.08)]'
                      : 'group-hover:bg-white/10',
                  )}
                  style={{
                    background: hasActiveChild
                      ? theme.iconBg
                      : open
                        ? theme.iconBg
                        : 'transparent',
                  }}
                >
                  <GroupIcon
                    size={15}
                    strokeWidth={hasActiveChild ? 2.2 : 1.5}
                    style={{
                      color: hasActiveChild || open ? theme.iconColor : '#6B7280',
                      filter: hasActiveChild ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 'none',
                    }}
                  />
                </div>

                {/* Label */}
                <span className="flex-1 text-left">{group.label}</span>

                {/* Chevron with color */}
                <ChevronDown
                  size={13}
                  strokeWidth={2}
                  className="shrink-0 transition-transform duration-300"
                  style={{
                    color: hasActiveChild ? theme.borderColor : '#9CA3AF',
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
                    className="ml-6 mt-1 space-y-0.5 border-l-2 pl-2"
                    style={{
                      borderColor: theme.subBorder,
                    }}
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
                              background: !active ? theme.gradientHover : undefined,
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
                                  color: active ? theme.iconColor : '#6B7280',
                                }}
                              />
                            )}
                          </div>

                          {/* Label */}
                          <span className="truncate relative z-10">{item.label}</span>

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
          'bg-white/85 dark:bg-[#121217]/95 backdrop-blur-[24px] saturate-[180%]',
          'border-r border-[rgba(11,11,15,0.04)] dark:border-white/5',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_16px_48px_rgba(11,11,15,0.08)]',
          'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_16px_48px_rgba(0,0,0,0.3)]',
        ],
        isMobile && [
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'bg-white/90 dark:bg-[#121217]/98 backdrop-blur-[24px]',
          'border-r border-[rgba(11,11,15,0.04)] dark:border-white/5',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ],
      )}
    >
      {/* Header with brand gradient accent */}
      <div className="relative shrink-0 px-5 py-6">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4]" />
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/logo.png"
                alt="619 Fitness"
                className="h-14 w-14 rounded-xl object-cover shadow-[0_4px_16px_rgba(59,130,246,0.15)] transition-all duration-300 group-hover:shadow-[0_4px_20px_rgba(59,130,246,0.25)]"
              />
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] shadow-[0_0_6px_rgba(16,185,129,0.4)] ring-2 ring-white dark:ring-[#121217]" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold tracking-tight text-[var(--text-primary)] leading-none dark:text-white">
                <span className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">619</span>
                {' '}FITNESS
              </h2>
              <p className="mt-0.5 text-[11px] font-semibold text-[var(--text-muted)] dark:text-white/50 tracking-[0.06em] uppercase">
                Studio Management
              </p>
            </div>
          </Link>
          {isMobile && (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onMobileClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation scroll area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 scrollbar-thin scrollbar-thumb-[rgba(11,11,15,0.08)] dark:scrollbar-thumb-white/10">
        <SidebarNav onLinkClick={isMobile ? onMobileClose : undefined} />
      </div>

      {/* Footer with gradient top border */}
      <div className="relative shrink-0 px-4 py-3">
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[rgba(11,11,15,0.06)] to-transparent dark:via-white/5" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-muted)] dark:text-white/40">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.50)]" />
              </span>
              Premium — v4.0
            </span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[var(--text-muted)] dark:text-white/50 transition-all hover:bg-[rgba(59,130,246,0.08)] hover:text-[#3B82F6] dark:hover:bg-white/10 dark:hover:text-white/80"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
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
