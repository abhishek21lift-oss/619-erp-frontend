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
    id: 'lead-crm',
    label: 'Lead CRM',
    icon: 'Target',
    items: [
      { href: '/sales/leads',              label: 'Lead Inbox',         icon: 'Inbox',        badge: 'leadsCount' },
      { href: '/sales/sources',            label: 'Lead Sources',       icon: 'PieChart',     role: 'admin' },
      { href: '/sales/funnel',             label: 'Conversion Funnel',  icon: 'Filter',       role: 'admin' },
      { href: '/sales/enquiry',            label: 'Add Enquiry',        icon: 'PlusCircle' },
      { href: '/sales/enquiries',          label: 'Enquiry List',       icon: 'List' },
      { href: '/sales/trial-sessions',     label: 'Trial Sessions',     icon: 'CalendarCheck', role: 'admin', isNew: true },
    ],
  },
  {
    id: 'members',
    label: 'Members',
    icon: 'Users',
    items: [
      { href: '/clients/new',       label: 'Add Member',   icon: 'UserPlus' },
      { href: '/clients',           label: 'My Members',      icon: 'Users' },
      { href: '/members/active',    label: 'Active Members',  icon: 'UserCheck' },
      { href: '/members/renewals',  label: 'Renewals',        icon: 'RefreshCw',     badge: 'renewalsCount' },
      { href: '/members/expiring',  label: 'Expiring Soon',   icon: 'CalendarClock', badge: 'expiringCount' },
      { href: '/members/lapsed',    label: 'Lapsed',          icon: 'UserX' },
      { href: '/members/birthdays', label: 'Birthdays',       icon: 'Cake',          badge: 'birthdaysToday' },
      { href: '/clients/[id]',      label: 'Member Profile',  icon: 'User', hidden: true, matchPrefix: '/clients/' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: 'ScanFace',
    items: [
      { href: '/checkin',                label: 'QR / Mobile Check-In', icon: 'ScanFace' },
      { href: '/attendance',             label: 'Attendance Records',   icon: 'ClipboardList' },
      { href: '/attendance/reports',     label: 'Attendance Reports',   icon: 'BarChart3',   role: 'admin', isNew: true },
      { href: '/attendance/staff',       label: 'Staff Attendance',     icon: 'UsersRound',  roles: ['admin', 'manager'] },
    ],
  },
  {
    id: 'personal-training',
    label: 'PT System',
    icon: 'Dumbbell',
    items: [
      { href: '/pt-os/new-client',       label: 'PT Consultation',    icon: 'ClipboardList' },
      { href: '/pt-os/goals',            label: 'Goal Setting',       icon: 'Target',       isNew: true },
      { href: '/pt-os/assessment',       label: 'PT Assessment',      icon: 'ClipboardCheck', isNew: true },
      { href: '/pt-os/packages',         label: 'PT Packages',        icon: 'Package',      isNew: true },
      { href: '/pt-os/clients',          label: 'PT Clients',         icon: 'Users' },
      { href: '/pt-portal',              label: 'PT Portal',          icon: 'Sparkles',     roles: ['admin', 'manager', 'trainer'] },
    ],
  },
  {
    id: 'trainer-management',
    label: 'Trainers',
    icon: 'UserCog',
    items: [
      { href: '/trainers/add',              label: 'Add Trainer',          icon: 'UserPlus',    role: 'admin' },
      { href: '/trainers',                  label: 'Trainer Profiles',     icon: 'UserCog',     role: 'admin' },
      { href: '/pt-os/workout-plans',       label: 'Workout Plans',        icon: 'Dumbbell' },
      { href: '/pt-os/diet-plans',          label: 'Diet Plans',           icon: 'Apple' },
      { href: '/training/transformations',  label: 'Transformations',      icon: 'Sparkles',    roles: ['admin', 'manager'] },
      { href: '/trainers/leave',            label: 'Leave Requests',       icon: 'CalendarOff', roles: ['admin', 'manager'], badge: 'pendingLeaves' },
      { href: '/trainer/dashboard',         label: 'Trainer Dashboard',    icon: 'LayoutGrid',  role: 'trainer' },
      { href: '/trainers/[id]',             label: 'Trainer Profile',      icon: 'UserCog',     hidden: true, matchPrefix: '/trainers/' },
    ],
  },
  {
    id: 'session-management',
    label: 'Sessions',
    icon: 'Calendar',
    items: [
      { href: '/pt-os/schedule-session',  label: 'Book Session',         icon: 'CalendarPlus' },
      { href: '/pt-os/session-balance',   label: 'Session Balance',      icon: 'Gauge',         isNew: true },
      { href: '/pt-os/sessions',          label: 'Session History',      icon: 'History' },
      { href: '/insights/sessions',       label: 'Session Utilisation',  icon: 'Clock' },
    ],
  },
  {
    id: 'progress-tracking',
    label: 'Progress',
    icon: 'TrendingUp',
    items: [
      { href: '/pt-os/weekly-checkin',    label: 'Weekly Check-In',     icon: 'ClipboardCheck', isNew: true },
      { href: '/pt-os/measurements',      label: 'Measurements',        icon: 'Ruler',          isNew: true },
      { href: '/pt-os/strength-tracking', label: 'Strength Tracking',   icon: 'Zap',             isNew: true },
      { href: '/pt-os/progress-photos',   label: 'Progress Photos',     icon: 'Camera',         isNew: true },
      { href: '/pt-os/reports',           label: 'Progress Report',     icon: 'FileBarChart' },
    ],
  },
  {
    id: 'memberships',
    label: 'Memberships',
    icon: 'CreditCard',
    items: [
      { href: '/plans',                    label: 'Plans',              icon: 'Layers',        role: 'admin',
        children: [
          { href: '/plans/create', label: 'Create Plan',  icon: 'PlusCircle', role: 'admin' },
          { href: '/plans',        label: 'My Plans',     icon: 'LayoutGrid', role: 'admin' },
        ],
      },
      { href: '/memberships/subscriptions', label: 'Subscriptions',      icon: 'RefreshCw' },
      { href: '/memberships/coupons',       label: 'Coupons',            icon: 'Ticket',        role: 'admin' },
      { href: '/memberships/combo-offers',  label: 'Combo Offers',       icon: 'Gift',          role: 'admin' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'IndianRupee',
    items: [
      { href: '/finance/record-payment',  label: 'Record Payment',     icon: 'Wallet' },
      { href: '/payments',                label: 'Payments',           icon: 'Banknote' },
      { href: '/finance/invoices',        label: 'Invoices',           icon: 'FileText' },
      { href: '/finance/dues',            label: 'Outstanding Dues',   icon: 'AlertCircle',  badge: 'duesCount' },
      { href: '/finance/pl',              label: 'Profit & Loss',      icon: 'BarChart3',    role: 'admin' },
      { href: '/finance/collection',      label: 'Collection',         icon: 'ArrowUpRight', role: 'admin' },
      { href: '/finance/forecast',        label: 'Revenue Forecast',   icon: 'TrendingUp',   role: 'admin' },
      { href: '/pt-os/commissions',       label: 'Trainer Commissions', icon: 'Percent',     role: 'admin', isNew: true },
      { href: '/finance/trainer-revenue', label: 'Trainer Payouts',    icon: 'Award',        role: 'admin' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'MessageCircle',
    items: [
      { href: '/engagement/whatsapp',      label: 'WhatsApp / SMS',       icon: 'MessageCircle' },
      { href: '/engagement/notifications', label: 'Notifications',        icon: 'Bell' },
      { href: '/engagement/campaigns',     label: 'Campaigns',            icon: 'Send',        role: 'admin' },
      { href: '/engagement/offers',        label: 'Promotional Offers',   icon: 'Tag',         role: 'admin' },
      { href: '/engagement/feedback',      label: 'Feedback',             icon: 'Star',        role: 'admin' },
      { href: '/engagement/automation',    label: 'Automation Rules',     icon: 'Bot',         isNew: true },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'FileBarChart',
    items: [
      { href: '/reports',               label: 'All Reports',         icon: 'FileBarChart' },
      { href: '/insights/revenue',      label: 'Revenue Report',      icon: 'TrendingUp',   role: 'admin' },
      { href: '/insights/renewal',      label: 'Renewal Report',      icon: 'RefreshCcw',   role: 'admin' },
      { href: '/insights/traffic',      label: 'Attendance Report',   icon: 'Activity',     role: 'admin' },
      { href: '/finance/pl',            label: 'Profit & Loss',       icon: 'BarChart3',    role: 'admin' },
      { href: '/training/transformations', label: 'Transformations',   icon: 'Sparkles',     roles: ['admin', 'manager'] },
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
  { id: 'qa-add-lead',     label: 'Add new lead',          icon: 'UserPlus',      href: '/sales/enquiry' },
  { id: 'qa-add-member',   label: 'Create member',         icon: 'Users',         href: '/clients/new' },
  { id: 'qa-record-pay',   label: 'Record payment',        icon: 'Wallet',        href: '/finance/record-payment' },
  { id: 'qa-book-session', label: 'Book PT session',       icon: 'CalendarPlus',  href: '/pt-os/schedule-session' },
  { id: 'qa-face-checkin', label: 'QR / Face check-in',    icon: 'ScanFace',      href: '/checkin' },
  { id: 'qa-add-coach',    label: 'Add trainer',            icon: 'UserCog',       href: '/trainers/add', role: 'admin' as Role },
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
