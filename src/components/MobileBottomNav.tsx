'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ScanFace, Dumbbell, IndianRupee } from 'lucide-react';
import { m } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { normaliseRole } from '@/lib/nav-config';
import { useNavScroll } from '@/contexts/nav-scroll-context';

const BASE_ITEMS = [
  { href: '/',               icon: Home,        label: 'Home'     },
  { href: '/pt-os/clients',  icon: Users,       label: 'Clients'  },
  { href: '/checkin',        icon: ScanFace,    label: 'Check-in' },
  { href: '/pt-os/sessions', icon: Dumbbell,    label: 'Sessions' },
];

const FINANCE_ITEM = {
  href: '/finance/collected-payments',
  icon: IndianRupee,
  label: 'Finance',
};

interface MobileBottomNavProps {
  sidebarOpen?: boolean;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function MobileBottomNav({ sidebarOpen = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role     = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const items    = isAdminOrManager ? [...BASE_ITEMS, FINANCE_ITEM] : BASE_ITEMS;

  const { reducedMotion } = useNavScroll();

  const dur = reducedMotion ? 0 : 0.28;

  return (
    <m.nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        background: 'linear-gradient(135deg, #FF9E00 0%, #F57C00 55%, #E65100 100%)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        willChange: 'transform',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      }}
      animate={{ y: sidebarOpen ? '100%' : 0 }}
      transition={{ duration: dur, ease: EASE }}
      aria-label="Primary navigation"
      initial={false}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'rgba(255,255,255,0.25)' }} />

      <div className="flex h-[60px] items-stretch">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 overflow-hidden"
              aria-current={isActive ? 'page' : undefined}
              style={{ minHeight: 44 }}
            >
              {/* Active tab background pill */}
              {isActive && (
                <m.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-2 rounded-xl"
                  style={{
                    top:    6,
                    bottom: 6,
                    background: 'linear-gradient(135deg, #FFF3C4 0%, #FFE082 100%)',
                    boxShadow: '0 4px 16px rgba(255,176,0,0.35)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 520,
                    damping: 38,
                    mass: 0.7,
                  }}
                />
              )}

              {/* Icon */}
              <m.span
                className="relative z-10 flex h-[26px] w-[26px] items-center justify-center"
                whileTap={reducedMotion ? {} : { scale: 0.80 }}
                transition={{ type: 'spring', stiffness: 700, damping: 22 }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{
                    color: isActive ? '#C25A00' : 'rgba(255,255,255,0.85)',
                  }}
                  aria-hidden="true"
                />
              </m.span>

              {/* Label */}
              <span
                className="relative z-10 select-none text-[10px] font-bold uppercase tracking-[0.04em] leading-none"
                style={{
                  color: isActive ? '#7A3900' : 'rgba(255,255,255,0.80)',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </m.nav>
  );
}
