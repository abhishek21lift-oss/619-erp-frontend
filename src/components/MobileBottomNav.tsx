'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ScanFace, Dumbbell, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
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

// Spec: transform 280ms cubic-bezier(0.22, 1, 0.36, 1)
const EASE = [0.22, 1, 0.36, 1] as const;

export default function MobileBottomNav({ sidebarOpen = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role     = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const items    = isAdminOrManager ? [...BASE_ITEMS, FINANCE_ITEM] : BASE_ITEMS;

  const { bottomBar, reducedMotion } = useNavScroll();

  // Hidden when sidebar drawer is open OR when scroll state says hidden
  const isVisible = !sidebarOpen && bottomBar !== 'hidden';
  const dur       = reducedMotion ? 0 : 0.28;

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        // Flush to device edge — gradient extends through safe-area zone
        background: 'linear-gradient(135deg, #FF9E00 0%, #F57C00 55%, #E65100 100%)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        // GPU compositing
        willChange: 'transform',
      }}
      animate={{ y: isVisible ? 0 : '100%' }}
      transition={{ duration: dur, ease: EASE }}
      aria-label="Primary navigation"
      initial={false}
    >
      <div className="flex h-[50px] items-stretch">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active tab background pill — springs between tabs */}
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute inset-x-2 rounded-xl"
                  style={{
                    top:    7,
                    bottom: 7,
                    background:
                      'linear-gradient(135deg, #FFF3C4 0%, #FFE082 100%)',
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

              {/* Icon — tap scales down for tactile feedback */}
              <motion.span
                className="relative z-10 flex h-[22px] w-[22px] items-center justify-center"
                whileTap={reducedMotion ? {} : { scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 700, damping: 22 }}
              >
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  style={{
                    color: isActive
                      ? '#C25A00'
                      : 'rgba(255,255,255,0.82)',
                  }}
                  aria-hidden="true"
                />
              </motion.span>

              {/* Label — always visible */}
              <span
                className="relative z-10 select-none text-[9px] font-bold uppercase tracking-[0.05em] leading-none"
                style={{
                  color: isActive ? '#7A3900' : 'rgba(255,255,255,0.80)',
                }}
                aria-hidden="true"
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
