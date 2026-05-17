'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Edit2,
  Eye,
  FileText,
  Filter,
  Grid3x3,
  Key,
  LayoutList,
  Lock,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

/* ──────────── types ──────────── */

type ViewMode = 'table' | 'grid';
type DeptFilter = 'all' | 'trainer' | 'reception' | 'management' | 'support';
type Tab = 'directory' | 'trainers' | 'roles' | 'attendance' | 'payroll';

const ROLES = ['Owner', 'Manager', 'Trainer', 'Reception', 'Accountant', 'Support'] as const;
type Role = typeof ROLES[number];

const MODULES = ['Dashboard', 'Members', 'Payments', 'Finance', 'Staff', 'Reports', 'Settings'] as const;

type PermMatrix = Record<Role, Record<typeof MODULES[number], boolean>>;

const DEFAULT_PERMS: PermMatrix = {
  Owner:      { Dashboard: true,  Members: true,  Payments: true,  Finance: true,  Staff: true,  Reports: true,  Settings: true  },
  Manager:    { Dashboard: true,  Members: true,  Payments: true,  Finance: true,  Staff: true,  Reports: true,  Settings: false },
  Trainer:    { Dashboard: true,  Members: true,  Payments: false, Finance: false, Staff: false, Reports: false, Settings: false },
  Reception:  { Dashboard: true,  Members: true,  Payments: true,  Finance: false, Staff: false, Reports: false, Settings: false },
  Accountant: { Dashboard: true,  Members: false, Payments: true,  Finance: true,  Staff: false, Reports: true,  Settings: false },
  Support:    { Dashboard: true,  Members: false, Payments: false, Finance: false, Staff: false, Reports: false, Settings: false },
};

const MOCK_STAFF = [
  { id: '1', name: 'Arjun Sharma',   role: 'Trainer',   dept: 'trainer',    status: 'active',   shift: '6 AM – 2 PM',  lastActive: '2 min ago',  phone: '+91 98765 43210', avatar: 'AS', sessions: 8,  clients: 24 },
  { id: '2', name: 'Priya Verma',    role: 'Reception', dept: 'reception',  status: 'active',   shift: '8 AM – 4 PM',  lastActive: '5 min ago',  phone: '+91 87654 32109', avatar: 'PV', sessions: 0,  clients: 0  },
  { id: '3', name: 'Rohit Mishra',   role: 'Trainer',   dept: 'trainer',    status: 'active',   shift: '2 PM – 10 PM', lastActive: '1 hr ago',   phone: '+91 76543 21098', avatar: 'RM', sessions: 6,  clients: 18 },
  { id: '4', name: 'Sneha Patel',    role: 'Manager',   dept: 'management', status: 'active',   shift: '9 AM – 6 PM',  lastActive: '12 min ago', phone: '+91 65432 10987', avatar: 'SP', sessions: 0,  clients: 0  },
  { id: '5', name: 'Vikram Singh',   role: 'Trainer',   dept: 'trainer',    status: 'inactive', shift: '6 AM – 2 PM',  lastActive: '2 days ago', phone: '+91 54321 09876', avatar: 'VS', sessions: 4,  clients: 12 },
  { id: '6', name: 'Kavya Nair',     role: 'Support',   dept: 'support',    status: 'active',   shift: '10 AM – 7 PM', lastActive: '30 min ago', phone: '+91 43210 98765', avatar: 'KN', sessions: 0,  clients: 0  },
];

const MOCK_TRAINERS = [
  { id: '1', name: 'Arjun Sharma',  spec: 'Strength & Powerlifting', clients: 24, sessions: 8,  rating: 4.9, revenue: 48000, attendance: 97, avatar: 'AS', certified: true  },
  { id: '3', name: 'Rohit Mishra',  spec: 'Functional & CrossFit',   clients: 18, sessions: 6,  rating: 4.7, revenue: 36000, attendance: 91, avatar: 'RM', certified: true  },
  { id: '5', name: 'Vikram Singh',  spec: 'Weight Management',       clients: 12, sessions: 4,  rating: 4.5, revenue: 24000, attendance: 78, avatar: 'VS', certified: false },
];

