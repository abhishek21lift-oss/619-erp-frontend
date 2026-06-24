'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User, Shield, Bell, Monitor, Clock, Activity, Sliders,
  ChevronRight,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const NAV = [
  { label: 'Overview',      href: '/profile/overview',      icon: User },
  { label: 'Security',      href: '/profile/security',      icon: Shield },
  { label: 'Notifications', href: '/profile/notifications', icon: Bell },
  { label: 'Devices',       href: '/profile/devices',       icon: Monitor },
  { label: 'Sessions',      href: '/profile/sessions',      icon: Clock },
  { label: 'Activity',      href: '/profile/activity',      icon: Activity },
  { label: 'Preferences',   href: '/profile/preferences',   icon: Sliders },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = NAV.find(n => pathname.startsWith(n.href));

  return (
    <Guard>
      <AppShell title={active?.label ?? 'Profile'}>
        {/* Mobile tab strip */}
        <div className="lg:hidden overflow-x-auto scrollbar-none border-b border-white/[0.07]">
          <div className="flex px-4 gap-1 py-2">
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap ${
                  pathname.startsWith(n.href)
                    ? 'bg-[rgba(212,175,55,0.9)] text-[#050816] font-semibold'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-6xl flex gap-0 lg:gap-8 px-4 py-6">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:flex flex-col w-56 flex-shrink-0">
            <nav className="sticky top-24 space-y-0.5">
              {NAV.map(n => {
                const Icon = n.icon;
                const isActive = pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group ${
                      isActive
                        ? 'bg-[rgba(212,175,55,0.12)] text-white border-l-2 border-[#D4AF37] pl-[10px]'
                        : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04] border-l-2 border-transparent'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-[#D4AF37]' : 'text-white/30 group-hover:text-white/60'} />
                    {n.label}
                    {isActive && <ChevronRight size={12} className="ml-auto text-[#D4AF37]/60" />}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>

        <style>{`
          .scrollbar-none::-webkit-scrollbar { display: none; }
          .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </AppShell>
    </Guard>
  );
}
