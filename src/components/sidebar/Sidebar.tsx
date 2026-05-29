'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, isVisibleForRole, isGroupVisibleForRole } from '@/lib/nav-config';
import {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  Settings, Building2, ShieldCheck, Fingerprint, Receipt, Palette, Zap, DatabaseBackup, UsersRound,
  Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  Settings, Building2, ShieldCheck, Fingerprint, Receipt, Palette, Zap, DatabaseBackup, UsersRound,
  Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote,
};

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  variant?: 'desktop' | 'mobile';
}

function SidebarNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = NAV_GROUPS.filter(g => isGroupVisibleForRole(g, user?.role)).map(g => ({
    ...g,
    items: g.items.filter(i => isVisibleForRole(i, user?.role)).flatMap(i =>
      i.children
        ? i.children.filter(c => isVisibleForRole(c, user?.role))
        : [i]
    ),
  })).filter(g => g.items.length > 0);

  const settingsItems = SETTINGS_GROUP.items.filter(i => isVisibleForRole(i, user?.role));

  const navItems = [
    { items: [], label: 'Dashboard', id: 'dashboard', icon: 'LayoutDashboard', single: true, href: '/dashboard' },
    ...groups.map(g => ({ ...g, single: false, href: '' })),
    ...(settingsItems.length ? [{ items: settingsItems, label: 'Settings', id: 'settings', icon: 'Settings', single: false, href: '' }] : []),
  ];

  const toggleGroup = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const anyChildActive = (items: typeof groups[0]['items']) =>
    items.some(i => isActive(i.href) || (i.children?.some(c => isActive(c.href))));

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

        return (
          <div key={group.id}>
            <button
              onClick={() => toggleGroup(group.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                hasActiveChild
                  ? 'bg-[rgba(59,130,246,0.10)] text-[#3B82F6] font-semibold'
                  : 'text-[#4A4E57] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#3B82F6]',
              )}
            >
              <GroupIcon size={17} strokeWidth={hasActiveChild ? 2 : 1.5} />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                className={cn(
                  'shrink-0 text-[#9CA3AF] transition-transform duration-200',
                  open && 'rotate-180',
                )}
              />
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
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-[rgba(59,130,246,0.15)] pl-2">
                    {group.items.map(item => {
                      const ItemIcon = ICON_MAP[item.icon];
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'relative flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[12px] font-medium transition-all duration-150',
                            active
                              ? 'bg-[rgba(59,130,246,0.10)] text-[#3B82F6] font-semibold'
                              : 'text-[#4A4E57] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#3B82F6]',
                          )}
                        >
                          {ItemIcon && <ItemIcon size={14} strokeWidth={active ? 2 : 1.5} className="shrink-0" />}
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full bg-[#3B82F6] px-1.5 py-0.5 text-[8px] font-bold text-white">
                              {item.badge}
                            </span>
                          )}
                          {item.isNew && (
                            <span className="ml-auto rounded-full bg-[rgba(59,130,246,0.08)] px-1.5 py-0.5 text-[8px] font-bold text-[#3B82F6] shrink-0">
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
        <Link href="/dashboard" className="flex items-center gap-4 group">
          <img src="/logo.png" alt="619 Fitness" className="h-12 w-12 rounded-xl object-cover shadow-[0_2px_12px_rgba(0,0,0,0.10)]" />
          <div>
            <h2 className="text-[20px] font-extrabold tracking-tight text-[#0B0B0F] leading-none">619 FITNESS</h2>
            <p className="mt-0.5 text-[13px] font-semibold text-[#4A4E57] tracking-[0.06em]">STUDIO</p>
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
