'use client';

import { useEffect, useRef, useState } from 'react';
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

interface MobileBottomNavProps {
  sidebarOpen?: boolean;
}

export default function MobileBottomNav({ sidebarOpen = false }: MobileBottomNavProps) {
  const pathname  = usePathname();
  const { user }  = useAuth();
  const role      = normaliseRole(user?.role);
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const items     = isAdminOrManager ? [...BASE_ITEMS, FINANCE_ITEM] : BASE_ITEMS;

  const [scrollVisible, setScrollVisible] = useState(true);

  // Track scroll position to hide nav while scrolling
  const lastScrollY  = useRef(0);
  const scrollTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track touch start position to distinguish tap from scroll
  const touchStartY  = useRef(0);
  const touchStartX  = useRef(0);

  useEffect(() => {
    const hide = () => {
      setScrollVisible(false);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => setScrollVisible(true), 500);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      // Only treat as scroll if finger moved more than 8px vertically
      if (dy > 8 && dy > dx) hide();
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
      // Tap (barely moved) — show the nav immediately
      if (dy < 10 && dx < 10) {
        if (scrollTimer.current) clearTimeout(scrollTimer.current);
        setScrollVisible(true);
      }
    };

    // Fallback scroll listener for desktop / non-touch
    const onScroll = () => {
      const delta = Math.abs(window.scrollY - lastScrollY.current);
      if (delta > 4) hide();
      lastScrollY.current = window.scrollY;
    };


    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('scroll', onScroll);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  // Always show on route change
  useEffect(() => {
    setScrollVisible(true);
  }, [pathname]);

  // Hidden when sidebar drawer is open OR during scroll
  const isVisible = !sidebarOpen && scrollVisible;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #1a1440 60%, #1e1b4b 100%)',
        borderTop: '1px solid rgba(167,139,250,0.15)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transform: isVisible ? 'translateY(0)' : 'translateY(calc(100% + env(safe-area-inset-bottom, 20px) + 10px))',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="flex items-stretch h-12">
        {items.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95',
                isActive ? 'text-purple-300' : 'text-white/40 hover:text-white/70',
              )}
            >
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200',
                isActive && 'bg-purple-500/20 shadow-[0_0_12px_rgba(167,139,250,0.4)]',
              )}>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
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
