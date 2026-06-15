'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, LogIn, DollarSign, Dumbbell, LayoutGrid } from 'lucide-react';
import { cn } from '@/components/ui/cn';

const NAV_ITEMS = [
  { href: '/pt-os/clients', icon: Users,       label: 'Clients'  },
  { href: '/checkin',       icon: LogIn,        label: 'Check-in' },
  { href: '/finance/collected-payments', icon: DollarSign, label: 'Finance' },
  { href: '/pt-os/sessions', icon: Dumbbell,   label: 'Sessions' },
  { href: '/pt-os',         icon: LayoutGrid,  label: 'PT OS'    },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1440 60%, #1e1b4b 100%)',
        borderTop: '1px solid rgba(167,139,250,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/pt-os' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95',
                isActive ? 'text-purple-300' : 'text-white/40 hover:text-white/70',
              )}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
                isActive && 'bg-purple-500/20 shadow-[0_0_12px_rgba(167,139,250,0.4)]',
              )}>
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              </div>
              <span className={cn(
                'text-[9px] font-bold tracking-wide uppercase leading-none',
                isActive ? 'text-purple-300' : 'text-white/35',
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
