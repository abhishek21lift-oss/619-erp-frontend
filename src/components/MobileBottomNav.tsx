'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ScanFace, Dumbbell, IndianRupee } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { useAuth } from '@/lib/auth-context';
import { normaliseRole } from '@/lib/nav-config';

const BASE_ITEMS = [
  { href: '/',               icon: Home,        label: 'Home'     },
  { href: '/pt-os/clients',  icon: Users,       label: 'Clients'  },
  { href: '/checkin',        icon: ScanFace,    label: 'Check-in' },
  { href: '/pt-os/sessions', icon: Dumbbell,    label: 'Sessions' },
];

const FINANCE_ITEM = { href: '/finance/collected-payments', icon: IndianRupee, label: 'Finance' };

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';

  const items = isAdminOrManager ? [...BASE_ITEMS, FINANCE_ITEM] : BASE_ITEMS;

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
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(href + '/');
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
