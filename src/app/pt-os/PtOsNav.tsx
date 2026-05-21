'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Dumbbell, Layers, Calendar,
  IndianRupee, BarChart3, Bot, Settings, Sparkles,
} from 'lucide-react';
import { cn } from '@/components/ui/cn';

const NAV_ITEMS = [
  { href: '/pt-os/dashboard', label: 'Mission Control', icon: LayoutDashboard, color: 'text-emerald-500' },
  { href: '/pt-os/clients', label: 'Clients', icon: Users, color: 'text-sky-500' },
  { href: '/pt-os/trainers', label: 'Trainers', icon: Dumbbell, color: 'text-violet-500' },
  { href: '/pt-os/programs', label: 'Programs', icon: Layers, color: 'text-amber-500' },
  { href: '/pt-os/sessions', label: 'Sessions', icon: Calendar, color: 'text-rose-500' },
  { href: '/pt-os/finance', label: 'Finance', icon: IndianRupee, color: 'text-indigo-500' },
  { href: '/pt-os/analytics', label: 'Analytics', icon: BarChart3, color: 'text-purple-500' },
  { href: '/pt-os/automation', label: 'Automation', icon: Bot, color: 'text-teal-500' },
  { href: '/pt-os/settings', label: 'Settings', icon: Settings, color: 'text-slate-500' },
];

export default function PtOsNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <div className="mr-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden text-sm font-bold tracking-tight text-zinc-800 sm:inline">
            PT Operating System
          </span>
        </div>
        <div className="flex items-center gap-0.5 overflow-x-auto rounded-2xl bg-zinc-100/70 p-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-white text-zinc-900 shadow-sm shadow-zinc-200/50'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="ptos-nav-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm shadow-zinc-200/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}