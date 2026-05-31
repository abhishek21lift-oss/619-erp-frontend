'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User, Shield, Bell, Monitor, Clock, Activity, Sliders,
  ChevronRight, Menu, X
} from 'lucide-react';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = NAV.find(n => pathname.startsWith(n.href));

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090909]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Menu size={18} className="text-white/70" />
            </button>
            <div>
              <p className="text-[11px] text-white/40 uppercase tracking-widest font-medium">619 Fitness</p>
              <h1 className="text-[15px] font-semibold leading-tight">
                {active?.label ?? 'Profile'}
              </h1>
            </div>
          </div>
        </div>
        {/* Mobile breadcrumb tabs */}
        <div className="lg:hidden overflow-x-auto scrollbar-none border-t border-white/[0.07]">
          <div className="flex px-4 gap-1 py-2">
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap ${
                  pathname.startsWith(n.href)
                    ? 'bg-[#FF2E63] text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

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
                      ? 'bg-[#FF2E63]/10 text-white border-l-2 border-[#FF2E63] pl-[10px]'
                      : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04] border-l-2 border-transparent'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-[#FF2E63]' : 'text-white/30 group-hover:text-white/60'} />
                  {n.label}
                  {isActive && <ChevronRight size={12} className="ml-auto text-[#FF2E63]/60" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom sheet nav */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-[#141414] border-t border-white/10 rounded-t-2xl p-4 pb-8"
            style={{ animation: 'slideUp 0.32s cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-semibold text-white/80">Profile Settings</span>
              <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white/70">
                <X size={18} />
              </button>
            </div>
            {NAV.map(n => {
              const Icon = n.icon;
              const isActive = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl mb-1 transition-all ${
                    isActive ? 'bg-[#FF2E63]/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-[#FF2E63]' : 'text-white/30'} />
                  <span className="text-[14px] font-medium">{n.label}</span>
                  <ChevronRight size={14} className="ml-auto text-white/20" />
                </Link>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
