'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Users, ScanFace, Dumbbell, Bot, LayoutGrid, Layers, CreditCard, Activity } from 'lucide-react';
import { m } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { getImpersonation } from '@/lib/http';
import { normaliseRole, isVisibleForFeature } from '@/lib/nav-config';
import { useFeatures } from '@/lib/features-context';
import { useNavScroll } from '@/contexts/nav-scroll-context';

// AI Coach replaced the Finance tab here. Finance was also the one tab gated
// to admin/manager, which meant trainers and reception saw a 4-tab bar and
// everyone else a 5-tab one; AI Coach is open to every studio role (see the
// ai-coach group in nav-config.ts), so the bar is now the same five tabs for
// everyone. Finance is still reachable from the sidebar's Finance group.
//
// Two of these five are feature-gated capabilities, so they carry the same
// keys the sidebar uses. A studio with AI Suite or Attendance switched off
// gets a shorter bar rather than a tab that 403s — which is worse here than
// in the sidebar, since this is the only navigation on a phone. Home, Clients
// and Sessions are core and can never be switched off.
const BASE_ITEMS = [
  { href: '/',                   icon: Home,     label: 'Home'     },
  { href: '/pt-os/clients',      icon: Users,    label: 'Clients'  },
  { href: '/ai-coach',           icon: Bot,      label: 'AI Coach', feature: 'ai_suite'   },
  { href: '/pt-os/sessions',     icon: Dumbbell, label: 'Sessions' },
  { href: '/checkin/qr-scanner', icon: ScanFace, label: 'Check-in', feature: 'attendance' },
];

// Platform operators get control-plane tabs instead of studio tabs. These all
// share the /platform pathname and differ only by ?tab=, so each carries an
// explicit `tab` id — pathname alone can't tell Studios from Finance apart.
const PLATFORM_ITEMS = [
  { href: '/platform',              tab: 'overview', icon: LayoutGrid, label: 'Overview'  },
  { href: '/platform?tab=studios',  tab: 'studios',  icon: Layers,     label: 'Studios'   },
  { href: '/platform?tab=finance',  tab: 'finance',  icon: CreditCard, label: 'Finance'   },
  { href: '/platform?tab=activity', tab: 'activity', icon: Activity,   label: 'Activity'  },
];

// Mirrors normalizeTab() in app/platform/page.tsx — legacy ?tab=billing/coupons
// deep-links still land on the Finance tab.
function normalizePlatformTab(raw: string | null): string {
  if (raw === 'billing' || raw === 'coupons') return 'finance';
  return raw ?? 'overview';
}

interface MobileBottomNavProps {
  sidebarOpen?: boolean;
}

const EASE   = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const;

export default function MobileBottomNav({ sidebarOpen = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPlatformTab = normalizePlatformTab(searchParams.get('tab'));
  const { user } = useAuth();
  const role             = normaliseRole(user?.role);
  // While impersonating, the operator acts as the studio admin — show studio
  // tabs, not the platform control plane.
  const isSuperAdmin     = role === 'super_admin' && !getImpersonation();
  const { features }     = useFeatures();
  // Platform tabs are control-plane surfaces and are never tenant-gated.
  const items            = isSuperAdmin
    ? PLATFORM_ITEMS
    : BASE_ITEMS.filter(i => isVisibleForFeature(i, features));

  const { reducedMotion } = useNavScroll();
  const dur = reducedMotion ? 0 : 0.28;

  return (
    <m.nav
      // `bottom` comes from .mobile-bottom-nav, not Tailwind's bottom-0: it
      // tracks --vv-bottom-inset so the bar stays on the real bottom edge
      // even when iOS leaves the layout viewport disagreeing with the
      // visible one. See useVisualViewportAnchor.
      className="mobile-bottom-nav fixed left-0 right-0 z-40 lg:hidden"
      data-no-pull-refresh
      style={{
        background: 'rgba(15,23,42,0.94)',
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
          background: 'linear-gradient(90deg, transparent 0%, rgba(127,180,255,0.4) 25%, rgba(127,180,255,0.65) 50%, rgba(127,180,255,0.4) 75%, transparent 100%)',
        }}
      />

      {/* Height comes from --bottom-nav-h (globals.css), the same token every
          "clear the bottom nav" offset is derived from — so changing the nav's
          height can never leave pages overlapping it. */}
      <div className="flex items-stretch" style={{ height: 'var(--bottom-nav-h, 52px)' }}>
        {items.map((item) => {
          const { href, icon: Icon, label } = item;
          // Platform tabs all share the /platform pathname and differ only by
          // ?tab=, so those items match on the normalised tab id instead.
          const isActive = 'tab' in item
            ? pathname === '/platform' && currentPlatformTab === item.tab
            : href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center overflow-hidden focus-visible:outline-none"
              aria-current={isActive ? 'page' : undefined}
              style={{ gap: 2, minHeight: 44 }}
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
                    top:    4,
                    bottom: 4,
                    background: 'linear-gradient(135deg, rgba(127,180,255,0.22) 0%, rgba(0,103,224,0.14) 100%)',
                    border: '1px solid rgba(127,180,255,0.28)',
                    boxShadow: '0 2px 14px rgba(127,180,255,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
                  }}
                  transition={SPRING}
                />
              )}

              {/* Icon */}
              <m.span
                className="relative z-10 flex h-[22px] w-[22px] items-center justify-center"
                whileTap={reducedMotion ? {} : { scale: 0.76 }}
                transition={{ type: 'spring', stiffness: 700, damping: 22 }}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.3 : 1.7}
                  style={{
                    color: isActive ? '#7fb4ff' : 'rgba(255,255,255,0.40)',
                    filter: isActive ? 'drop-shadow(0 0 7px rgba(127,180,255,0.55))' : 'none',
                    transition: 'color 200ms ease, filter 200ms ease',
                  }}
                  aria-hidden="true"
                />
              </m.span>

              {/* Label */}
              {/* nowrap: "AI Coach" is the only label containing a space, and
                  the bar's height is fixed — letting it stack onto two lines
                  would push it out of the row. */}
              <span
                className="relative z-10 select-none whitespace-nowrap text-[9.5px] font-bold uppercase leading-none"
                style={{
                  letterSpacing: '0.065em',
                  color: isActive ? '#b8d7ff' : 'rgba(255,255,255,0.36)',
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
