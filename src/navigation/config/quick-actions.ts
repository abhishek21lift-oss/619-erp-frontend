// Quick actions - adapted from legacy QUICK_ACTIONS + bottom nav tab definitions.

import { QUICK_ACTIONS as LEGACY_QUICK_ACTIONS } from '@/lib/nav-config';
import type { QuickAction, BottomNavTab } from './types';

export const QUICK_ACTIONS: QuickAction[] = LEGACY_QUICK_ACTIONS.map((qa) => ({
  id:    qa.id,
  label: qa.label,
  icon:  qa.icon,
  href:  qa.href,
  roles: qa.roles ? [...qa.roles] : undefined,
}));

/** Bottom navigation tabs shown on mobile. Order matters - left to right. */
export const BOTTOM_NAV_TABS: BottomNavTab[] = [
  { href: '/',             label: 'Home',     icon: 'Home' },
  { href: '/clients',      label: 'Clients',  icon: 'Users', matchPrefix: '/clients' },
  { href: '/schedule',     label: 'Schedule', icon: 'CalendarCheck', matchPrefix: '/schedule' },
  { href: '/programs',     label: 'Programs', icon: 'Dumbbell', matchPrefix: '/programs' },
  { href: '/payments',     label: 'Payments', icon: 'IndianRupee', matchPrefix: '/payments' },
];
