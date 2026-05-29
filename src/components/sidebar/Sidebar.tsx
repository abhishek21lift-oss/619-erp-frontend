'use client';

import { useState } from 'react';
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
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(249,115,22,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.06))',
    borderColor: '#F59E0B',
    iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(249,115,22,0.12))',
    iconColor: '#FBBF24',
    activeBg: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05))',
    subBorder: 'rgba(245,158,11,0.20)',
    subActiveBg: 'rgba(245,158,11,0.08)',
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeText: '#F59E0B',
  },
  'members': {
    label: 'Members',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(5,150,105,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
    borderColor: '#10B981',
    iconBg: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.12))',
    iconColor: '#34D399',
    activeBg: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(5,150,105,0.05))',
    subBorder: 'rgba(16,185,129,0.20)',
    subActiveBg: 'rgba(16,185,129,0.08)',
    badgeBg: 'rgba(16,185,129,0.12)',
    badgeText: '#10B981',
  },
  'attendance': {
    label: 'Attendance',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(14,165,233,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.06))',
    borderColor: '#06B6D4',
    iconBg: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(14,165,233,0.12))',
    iconColor: '#22D3EE',
    activeBg: 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(14,165,233,0.05))',
    subBorder: 'rgba(6,182,212,0.20)',
    subActiveBg: 'rgba(6,182,212,0.08)',
    badgeBg: 'rgba(6,182,212,0.12)',
    badgeText: '#06B6D4',
  },
  'personal-training': {
    label: 'PT System',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.07), rgba(168,85,247,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(168,85,247,0.06))',
    borderColor: '#8B5CF6',
    iconBg: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(168,85,247,0.12))',
    iconColor: '#A78BFA',
    activeBg: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(168,85,247,0.05))',
    subBorder: 'rgba(139,92,246,0.20)',
    subActiveBg: 'rgba(139,92,246,0.08)',
    badgeBg: 'rgba(139,92,246,0.12)',
    badgeText: '#8B5CF6',
  },
  'trainer-management': {
    label: 'Trainers',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.07), rgba(234,88,12,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))',
    borderColor: '#F97316',
    iconBg: 'linear-gradient(135deg, rgba(249,115,22,0.25), rgba(234,88,12,0.12))',
    iconColor: '#FB923C',
    activeBg: 'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(234,88,12,0.05))',
    subBorder: 'rgba(249,115,22,0.20)',
    subActiveBg: 'rgba(249,115,22,0.08)',
    badgeBg: 'rgba(249,115,22,0.12)',
    badgeText: '#F97316',
  },
  'session-management': {
    label: 'Sessions',
    gradient: 'linear-gradient(135deg, rgba(14,165,233,0.07), rgba(99,102,241,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(99,102,241,0.06))',
    borderColor: '#0EA5E9',
    iconBg: 'linear-gradient(135deg, rgba(14,165,233,0.25), rgba(99,102,241,0.12))',
    iconColor: '#38BDF8',
    activeBg: 'linear-gradient(135deg, rgba(14,165,233,0.10), rgba(99,102,241,0.05))',
    subBorder: 'rgba(14,165,233,0.20)',
    subActiveBg: 'rgba(14,165,233,0.08)',
    badgeBg: 'rgba(14,165,233,0.12)',
    badgeText: '#0EA5E9',
  },
  'progress-tracking': {
    label: 'Progress',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.07), rgba(244,63,94,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(244,63,94,0.06))',
    borderColor: '#EC4899',
    iconBg: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(244,63,94,0.12))',
    iconColor: '#F472B6',
    activeBg: 'linear-gradient(135deg, rgba(236,72,153,0.10), rgba(244,63,94,0.05))',
    subBorder: 'rgba(236,72,153,0.20)',
    subActiveBg: 'rgba(236,72,153,0.08)',
    badgeBg: 'rgba(236,72,153,0.12)',
    badgeText: '#EC4899',
  },
  'memberships': {
    label: 'Memberships',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(79,70,229,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))',
    borderColor: '#6366F1',
    iconBg: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(79,70,229,0.12))',
    iconColor: '#818CF8',
    activeBg: 'linear-gradient(135deg, rgba(99,102,241,0.10), rgba(79,70,229,0.05))',
    subBorder: 'rgba(99,102,241,0.20)',
    subActiveBg: 'rgba(99,102,241,0.08)',
    badgeBg: 'rgba(99,102,241,0.12)',
    badgeText: '#6366F1',
  },
  'finance': {
    label: 'Finance',
    gradient: 'linear-gradient(135deg, rgba(20,184,166,0.07), rgba(16,185,129,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(16,185,129,0.06))',
    borderColor: '#14B8A6',
    iconBg: 'linear-gradient(135deg, rgba(20,184,166,0.25), rgba(16,185,129,0.12))',
    iconColor: '#2DD4BF',
    activeBg: 'linear-gradient(135deg, rgba(20,184,166,0.10), rgba(16,185,129,0.05))',
    subBorder: 'rgba(20,184,166,0.20)',
    subActiveBg: 'rgba(20,184,166,0.08)',
    badgeBg: 'rgba(20,184,166,0.12)',
    badgeText: '#14B8A6',
  },
  'communication': {
    label: 'Communication',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.07), rgba(217,70,239,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(217,70,239,0.06))',
    borderColor: '#A855F7',
    iconBg: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(217,70,239,0.12))',
    iconColor: '#C084FC',
    activeBg: 'linear-gradient(135deg, rgba(168,85,247,0.10), rgba(217,70,239,0.05))',
    subBorder: 'rgba(168,85,247,0.20)',
    subActiveBg: 'rgba(168,85,247,0.08)',
    badgeBg: 'rgba(168,85,247,0.12)',
    badgeText: '#A855F7',
  },
  'reports': {
    label: 'Reports',
    gradient: 'linear-gradient(135deg, rgba(100,116,139,0.07), rgba(71,85,105,0.03))',
    gradientHover: 'linear-gradient(135deg, rgba(100,116,139,0.12), rgba(71,85,105,0.06))',
    borderColor: '#64748B',
    iconBg: 'linear-gradient(135deg, rgba(100,116,139,0.25), rgba(71,85,105,0.12))',
    iconColor: '#94A3B8',
    activeBg: 'linear-gradient(135deg, rgba(100,116,139,0.10), rgba(71,85,105,0.05))',
    subBorder: 'rgba(100,116,139,0.20)',
    subActiveBg: 'rgba(100,116,139,0.08)',
    badgeBg: 'rgba(100,116,139,0.12)',
    badgeText: '#64748B',
  },
};

