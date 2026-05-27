// src/lib/nav-config.ts
// Single source of truth for all navigation.
// Sidebar, CommandPalette, and Breadcrumbs all consume this file.

export type Role = 'admin' | 'manager' | 'staff' | 'reception' | 'receptionist' | 'trainer' | 'member';

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  role?: Role;
  roles?: Role[];
  hidden?: boolean;
  matchPrefix?: string;
  badge?: string;
  isNew?: boolean;
  comingSoon?: boolean;
  children?: NavItem[];
};

export type NavGroup = {
  id: string;
  label: string;
  icon: string;
  roles?: Role[];
  items: NavItem[];
};

export const DASHBOARD_ITEM: NavItem = {
  href:  '/dashboard',
  label: 'Dashboard',
  icon:  'LayoutDashboard',
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'members',
    label: 'Members',
    icon: 'Users',
    items: [
      { href: '/clients/new',       label: 'Add Member',    icon: 'UserPlus' },
      { href: '/clients',           label: 'My Members',    icon: 'Users' },
      { href: '/members/active',    label: 'Active',        icon: 'UserCheck' },
      { href: '/members/renewals',  label: 'Renewals',      icon: 'RefreshCw',     badge: 'renewalsCount', isNew: true },
      { href: '/members/expiring',  label: 'Expiring Soon', icon: 'CalendarClock', badge: 'expiringCount' },
      { href: '/members/lapsed',    label: 'Lapsed',        icon: 'UserX' },
      { href: '/members/birthdays', label: 'Birthdays',     icon: 'Cake',          badge: 'birthdaysToday' },
      { href: '/attendance',        label: 'Attendance',    icon: 'ClipboardList' },
      { href: '/checkin',           label: 'Check-ins',     icon: 'ScanFace' },
      { href: '/clients/[id]',      label: 'Member Profile', icon: 'User', hidden: true, matchPrefix: '/clients/' },
    ],
  },
  {
    id: 'coaches',
    label: 'Coaches',
    icon: 'Dumbbell',
    items: [
      { href: '/trainers/add',              label: 'Add Coach',               icon: 'UserPlus',    role: 'admin' },
      { href: '/trainers',                  label: 'My Coaches',              icon: 'UserCog',     role: 'admin' },
      { href: '/training/transformations',  label: 'Transformations',         icon: 'Sparkles',    roles: ['admin', 'manager'] },
      { href: '/trainers/leave',            label: 'Leave Requests',          icon: 'CalendarOff', roles: ['admin', 'manager'], badge: 'pendingLeaves' },
      { href: '/pt-portal',                 label: 'PT Portal',               icon: 'Sparkles',    roles: ['admin', 'manager', 'trainer'], isNew: true },
      { href: '/pt-os/new-client',          label: 'New PT Client',           icon: 'UserPlus',    role: 'admin' },
      { href: '/pt-os/schedule-session',    label: 'Schedule Session',        icon: 'Calendar',    role: 'admin' },
      { href: '/pt-os/workout-plans',       label: 'Workout Plans',           icon: 'Dumbbell',    role: 'admin' },
      { href: '/pt-os/diet-plans',          label: 'Diet Plans',              icon: 'Apple',       role: 'admin' },
      { href: '/trainer/dashboard',         label: 'My Dashboard',            icon: 'LayoutGrid',  role: 'trainer' },
      { href: '/trainers/[id]',             label: 'Coach Profile',           icon: 'UserCog',     hidden: true, matchPrefix: '/trainers/' },
    ],
  },
  {
    id: 'memberships',
    label: 'Memberships',
    icon: 'CreditCard',
    items: [
      {
        href: '/plans',
        label: 'Plans',
        icon: 'Layers',
        role: 'admin',
        children: [
          { href: '/plans/create', label: 'Create Plan',  icon: 'PlusCircle', role: 'admin' },
          { href: '/plans',        label: 'My Plans',     icon: 'LayoutGrid', role: 'admin' },
        ],
      },
      { href: '/memberships/subscriptions', label: 'Subscriptions', icon: 'RefreshCw' },
      { href: '/memberships/coupons',       label: 'Coupons',       icon: 'Ticket',    role: 'admin', isNew: true },
      { href: '/memberships/combo-offers',  label: 'Combo Offers',  icon: 'Gift',      role: 'admin', isNew: true },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'TrendingUp',
    items: [
      { href: '/sales/leads',     label: 'Lead Inbox',        icon: 'Inbox',       role: 'admin', badge: 'leadsCount' },
      { href: '/sales/enquiry',   label: 'Add Enquiry',       icon: 'PlusCircle' },
      { href: '/sales/enquiries', label: 'Enquiry List',      icon: 'List' },
      { href: '/sales/funnel',    label: 'Conversion Funnel', icon: 'Filter',      role: 'admin' },
      { href: '/sales/sources',   label: 'Lead Sources',      icon: 'PieChart',    role: 'admin' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'ScanFace',
    items: [
      { href: '/checkin',                label: 'Face Check-In',     icon: 'ScanFace' },
      { href: '/attendance',             label: 'Member Attendance', icon: 'ClipboardList' },
      { href: '/attendance/staff',       label: 'Staff Attendance',  icon: 'UsersRound', roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'IndianRupee',
    items: [
      { href: '/payments',                label: 'Payments',         icon: 'Wallet' },
      { href: '/finance/invoices',        label: 'Invoices',         icon: 'FileText',     isNew: true },
      { href: '/finance/record-payment',  label: 'Record Payment',   icon: 'Wallet',       isNew: true },
      { href: '/finance/dues',            label: 'Outstanding Dues', icon: 'AlertCircle',  badge: 'duesCount' },
      { href: '/finance/collection',      label: 'Collection',       icon: 'ArrowUpRight', role: 'admin' },
      { href: '/finance/pl',              label: 'Profit & Loss',    icon: 'BarChart3',    role: 'admin' },
      { href: '/finance/forecast',        label: 'Revenue Forecast', icon: 'TrendingUp',   role: 'admin' },
      { href: '/finance/trainer-revenue', label: 'Coach Revenue',    icon: 'Award',        role: 'admin' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'LineChart',
    items: [
      { href: '/reports',           label: 'Reports',            icon: 'FileBarChart' },
      { href: '/insights/revenue',  label: 'Revenue Analytics',  icon: 'TrendingUp',   role: 'admin' },
      { href: '/insights/traffic',  label: 'Attendance Analytics', icon: 'Activity',   role: 'admin' },
      { href: '/insights/renewal',  label: 'Renewal Analysis',   icon: 'RefreshCcw',   role: 'admin' },
      { href: '/insights/sessions', label: 'Session Utilisation', icon: 'Clock' },
    ],
  },
  {
    id: 'engagement',
    label: 'Engagement',
    icon: 'Megaphone',
    items: [
      { href: '/engagement/notifications', label: 'Notifications',   icon: 'Bell' },
      { href: '/engagement/whatsapp',      label: 'WhatsApp',        icon: 'MessageCircle' },
      { href: '/engagement/campaigns',     label: 'Campaigns',       icon: 'Send',      role: 'admin' },
      { href: '/engagement/offers',        label: 'Offers & Promos', icon: 'Tag',       role: 'admin' },
      { href: '/engagement/feedback',      label: 'Feedback',        icon: 'Star',      role: 'admin' },
    ],
  },
];

export const SETTINGS_GROUP: NavGroup = {
  id: 'settings',
  label: 'Settings',
  icon: 'Settings',
  items: [
    { href: '/settings',                 label: 'General',              icon: 'Settings' },
    { href: '/settings/studio',          label: 'Studio Settings',      icon: 'Building2',      role: 'admin', isNew: true },
    { href: '/settings/profile',         label: 'My Profile',           icon: 'User',           isNew: true },
    { href: '/settings/branches',        label: 'Branches',             icon: 'Building2',      role: 'admin' },
    { href: '/settings/staff',           label: 'Staff & Access',       icon: 'ShieldCheck',    role: 'admin' },
    { href: '/settings/biometric',       label: 'Biometric & Face',     icon: 'Fingerprint',    role: 'admin' },
    { href: '/settings/billing',         label: 'GST / Invoice',        icon: 'Receipt',        role: 'admin' },
    { href: '/settings/branding',        label: 'Branding',             icon: 'Palette',        role: 'admin' },
    { href: '/settings/integrations',    label: 'Integrations',         icon: 'Zap',            role: 'admin', isNew: true },
    { href: '/settings/import-database', label: 'Import Database',      icon: 'DatabaseBackup', role: 'admin' },
  ],
};

export const QUICK_ACTIONS = [
  { id: 'qa-add-member',   label: 'Add new member',       icon: 'UserPlus',      href: '/clients/new' },
  { id: 'qa-record-pay',   label: 'Record a payment',     icon: 'Wallet',        href: '/finance/record-payment' },
  { id: 'qa-mark-att',     label: 'Manual attendance log', icon: 'ClipboardList', href: '/attendance' },
  { id: 'qa-add-coach',    label: 'Add coach',             icon: 'UserCog',       href: '/trainers/add', role: 'admin' as Role },
  { id: 'qa-face-checkin', label: 'Face check-in',         icon: 'ScanFace',      href: '/checkin' },
  { id: 'qa-add-enquiry',  label: 'Add enquiry',           icon: 'PlusCircle',    href: '/sales/enquiry' },
];

export function allNavItems(): Array<NavItem & { groupId: string; groupLabel: string }> {
  const out: Array<NavItem & { groupId: string; groupLabel: string }> = [];
  out.push({ ...DASHBOARD_ITEM, groupId: 'dashboard', groupLabel: 'Dashboard' });
  for (const g of NAV_GROUPS) {
    for (const it of g.items) {
      out.push({ ...it, groupId: g.id, groupLabel: g.label });
      if (it.children) {
        for (const child of it.children) {
          out.push({ ...child, groupId: g.id, groupLabel: g.label });
        }
      }
    }
  }
  for (const it of SETTINGS_GROUP.items) out.push({ ...it, groupId: SETTINGS_GROUP.id, groupLabel: SETTINGS_GROUP.label });
  return out;
}

export function findItemByPath(pathname: string): (NavItem & { groupId: string; groupLabel: string }) | null {
  const all  = allNavItems();
  const path = pathname.split('?')[0];
  const exact = all.find((i) => i.href.split('?')[0] === path);
  if (exact) return exact;
  const prefix = all.find((i) => i.matchPrefix && path.startsWith(i.matchPrefix));
  if (prefix) return prefix;
  return all.find((i) => !i.matchPrefix && path.startsWith(i.href.split('?')[0] + '/')) ?? null;
}

export function isVisibleForRole(item: NavItem, userRole?: string): boolean {
  if (item.hidden) return false;
  const role = userRole === 'receptionist' ? 'reception' : userRole;
  if (item.roles?.length) return !!role && (item.roles as string[]).includes(role);
  if (item.role)          return role === item.role;
  return true;
}

export function isGroupVisibleForRole(group: NavGroup, userRole?: string): boolean {
  const role = userRole === 'receptionist' ? 'reception' : userRole;
  if (group.roles?.length) return !!role && (group.roles as string[]).includes(role);
  return true;
}
