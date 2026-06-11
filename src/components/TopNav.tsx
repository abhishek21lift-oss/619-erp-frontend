'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { NAV_GROUPS, isVisibleForRole, isGroupVisibleForRole } from '@/lib/nav-config';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote,
} from 'lucide-react';
import { cn } from '@/components/ui/cn';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Target, Users, UserPlus, UserCheck, RefreshCw, CalendarClock, UserX, Cake,
  ClipboardList, ScanFace, User, Dumbbell, UserCog, Sparkles, CalendarOff, Calendar, Apple,
  LayoutGrid, Layers, PlusCircle, Ticket, Gift, CreditCard, TrendingUp, Inbox,
  List, Filter, PieChart, IndianRupee, Wallet, FileText, AlertCircle, ArrowUpRight, BarChart3, Award,
  LineChart, FileBarChart, Activity, RefreshCcw, Clock, Megaphone, Bell, MessageCircle, Send, Tag, Star,
  UsersRound, Gauge, History, CalendarPlus, ClipboardCheck, Ruler, Camera, Percent, Bot,
  CalendarCheck, Package, Banknote,
};

const GROUP_COLORS: Record<string, string> = {
  attendance: '#06B6D4',
  'personal-training': '#8B5CF6',
  'trainer-management': '#F97316',
  'session-management': '#0EA5E9',
  'progress-tracking': '#EC4899',
  memberships: '#6366F1',
  finance: '#14B8A6',
  communication: '#A855F7',
  reports: '#64748B',
};

export default function TopNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setOpenGroup(null); }, [pathname]);

  const visibleGroups = NAV_GROUPS
    .filter(g => isGroupVisibleForRole(g, user?.role))
    .map(g => ({
      ...g,
      items: g.items
        .filter(i => isVisibleForRole(i, user?.role))
        .flatMap(i => i.children ? i.children.filter(c => isVisibleForRole(c, user?.role)) : [i]),
    }))
    .filter(g => g.items.length > 0);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav ref={navRef} className="flex items-center gap-1">
      {visibleGroups.map(group => {
        const GroupIcon = ICON_MAP[group.icon] || LayoutDashboard;
        const color = GROUP_COLORS[group.id] || '#3B82F6';
        const open = openGroup === group.id;
        const hasActive = group.items.some(i => isActive(i.href));

        return (
          <div key={group.id} className="relative">
            <button
              onClick={() => setOpenGroup(open ? null : group.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all duration-200',
                hasActive
                  ? 'text-white shadow-sm'
                  : 'text-white/70 hover:text-white',
              )}
              style={{
                background: hasActive ? `linear-gradient(135deg, ${color}, ${color}cc)` : `${color}15`,
                boxShadow: hasActive ? `0 2px 8px ${color}40` : undefined,
              }}
            >
              <GroupIcon size={14} strokeWidth={hasActive ? 2.5 : 1.5} />
              <span>{group.label}</span>
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute left-0 top-full mt-1.5 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_12px_40px_rgba(0,0,0,0.1)]"
                  style={{ borderTop: `2px solid ${color}` }}
                >
                  <div className="py-1">
                    {group.items.map(item => {
                      const ItemIcon = ICON_MAP[item.icon];
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpenGroup(null)}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-colors',
                            active
                              ? 'text-[var(--text-primary)] bg-[var(--bg-hover)]'
                              : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                          )}
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-md"
                            style={{ background: active ? `${color}15` : 'transparent' }}>
                            {ItemIcon && <ItemIcon size={12} strokeWidth={active ? 2.5 : 1.5}
                              style={{ color: active ? color : 'var(--text-muted)' }} />}
                          </div>
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                              style={{ background: `${color}20`, color }}>
                              {item.badge}
                            </span>
                          )}
                          {item.isNew && (
                            <span className="ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase text-white"
                              style={{ background: color }}>
                              New
                            </span>
                          )}
                          {item.comingSoon && (
                            <span className="ml-auto text-[8px] font-semibold text-[var(--text-disabled)]">
                              Soon
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
    </nav>
  );
}