function SidebarNav() {
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
    <div className="space-y-1.5 px-2">
      {/* Dashboard — single link */}
      <Link
        href="/dashboard"
        className={cn(
          'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
          isActive('/dashboard')
            ? 'bg-[rgba(59,130,246,0.10)] text-[#3B82F6] font-semibold'
            : 'text-[#4A4E57] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#3B82F6]',
        )}
      >
        <LayoutDashboard size={17} strokeWidth={isActive('/dashboard') ? 2 : 1.5} />
        <span>Dashboard</span>
      </Link>

      {/* Group buttons with dropdowns */}
      {navItems.slice(1).map(group => {
        const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
        const open = expanded[group.id] ?? anyChildActive(group.items);
        const hasActiveChild = anyChildActive(group.items);
        const theme = GROUP_THEMES[group.id];

        return (
          <div key={group.id}>
            <button
              onClick={() => toggleGroup(group.id)}
              className="group relative w-full rounded-[10px] transition-all duration-200 overflow-hidden"
              style={{
                background: hasActiveChild ? theme.activeBg : undefined,
              }}
            >
              {/* Left color strip */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200"
                style={{
                  background: theme.borderColor,
                  height: hasActiveChild || open ? '50%' : '0%',
                  opacity: hasActiveChild || open ? 0.8 : 0,
                  boxShadow: `0 0 8px ${theme.borderColor}40`,
                }}
              />

              {/* Hover gradient overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-[10px]"
                style={{ background: theme.gradientHover }}
              />

              <div
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                  hasActiveChild ? 'font-semibold' : '',
                )}
                style={{ color: hasActiveChild ? theme.borderColor : '#4A4E57' }}
              >
                {/* Colored icon container */}
                <div
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] transition-all duration-200 shrink-0"
                  style={{
                    background: hasActiveChild || open ? theme.iconBg : 'transparent',
                  }}
                >
                  <GroupIcon
                    size={15}
                    strokeWidth={hasActiveChild ? 2 : 1.5}
                    style={{ color: hasActiveChild || open ? theme.iconColor : '#6B7280' }}
                  />
                </div>

                <span className="flex-1 text-left">{group.label}</span>

                <ChevronDown
                  size={13}
                  strokeWidth={1.5}
                  className="shrink-0 transition-transform duration-200"
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
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div
                    className="ml-6 mt-0.5 space-y-0.5 border-l-2 pl-2"
                    style={{ borderColor: theme.subBorder }}
                  >
                    {group.items.map(item => {
                      const ItemIcon = ICON_MAP[item.icon];
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="relative flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[12px] font-medium transition-all duration-150 overflow-hidden"
                          style={{
                            color: active ? theme.borderColor : '#4A4E57',
                            background: active ? theme.subActiveBg : undefined,
                          }}
                        >
                          {/* Active dot */}
                          {active && (
                            <div
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                              style={{ background: theme.borderColor, boxShadow: `0 0 6px ${theme.borderColor}60` }}
                            />
                          )}

                          <div
                            className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] shrink-0 transition-all duration-150"
                            style={{
                              background: active ? theme.iconBg : 'transparent',
                            }}
                          >
                            {ItemIcon && (
                              <ItemIcon
                                size={13}
                                strokeWidth={active ? 2 : 1.5}
                                style={{ color: active ? theme.iconColor : '#6B7280' }}
                              />
                            )}
                          </div>

                          <span className="truncate">{item.label}</span>

                          {item.badge && (
                            <span
                              className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0"
                              style={{ background: theme.badgeBg, color: theme.badgeText }}
                            >
                              {item.badge}
                            </span>
                          )}

                          {item.isNew && (
                            <span
                              className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0"
                              style={{ background: theme.badgeBg, color: theme.badgeText }}
                            >
                              NEW
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

  return (
    <aside
      data-sidebar={variant}
      className={cn(
        !isMobile && [
          'fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r',
          'lg:flex xl:w-72',
          'bg-white/75 backdrop-blur-[20px] saturate-[160%] border-[rgba(11,11,15,0.05)]',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset,0_8px_32px_rgba(11,11,15,0.06)]',
        ],
        isMobile && [
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'bg-white/80 backdrop-blur-[20px] border-[rgba(11,11,15,0.05)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ],
      )}
    >
      <div className="flex shrink-0 items-center border-b border-[rgba(11,11,15,0.05)] px-5 py-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="619 Fitness" className="h-14 w-14 rounded-xl object-cover shadow-[0_2px_12px_rgba(0,0,0,0.10)]" />
          <div>
            <h2 className="text-[16px] font-extrabold tracking-tight text-[#0B0B0F] leading-none">619 FITNESS</h2>
            <p className="mt-0.5 text-[11px] font-semibold text-[#4A4E57] tracking-[0.06em]">STUDIO</p>
          </div>
        </Link>
        {isMobile && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#4A4E57] transition-colors hover:bg-[rgba(59,130,246,0.06)] hover:text-[#3B82F6]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
        <SidebarNav />
      </div>

      <div className="shrink-0 border-t border-[rgba(11,11,15,0.05)] px-5 py-3">
        <p className="text-[11px] text-[#4A4E57]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.40)]" />
            v4.0 — Premium
          </span>
        </p>
      </div>
    </aside>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  variant?: 'desktop' | 'mobile';
}
