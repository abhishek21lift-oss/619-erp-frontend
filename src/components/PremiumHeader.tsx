'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, isVisibleForRole } from '@/lib/nav-config';
import {
  Menu, Bell, ChevronDown, Search, MoreVertical,
  Plus, UserPlus, Dumbbell, FileText, CreditCard, UserCheck,
  CalendarPlus, ClipboardList, Salad, Zap,
  LayoutDashboard, TrendingUp, Users, Activity, Settings, BarChart2,
  IndianRupee, LogOut, KeyRound, X, Palette,
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { cn } from '@/components/ui';
import PtOsButton from './PtOsButton';

interface Props { onMenuClick?: () => void; }

interface MegaItem { label: string; href?: string; description?: string; isNew?: boolean; children?: MegaItem[]; }
interface MegaColumn { heading?: string; items: MegaItem[]; }
interface SpotlightCard { title: string; value: string; sub: string; accent: string; }
interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  glow: string;
  gradient: string;
  columns: MegaColumn[];
  spotlight?: SpotlightCard;
}

const MEGA_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={13} />,
    accent: '#FF1744',
    glow: 'rgba(255,23,68,0.18)',
    gradient: 'linear-gradient(135deg,#FF1744,#b71c1c)',
    columns: [
      { heading: 'Overview', items: [
        { label: 'Overview', href: '/dashboard', description: 'Studio at a glance' },
        { label: 'Live Activity', href: '/dashboard/live-activity', description: 'Real-time check-ins' },
        { label: 'Quick Actions', href: '/dashboard/quick-actions', description: 'Fast operations' },
      ]},
      { heading: 'Intelligence', items: [
        { label: 'AI Insights', href: '/dashboard/ai-insights', description: 'Smart recommendations', isNew: true },
        { label: 'Tasks', href: '/dashboard/tasks', description: 'Pending work items' },
        { label: 'Studio Status', href: '/dashboard/studio-status', description: 'System health' },
      ]},
    ],
    spotlight: { title: 'Today', value: '—', sub: 'Members active', accent: '#FF1744' },
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: <TrendingUp size={13} />,
    accent: '#FF1744',
    glow: 'rgba(255,23,68,0.15)',
    gradient: 'linear-gradient(135deg,#FF1744,#c62828)',
    columns: [
      { heading: 'Pipeline', items: [
        { label: 'Leads', href: '/sales/leads', description: 'Prospective members' },
        { label: 'Enquiries', children: [
          { label: 'Add Enquiry', href: '/sales/enquiry', description: 'New lead form' },
          { label: 'Enquiry List', href: '/sales/enquiries', description: 'View all enquiries' },
        ]},
        { label: 'Membership Sales', href: '/memberships/subscriptions', description: 'Plan conversions' },
      ]},
      { heading: 'Finance', items: [
        { label: 'POS', href: '/payments', description: 'Point of sale terminal' },
        { label: 'Payments', href: '/finance/collection', description: 'Transaction ledger' },
        { label: 'Invoices', href: '/finance/invoices', description: 'Billing records' },
        { label: 'Promotions', href: '/engagement/offers', description: 'Offers & discounts' },
      ]},
    ],
    spotlight: { title: 'This Month', value: '—', sub: 'Revenue collected', accent: '#FF1744' },
  },
  {
    id: 'members',
    label: 'Members',
    icon: <Users size={13} />,
    accent: '#FF1744',
    glow: 'rgba(255,23,68,0.15)',
    gradient: 'linear-gradient(135deg,#FF1744,#d50000)',
    columns: [
      { heading: 'Roster', items: [
        { label: 'Add Member', href: '/clients/new', description: 'Register new member' },
        { label: 'All Members', href: '/clients', description: 'Complete member list' },
        { label: 'Active', href: '/members/active', description: 'Currently active' },
        { label: 'Renewals', href: '/members/renewals', description: 'Upcoming renewals', isNew: true },
        { label: 'Expiring Soon', href: '/members/expiring', description: 'Membership ending' },
        { label: 'Lapsed', href: '/members/lapsed', description: 'Expired memberships' },
        { label: 'Birthdays', href: '/members/birthdays', description: 'Birthday list' },
      ]},
      { heading: 'Daily Operations', items: [
        { label: 'Attendance', href: '/attendance', description: 'Daily attendance log' },
        { label: 'Check-ins', href: '/checkin', description: 'Live check-in system' },
        { label: 'Member Profiles', href: '/clients', description: 'View & manage profiles' },
        { label: 'Member Database', href: '/clients', description: 'Advanced search & filters' },
      ]},
    ],
    spotlight: { title: 'Active Members', value: '—', sub: 'Valid subscriptions', accent: '#FF1744' },
  },
  {
    id: 'coaches',
    label: 'Coaches',
    icon: <Dumbbell size={13} />,
    accent: '#FF1744',
    glow: 'rgba(255,23,68,0.15)',
    gradient: 'linear-gradient(135deg,#FF1744,#b71c1c)',
    columns: [
      { heading: 'Coach Management', items: [
        { label: 'Add Coach', href: '/trainers/add', description: 'Register new coach' },
        { label: 'My Coaches', href: '/trainers', description: 'Coach roster' },
        { label: 'Coach Profiles', href: '/trainers', description: 'Profiles & schedules' },
        { label: 'Coach Attendance', href: '/attendance/staff', description: 'Staff attendance log' },
        { label: 'Leave Requests', href: '/trainers/leave', description: 'Pending approvals' },
      ]},
      { heading: 'PT Programs', items: [
        { label: 'PT OS', href: '/pt-os', description: 'Full PT management system' },
        { label: 'Transformations', href: '/training/transformations', description: 'Client transformations' },
      ]},
    ],
    spotlight: { title: 'Active Coaches', value: '—', sub: 'On duty', accent: '#FF1744' },
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: <Activity size={13} />,
    accent: '#FF1744',
    glow: 'rgba(255,23,68,0.15)',
    gradient: 'linear-gradient(135deg,#FF1744,#c62828)',
    columns: [
      { heading: 'Staff & Coaches', items: [
        { label: 'Staff', href: '/staff', description: 'HR management' },
        { label: 'Coaches', href: '/trainers', description: 'Coach roster' },
        { label: 'Attendance', href: '/attendance/staff', description: 'Staff log' },
        { label: 'Class Scheduling', href: '/appointments', description: 'Group sessions' },
      ]},
      { heading: 'Facility', items: [
        { label: 'Equipment', href: '/settings/studio', description: 'Asset inventory' },
        { label: 'Maintenance', href: '/settings/studio', description: 'Work orders & upkeep' },
        { label: 'Access Control', href: '/settings/biometric', description: 'Entry system' },
        { label: 'Branches', href: '/settings/branches', description: 'Multi-location' },
      ]},
    ],
    spotlight: { title: 'Staff On Duty', value: '—', sub: 'Currently present', accent: '#FF1744' },
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <IndianRupee size={13} />,
    accent: '#FF1744',
    glow: 'rgba(255,23,68,0.15)',
    gradient: 'linear-gradient(135deg,#FF1744,#b71c1c)',
    columns: [
      { heading: 'Revenue & Expenses', items: [
        { label: 'Revenue', href: '/finance/collection', description: 'Income tracking' },
        { label: 'P&L', href: '/finance/pl', description: 'Profit & loss' },
        { label: 'Dues', href: '/finance/dues', description: 'Outstanding balances' },
        { label: 'Payroll', href: '/staff/targets', description: 'Staff compensation' },
      ]},
      { heading: 'Planning', items: [
        { label: 'Billing', href: '/settings/billing', description: 'Invoice management' },
        { label: 'Reports', href: '/reports', description: 'Financial summaries' },
        { label: 'Forecasting', href: '/finance/forecast', description: 'Revenue projections' },
        { label: 'Subscriptions', href: '/memberships/subscriptions', description: 'Plan management' },
      ]},
    ],
    spotlight: { title: 'Outstanding Dues', value: '—', sub: 'Pending collection', accent: '#FF1744' },
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart2 size={13} />,
    accent: '#FF1744',
    glow: 'rgba(255,23,68,0.15)',
    gradient: 'linear-gradient(135deg,#FF1744,#c62828)',
    columns: [
      { heading: 'Performance', items: [
        { label: 'Revenue Analytics', href: '/finance/collection', description: 'Income trends' },
        { label: 'Retention', href: '/insights/renewal', description: 'Member lifecycle' },
        { label: 'Churn Analysis', href: '/insights/traffic', description: 'Drop-off & foot traffic' },
        { label: 'Attendance Analytics', href: '/insights/traffic', description: 'Foot traffic data' },
      ]},
      { heading: 'Intelligence', items: [
        { label: 'Coach Performance', href: '/insights/sessions', description: 'Coaching metrics' },
        { label: 'Branch Performance', href: '/settings/branches', description: 'Location comparison' },
        { label: 'AI Insights', href: '/dashboard/ai-insights', description: 'Smart patterns', isNew: true },
        { label: 'Forecasting', href: '/finance/forecast', description: 'Future projections' },
      ]},
    ],
    spotlight: { title: 'Retention Rate', value: '—', sub: 'Last 30 days', accent: '#FF1744' },
  },
];

