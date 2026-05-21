'use client';

import { useEffect, useMemo, useRef, useState, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { DASHBOARD_ITEM, NAV_GROUPS, SETTINGS_GROUP, isVisibleForRole } from '@/lib/nav-config';
import {
  Menu, Moon, Sun, Bell, ChevronDown, KeyRound, LogOut, Search,
  Plus, UserPlus, Dumbbell, FileText, CreditCard, UserCheck,
  CalendarPlus, ClipboardList, Salad, Zap, X, Check,
  LayoutDashboard, TrendingUp, Users, Activity, Settings, BarChart2,
  IndianRupee, Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { cn } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props { onMenuClick?: () => void; }

interface MegaItem { label: string; href: string; description?: string; isNew?: boolean; icon?: React.ReactNode; }
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

// ─── Mega Menu Config ─────────────────────────────────────────────────────────
const MEGA_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={13} />,
    accent: '#7c3aed',
    glow: 'rgba(124,58,237,0.18)',
    gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
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
    spotlight: { title: 'Today', value: '—', sub: 'Members active', accent: '#7c3aed' },
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: <TrendingUp size={13} />,
    accent: '#0369a1',
    glow: 'rgba(3,105,161,0.18)',
    gradient: 'linear-gradient(135deg,#0369a1,#0891b2)',
    columns: [
      { heading: 'Pipeline', items: [
        { label: 'Leads', href: '/sales/leads', description: 'Prospective members' },
        { label: 'Enquiries', href: '/sales/enquiry', description: 'Inbound interest' },
        { label: 'Membership Sales', href: '/memberships/subscriptions', description: 'Plan conversions' },
        { label: 'PT Sales', href: '/pt-portal', description: 'Personal training deals' },
      ]},
      { heading: 'Finance', items: [
        { label: 'POS', href: '/payments', description: 'Point of sale' },
        { label: 'Payments', href: '/payments', description: 'Transaction ledger' },
        { label: 'Invoices', href: '/finance/collection', description: 'Billing records' },
        { label: 'Promotions', href: '/engagement/offers', description: 'Offers & discounts' },
      ]},
    ],
    spotlight: { title: 'This Month', value: '—', sub: 'Revenue collected', accent: '#0369a1' },
  },
  {
    id: 'members',
    label: 'Members',
    icon: <Users size={13} />,
    accent: '#0f766e',
    glow: 'rgba(15,118,110,0.18)',
    gradient: 'linear-gradient(135deg,#0f766e,#059669)',
    columns: [
      { heading: 'Roster', items: [
        { label: 'All Members', href: '/clients', description: 'Complete member list' },
        { label: 'Attendance', href: '/attendance', description: 'Daily log' },
        { label: 'Check-ins', href: '/checkin', description: 'Live check-in system' },
        { label: 'Member Profiles', href: '/clients', description: 'Individual detail' },
      ]},
      { heading: 'Health & Retention', items: [
        { label: 'Body Metrics', href: '/clients', description: 'Measurements & progress' },
        { label: 'Transformations', href: '/training/transformations', description: 'Before & after' },
        { label: 'Retention', href: '/insights/renewal', description: 'Churn prevention' },
      ]},
    ],
    spotlight: { title: 'Active Members', value: '—', sub: 'Valid subscriptions', accent: '#0f766e' },
  },
  {
    id: 'training',
    label: 'Training',
    icon: <Dumbbell size={13} />,
    accent: '#b45309',
    glow: 'rgba(180,83,9,0.18)',
    gradient: 'linear-gradient(135deg,#b45309,#d97706)',
    columns: [
      { heading: 'Clients & Plans', items: [
        { label: 'PT Portal', href: '/pt-portal', description: 'Active PT members' },
        { label: 'Workout Plans', href: '/training/transformations', description: 'Custom programs' },
        { label: 'Diet Plans', href: '/training/transformations', description: 'Nutrition programs' },
        { label: 'Progress Tracking', href: '/training/transformations', description: 'Performance data' },
      ]},
      { heading: 'Scheduling & Revenue', items: [
        { label: 'Session Scheduling', href: '/appointments', description: 'Book PT sessions' },
        { label: 'Trainer Assignments', href: '/trainers', description: 'Client-trainer match' },
        { label: 'PT Revenue', href: '/finance/trainer-revenue', description: 'Earnings report' },
      ]},
    ],
    spotlight: { title: 'PT Sessions Today', value: '—', sub: 'Scheduled sessions', accent: '#b45309' },
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: <Activity size={13} />,
    accent: '#be185d',
    glow: 'rgba(190,24,93,0.18)',
    gradient: 'linear-gradient(135deg,#be185d,#db2777)',
    columns: [
      { heading: 'Staff & Trainers', items: [
        { label: 'Staff', href: '/staff', description: 'HR management' },
        { label: 'Trainers', href: '/trainers', description: 'Trainer roster' },
        { label: 'Attendance', href: '/attendance/staff', description: 'Staff log' },
        { label: 'Class Scheduling', href: '/appointments', description: 'Group sessions' },
      ]},
      { heading: 'Facility', items: [
        { label: 'Equipment', href: '/settings', description: 'Asset inventory' },
        { label: 'Maintenance', href: '/settings', description: 'Work orders' },
        { label: 'Access Control', href: '/settings/biometric', description: 'Entry system' },
        { label: 'Branches', href: '/settings/branches', description: 'Multi-location' },
      ]},
    ],
    spotlight: { title: 'Staff On Duty', value: '—', sub: 'Currently present', accent: '#be185d' },
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <IndianRupee size={13} />,
    accent: '#1d4ed8',
    glow: 'rgba(29,78,216,0.18)',
    gradient: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
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
    spotlight: { title: 'Outstanding Dues', value: '—', sub: 'Pending collection', accent: '#1d4ed8' },
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart2 size={13} />,
    accent: '#0d9488',
    glow: 'rgba(13,148,136,0.18)',
    gradient: 'linear-gradient(135deg,#0d9488,#06b6d4)',
    columns: [
      { heading: 'Performance', items: [
        { label: 'Revenue Analytics', href: '/insights/traffic', description: 'Income trends' },
        { label: 'Retention', href: '/insights/renewal', description: 'Member lifecycle' },
        { label: 'Churn Analysis', href: '/insights/renewal', description: 'Drop-off patterns' },
        { label: 'Attendance Analytics', href: '/insights/traffic', description: 'Foot traffic data' },
      ]},
      { heading: 'Intelligence', items: [
        { label: 'Trainer Performance', href: '/insights/sessions', description: 'Coaching metrics' },
        { label: 'Branch Performance', href: '/settings/branches', description: 'Location comparison' },
        { label: 'AI Insights', href: '/dashboard/ai-insights', description: 'Smart patterns', isNew: true },
        { label: 'Forecasting', href: '/finance/forecast', description: 'Future projections' },
      ]},
    ],
    spotlight: { title: 'Retention Rate', value: '—', sub: 'Last 30 days', accent: '#0d9488' },
  },
];

