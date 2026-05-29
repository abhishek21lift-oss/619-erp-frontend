'use client';

import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, isVisibleForRole, isGroupVisibleForRole } from '@/lib/nav-config';
import {
  LayoutDashboard, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  Settings, Building2, ShieldCheck, Fingerprint, Receipt, Palette, Zap, DatabaseBackup, UsersRound,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  Settings, Building2, ShieldCheck, Fingerprint, Receipt, Palette, Zap, DatabaseBackup,
};

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  variant?: 'desktop' | 'mobile';
}

function SidebarNav() {
  const { user } = useAuth();
  const pathname = usePathname();

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
    { items: [{ ...DASHBOARD_ITEM, label: 'Dashboard' }], label: '', id: 'dashboard' },
    ...groups,
    ...(settingsItems.length ? [{ items: settingsItems, label: 'Settings', id: 'settings' }] : []),
  ];

  return (
    <div className="space-y-4">
      {navItems.map(group => (
        <div key={group.id}>
          {group.label && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map(item => {
              const Icon = ICON_MAP[item.icon];
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all duration-150',
                    active
                      ? 'bg-[rgba(59,130,246,0.10)] text-[#3B82F6] font-semibold shadow-[inset_3px_0_0_#3B82F6]'
                      : 'text-[#4A4E57] hover:bg-[rgba(59,130,246,0.06)] hover:text-[#3B82F6]',
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.40)]" />
                  )}
                  {Icon && <Icon size={16} strokeWidth={active ? 2 : 1.5} className={cn('shrink-0', active && 'text-[#3B82F6]')} />}
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-[#3B82F6] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                  {item.isNew && (
                    <span className="ml-auto rounded-full bg-[rgba(59,130,246,0.08)] px-1.5 py-0.5 text-[9px] font-bold text-[#3B82F6]">
                      NEW
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
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
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(11,11,15,0.05)] px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="619 Fitness" className="h-9 w-9 rounded-xl object-cover shadow-[0_2px_8px_rgba(0,0,0,0.08)]" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold tracking-tight text-[#0B0B0F] leading-tight">619 FITNESS</h2>
            <p className="text-[11px] font-medium text-[#4A4E57] tracking-[0.02em]">STUDIO</p>
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

      <div className="shrink-0 border-t border-[rgba(11,11,15,0.05)] px-5 py-4">
        <p className="text-[12px] text-[#4A4E57]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.40)]" />
            v4.0 — Premium
          </span>
        </p>
      </div>
    </aside>
  );
}
