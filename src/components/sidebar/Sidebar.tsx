'use client';

import { X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
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
    <div className="space-y-5">
      {navItems.map(group => (
        <div key={group.id}>
          {group.label && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
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
                    'flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all duration-150',
                    active
                      ? 'bg-[#1d1d1f] text-white shadow-sm'
                      : 'text-[#86868b] hover:bg-[rgba(0,0,0,0.03)] hover:text-[#1d1d1f]',
                  )}
                >
                  {Icon && <Icon size={16} strokeWidth={1.5} className="shrink-0" />}
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                  {item.isNew && (
                    <span className="ml-auto rounded-full bg-[rgba(220,38,38,0.08)] px-1.5 py-0.5 text-[9px] font-bold text-[#dc2626]">
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
          'fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r backdrop-blur-xl',
          'lg:flex xl:w-72',
          'bg-white/95 border-[rgba(0,0,0,0.04)]',
        ],
        isMobile && [
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'bg-white border-[rgba(0,0,0,0.04)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ],
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(0,0,0,0.04)] px-5 py-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1d1d1f] text-[11px] font-bold tracking-tight text-white shadow-sm">
            619
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-[#1d1d1f]">619 Fitness</h2>
            <p className="text-[12px] text-[#86868b]">Studio Dashboard</p>
          </div>
        </Link>
        {isMobile && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#86868b] transition-colors hover:bg-[rgba(0,0,0,0.04)] hover:text-[#1d1d1f]"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarNav />
      </div>

      <div className="shrink-0 border-t border-[rgba(0,0,0,0.04)] px-5 py-4">
        <p className="text-[12px] text-[#86868b]">v3.0.1</p>
      </div>
    </aside>
  );
}