const QUICK_ACTIONS = [
  { label: 'Add Member', href: '/clients/new', icon: <UserPlus size={14} />, group: 'Members' },
  { label: 'New PT Client', href: '/clients/new', icon: <Dumbbell size={14} />, group: 'Training' },
  { label: 'Create Invoice', href: '/payments', icon: <FileText size={14} />, group: 'Finance' },
  { label: 'Record Payment', href: '/payments', icon: <CreditCard size={14} />, group: 'Finance' },
  { label: 'Add Lead', href: '/sales/enquiry', icon: <UserCheck size={14} />, group: 'Sales' },
  { label: 'Schedule Session', href: '/appointments', icon: <CalendarPlus size={14} />, group: 'Training' },
  { label: 'Workout Plan', href: '/pt-portal', icon: <ClipboardList size={14} />, group: 'Training' },
  { label: 'Diet Plan', href: '/pt-portal', icon: <Salad size={14} />, group: 'Training' },
];

const LIVE_PILLS = [
  { label: 'Studio Live', color: '#10b981', pulse: true },
  { label: 'AI Active', color: '#8b5cf6', pulse: true },
  { label: 'Sync', color: '#3b82f6', pulse: false },
];

// ─── Framer Motion variants ───────────────────────────────────────────────────
const megaVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -8,
    scale: 0.975,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 420,
      damping: 30,
      mass: 0.6,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.982,
    filter: 'blur(2px)',
    transition: {
      duration: 0.14,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

const dropVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.975 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 440, damping: 28, mass: 0.5 },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.985,
    transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