const SHIFT_SLOTS = [
  { label: 'Morning',   time: '6 AM – 10 AM',  staff: ['Arjun Sharma', 'Vikram Singh'],     fill: 80 },
  { label: 'Midday',    time: '10 AM – 2 PM',  staff: ['Priya Verma', 'Kavya Nair'],        fill: 60 },
  { label: 'Afternoon', time: '2 PM – 6 PM',   staff: ['Rohit Mishra', 'Sneha Patel'],      fill: 70 },
  { label: 'Evening',   time: '6 PM – 10 PM',  staff: ['Arjun Sharma', 'Rohit Mishra'],     fill: 90 },
];

/* ──────────── page ──────────── */

export default function StaffSettingsPage() {
  return (
    <Guard role="admin">
      <AppShell>
        <StaffContent />
      </AppShell>
    </Guard>
  );
}

function StaffContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<Tab>('directory');
  const [viewMode, setViewMode] = React.useState<ViewMode>('table');
  const [search, setSearch] = React.useState('');
  const [dept, setDept] = React.useState<DeptFilter>('all');
  const [perms, setPerms] = React.useState<PermMatrix>(DEFAULT_PERMS);
  const [dirty, setDirty] = React.useState(false);

  const filteredStaff = MOCK_STAFF.filter(s => {
    const matchDept = dept === 'all' || s.dept === dept;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  function togglePerm(role: Role, mod: typeof MODULES[number]) {
    if (role === 'Owner') return;
    setPerms(prev => ({ ...prev, [role]: { ...prev[role], [mod]: !prev[role][mod] } }));
    setDirty(true);
  }

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-8">

        {/* ── HERO ── */}
        <StaffHero router={router} />

        {/* ── KPI CARDS ── */}
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          <StaffKpiCard label="Total Staff"        value="6"   hint="Across all roles"   icon={<Users className="h-5 w-5" />}    accent="rose"    href="/settings/staff" />
          <StaffKpiCard label="Active Trainers"    value="2"   hint="On floor now"        icon={<Zap className="h-5 w-5" />}      accent="emerald" href="/trainers" />
          <StaffKpiCard label="Attendance Today"   value="5/6" hint="1 late arrival"      icon={<UserCheck className="h-5 w-5" />} accent="sky"     href="/attendance" />
          <StaffKpiCard label="Pending Approvals"  value="3"   hint="Awaiting review"     icon={<AlertCircle className="h-5 w-5" />} accent="amber" href="/settings/staff" />
          <StaffKpiCard label="Payroll Status"     value="Apr" hint="Processing"          icon={<Wallet className="h-5 w-5" />}   accent="violet"  href="/finance/payroll" />
          <StaffKpiCard label="Permissions"        value="6"   hint="Roles configured"   icon={<Shield className="h-5 w-5" />}   accent="zinc"    href="/settings/staff" />
        </section>

        {/* ── TAB BAR ── */}
        <div className="mt-6 flex flex-wrap gap-2 rounded-[22px] border border-zinc-200/80 bg-white/70 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          {(['directory', 'trainers', 'roles', 'attendance', 'payroll'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-[16px] px-4 py-2.5 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-[linear-gradient(135deg,#dc2626,#991b1b)] text-white shadow-[0_6px_20px_rgba(220,38,38,0.3)]'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
            >
              {tab === 'directory' ? 'Staff Directory' : tab === 'roles' ? 'Roles & Permissions' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── TAB PANELS ── */}
        <div className="mt-5">
          {activeTab === 'directory'  && <DirectoryPanel staff={filteredStaff} viewMode={viewMode} setViewMode={setViewMode} search={search} setSearch={setSearch} dept={dept} setDept={setDept} />}
          {activeTab === 'trainers'   && <TrainersPanel trainers={MOCK_TRAINERS} router={router} />}
          {activeTab === 'roles'      && <RolesPanel perms={perms} togglePerm={togglePerm} />}
          {activeTab === 'attendance' && <AttendancePanel />}
          {activeTab === 'payroll'    && <PayrollPanel />}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <QuickActionsPanel router={router} />

      </div>

      {/* ── FOOTER ACTION BAR ── */}
      <FooterBar dirty={dirty} setDirty={setDirty} />
    </div>
  );
}

/* ──────────── hero ──────────── */

