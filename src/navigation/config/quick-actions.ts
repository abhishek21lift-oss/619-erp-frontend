// Quick actions — adapted from legacy QUICK_ACTIONS + bottom nav tab definitions.

import { QUICK_ACTIONS as LEGACY_QUICK_ACTIONS } from '@/lib/nav-config';
import type { QuickAction, BottomNavTab } from './types';

export const QUICK_ACTIONS: QuickAction[] = LEGACY_QUICK_ACTIONS.map((qa) => ({
  id:    qa.id,
  label: qa.label,
  icon:  qa.icon,
  href:  qa.href,
  roles: qa.roles ? [...qa.roles] : undefined,
}));

/** Bottom navigation tabs shown on mobile. Order matters — left to right. */
export const BOTTOM_NAV_TABS: BottomNavTab[] = [
  { href: '/',                             label: 'Home',     icon: 'Home'         },
  { href: '/pt-os/clients',               label: 'Clients',  icon: 'Users'        },
  { href: '/checkin',                     label: 'Check-in', icon: 'ScanFace'     },
  { href: '/pt-os/sessions',             label: 'Sessions', icon: 'Dumbbell'     },
  { href: '/finance/collected-payments', label: 'Finance',  icon: 'IndianRupee', matchPrefix: '/finance' },
];
