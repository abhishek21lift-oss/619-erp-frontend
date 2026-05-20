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
  IndianRupee,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/components/ui';

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

const MEGA_SECTIONS: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={12} />,
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
    icon: <TrendingUp size={12} />,
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
    icon: <Users size={12} />,
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
    icon: <Dumbbell size={12} />,
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
    icon: <Activity size={12} />,
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
    icon: <IndianRupee size={12} />,
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
    icon: <BarChart2 size={12} />,
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

const megaVariants = {
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

const dropVariants = {
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
      ) { onClose(); }
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
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(255,255,255,0.65)',
        boxShadow: `0 32px 80px rgba(15,23,42,0.12), 0 12px 32px ${section.glow}, inset 0 1px 0 rgba(255,255,255,0.90)`,
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
                  style={{ color: section.accent, opacity: 0.8 }}
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
                      ia ? 'font-semibold' : 'hover:bg-white/70',
                    )}
                    style={ia ? { background: section.glow.replace('0.18', '0.10') } : {}}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-[12px] font-bold transition-all',
                        ia
                          ? 'border-violet-200 bg-violet-50 text-violet-600'
                          : 'border-white/60 bg-white/80 text-slate-400 group-hover/item:border-violet-100 group-hover/item:bg-violet-50/50 group-hover/item:text-violet-500 backdrop-blur-sm',
                      )}
                    >
                      {item.icon || <span className="text-[11px] font-bold opacity-60">{item.label[0]}</span>}
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
              backdropFilter: 'blur(8px)',
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
              className="mt-3 w-full rounded-[10px] py-2 text-[11px] font-bold text-white transition-all hover:opacity-90 hover:shadow-lg"
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
            'glass-nav-pill',
            active && 'glass-nav-pill-active',
          )}
        >
          <span className={cn('shrink-0', active ? 'opacity-100' : 'opacity-60 transition-opacity group-hover:opacity-90')}>
            {section.icon}
          </span>
          <span>{section.label}</span>
          <motion.span
            animate={{ rotate: opened ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="shrink-0"
            style={{ display: 'inline-flex', opacity: 0.4 }}
          >
            <ChevronDown size={10} />
          </motion.span>
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
        @keyframes glass-shine {
          0% { background-position: 200% 50%; }
          100% { background-position: -200% 50%; }
        }
        .logo-glow { animation: brand-glow 3.5s ease-in-out infinite; }
        .pill-pulse { animation: pulse-ring 2.2s cubic-bezier(0.455,0.03,0.515,0.955) infinite; }
        .logo-img-clean {
          mix-blend-mode: multiply;
          filter: contrast(1.08) saturate(1.1);
        }
        .logo-img-avatar {
          mix-blend-mode: multiply;
          filter: contrast(1.05);
        }
        .nav-scroll::-webkit-scrollbar { display: none; }
        .nav-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        .glass-edge {
          position: relative;
        }
        .glass-edge::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.30) 40%, rgba(255,255,255,0.10) 70%, transparent 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .glass-edge-dark::before {
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, transparent 70%, transparent 100%);
        }
      `}</style>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[100] transition-all duration-500',
          scrolled
            ? 'h-[58px]'
            : 'h-[66px]',
        )}
        style={{
          background: scrolled
            ? 'rgba(255,255,255,0.78)'
            : 'rgba(255,255,255,0.55)',
          backdropFilter: scrolled ? 'blur(32px) saturate(160%)' : 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: scrolled ? 'blur(32px) saturate(160%)' : 'blur(20px) saturate(140%)',
          borderBottom: scrolled
            ? '1px solid rgba(255,255,255,0.50)'
            : '1px solid rgba(255,255,255,0.25)',
          boxShadow: scrolled
            ? '0 1px 0 rgba(15,23,42,0.05), 0 8px 32px rgba(15,23,42,0.06)'
            : '0 1px 0 rgba(15,23,42,0.02), 0 4px 20px rgba(15,23,42,0.03)',
        }}
      >
        <div
          ref={headerRef}
          className={cn(
            'mx-auto flex w-full max-w-[1680px] items-center px-3 transition-all duration-500 sm:px-4 lg:px-5',
            scrolled ? 'h-[58px]' : 'h-[66px]',
          )}
        >
          {/* ── Left section: hamburger + brand ──────────────────────── */}
          <div className="flex flex-1 items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl glass-btn lg:hidden"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
            >
              <Menu size={15} />
            </button>

            {/* Brand logo + text */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
              <div
                className="logo-glow relative flex shrink-0 items-center justify-center rounded-[14px] overflow-hidden"
                style={{
                  width: scrolled ? 36 : 44,
                  height: scrolled ? 36 : 44,
                  background: 'rgba(255,255,255,0.90)',
                  border: '1px solid rgba(255,255,255,0.60)',
                  boxShadow: '0 2px 12px rgba(220,38,38,0.15), 0 1px 3px rgba(15,23,42,0.06)',
                  transition: 'width 0.4s, height 0.4s',
                }}
                title="619 Fitness Studio"
              >
                <Image
                  src="/619-logo.png"
                  alt="619 Fitness Studio"
                  width={scrolled ? 32 : 40}
                  height={scrolled ? 32 : 40}
                  className="logo-img-clean object-contain transition-all duration-400"
                  style={{ display: 'block' }}
                  onError={() => {
                    const el = document.getElementById('logo-fallback');
                    if (el) el.style.display = 'flex';
                  }}
                />
                <span
                  id="logo-fallback"
                  className="absolute hidden h-full w-full items-center justify-center rounded-[14px] text-[13px] font-black text-white"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}
                >
                  619
                </span>
              </div>

              <div className="hidden lg:block" style={{ marginLeft: 2 }}>
                <div className="text-[13px] font-extrabold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                  619 FITNESS STUDIO
                </div>
                <div className="mt-[3px] text-[9.5px] font-semibold tracking-[0.22em] uppercase" style={{ color: 'var(--text-muted)', opacity: 0.75 }}>
                  Management OS
                </div>
              </div>
            </div>

            <div className="glass-divider hidden lg:block" style={{ marginLeft: 2 }} />
          </div>

          {/* ── Center nav ───────────────────────────────────────────── */}
          <nav
            aria-label="Primary navigation"
            className="nav-scroll hidden overflow-x-auto lg:flex lg:items-center lg:justify-center"
          >
            <div className="flex items-center gap-0.5">
              {MEGA_SECTIONS.map(renderSection)}
            </div>
          </nav>

          {/* ── Right section ────────────────────────────────────────── */}
          <div className="flex flex-1 items-center justify-end gap-1.5">

            {/* Live pills */}
            <div className="hidden items-center gap-1.5 2xl:flex">
              {LIVE_PILLS.map((pill, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    background: `${pill.color}0d`,
                    border: `1px solid ${pill.color}25`,
                    color: pill.color,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="relative flex h-[5px] w-[5px] shrink-0 items-center justify-center">
                    <span className="h-[5px] w-[5px] rounded-full" style={{ background: pill.color }} />
                    {pill.pulse && (
                      <span
                        className="pill-pulse absolute h-[5px] w-[5px] rounded-full"
                        style={{ color: `${pill.color}40`, animationDelay: `${i * 0.6}s` }}
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
              className="hidden h-[34px] w-[180px] items-center justify-between rounded-full glass-btn px-3 2xl:inline-flex"
            >
              <span className="flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                <Search size={11} className="shrink-0" />
                <span>Search anything…</span>
              </span>
              <kbd className="rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold" style={{ background: 'rgba(255,255,255,0.70)', borderColor: 'rgba(255,255,255,0.40)', color: 'var(--text-muted)' }}>
                ⌘K
              </kbd>
            </button>

            {/* Search icon (mobile) */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('619-cmd-palette'))}
              className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full glass-btn 2xl:hidden"
              aria-label="Search"
            >
              <Search size={13} />
            </button>

            {/* Quick actions New button */}
            <div className="shrink-0">
              <button
                ref={quickAnchorRef}
                type="button"
                onClick={() => setShowQuick((v) => !v)}
                aria-expanded={showQuick}
                className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold text-white transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                  boxShadow: '0 4px 14px rgba(124,58,237,0.30), inset 0 1px 0 rgba(255,255,255,0.20)',
                }}
              >
                <Plus size={12} className="shrink-0" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full glass-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {hydrated ? (
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
                </motion.span>
              ) : <span style={{ width: 13 }} />}
            </button>

            {/* Notifications */}
            <button
              type="button"
              className="relative inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full glass-btn"
              aria-label="Notifications"
            >
              <Bell size={13} />
              <span className="absolute right-[8px] top-[8px] h-[5px] w-[5px] rounded-full bg-rose-500" style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.90)' }} />
            </button>

            {/* Profile */}
            <div className="shrink-0">
              <button
                ref={accountAnchorRef}
                type="button"
                onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
                aria-expanded={openMenu === 'account'}
                className="inline-flex h-[34px] items-center gap-2 rounded-full glass-btn pl-1 pr-3"
              >
                <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.90)', border: '1px solid rgba(255,255,255,0.40)' }}>
                  <Image
                    src="/619-logo.png"
                    alt="Profile"
                    width={22}
                    height={22}
                    className="logo-img-avatar object-contain"
                    style={{ display: 'block' }}
                  />
                </div>
                <div className="hidden text-left xl:block">
                  <div className="max-w-[90px] truncate text-[11px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{accountLabel}</div>
                  <div className="mt-0.5 text-[9.5px] capitalize tracking-wide" style={{ color: 'var(--text-muted)' }}>{roleLabel}</div>
                </div>
                <motion.span
                  animate={{ rotate: openMenu === 'account' ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ display: 'inline-flex', color: 'var(--text-muted)' }}
                >
                  <ChevronDown size={10} />
                </motion.span>
              </button>
            </div>
          </div>
        </div>
      </header>

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

      <AnimatePresence>
        {showQuick && <QuickActionsPortal anchorRef={quickAnchorRef} onClose={() => setShowQuick(false)} router={router} />}
      </AnimatePresence>

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

function QuickActionsPortal({
  anchorRef, onClose, router,
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
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(255,255,255,0.60)',
        boxShadow: '0 20px 56px rgba(15,23,42,0.10), 0 4px 16px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.85)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
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
          <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{group}</div>
          {QUICK_ACTIONS.filter((a) => a.group === group).map((action) => (
            <button
              type="button"
              key={action.label}
              onClick={() => { router.push(action.href); onClose(); }}
              className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left text-[13px] font-semibold transition-all hover:bg-violet-50/80 hover:text-violet-700"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span style={{ color: '#7c3aed' }}>{action.icon}</span>
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
        width: 228,
        zIndex: 9999,
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(255,255,255,0.60)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderRadius: 18,
        padding: 6,
        transformOrigin: 'top right',
        willChange: 'transform, opacity',
        isolation: 'isolate',
      }}
    >
      <div className="mb-1.5 flex items-center gap-3 rounded-[14px] p-3" style={{ background: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.35)' }}>
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.90)', border: '1px solid rgba(255,255,255,0.40)' }}>
          <Image
            src="/619-logo.png"
            alt="Profile"
            width={32}
            height={32}
            className="logo-img-avatar object-contain"
            style={{ display: 'block' }}
          />
        </div>
        <div>
          <div className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{accountLabel}</div>
          <div className="text-[11px] capitalize" style={{ color: 'var(--text-muted)' }}>{roleLabel}</div>
        </div>
      </div>

      {([
        { href: '/settings', icon: <Settings size={13} />, label: 'My Profile' },
        { href: '/settings', icon: <Settings size={13} />, label: 'Studio Settings' },
        { href: '/settings/staff', icon: <Users size={13} />, label: 'Team Management' },
        { href: '/settings/billing', icon: <IndianRupee size={13} />, label: 'Billing' },
        { href: '/settings/branding', icon: <Zap size={13} />, label: 'Integrations' },
      ] as const).map((item) => (
        <button
          type="button"
          key={item.label}
          onClick={() => { router.push(item.href); onClose(); }}
          className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all hover:bg-white/70"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
          {item.label}
        </button>
      ))}

      <div className="mx-2 my-1 h-px" style={{ background: 'var(--border)' }} />

      <button
        type="button"
        onClick={() => { router.push('/reset-password'); onClose(); }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all hover:bg-white/70"
        style={{ color: 'var(--text-secondary)' }}
      >
        <KeyRound size={13} style={{ color: 'var(--text-muted)' }} />
        Reset Password
      </button>
      <button
        type="button"
        onClick={() => { logout(); router.push('/login'); }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all hover:bg-rose-50/80"
        style={{ color: '#e11d48' }}
      >
        <LogOut size={13} />
        Log Out
      </button>
    </motion.div>,
    document.body,
  );
}