function StaffHero({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,9,11,0.97),rgba(38,7,12,0.93),rgba(24,24,27,0.94))] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(220,38,38,0.28),transparent_28%),radial-gradient(circle_at_78%_10%,rgba(124,58,237,0.16),transparent_22%),radial-gradient(circle_at_55%_88%,rgba(255,255,255,0.05),transparent_16%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
        <div className="space-y-5 text-white">
          <div className="flex flex-wrap gap-3">
            <Chip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Staff Command Center" />
            <Chip icon={<Sparkles className="h-3.5 w-3.5" />} label="Enterprise operations" glow />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-white/50">619 Fitness Studio</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[3rem] lg:leading-[1.06]">Staff Settings</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
              Manage trainers, staff roles, access permissions, attendance and payroll operations across your entire studio.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <HeroBtn label="Add Staff"      icon={<UserPlus className="h-4 w-4" />}   primary />
            <HeroBtn label="Add Trainer"    icon={<Plus className="h-4 w-4" />}        onClick={() => router.push('/trainers')} />
            <HeroBtn label="Manage Roles"   icon={<Key className="h-4 w-4" />} />
            <HeroBtn label="View Attendance" icon={<Clock className="h-4 w-4" />}      onClick={() => router.push('/attendance')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total staff',    value: '6',   sub: 'All roles' },
            { label: 'Online now',     value: '3',   sub: 'Active sessions' },
            { label: 'Pending',        value: '3',   sub: 'Approvals' },
            { label: 'Attendance',     value: '83%', sub: 'Today' },
          ].map(stat => (
            <div key={stat.label} className="rounded-[22px] border border-white/10 bg-white/10 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl">
              <p className="text-xs text-white/45">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-xs text-white/50">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── directory ──────────── */

function DirectoryPanel({
  staff, viewMode, setViewMode, search, setSearch, dept, setDept,
}: {
  staff: typeof MOCK_STAFF;
  viewMode: ViewMode; setViewMode: (v: ViewMode) => void;
  search: string;     setSearch: (v: string) => void;
  dept: DeptFilter;   setDept: (v: DeptFilter) => void;
}) {
  const DEPTS: { id: DeptFilter; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'trainer', label: 'Trainers' },
    { id: 'reception', label: 'Reception' }, { id: 'management', label: 'Management' },
    { id: 'support', label: 'Support' },
  ];

  return (
    <PremiumCard title="Staff Directory" subtitle="Search, filter and manage all team members">
      {/* toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…"
              className="w-full rounded-[14px] border border-zinc-200 bg-white/80 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:ring-rose-900/20"
            />
          </div>
          <div className="flex gap-1.5 rounded-[14px] border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-white/5">
            {DEPTS.map(d => (
              <button key={d.id} onClick={() => setDept(d.id)}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${
                  dept === d.id ? 'bg-white text-zinc-900 shadow-sm dark:bg-white/12 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-white/40 dark:hover:text-white/70'
                }`}>{d.label}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 rounded-[14px] border border-zinc-200 bg-zinc-50 p-1 dark:border-white/10 dark:bg-white/5">
          <button onClick={() => setViewMode('table')} className={`rounded-[10px] p-2 transition ${ viewMode === 'table' ? 'bg-white shadow-sm dark:bg-white/12' : 'text-zinc-400 hover:text-zinc-700 dark:text-white/30 dark:hover:text-white/60' }`}><LayoutList className="h-4 w-4" /></button>
          <button onClick={() => setViewMode('grid')}  className={`rounded-[10px] p-2 transition ${ viewMode === 'grid'  ? 'bg-white shadow-sm dark:bg-white/12' : 'text-zinc-400 hover:text-zinc-700 dark:text-white/30 dark:hover:text-white/60' }`}><Grid3x3 className="h-4 w-4" /></button>
        </div>
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No staff members found" desc="Try adjusting your search or filters." />
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-[20px] border border-zinc-200/70 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50/80 text-xs uppercase tracking-wider text-zinc-500 dark:bg-white/5 dark:text-white/40">
              <tr>
                {['Member', 'Role', 'Shift', 'Status', 'Last active', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-t border-zinc-100 transition hover:bg-zinc-50/70 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar initials={s.avatar} />
                      <div>
                        <p className="font-semibold text-zinc-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-white/40">{s.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><RoleBadge role={s.role} /></td>
                  <td className="px-5 py-4 text-zinc-600 dark:text-white/60">{s.shift}</td>
                  <td className="px-5 py-4"><StatusDot status={s.status} /></td>
                  <td className="px-5 py-4 text-xs text-zinc-500 dark:text-white/40">{s.lastActive}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <IconBtn icon={<Eye className="h-3.5 w-3.5" />} label="View" />
                      <IconBtn icon={<Edit2 className="h-3.5 w-3.5" />} label="Edit" />
                      <IconBtn icon={<MoreVertical className="h-3.5 w-3.5" />} label="More" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map(s => (
            <div key={s.id} className="rounded-[22px] border border-zinc-200/70 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar initials={s.avatar} large />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">{s.name}</p>
                    <RoleBadge role={s.role} />
                  </div>
                </div>
                <StatusDot status={s.status} />
              </div>
              <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-white/55">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" />{s.shift}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{s.phone}</p>
                <p className="flex items-center gap-2"><Activity className="h-4 w-4" />Last active {s.lastActive}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <SmBtn label="View"       icon={<Eye className="h-3.5 w-3.5" />} />
                <SmBtn label="Edit"       icon={<Edit2 className="h-3.5 w-3.5" />} />
                <SmBtn label="Attendance" icon={<Calendar className="h-3.5 w-3.5" />} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PremiumCard>
  );
}

/* ──────────── trainers ──────────── */

function TrainersPanel({ trainers, router }: { trainers: typeof MOCK_TRAINERS; router: ReturnType<typeof useRouter> }) {
  return (
    <PremiumCard
      title="Trainer Management"
      subtitle="Performance, clients, and schedule management"
      action={<SmBtn label="Go to Trainers" icon={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={() => router.push('/trainers')} />}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {trainers.map(t => (
          <div key={t.id} className="rounded-[24px] border border-zinc-200/70 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar initials={t.avatar} large />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-white">{t.name}</p>
                    {t.certified && <Award className="h-4 w-4 text-amber-500" />}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-white/40">{t.spec}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                <Star className="h-3 w-3" />{t.rating}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <MetricTile label="Clients"  value={String(t.clients)} />
              <MetricTile label="Sessions" value={String(t.sessions)} />
              <MetricTile label="Attend."  value={`${t.attendance}%`} />
            </div>

            <div className="mt-4 rounded-[16px] bg-zinc-50 p-3 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-700 dark:text-white/70">Monthly revenue</p>
                <p className="text-sm font-semibold text-emerald-600">₹{t.revenue.toLocaleString('en-IN')}</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-white/10">
                <div className="h-2 rounded-full bg-[linear-gradient(90deg,#dc2626,#fb7185)]" style={{ width: `${(t.revenue / 60000) * 100}%` }} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <SmBtn label="View"           icon={<Eye className="h-3.5 w-3.5" />}           onClick={() => router.push('/trainers')} />
              <SmBtn label="Schedule"       icon={<Calendar className="h-3.5 w-3.5" />} />
              <SmBtn label="Assign clients" icon={<UserPlus className="h-3.5 w-3.5" />} />
              <SmBtn label="Message"        icon={<MessageSquare className="h-3.5 w-3.5" />} />
            </div>
          </div>
        ))}
      </div>
    </PremiumCard>
  );
}

/* ──────────── roles ──────────── */

function RolesPanel({ perms, togglePerm }: { perms: PermMatrix; togglePerm: (r: Role, m: typeof MODULES[number]) => void }) {
  return (
    <PremiumCard title="Roles & Permissions" subtitle="Enterprise access control matrix — configure module visibility per role">
      <div className="overflow-x-auto rounded-[20px] border border-zinc-200/70 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50/90 dark:bg-white/5">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-white/40">Module</th>
              {ROLES.map(r => (
                <th key={r} className="px-4 py-4 text-center">
                  <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-white/10 dark:text-white/75">{r}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => (
              <tr key={mod} className="border-t border-zinc-100 transition hover:bg-zinc-50/60 dark:border-white/5 dark:hover:bg-white/5">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[10px] bg-rose-50 flex items-center justify-center dark:bg-rose-900/20">
                      <Key className="h-4 w-4 text-rose-500" />
                    </div>
                    <span className="font-medium text-zinc-800 dark:text-white/80">{mod}</span>
                  </div>
                </td>
                {ROLES.map(r => (
                  <td key={r} className="px-4 py-4 text-center">
                    <button
                      onClick={() => togglePerm(r, mod)}
                      disabled={r === 'Owner'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        perms[r][mod]
                          ? 'bg-[linear-gradient(135deg,#dc2626,#991b1b)] shadow-[0_4px_12px_rgba(220,38,38,0.35)]'
                          : 'bg-zinc-200 dark:bg-white/15'
                      } ${r === 'Owner' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-90'}`}
                      aria-label={`Toggle ${mod} for ${r}`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        perms[r][mod] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <p className="text-sm text-zinc-500 dark:text-white/40"><Lock className="inline h-4 w-4 align-middle" /> Owner access is locked and cannot be modified.</p>
      </div>
    </PremiumCard>
  );
}

/* ──────────── attendance ──────────── */

function AttendancePanel() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const bars = [92, 78, 85, 100, 72, 88, 64];

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
      <PremiumCard title="Live Attendance" subtitle="Today's clock-in/out status across all staff">
        <div className="space-y-3">
          {MOCK_STAFF.map(s => (
            <div key={s.id} className="flex items-center gap-4 rounded-[18px] border border-zinc-200/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
              <Avatar initials={s.avatar} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-zinc-900 dark:text-white">{s.name}</p>
                  <StatusDot status={s.status} />
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-white/40">{s.shift}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-800 dark:text-white/80">{s.lastActive}</p>
                <p className="text-xs text-zinc-400 dark:text-white/30">Last seen</p>
              </div>
            </div>
          ))}
        </div>
      </PremiumCard>

      <div className="space-y-5">
        <PremiumCard title="Weekly chart" subtitle="Attendance %">
          <div className="flex h-32 items-end gap-2">
            {bars.map((b, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="w-full rounded-t-[8px] transition-all" style={{ height: `${b}%`, background: 'linear-gradient(180deg,#dc2626,#991b1b)' }} />
                <p className="text-xs text-zinc-500 dark:text-white/35">{days[i]}</p>
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard title="Shifts today" subtitle="Slot coverage">
          <div className="space-y-3">
            {SHIFT_SLOTS.map(slot => (
              <div key={slot.label} className="rounded-[16px] bg-zinc-50 p-3 dark:bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-800 dark:text-white/75">{slot.label}</p>
                  <p className="text-xs text-zinc-500 dark:text-white/40">{slot.time}</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10">
                  <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,#dc2626,#fb7185)]" style={{ width: `${slot.fill}%` }} />
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-white/40">{slot.staff.join(', ')}</p>
              </div>
            ))}
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}

/* ──────────── payroll ──────────── */

function PayrollPanel() {
  const staff = [
    { name: 'Arjun Sharma',  role: 'Trainer',   base: 28000, incentive: 12000, total: 40000, status: 'processed', avatar: 'AS' },
    { name: 'Priya Verma',   role: 'Reception', base: 18000, incentive: 2000,  total: 20000, status: 'pending',   avatar: 'PV' },
    { name: 'Rohit Mishra',  role: 'Trainer',   base: 24000, incentive: 8000,  total: 32000, status: 'processed', avatar: 'RM' },
    { name: 'Sneha Patel',   role: 'Manager',   base: 35000, incentive: 5000,  total: 40000, status: 'processed', avatar: 'SP' },
    { name: 'Vikram Singh',  role: 'Trainer',   base: 20000, incentive: 4000,  total: 24000, status: 'on-hold',   avatar: 'VS' },
    { name: 'Kavya Nair',    role: 'Support',   base: 15000, incentive: 1000,  total: 16000, status: 'pending',   avatar: 'KN' },
  ];
  const totalPayroll = staff.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryKpi label="Total payroll" value={`₹${(totalPayroll / 1000).toFixed(0)}K`} sub="April 2026" accent="emerald" />
        <SummaryKpi label="Trainer commissions" value="₹20K" sub="Incentives + sessions" accent="rose" />
        <SummaryKpi label="Pending disbursements" value="2" sub="Staff awaiting" accent="amber" />
      </div>

      <PremiumCard title="Payroll register" subtitle="April 2026 disbursement status">
        <div className="overflow-x-auto rounded-[20px] border border-zinc-200/70 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50/80 text-xs uppercase tracking-wider text-zinc-500 dark:bg-white/5 dark:text-white/40">
              <tr>
                {['Staff', 'Role', 'Base', 'Incentive', 'Total', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-5 py-4 font-medium text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={i} className="border-t border-zinc-100 hover:bg-zinc-50/60 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar initials={s.avatar} />
                      <p className="font-medium text-zinc-900 dark:text-white">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4"><RoleBadge role={s.role} /></td>
                  <td className="px-5 py-4 tabular-nums text-zinc-600 dark:text-white/60">₹{s.base.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 tabular-nums text-emerald-600">+₹{s.incentive.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 tabular-nums font-semibold text-zinc-900 dark:text-white">₹{s.total.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4"><PayrollBadge status={s.status} /></td>
                  <td className="px-5 py-4"><SmBtn label="Disburse" icon={<CreditCard className="h-3.5 w-3.5" />} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  );
}

/* ──────────── quick actions ──────────── */

function QuickActionsPanel({ router }: { router: ReturnType<typeof useRouter> }) {
  const actions = [
    { label: 'Add New Staff',      icon: <UserPlus className="h-5 w-5" />,     color: 'from-rose-500/20 to-red-500/10',     onClick: () => {} },
    { label: 'Generate Payroll',   icon: <Wallet className="h-5 w-5" />,       color: 'from-emerald-500/20 to-green-500/10', onClick: () => {} },
    { label: 'Export Staff Data',  icon: <Download className="h-5 w-5" />,     color: 'from-sky-500/20 to-blue-500/10',      onClick: () => {} },
    { label: 'Assign Shift',       icon: <Calendar className="h-5 w-5" />,     color: 'from-violet-500/20 to-purple-500/10', onClick: () => {} },
    { label: 'Send Announcement',  icon: <Bell className="h-5 w-5" />,         color: 'from-amber-500/20 to-yellow-500/10',  onClick: () => {} },
    { label: 'Go to Trainers',     icon: <ArrowUpRight className="h-5 w-5" />, color: 'from-rose-500/20 to-red-500/10',     onClick: () => router.push('/trainers') },
  ];

  return (
    <section className="mt-6">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 dark:text-white/40">Quick actions</p>
        <h2 className="mt-1.5 text-xl font-semibold text-zinc-900 dark:text-white">Common operations</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map(a => (
          <button key={a.label} onClick={a.onClick}
            className={`group rounded-[22px] border border-zinc-200/70 bg-gradient-to-br ${a.color} p-5 text-left transition hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.10)] dark:border-white/10`}>
            <div className="mb-4 h-10 w-10 rounded-[14px] border border-zinc-200/70 bg-white/80 flex items-center justify-center text-zinc-700 shadow-sm transition group-hover:scale-110 dark:border-white/10 dark:bg-white/10 dark:text-white/75">
              {a.icon}
            </div>
            <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">{a.label}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ──────────── footer ──────────── */

function FooterBar({ dirty, setDirty }: { dirty: boolean; setDirty: (v: boolean) => void }) {
  return (
    <div className="sticky bottom-4 z-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.84),rgba(18,18,20,0.72))] px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3 text-white">
          <span className={`h-2.5 w-2.5 rounded-full ${dirty ? 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)]' : 'bg-emerald-400'}`} />
          <div>
            <p className="text-sm font-medium">{dirty ? 'Unsaved staff changes' : 'All changes saved'}</p>
            <p className="text-xs text-white/50">Publishing applies permission and role updates across all staff accounts.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <HeroBtn label="Reset"        icon={<RefreshCw className="h-4 w-4" />}       onClick={() => setDirty(false)} compact />
          <HeroBtn label="Sync Data"    icon={<RefreshCw className="h-4 w-4" />}       compact />
          <HeroBtn label="Save Changes" icon={<CheckCircle2 className="h-4 w-4" />}   primary compact onClick={() => setDirty(false)} />
          <HeroBtn label="Publish"      icon={<ArrowUpRight className="h-4 w-4" />}    primary compact />
        </div>
      </div>
    </div>
  );
}

/* ──────────── shared atoms ──────────── */

function PremiumCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[30px] border border-zinc-200/70 bg-white/75 p-5 shadow-[0_10px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_10px_50px_rgba(0,0,0,0.22)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-500 dark:text-white/45">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StaffKpiCard({ label, value, hint, icon, accent, href }: { label: string; value: string; hint: string; icon: React.ReactNode; accent: string; href: string }) {
  const accents: Record<string, string> = {
    rose:   'from-rose-500/15 to-red-500/8',
    emerald:'from-emerald-500/15 to-green-500/8',
    sky:    'from-sky-500/15 to-blue-500/8',
    amber:  'from-amber-500/15 to-yellow-500/8',
    violet: 'from-violet-500/15 to-purple-500/8',
    zinc:   'from-zinc-400/15 to-zinc-500/8',
  };
  return (
    <Link href={href} className={`group rounded-[22px] border border-zinc-200/70 bg-gradient-to-br ${accents[accent] ?? accents.zinc} bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="h-9 w-9 rounded-[12px] border border-zinc-200/70 bg-white/90 flex items-center justify-center text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white/70">{icon}</div>
        <ArrowUpRight className="h-4 w-4 text-zinc-400 opacity-0 transition group-hover:opacity-100 dark:text-white/30" />
      </div>
      <p className="text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-white/70">{label}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-white/40">{hint}</p>
    </Link>
  );
}

function SummaryKpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  const colors: Record<string, string> = { emerald: 'text-emerald-600', rose: 'text-rose-500', amber: 'text-amber-500' };
  return (
    <div className="rounded-[22px] border border-zinc-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-sm text-zinc-500 dark:text-white/40">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${colors[accent] ?? ''} dark:opacity-90`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-400 dark:text-white/30">{sub}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-zinc-50 p-3 text-center dark:bg-white/8">
      <p className="text-base font-semibold text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-white/40">{label}</p>
    </div>
  );
}

function Avatar({ initials, large }: { initials: string; large?: boolean }) {
  const sz = large ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs';
  return (
    <div className={`${sz} shrink-0 rounded-full bg-[linear-gradient(135deg,#dc2626,#7c3aed)] flex items-center justify-center font-semibold text-white shadow-sm`}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    Trainer:    'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
    Manager:    'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
    Reception:  'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
    Accountant: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    Support:    'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-white/60',
    Owner:      'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[role] ?? map.Support}`}>{role}</span>
  );
}

function PayrollBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    processed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    pending:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    'on-hold': 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${map[status] ?? map.pending}`}>{status}</span>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
      status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-white/40'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400' }`} />
      {status}
    </span>
  );
}

function Chip({ icon, label, glow }: { icon: React.ReactNode; label: string; glow?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md ${
      glow ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-white/10 bg-white/10'
    }`}>{icon}{label}</span>
  );
}

function HeroBtn({ label, icon, primary, compact, onClick }: { label: string; icon: React.ReactNode; primary?: boolean; compact?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border font-medium transition hover:-translate-y-0.5 ${
        compact ? 'px-3.5 py-2 text-sm' : 'px-4 py-2.5 text-sm'
      } ${
        primary
          ? 'border-transparent bg-[linear-gradient(135deg,#dc2626,#991b1b)] text-white shadow-[0_10px_28px_rgba(220,38,38,0.32)] hover:shadow-[0_14px_36px_rgba(220,38,38,0.42)]'
          : 'border-white/15 bg-white/10 text-white/85 hover:bg-white/18 backdrop-blur-md'
      }`}>
      {icon}{label}
    </button>
  );
}

function SmBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-white/70 dark:hover:bg-white/15">
      {icon}{label}
    </button>
  );
}

function IconBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button aria-label={label}
      className="rounded-[10px] border border-zinc-200 bg-white p-2 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white">
      {icon}
    </button>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center rounded-[22px] border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center dark:border-white/10 dark:bg-white/3">
      <div className="mb-4 text-zinc-400 dark:text-white/30">{icon}</div>
      <p className="font-semibold text-zinc-800 dark:text-white/80">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-zinc-500 dark:text-white/40">{desc}</p>
    </div>
  );
}
