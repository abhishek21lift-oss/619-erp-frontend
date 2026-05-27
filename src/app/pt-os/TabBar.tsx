'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Wallet, DollarSign, BarChart3,
} from 'lucide-react';

const NAV = [
  { href: '/pt-os', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { href: '/pt-os/clients', label: 'PT Clients', icon: <Users size={14} /> },
  { href: '/pt-os/balance-sheet', label: 'Balance Sheet', icon: <Wallet size={14} /> },
  { href: '/pt-os/commissions', label: 'Commissions', icon: <DollarSign size={14} /> },
  { href: '/pt-os/reports', label: 'Reports', icon: <BarChart3 size={14} /> },
];

export default function PtOsTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="flex gap-1 rounded-[14px] p-1.5 mb-6 overflow-x-auto scrollbar-none"
      style={{
        background: 'rgba(255,255,255,0.60)',
        border: '1px solid rgba(255,255,255,0.85)',
        boxShadow: '0 1px 8px rgba(15,23,42,0.04)',
      }}
    >
      {NAV.map((item) => {
        const isActive = item.href === '/pt-os'
          ? pathname === '/pt-os'
          : pathname.startsWith(item.href);
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[12px] font-semibold transition-all duration-200 whitespace-nowrap"
            style={{
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#1e1b4b' : 'rgb(148,163,184)',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
            }}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