type QuickAction = { label: string; href: string; icon: React.ReactNode; group: string; role?: string };
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'PT OS Dashboard', href: '/pt-os',                  icon: <Dumbbell size={14} />,     group: 'Coaches' },
  { label: 'Create Invoice',   href: '/finance/invoices',       icon: <FileText size={14} />,     group: 'Finance',  role: 'admin' },
  { label: 'Record Payment',   href: '/finance/record-payment', icon: <CreditCard size={14} />,   group: 'Finance',  role: 'admin' },
  { label: 'Add Lead',         href: '/sales/enquiry',          icon: <UserCheck size={14} />,    group: 'Sales'    },
  { label: 'Schedule Session', href: '/appointments',           icon: <CalendarPlus size={14} />, group: 'Coaches' },
  { label: 'Workout Plan',     href: '/pt-os/workout-plans',    icon: <ClipboardList size={14} />,group: 'Coaches' },
  { label: 'Diet Plan',        href: '/pt-os/diet-plans',       icon: <Salad size={14} />,        group: 'Coaches' },
];

const LIVE_PILLS = [
  { label: 'Studio Live', color: '#FF1744', pulse: true },
  { label: 'AI Active', color: '#FF1744', pulse: true },
  { label: 'Sync', color: '#FF1744', pulse: false },
];

const megaVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.975, filter: 'blur(4px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 420, damping: 30, mass: 0.6 },
  },
  exit: {
    opacity: 0, y: -6, scale: 0.982, filter: 'blur(2px)',
    transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const dropVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.975 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 440, damping: 28, mass: 0.5 },
  },
  exit: {
    opacity: 0, y: -4, scale: 0.985,
    transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

interface MegaPortalProps {
  section: NavSection;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  pathname: string;
  router: ReturnType<typeof useRouter>;
}

function MegaMenuPortal({ section, anchorRef, onClose, pathname, router }: MegaPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [subOpen, setSubOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    section.columns.forEach(c => c.items.forEach(i => { if (i.children) init[i.label] = true; }));
    return init;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({ top: rect.bottom + 10, left: rect.left, width: section.spotlight ? 640 : 480 });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [anchorRef, section.spotlight]);

  useEffect(() => {
    const handleDown = (e: MouseEvent | TouchEvent) => {
      const target = ('touches' in e ? e.touches[0]?.target : e.target) as Node | null;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) { onClose(); }
    };
    document.addEventListener('mousedown', handleDown as EventListener);
    document.addEventListener('touchstart', handleDown as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleDown as EventListener);
      document.removeEventListener('touchstart', handleDown as EventListener);
    };
  }, [onClose, anchorRef]);

  if (!mounted) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const menuWidth = vw < 768
    ? vw - 32
    : vw < 1024
      ? section.spotlight ? 480 : 360
      : section.spotlight ? 640 : 480;
  const safeLeft = vw < 768
    ? Math.max(16, (vw - menuWidth) / 2)
    : Math.min(pos.left, vw - menuWidth - 16);

  return createPortal(
    <motion.div
      ref={menuRef}
      key={section.id}
      variants={megaVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'fixed',
        top: pos.top,
        left: safeLeft,
        width: menuWidth,
        zIndex: 9999,
        background: 'var(--bg-card)',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: 22,
        transformOrigin: 'top left',
        willChange: 'transform, opacity',
        isolation: 'isolate',
      }}
    >
      <div
        className="h-[3px] w-full rounded-t-[22px]"
        style={{ background: section.gradient }}
      />

      <div className="flex gap-0 p-4">
        <div className={cn('flex gap-3', section.spotlight ? 'flex-1' : 'w-full')}>
          {section.columns.map((col, ci) => (
            <div key={ci} className="flex flex-1 flex-col gap-0.5">
                  {col.heading && (
                <div
                  className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: '#dc2626' }}
                >
                  {col.heading}
                </div>
              )}
              {col.items.map((item) => {
                if (item.children) {
                  const open = subOpen[item.label] ?? false;
                  const anyActive = item.children.some(c => pathname === c.href || pathname.startsWith(`${c.href}/`));
                  return (
                    <div key={item.label} className="mb-1">
                      <button
                        type="button"
                        onClick={() => setSubOpen(prev => ({ ...prev, [item.label]: !open }))}
                        className="flex w-full items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all"
                        style={{ color: '#86868b' }}
                      >
                        {item.label}
                        <motion.span
                          animate={{ rotate: open ? 180 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          style={{ display: 'inline-flex' }}
                        >
                          <ChevronDown size={10} />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            key="sub-items"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="ml-2 space-y-0.5 overflow-hidden border-l-2 pl-2"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            {item.children.map((child) => {
                              const ca = pathname === child.href || pathname.startsWith(`${child.href}/`);
                              return (
                                <button
                                  type="button"
                                  key={child.label}
                                  onClick={() => { router.push(child.href!); onClose(); }}
                                  className={cn(
                                    'group/child flex w-full items-start gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition-all duration-150',
                                    ca ? 'font-semibold' : '',
                                  )}
                                  style={ca ? { background: 'var(--border)' } : {}}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 truncate text-[12.5px] font-semibold" style={{ color: ca ? '#dc2626' : '#1d1d1f' }}>
                                      {child.label}
                                      {child.isNew && (
                                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: section.gradient }}>
                                          NEW
                                        </span>
                                      )}
                                    </div>
                                    {child.description && (
                                      <div className="mt-0.5 truncate text-[10.5px]" style={{ color: '#86868b' }}>{child.description}</div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
                const ia = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => { router.push(item.href!); onClose(); }}
                    className={cn(
                      'group/item flex w-full items-start gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-all duration-150',
                      ia ? 'font-semibold' : '',
                    )}
                    style={ia ? { background: 'var(--border)' } : {}}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold" style={{ color: ia ? '#dc2626' : '#1d1d1f' }}>
                        {item.label}
                        {item.isNew && (
                          <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: section.gradient }}>
                            NEW
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="mt-0.5 truncate text-[11px]" style={{ color: '#86868b' }}>{item.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {section.spotlight && (
          <div
            className="ml-3 flex w-[148px] shrink-0 flex-col justify-between rounded-[16px] p-4"
            style={{
              background: '#f5f5f7',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: '#dc2626' }}
            >
              {section.spotlight.title}
            </div>
            <div>
              <div className="text-[28px] font-black leading-none" style={{ color: '#dc2626' }}>
                {section.spotlight.value}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: '#86868b' }}>{section.spotlight.sub}</div>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-[10px] py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: section.gradient }}
              onClick={() => { const first = section.columns[0].items.find(i => i.href); if (first?.href) router.push(first.href); onClose(); }}
            >
              Open →
            </button>
          </div>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}

export default function PremiumHeader({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [hydrated, setHydrated] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  const anchorRefs = useRef<Record<string, React.RefObject<HTMLButtonElement | null>>>({});
  MEGA_SECTIONS.forEach((s) => {
    if (!anchorRefs.current[s.id]) {
      anchorRefs.current[s.id] = { current: null };
    }
  });
  const quickAnchorRef = useRef<HTMLButtonElement | null>(null);
  const accountAnchorRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('619_theme') as 'light' | 'dark') ?? 'dark';
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const toggleTheme = useCallback(() => {
    if (!hydrated) return;
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('619_theme', next); } catch { /* ignore */ }
  }, [hydrated, theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('619-cmd-palette'));
      }
      if (e.key === 'Escape') { setOpenMenu(null); setShowQuick(false); }
    };
    const onClickAway = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        const portalMenus = document.querySelectorAll('[data-mega-portal]');
        for (const menu of Array.from(portalMenus)) {
          if (menu.contains(e.target as Node)) return;
        }
        setOpenMenu(null);
        setShowQuick(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickAway);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickAway);
    };
  }, []);

  useEffect(() => { setOpenMenu(null); setShowQuick(false); }, [pathname]);

  const _legacyGroups = useMemo(() => {
    const visible = NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => isVisibleForRole(i, user?.role) && !i.hidden),
    })).filter((g) => {
      const orig = NAV_GROUPS.find((ng) => ng.id === g.id);
      if (orig?.roles?.length) return !!user?.role && orig.roles.includes(user.role as never);
      return g.items.length > 0;
    });
    const vs = {
      ...SETTINGS_GROUP,
      items: SETTINGS_GROUP.items.filter((i) => isVisibleForRole(i, user?.role) && !i.hidden),
    };
    return [
      { id: 'dashboard', label: 'Dashboard', items: [DASHBOARD_ITEM] },
      ...visible,
      ...(vs.items.length ? [{ id: vs.id, label: vs.label, items: vs.items }] : []),
    ];
  }, [user?.role]);

  const accountLabel = user?.name || 'ABHI-DESK';
  const roleLabel = user?.role || 'admin';
  const initials = (user?.name || 'A').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const isActive = (section: NavSection) =>
    section.columns.some((col) =>
      col.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    );

  const renderSection = (section: NavSection) => {
    const active = isActive(section);
    const opened = openMenu === section.id;

    return (
      <div key={section.id} className="shrink-0">
        <button
          ref={(el) => { anchorRefs.current[section.id].current = el; }}
          type="button"
          onClick={() => setOpenMenu(opened ? null : section.id)}
          aria-expanded={opened}
          aria-haspopup="true"
          className={cn(
            'group relative inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-[12px] text-[12px] font-semibold tracking-[0.01em] transition-all duration-200',
            active ? 'text-white shadow-lg' : 'hover:text-[#1d1d1f]/80',
          )}
          style={active ? {
            background: section.gradient,
            boxShadow: `0 4px 16px ${section.glow}, 0 1px 3px rgba(0,0,0,0.3)`,
            transform: 'translateY(-1px)',
          } : {
            background: opened ? 'rgba(220,38,38,0.06)' : 'transparent',
            color: 'rgba(0,0,0,0.5)',
          }}
        >
          <span className={cn('shrink-0 opacity-70 transition-opacity group-hover:opacity-100', active && 'opacity-90')}>
            {section.icon}
          </span>
          <span>{section.label}</span>
          <motion.span
            animate={{ rotate: opened ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="shrink-0"
            style={{ display: 'inline-flex', opacity: 0.5 }}
          >
            <ChevronDown size={10} />
          </motion.span>
          {!active && (
            <span
              className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full transition-all duration-200 group-hover:w-[60%]"
              style={{ background: section.gradient }}
            />
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes brand-glow {
          0%,100% { box-shadow: 0 0 0 0 transparent; }
          50%      { box-shadow: 0 0 20px 4px rgba(255,23,68,0.20); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 currentColor; opacity:0.8; }
          70%  { box-shadow: 0 0 0 6px currentColor; opacity:0; }
          100% { box-shadow: 0 0 0 0 currentColor; opacity:0; }
        }
        @keyframes pt-os-shimmer {
          0%   { transform: translateX(-100%); }
          18%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pt-os-glow-pulse {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%     { opacity: 1;   transform: scale(1.04); }
        }
        @keyframes header-ambient {
          0%,100% { opacity: 0.3; }
          50%     { opacity: 0.6; }
        }
        .logo-glow { animation: brand-glow 3.5s ease-in-out infinite; }
        .pill-pulse { animation: pulse-ring 2.2s cubic-bezier(0.455,0.03,0.515,0.955) infinite; }
        .header-ambient { animation: header-ambient 4s ease-in-out infinite; }

        .logo-img-clean {
          mix-blend-mode: multiply;
          filter: contrast(1.08) saturate(1.1);
        }

        .nav-scroll::-webkit-scrollbar { display: none; }
        .nav-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-[80px] opacity-40 header-ambient"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,23,68,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          zIndex: 99,
        }}
      />

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[100] transition-all duration-300',
          scrolled
            ? 'border-b border-[rgba(0,0,0,0.04)] bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl'
            : 'border-b border-[rgba(0,0,0,0.03)] bg-[rgba(255,255,255,0.85)] backdrop-blur-xl',
        )}
        style={{
          WebkitBackdropFilter: scrolled ? 'blur(32px)' : 'blur(24px)',
          boxShadow: scrolled
            ? '0 1px 0 rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)'
            : '0 1px 0 rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        <div
          ref={headerRef}
          className={cn(
            'mx-auto flex w-full max-w-[1680px] items-center px-3 transition-all duration-300 sm:px-4 lg:px-5',
            scrolled ? 'h-[56px]' : 'h-[64px]',
          )}
        >
          {/* ── Left section: hamburger + logo ── */}
          <div className="flex flex-1 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl lg:hidden"
              style={{
                background: 'var(--border)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: '#1d1d1f',
              }}
              onClick={onMenuClick}
              aria-label="Open navigation menu"
            >
              <Menu size={16} />
            </button>

            <div
              className="relative flex shrink-0 cursor-pointer items-center justify-center rounded-2xl"
              style={{
                width: scrolled ? 38 : 46,
                height: scrolled ? 38 : 46,
                background: '#f5f5f7',
                border: '1px solid rgba(0,0,0,0.06)',
                transition: 'width 0.3s, height 0.3s',
              }}
              onClick={() => router.push('/dashboard')}
              title="ABHI-DESK"
            >
              <Image
                src="/619-logo.png"
                alt="ABHI-DESK"
                width={scrolled ? 34 : 42}
                height={scrolled ? 34 : 42}
                className="logo-img-clean object-contain transition-all duration-300"
                style={{ display: 'block', filter: 'brightness(1.2) contrast(1.2)' }}
                onError={() => {
                  const el = document.getElementById('logo-fallback');
                  if (el) el.style.display = 'flex';
                }}
              />
              <span
                id="logo-fallback"
                className="absolute hidden h-full w-full items-center justify-center rounded-[14px] text-[13px] font-black text-white"
                style={{ background: 'linear-gradient(135deg,#FF1744,#b71c1c)' }}
              >
                AD
              </span>
            </div>

            <PtOsButton />

            <div className="mx-1 hidden h-7 w-px shrink-0 lg:block" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,23,68,0.15), transparent)' }} />
          </div>

          {/* ── Center nav ── */}
          <nav
            aria-label="Primary navigation"
            className="nav-scroll hidden overflow-x-auto lg:flex lg:items-center lg:justify-center"
          >
            <div className="flex items-center gap-0.5">
              {MEGA_SECTIONS.map(renderSection)}
            </div>
          </nav>

          {/* ── Right section ── */}
          <div className="flex flex-1 items-center justify-end gap-1.5">

            {/* Live pills */}
            <div className="hidden items-center gap-1.5 2xl:flex">
              {LIVE_PILLS.map((pill, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                  style={{
                    borderColor: `${pill.color}30`,
                    background: `${pill.color}0a`,
                    color: pill.color,
                  }}
                >
                  <span className="relative flex h-[6px] w-[6px] shrink-0 items-center justify-center">
                    <span className="h-[6px] w-[6px] rounded-full" style={{ background: pill.color, boxShadow: `0 0 6px ${pill.color}` }} />
                    {pill.pulse && (
                      <span
                        className="pill-pulse absolute h-[6px] w-[6px] rounded-full"
                        style={{ color: `${pill.color}50`, animationDelay: `${i * 0.6}s` }}
                      />
                    )}
                  </span>
                  {pill.label}
                </div>
              ))}
            </div>

            {/* Search bar */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
              className="hidden h-[36px] w-[200px] items-center justify-between rounded-full px-3.5 backdrop-blur-sm transition-all duration-150 2xl:inline-flex"
              style={{
                background: 'var(--border)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: 'rgba(0,0,0,0.3)',
              }}
            >
              <span className="flex items-center gap-2 text-[12px]">
                <Search size={12} className="shrink-0" />
                <span>Search anything…</span>
              </span>
              <kbd className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: 'var(--border)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  color: 'rgba(0,0,0,0.3)',
                }}
              >
                ⌘K
              </kbd>
            </button>

            {/* Mobile overflow menu — visible on <768px, hides secondary actions */}
            <div className="inline-flex md:hidden">
              <button
                type="button"
                onClick={() => setShowQuick((v) => !v)}
                className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-all"
                style={{
                  background: 'var(--border)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  color: 'rgba(0,0,0,0.4)',
                }}
                aria-label="More actions"
              >
                <MoreVertical size={14} />
              </button>
            </div>

            {/* Desktop action group — hidden on <768px */}
            <div className="hidden md:flex md:items-center md:gap-1.5">

              {/* Search icon */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
                className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-all 2xl:hidden"
                style={{
                  background: 'var(--border)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  color: 'rgba(0,0,0,0.4)',
                }}
                aria-label="Search"
              >
                <Search size={14} />
              </button>

              {/* Quick actions — PERSONAL TRAINING */}
              <div className="shrink-0">
                <button
                  ref={quickAnchorRef}
                  type="button"
                  onClick={() => setShowQuick((v) => !v)}
                  aria-expanded={showQuick}
                  className="inline-flex h-[36px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-bold text-white transition-all duration-150 hover:opacity-90 hover:shadow-lg active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg,#FF1744,#b71c1c)',
                    boxShadow: '0 4px 14px rgba(255,23,68,0.30)',
                  }}
                >
                  <Plus size={13} className="shrink-0" />
                  <span className="hidden sm:inline">PERSONAL TRAINING</span>
                </button>
              </div>

              {/* Notifications */}
              <button
                type="button"
                onClick={() => router.push('/engagement/notifications')}
                className="relative inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full backdrop-blur-sm transition-all"
                style={{
                  background: 'var(--border)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  color: 'rgba(0,0,0,0.4)',
                }}
                aria-label="Notifications"
              >
                <Bell size={14} />
                <span className="absolute right-[9px] top-[9px] h-[6px] w-[6px] rounded-full"
                  style={{ background: '#dc2626', boxShadow: '0 0 0 1.5px white' }}
                />
              </button>
            </div>

            {/* Admin profile */}
            <div className="shrink-0">
              <button
                ref={accountAnchorRef}
                type="button"
                onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
                aria-expanded={openMenu === 'account'}
                className="inline-flex h-[36px] items-center gap-2 rounded-full pl-1.5 pr-3 backdrop-blur-sm transition-all"
                style={{
                  background: 'var(--border)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full"
                  style={{
                    background: '#f5f5f7',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-[#1d1d1f]">{initials}</span>
                </div>
                <div className="hidden text-left xl:block">
                  <div className="max-w-[90px] truncate text-[11.5px] font-semibold leading-none" style={{ color: '#1d1d1f' }}>{accountLabel}</div>
                  <div className="mt-0.5 text-[10px] capitalize tracking-wide" style={{ color: '#86868b' }}>{roleLabel}</div>
                </div>
                <motion.span
                  animate={{ rotate: openMenu === 'account' ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ display: 'inline-flex', color: '#86868b' }}
                >
                  <ChevronDown size={10} />
                </motion.span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Portal-rendered Mega Menus ── */}
      <AnimatePresence mode="wait">
        {MEGA_SECTIONS.map((section) =>
          openMenu === section.id ? (
            <MegaMenuPortal
              key={section.id}
              section={section}
              anchorRef={anchorRefs.current[section.id] as React.RefObject<HTMLButtonElement | null>}
              onClose={() => setOpenMenu(null)}
              pathname={pathname}
              router={router}
            />
          ) : null
        )}
      </AnimatePresence>

      {/* ── Quick Actions Portal ── */}
      <AnimatePresence>
        {showQuick && <QuickActionsPortal anchorRef={quickAnchorRef} onClose={() => setShowQuick(false)} router={router} user={user} />}
      </AnimatePresence>

      {/* ── Account Menu Portal ── */}
      <AnimatePresence>
        {openMenu === 'account' && (
          <AccountMenuPortal
            anchorRef={accountAnchorRef}
            onClose={() => setOpenMenu(null)}
            router={router}
            logout={logout}
            initials={initials}
            accountLabel={accountLabel}
            roleLabel={roleLabel}
            pathname={pathname}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function QuickActionsPortal({
  anchorRef,
  onClose,
  router,
  user,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  user?: { role?: string } | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [anchorRef]);

  useEffect(() => {
    const handleDown = (e: MouseEvent | TouchEvent) => {
      const target = ('touches' in e ? e.touches[0]?.target : e.target) as Node | null;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) { onClose(); }
    };
    document.addEventListener('mousedown', handleDown as EventListener);
    document.addEventListener('touchstart', handleDown as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleDown as EventListener);
      document.removeEventListener('touchstart', handleDown as EventListener);
    };
  }, [onClose, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      ref={menuRef}
      variants={dropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        width: 240,
        zIndex: 9999,
        background: 'var(--bg-card)',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 20px 56px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20,
        padding: 6,
        transformOrigin: 'top right',
        willChange: 'transform, opacity',
        isolation: 'isolate',
      }}
    >
      <div className="mb-1.5 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg,#dc2626,#b91c1c)' }} />
      {['Finance', 'Coaches', 'Sales'].map((group) => (
        <div key={group}>
          <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.18em]" style={{ color: '#86868b' }}>{group}</div>
          {QUICK_ACTIONS.filter((a) => a.group === group && (!a.role || a.role === user?.role)).map((action) => (
            <button
              type="button"
              key={action.label}
              onClick={() => { router.push(action.href); onClose(); }}
              className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold transition-all"
              style={{ color: '#1d1d1f' }}
            >
              <span style={{ color: '#dc2626' }}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </motion.div>,
    document.body,
  );
}

function AccountMenuPortal({
  anchorRef, onClose, router, logout, initials, accountLabel, roleLabel, pathname,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  logout: () => void;
  initials: string;
  accountLabel: string;
  roleLabel: string;
  pathname: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [anchorRef]);

  useEffect(() => {
    const handleDown = (e: MouseEvent | TouchEvent) => {
      const target = ('touches' in e ? e.touches[0]?.target : e.target) as Node | null;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        anchorRef.current && !anchorRef.current.contains(target)
      ) { onClose(); }
    };
    document.addEventListener('mousedown', handleDown as EventListener);
    document.addEventListener('touchstart', handleDown as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleDown as EventListener);
      document.removeEventListener('touchstart', handleDown as EventListener);
    };
  }, [onClose, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      ref={menuRef}
      variants={dropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        width: 220,
        zIndex: 9999,
        background: 'var(--bg-card)',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 18,
        padding: 6,
        transformOrigin: 'top right',
        willChange: 'transform, opacity',
        isolation: 'isolate',
      }}
    >
      <div
        className="mb-1.5 flex items-center gap-3 rounded-[14px] p-3"
        style={{ background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.04)' }}
      >
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[11px] font-black"
          style={{
            background: '#e8e8ed',
            border: '1px solid rgba(0,0,0,0.04)',
            color: '#1d1d1f',
          }}
        >
          {initials}
        </div>
        <div>
          <div className="text-[13px] font-bold" style={{ color: '#1d1d1f' }}>{accountLabel}</div>
          <div className="text-[11px] capitalize" style={{ color: '#86868b' }}>{roleLabel}</div>
        </div>
      </div>

      {([
        { href: '/profile',          icon: <Users size={13} />,        label: 'My Profile'        },
        { href: '/settings',         icon: <Settings size={13} />,     label: 'Studio Settings'   },
        { href: '/settings/staff',   icon: <Users size={13} />,        label: 'Team Management'   },
        { href: '/settings/billing', icon: <IndianRupee size={13} />,  label: 'Billing'           },
        { href: '/settings/branding',icon: <Palette size={13} />,     label: 'Branding'          },
      ] as const).map((item) => {
        const isActive = pathname === item.href;
        return (
          <button
            type="button"
            key={item.label}
            onClick={() => { if (!isActive) { router.push(item.href); onClose(); } }}
            className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all ${
              isActive ? '' : ''
            }`}
            style={{
              color: isActive ? '#dc2626' : '#1d1d1f',
              background: isActive ? 'var(--border)' : 'transparent',
            }}
          >
            <span style={{ color: isActive ? '#dc2626' : '#86868b' }}>{item.icon}</span>
            {item.label}
            {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#dc2626]" />}
          </button>
        );
      })}

      <div className="my-1 h-px" style={{ background: 'var(--border)' }} />

      <button
        type="button"
        onClick={() => { logout(); onClose(); }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all"
        style={{ color: '#1d1d1f' }}
      >
        <span style={{ color: '#86868b' }}><LogOut size={13} /></span>
        Sign Out
      </button>
    </motion.div>,
    document.body,
  );
}
