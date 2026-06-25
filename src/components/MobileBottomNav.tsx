'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ScanFace, Dumbbell, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Shared easing curve (matches top bar)
const EASE = [0.32, 0.72, 0, 1] as const;

export default function MobileBottomNav({ sidebarOpen = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { user }  = useAuth();
  const role      = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const items = isAdminOrManager ? [...BASE_ITEMS, FINANCE_ITEM] : BASE_ITEMS;

  const { bottomBar, reducedMotion } = useNavScroll();

  const isVisible  = !sidebarOpen;
  const isCompact  = bottomBar === 'compact';
  const dur        = reducedMotion ? 0 : 0.22;
  const labelDur   = reducedMotion ? 0 : 0.14;

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      animate={{ y: isVisible ? 0 : '120%' }}
      transition={{ duration: dur, ease: EASE }}
      aria-label="Primary navigation"
      // Ensure GPU compositing — no layout thrashing
      initial={false}
    >
      <div className="px-3 pb-3">
        {/* Animated pill — height transitions between expanded (60px) and compact (44px) */}
        <motion.div
          className="overflow-hidden rounded-2xl"
          animate={{ height: isCompact ? 44 : 60 }}
          transition={{ duration: dur, ease: EASE }}
          style={{
            background:
              'linear-gradient(135deg, #FF9E00 0%, #F57C00 55%, #E65100 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: isCompact
              ? '0 -4px 16px rgba(255,140,0,0.15), 0 2px 10px rgba(0,0,0,0.10)'
              : '0 -10px 30px rgba(255,140,0,0.20), 0 4px 20px rgba(0,0,0,0.12)',
            willChange: 'height, transform',
          }}
        >
          <div className="flex h-full items-stretch">
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
                        top:    isCompact ? 4  : 7,
                        bottom: isCompact ? 4  : 7,
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

                  {/* Label — fades out in compact mode */}
                  <AnimatePresence initial={false}>
                    {!isCompact && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: labelDur, ease: 'easeOut' }}
                        className="relative z-10 select-none text-[9px] font-bold uppercase tracking-[0.05em] leading-none"
                        style={{
                          color: isActive
                            ? '#7A3900'
                            : 'rgba(255,255,255,0.80)',
                        }}
                        aria-hidden="true"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.nav>
  );
}