// ─── Portal-rendered Mega Menu ────────────────────────────────────────────────
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!anchorRef.current) return;

    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX,
        width: section.spotlight ? 640 : 480,
      });
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
    const handleDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [onClose, anchorRef]);

  if (!mounted) return null;

  const menuWidth = section.spotlight ? 640 : 480;

  const safeLeft = Math.min(
    pos.left,
    typeof window !== 'undefined' ? window.innerWidth - menuWidth - 16 : pos.left,
  );

  return createPortal(
    <motion.div
      ref={menuRef}
      key={section.id}
      variants={megaVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'absolute',
        top: pos.top,
        left: safeLeft,
        width: menuWidth,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: `0 32px 80px rgba(15,23,42,0.14), 0 12px 32px ${section.glow}, inset 0 1px 0 rgba(255,255,255,0.9)`,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
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
                  style={{ color: section.accent }}
                >
                  {col.heading}
                </div>
              )}
              {col.items.map((item) => {
                const ia = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => { router.push(item.href); onClose(); }}
                    className={cn(
                      'group/item flex w-full items-start gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-all duration-150',
                      ia ? 'font-semibold' : 'hover:bg-slate-50/80',
                    )}
                    style={ia ? { background: section.glow.replace('0.18', '0.10') } : {}}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-[12px] font-bold transition-all',
                        ia
                          ? 'border-violet-200 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-white text-slate-400 group-hover/item:border-violet-100 group-hover/item:bg-violet-50/50 group-hover/item:text-violet-500',
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold" style={{ color: ia ? 'var(--text-primary, #0f172a)' : undefined }}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div className="mt-0.5 truncate text-[11px] text-slate-400">{item.description}</div>
                      )}
                    </div>
                    {ia && <Check size={12} className="mt-2 shrink-0 text-violet-500" />}
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
              background: `linear-gradient(145deg, ${section.glow.replace('0.18', '0.10')}, ${section.glow.replace('0.18', '0.04')})`,
              border: `1px solid ${section.glow.replace('0.18', '0.20')}`,
            }}
          >
            <div
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: section.accent }}
            >
              {section.spotlight.title}
            </div>
            <div>
              <div className="text-[28px] font-black leading-none" style={{ color: section.accent }}>
                {section.spotlight.value}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{section.spotlight.sub}</div>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-[10px] py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: section.gradient }}
              onClick={() => { router.push(section.columns[0].items[0].href); onClose(); }}
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function PremiumHeader({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hydrated, setHydrated] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  const anchorRefs = useRef<Record<string, React.RefObject<HTMLButtonElement | null>>>({});
  MEGA_SECTIONS.forEach((s) => {
    if (!anchorRefs.current[s.id]) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      anchorRefs.current[s.id] = { current: null };
    }
  });
  const quickAnchorRef = useRef<HTMLButtonElement | null>(null);
  const accountAnchorRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('619_theme') as 'light' | 'dark') ?? 'light';
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

  const accountLabel = user?.name || '619 FITNESS STUDIO';
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
            active
              ? 'text-white shadow-lg'
              : 'text-slate-500 hover:text-slate-900',
          )}
          style={active ? {
            background: section.gradient,
            boxShadow: `0 4px 16px ${section.glow}, 0 1px 3px rgba(0,0,0,0.1)`,
            transform: 'translateY(-1px)',
          } : {
            background: opened ? section.glow.replace('0.18', '0.09') : 'transparent',
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
          50%      { box-shadow: 0 0 14px 2px rgba(220,38,38,0.22); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 currentColor; opacity:0.8; }
          70%  { box-shadow: 0 0 0 5px currentColor; opacity:0; }
          100% { box-shadow: 0 0 0 0 currentColor; opacity:0; }
        }
        .logo-glow { animation: brand-glow 3.5s ease-in-out infinite; }
        .pill-pulse { animation: pulse-ring 2.2s cubic-bezier(0.455,0.03,0.515,0.955) infinite; }
        .logo-img-clean { mix-blend-mode: multiply; filter: contrast(1.08) saturate(1.1); }
        .logo-img-avatar { mix-blend-mode: multiply; filter: contrast(1.05); }

        /* Nav focus ring — keyboard users see a clear indicator */
        .nav-btn:focus-visible {
          outline: 2px solid #7c3aed;
          outline-offset: 2px;
          border-radius: 9999px;
        }
        /* Prevent iOS tap highlight */
        .nav-btn { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[100] transition-all duration-300',
          scrolled
            ? 'border-b border-slate-200/60 bg-white/[0.97] backdrop-blur-2xl'
            : 'border-b border-slate-100/80 bg-white/[0.92] backdrop-blur-xl',
        )}
        style={{
          WebkitBackdropFilter: scrolled ? 'blur(28px)' : 'blur(20px)',
          boxShadow: scrolled
            ? '0 1px 0 rgba(15,23,42,0.07), 0 8px 32px rgba(15,23,42,0.05)'
            : '0 1px 0 rgba(15,23,42,0.04), 0 4px 20px rgba(15,23,42,0.03)',
        }}
      >
        {/*
          3-column CSS grid: [shrink-to-fit | fill remaining | shrink-to-fit]
          Guarantees left ↔ center ↔ right never overlap at any viewport width.
        */}
        <div
          ref={headerRef}
          className={cn(
            'mx-auto grid w-full max-w-[1680px] grid-cols-[auto_1fr_auto] items-center gap-x-2 px-3 transition-[height] duration-300 sm:px-4 lg:px-5',
            scrolled ? 'h-[56px]' : 'h-[64px]',
          )}
        >

          {/* ── Col 1: brand ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            {/* Mobile / tablet hamburger */}
            <button
              type="button"
              className="nav-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md lg:hidden"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
              aria-haspopup="true"
            >
              <Menu size={16} />
            </button>

            {/* Brand logo — clickable, keyboard-accessible */}
            <button
              type="button"
              className="logo-glow nav-btn relative flex shrink-0 items-center justify-center rounded-[14px] bg-white transition-[width,height] duration-300"
              style={{ width: scrolled ? 38 : 46, height: scrolled ? 38 : 46 }}
              onClick={() => router.push('/dashboard')}
              aria-label="619 Fitness Studio — go to dashboard"
            >
              <Image
                src="/619-logo.png"
                alt=""
                aria-hidden="true"
                width={scrolled ? 32 : 40}
                height={scrolled ? 32 : 40}
                className="logo-img-clean object-contain"
                style={{ display: 'block' }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 hidden items-center justify-center rounded-[14px] text-[13px] font-black text-white"
                style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}
              >
                619
              </span>
            </button>

            {/* Visual separator — desktop only */}
            <div aria-hidden="true" className="mx-0.5 hidden h-7 w-px shrink-0 bg-gradient-to-b from-transparent via-slate-200/70 to-transparent lg:block" />
          </div>

          {/* ── Col 2: primary nav (desktop) ──────────────────────────────── */}
          <nav
            aria-label="Primary navigation"
            className="hidden min-w-0 lg:flex lg:items-center lg:justify-center"
          >
            {/*
              flex-wrap is intentionally off — items shrink-to-fit via px compression.
              Gap-0.5 keeps items tight on 1024-1280 px viewports.
            */}
            <div className="flex items-center gap-0.5 overflow-hidden">
              {MEGA_SECTIONS.map(renderSection)}
            </div>
          </nav>

          {/* ── Col 3: actions ────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-1">

            {/* Live-status pills — only on very wide screens to avoid crowding */}
            <div aria-hidden="true" className="hidden items-center gap-1.5 xl:flex 2xl:flex">
              {LIVE_PILLS.map((pill, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold xl:gap-1.5 xl:px-2.5 xl:py-1 xl:text-[10.5px]"
                  style={{ borderColor: `${pill.color}30`, background: `${pill.color}0a`, color: pill.color }}
                >
                  <span className="relative flex h-[5px] w-[5px] shrink-0">
                    <span className="h-full w-full rounded-full" style={{ background: pill.color }} />
                    {pill.pulse && (
                      <span
                        className="pill-pulse absolute inset-0 rounded-full"
                        style={{ color: `${pill.color}50`, animationDelay: `${i * 0.6}s` }}
                      />
                    )}
                  </span>
                  <span className="hidden 2xl:inline">{pill.label}</span>
                </div>
              ))}
            </div>

            {/* Search — wide bar on xl+, icon-button below xl */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
              aria-label="Search"
              className="nav-btn hidden h-[34px] w-[180px] items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-3 backdrop-blur-sm transition-all duration-150 hover:border-violet-300/60 hover:bg-white hover:shadow-[0_2px_16px_rgba(124,58,237,0.10)] xl:inline-flex 2xl:w-[200px] 2xl:px-3.5"
            >
              <span className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
                <Search size={11} className="shrink-0" />
                <span>Search…</span>
              </span>
              <kbd className="rounded border border-slate-200 bg-white/90 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-400 shadow-[0_1px_0_rgba(15,23,42,0.06)]">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
              aria-label="Search"
              className="nav-btn inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 backdrop-blur-sm transition-all hover:border-violet-200 hover:text-violet-600 xl:hidden"
            >
              <Search size={14} />
            </button>

            {/* Quick-add */}
            <button
              ref={quickAnchorRef}
              type="button"
              onClick={() => setShowQuick((v) => !v)}
              aria-expanded={showQuick}
              aria-haspopup="true"
              aria-label="Quick add"
              className="nav-btn inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold text-white transition-all duration-150 hover:opacity-90 hover:shadow-lg active:scale-[0.97] sm:px-3.5 sm:text-[12.5px]"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 14px rgba(124,58,237,0.28)' }}
            >
              <Plus size={13} className="shrink-0" />
              <span className="hidden sm:inline">New</span>
            </button>

            {/* Theme toggle — hidden on mobile to save space */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="nav-btn hidden h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 backdrop-blur-sm transition-all hover:border-violet-200 hover:text-violet-600 sm:inline-flex"
            >
              {hydrated ? (theme === 'light' ? <Moon size={14} /> : <Sun size={14} />) : <span style={{ width: 14 }} />}
            </button>

            {/* Notifications */}
            <button
              type="button"
              aria-label="Notifications"
              className="nav-btn relative inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 backdrop-blur-sm transition-all hover:border-rose-200 hover:text-rose-500"
            >
              <Bell size={14} />
              <span aria-hidden="true" className="absolute right-[9px] top-[9px] h-[5px] w-[5px] rounded-full bg-rose-500 ring-[1.5px] ring-white" />
            </button>

            {/* Account / profile */}
            <button
              ref={accountAnchorRef}
              type="button"
              onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
              aria-expanded={openMenu === 'account'}
              aria-haspopup="true"
              aria-label="Account menu"
              className="nav-btn inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 pl-1 pr-2 backdrop-blur-sm transition-all hover:border-violet-200 hover:shadow-[0_2px_10px_rgba(124,58,237,0.10)] sm:gap-2 sm:pl-1.5 sm:pr-3"
            >
              <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white sm:h-[26px] sm:w-[26px]">
                <Image
                  src="/619-logo.png"
                  alt=""
                  aria-hidden="true"
                  width={26}
                  height={26}
                  className="logo-img-avatar h-full w-full object-contain"
                />
              </div>
              {/* Label — only at 1280px+ to avoid crowding at 1024-1280px */}
              <div className="hidden min-w-0 text-left xl:block">
                <div className="max-w-[80px] truncate text-[11px] font-bold leading-none text-slate-900">{accountLabel}</div>
                <div className="mt-0.5 text-[9.5px] capitalize tracking-wide text-slate-400">{roleLabel}</div>
              </div>
              <motion.span
                animate={{ rotate: openMenu === 'account' ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                aria-hidden="true"
                style={{ display: 'inline-flex', color: 'rgb(148 163 184)' }}
              >
                <ChevronDown size={10} />
              </motion.span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Portal-rendered Mega Menus ─────────────────────────────────────── */}
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

      {/* ── Quick Actions Portal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showQuick && <QuickActionsPortal anchorRef={quickAnchorRef} onClose={() => setShowQuick(false)} router={router} />}
      </AnimatePresence>

      {/* ── Account Menu Portal ────────────────────────────────────────────── */}
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
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Quick Actions Portal ─────────────────────────────────────────────────────
function QuickActionsPortal({
  anchorRef,
  onClose,
  router,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right - window.scrollX,
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [anchorRef]);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) { onClose(); }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
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
        position: 'absolute',
        top: pos.top,
        right: pos.right,
        width: 240,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid rgba(124,58,237,0.12)',
        boxShadow: '0 20px 56px rgba(15,23,42,0.12), 0 4px 16px rgba(124,58,237,0.10)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 20,
        padding: 6,
        transformOrigin: 'top right',
        willChange: 'transform, opacity',
        isolation: 'isolate',
      }}
    >
      <div className="mb-1.5 h-[3px] rounded-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#4f46e5)' }} />
      {['Members', 'Finance', 'Training', 'Sales'].map((group) => (
        <div key={group}>
          <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">{group}</div>
          {QUICK_ACTIONS.filter((a) => a.group === group).map((action) => (
            <button
              type="button"
          key={action.label}
          onClick={() => { router.push(action.href); onClose(); }}
              className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold text-slate-700 transition-all hover:bg-violet-50 hover:text-violet-700"
            >
              <span className="text-violet-500">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </motion.div>,
    document.body,
  );
}

// ─── Account Menu Portal ──────────────────────────────────────────────────────
function AccountMenuPortal({
  anchorRef, onClose, router, logout, initials, accountLabel, roleLabel,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
  logout: () => void;
  initials: string;
  accountLabel: string;
  roleLabel: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right - window.scrollX,
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [anchorRef]);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) { onClose(); }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
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
        position: 'absolute',
        top: pos.top,
        right: pos.right,
        width: 220,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 18,
        padding: 6,
        transformOrigin: 'top right',
        willChange: 'transform, opacity',
        isolation: 'isolate',
      }}
    >
      <div className="mb-1.5 flex items-center gap-3 rounded-[14px] bg-gradient-to-br from-slate-50 to-slate-100 p-3">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
          <Image
            src="/619-logo.png"
            alt="619"
            width={36}
            height={36}
            className="logo-img-avatar h-full w-full object-contain"
          />
        </div>
        <div>
          <div className="text-[13px] font-bold text-slate-900">{accountLabel}</div>
          <div className="text-[11px] capitalize text-slate-500">{roleLabel}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { router.push('/pt-os/dashboard'); onClose(); }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all hover:bg-white/70"
        style={{ color: 'var(--accent)' }}
      >
        <Sparkles size={13} style={{ color: 'var(--accent)' }} />
        PT Operating System
        <span className="ml-auto rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">NEW</span>
      </button>

      <div className="mx-2 my-1 h-px bg-slate-100" />

      {([
        { href: '/settings', icon: <Settings size={13} />, label: 'My Profile' },
        { href: '/settings', icon: <Settings size={13} />, label: 'Studio Settings' },
        { href: '/settings/staff', icon: <Users size={13} />, label: 'Team Management' },
        { href: '/settings/billing', icon: <IndianRupee size={13} />, label: 'Billing' },
        { href: '/settings/branding', icon: <Zap size={13} />, label: 'Branding' },
      ] as const).map((item) => (
        <button
          type="button"
          key={item.label}
          onClick={() => { router.push(item.href); onClose(); }}
          className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-50"
        >
          <span className="text-slate-400">{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className="mx-2 my-1 h-px bg-slate-100" />

      <button
        type="button"
        onClick={() => { router.push('/reset-password'); onClose(); }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-50"
      >
        <KeyRound size={13} className="text-slate-400" />
        Reset Password
      </button>
      <button
        type="button"
        onClick={() => { logout(); router.push('/login'); }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-50"
      >
        <LogOut size={13} />
        Log Out
      </button>
    </motion.div>,
    document.body,
  );
}
