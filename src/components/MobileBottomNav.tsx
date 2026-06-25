'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, ScanFace, Dumbbell, IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { normaliseRole } from '@/lib/nav-config';

const BASE_ITEMS = [
  { href: '/',               icon: Home,        label: 'Home'     },
  { href: '/pt-os/clients',  icon: Users,       label: 'Clients'  },
  { href: '/checkin',        icon: ScanFace,    label: 'Check-in' },
  { href: '/pt-os/sessions', icon: Dumbbell,    label: 'Sessions' },
];

const FINANCE_ITEM = { href: '/finance/collected-payments', icon: IndianRupee, label: 'Finance' };

interface MobileBottomNavProps {
  sidebarOpen?: boolean;
}

export default function MobileBottomNav({ sidebarOpen = false }: MobileBottomNavProps) {
  const pathname  = usePathname();
  const { user }  = useAuth();
  const role      = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const items     = isAdminOrManager ? [...BASE_ITEMS, FINANCE_ITEM] : BASE_ITEMS;

  const [scrollVisible, setScrollVisible] = useState(false);
  const lastScrollY  = useRef(0);
  const touchStartY  = useRef(0);
  const touchStartX  = useRef(0);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY.current;
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      const absDy = Math.abs(dy);
      if (absDy > 8 && absDy > dx) {
        // dy > 0 = finger moving down = scrolling content up → show
        // dy < 0 = finger moving up = scrolling content down → hide
        setScrollVisible(dy > 0);
      }
    };

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (delta < -4) setScrollVisible(true);   // scrolling up → show
      else if (delta > 4) setScrollVisible(false); // scrolling down → hide
      lastScrollY.current = currentY;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const isVisible = !sidebarOpen && scrollVisible;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: isVisible ? 'translateY(0)' : 'translateY(calc(100% + env(safe-area-inset-bottom, 20px) + 10px))',
        transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      {/* Floating pill container */}
      <div className="px-3 pb-3">
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #FF9E00 0%, #F57C00 55%, #E65100 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 -10px 30px rgba(255,140,0,0.20), 0 4px 20px rgba(0,0,0,0.12)',
          }}
        >
          <div className="flex h-[60px] items-stretch">
            {items.map(({ href, icon: Icon, label }) => {
              const isActive = href === '/'
                ? pathname === '/'
                : pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex flex-1 flex-col items-center justify-center gap-[3px] overflow-hidden"
                >
                  {/* Gold pill — slides between tabs via layoutId spring */}
                  {isActive && (
                    <motion.div
                      layoutId="gold-nav-pill"
                      className="absolute inset-x-2 inset-y-[7px] rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, #FFF3C4 0%, #FFE082 100%)',
                        boxShadow: '0 6px 20px rgba(255,176,0,0.35)',
                      }}
                      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }}
                    />
                  )}
                  <motion.div
                    className="relative z-10 flex h-[22px] w-[22px] items-center justify-center"
                    whileTap={{ scale: 0.80 }}
                    transition={{ type: 'spring', stiffness: 700, damping: 22 }}
                  >
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      style={{ color: isActive ? '#C25A00' : 'rgba(255,255,255,0.80)' }}
                    />
                  </motion.div>
                  <span
                    className="relative z-10 text-[9px] font-bold tracking-[0.05em] uppercase leading-none"
                    style={{ color: isActive ? '#7A3900' : 'rgba(255,255,255,0.80)' }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
