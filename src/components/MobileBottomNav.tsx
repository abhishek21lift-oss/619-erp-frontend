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

const EASE   = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const;

export default function MobileBottomNav({ sidebarOpen = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role             = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const items            = isAdminOrManager ? [...BASE_ITEMS, FINANCE_ITEM] : BASE_ITEMS;

  const { reducedMotion } = useNavScroll();
  const dur = reducedMotion ? 0 : 0.28;

  return (
    <m.nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      data-no-pull-refresh
      style={{
        background: 'rgba(7,5,15,0.94)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        willChange: 'transform',
        boxShadow: '0 -12px 32px rgba(0,0,0,0.28)',
      }}
      animate={{ y: sidebarOpen ? '100%' : 0 }}
      transition={{ duration: dur, ease: EASE }}
      aria-label="Primary navigation"
      initial={false}
    >
      {/* Top border with purple gradient glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.4) 25%, rgba(167,139,250,0.65) 50%, rgba(167,139,250,0.4) 75%, transparent 100%)',
        }}
      />

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
              className="relative flex flex-1 flex-col items-center justify-center overflow-hidden focus-visible:outline-none"
              aria-current={isActive ? 'page' : undefined}
              style={{ gap: 3, minHeight: 44 }}
            >
              {/* Focus ring for keyboard nav */}
              <span
                className="absolute inset-1 rounded-xl opacity-0 transition-opacity focus-visible:opacity-100 ring-2 ring-purple-400 ring-offset-0"
                aria-hidden="true"
              />

              {/* Active pill background */}
              {isActive && (
                <m.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-1.5 rounded-xl pointer-events-none"
                  style={{
                    top:    5,
                    bottom: 5,
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.22) 0%, rgba(109,40,217,0.14) 100%)',
                    border: '1px solid rgba(167,139,250,0.28)',
                    boxShadow: '0 2px 14px rgba(167,139,250,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
                  }}
                  transition={SPRING}
                />
              )}

              {/* Icon */}
              <m.span
                className="relative z-10 flex h-[26px] w-[26px] items-center justify-center"
                whileTap={reducedMotion ? {} : { scale: 0.76 }}
                transition={{ type: 'spring', stiffness: 700, damping: 22 }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.3 : 1.7}
                  style={{
                    color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.40)',
                    filter: isActive ? 'drop-shadow(0 0 7px rgba(167,139,250,0.55))' : 'none',
                    transition: 'color 200ms ease, filter 200ms ease',
                  }}
                  aria-hidden="true"
                />
              </m.span>

              {/* Label */}
              <span
                className="relative z-10 select-none text-[9.5px] font-bold uppercase leading-none"
                style={{
                  letterSpacing: '0.065em',
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.36)',
                  transition: 'color 200ms ease',
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
