'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Banknote,
  BookOpen,
  Calendar,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  Dumbbell,
  FileText,
  Filter,
  History,
  Home,
  IndianRupee,
  ListChecks,
  LogOut,
  Menu,
  NotebookPen,
  Package,
  PauseCircle,
  Plus,
  Receipt,
  Ruler,
  Search,
  Settings,
  ShieldAlert,
  Upload,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/components/ui/cn';

export type SoloScreen =
  | 'dashboard'
  | 'setup'
  | 'clients'
  | 'new-client'
  | 'client-profile'
  | 'schedule'
  | 'book-session'
  | 'programs'
  | 'program-builder'
  | 'payments'
  | 'record-payment'
  | 'settings';

type ClientStatus = 'Active' | 'Paused' | 'Churned';

type DemoClient = {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  goal: string;
  injury: string;
  packageName: string;
  status: ClientStatus;
  sessionsUsed: number;
  sessionsTotal: number;
  expiry: string;
  due: number;
  weight: string;
  trainerNote: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home, match: (path) => path === '/' },
  { href: '/clients', label: 'Clients', icon: Users, match: (path) => path.startsWith('/clients') },
  { href: '/schedule', label: 'Schedule', icon: Calendar, match: (path) => path.startsWith('/schedule') },
  { href: '/programs', label: 'Programs', icon: Dumbbell, match: (path) => path.startsWith('/programs') },
  { href: '/payments', label: 'Payments', icon: IndianRupee, match: (path) => path.startsWith('/payments') },
  { href: '/settings', label: 'Settings', icon: Settings, match: (path) => path.startsWith('/settings') },
];

const primaryMobileItems = navItems.filter((item) => item.href !== '/');

const demoClients: DemoClient[] = [
  {
    id: 'isha-sen',
    name: 'Isha Sen',
    phone: '9876543210',
    dob: '1996-04-18',
    gender: 'Female',
    goal: 'Strength and body recomposition',
    injury: 'Old ankle sprain, avoid high impact jumps',
    packageName: 'PT 24 Sessions',
    status: 'Active',
    sessionsUsed: 14,
    sessionsTotal: 24,
    expiry: '2026-07-29',
    due: 0,
    weight: '63.4 kg',
    trainerNote: 'Deadlift form is improving. Add hip mobility work.',
  },
  {
    id: 'arjun-mehra',
    name: 'Arjun Mehra',
    phone: '9988776655',
    dob: '1991-11-02',
    gender: 'Male',
    goal: 'Fat loss and conditioning',
    injury: 'Lower back stiffness',
    packageName: 'PT 12 Sessions',
    status: 'Paused',
    sessionsUsed: 8,
    sessionsTotal: 12,
    expiry: '2026-07-18',
    due: 4500,
    weight: '82.1 kg',
    trainerNote: 'Keep hinge volume moderate. Follow up on dues.',
  },
  {
    id: 'meera-nair',
    name: 'Meera Nair',
    phone: '9123456780',
    dob: '1988-09-14',
    gender: 'Female',
    goal: 'Posture, mobility, strength',
    injury: 'Shoulder impingement history',
    packageName: 'PT 36 Sessions',
    status: 'Active',
    sessionsUsed: 31,
    sessionsTotal: 36,
    expiry: '2026-07-15',
    due: 2200,
    weight: '58.8 kg',
    trainerNote: 'Renewal conversation due this week.',
  },
  {
    id: 'kabir-khan',
    name: 'Kabir Khan',
    phone: '9000011111',
    dob: '1999-01-22',
    gender: 'Male',
    goal: 'Muscle gain',
    injury: 'None',
    packageName: 'PT 12 Sessions',
    status: 'Churned',
    sessionsUsed: 12,
    sessionsTotal: 12,
    expiry: '2026-06-30',
    due: 0,
    weight: '72.0 kg',
    trainerNote: 'Send comeback offer before month end.',
  },
];

const todaysSessions = [
  { time: '07:00', client: 'Isha Sen', focus: 'Lower body strength', status: 'Booked' },
  { time: '09:30', client: 'Meera Nair', focus: 'Upper body mobility', status: 'Booked' },
  { time: '18:00', client: 'Arjun Mehra', focus: 'Conditioning', status: 'Balance check' },
];

const transactions = [
  { id: 'R-1042', client: 'Isha Sen', amount: 18000, mode: 'UPI', date: '2026-07-08', status: 'Full' },
  { id: 'R-1041', client: 'Meera Nair', amount: 8000, mode: 'Bank', date: '2026-07-07', status: 'Partial' },
  { id: 'R-1040', client: 'Arjun Mehra', amount: 4500, mode: 'Cash', date: '2026-07-05', status: 'Partial' },
];

const exerciseLibrary = [
  { name: 'Goblet Squat', muscle: 'Legs', video: 'Video linked' },
  { name: 'Incline Push-Up', muscle: 'Chest', video: 'Video linked' },
  { name: 'Cable Row', muscle: 'Back', video: 'Video linked' },
  { name: 'Pallof Press', muscle: 'Core', video: 'Video linked' },
];

const templates = [
  { name: 'Beginner Strength Split', days: '3 days', assigned: 8 },
  { name: 'Fat Loss Conditioning', days: '4 days', assigned: 5 },
  { name: 'Shoulder Rehab Base', days: '2 days', assigned: 3 },
];

function initials(name?: string | null) {
  if (!name) return 'CA';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function currency(amount: number) {
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]', className)}>
      {children}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: 'blue' | 'green' | 'amber' | 'rose';
}) {
  const tones = {
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', tones[tone])}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-bold tracking-normal text-slate-950">{value}</div>
        </div>
      </div>
    </Panel>
  );
}

function PageHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</div>
        <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}

function IconButton({
  href,
  icon: Icon,
  children,
  tone = 'dark',
}: {
  href: string;
  icon: LucideIcon;
  children: React.ReactNode;
  tone?: 'dark' | 'light' | 'green';
}) {
  const tones = {
    dark: 'bg-slate-950 text-white hover:bg-slate-800',
    light: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50',
    green: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  return (
    <Link
      href={href}
      className={cn('inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition', tones[tone])}
    >
      <Icon size={16} />
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: ClientStatus }) {
  const tone =
    status === 'Active'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : status === 'Paused'
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold', tone)}>{status}</span>;
}

function SoloShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const quickActions = [
    { href: '/clients/new', label: 'New Client', icon: UserPlus },
    { href: '/schedule/book', label: 'Log Session', icon: CalendarCheck },
    { href: '/payments/new', label: 'Record Payment', icon: Receipt },
  ];

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <Link href="/" className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
              CA
            </div>
            <div>
              <div className="text-sm font-bold tracking-normal text-slate-950">Coach Abhishek</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Personal Training</div>
            </div>
          </Link>

          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                    active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                {initials(user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-950">{user?.name || 'Trainer'}</div>
                <div className="truncate text-xs text-slate-500">{user?.email || 'coach account'}</div>
              </div>
              <button
                type="button"
                aria-label="Logout"
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-rose-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
            >
              <Menu size={18} />
            </button>
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-950 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-xs text-white">CA</span>
              Coach Abhishek
            </Link>
            <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 sm:flex">
              <Search size={16} />
              Search clients, phone, sessions, receipts
            </div>
            <div className="ml-auto hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-emerald-700 sm:flex">
              <CheckCircle2 size={14} />
              Online
            </div>
            <button
              type="button"
              onClick={() => setQuickOpen((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={16} />
              Quick Add
            </button>
          </div>
          {quickOpen && (
            <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => setQuickOpen(false)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Icon size={16} />
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-950/40"
              onClick={() => setNavOpen(false)}
            />
            <div className="relative h-full w-[280px] bg-white shadow-xl">
              <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
                <div className="font-bold">Primary Nav</div>
                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setNavOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200"
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="space-y-1 p-3" aria-label="Primary navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setNavOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold',
                        active ? 'bg-slate-950 text-white' : 'text-slate-600',
                      )}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <main id="main-content" className="mx-auto min-h-[calc(100dvh-56px)] max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden" aria-label="Primary navigation">
        <div className="grid h-16 grid-cols-5">
          {primaryMobileItems.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[10px] font-bold',
                  active ? 'text-slate-950' : 'text-slate-400',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Dashboard() {
  const dues = demoClients.filter((client) => client.due > 0);
  const expiring = demoClients.filter((client) => client.status !== 'Churned' && client.sessionsTotal - client.sessionsUsed <= 5);

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Today at a glance"
        action={<IconButton href="/clients/new" icon={UserPlus}>New Client</IconButton>}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CalendarCheck} label="Today's Sessions" value={String(todaysSessions.length)} tone="blue" />
        <Metric icon={Wallet} label="Dues Pending" value={currency(dues.reduce((sum, client) => sum + client.due, 0))} tone="rose" />
        <Metric icon={Package} label="Expiring Soon" value={String(expiring.length)} tone="amber" />
        <Metric icon={Users} label="Active Clients" value={String(demoClients.filter((client) => client.status === 'Active').length)} tone="green" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <Panel>
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-bold">Today's Sessions</h2>
            <Link href="/schedule" className="text-sm font-semibold text-sky-700">Open Schedule</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {todaysSessions.map((session) => (
              <div key={`${session.time}-${session.client}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="w-16 font-mono text-sm font-bold text-slate-950">{session.time}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{session.client}</div>
                  <div className="text-sm text-slate-500">{session.focus}</div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-bold">Quick Add</h2>
          </div>
          <div className="grid gap-2 p-4">
            <ActionRow href="/clients/new" icon={UserPlus} title="New Client" detail="Name, phone, DOB, gender, goal, injury, package" />
            <ActionRow href="/schedule/book" icon={CalendarCheck} title="Log Session" detail="Pick client, date, time, balance check" />
            <ActionRow href="/payments/new" icon={Receipt} title="Record Payment" detail="Amount, mode, partial or full receipt" />
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <AlertCircle size={17} className="text-rose-600" />
            <h2 className="text-base font-bold">Dues Pending</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {dues.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div>
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-sm text-slate-500">{client.packageName}</div>
                </div>
                <div className="font-bold text-rose-700">{currency(client.due)}</div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <Clock size={17} className="text-amber-600" />
            <h2 className="text-base font-bold">Packages Expiring Soon</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {expiring.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                <div>
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-sm text-slate-500">{client.sessionsTotal - client.sessionsUsed} sessions remaining</div>
                </div>
                <div className="text-sm font-bold text-amber-700">{client.expiry}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function ActionRow({ href, icon: Icon, title, detail }: { href: string; icon: LucideIcon; title: string; detail: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-950">{title}</div>
        <div className="truncate text-sm text-slate-500">{detail}</div>
      </div>
      <ChevronRight size={16} className="text-slate-400" />
    </Link>
  );
}

function ClientsPage() {
  const [filter, setFilter] = useState<ClientStatus | 'All'>('All');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoClients.filter((client) => {
      const statusMatch = filter === 'All' || client.status === filter;
      const queryMatch = !q || client.name.toLowerCase().includes(q) || client.phone.includes(q);
      return statusMatch && queryMatch;
    });
  }, [filter, query]);

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Client List"
        action={<IconButton href="/clients/new" icon={UserPlus}>Add Client</IconButton>}
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or phone"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['All', 'Active', 'Paused', 'Churned'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold',
                  filter === item ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600',
                )}
              >
                {item === 'All' ? <Filter size={15} /> : <PauseCircle size={15} />}
                {item}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Users size={34} className="text-slate-300" />
            <h2 className="mt-3 text-lg font-bold">No Clients Yet</h2>
            <Link href="/clients/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              <UserPlus size={16} />
              Add Client
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`} className="grid gap-3 px-4 py-4 hover:bg-slate-50 md:grid-cols-[1fr_160px_140px_120px] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-xs font-bold text-white">
                      {initials(client.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-950">{client.name}</div>
                      <div className="text-sm text-slate-500">{client.phone}</div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">{client.packageName}</div>
                <div className="text-sm font-semibold text-slate-700">
                  {client.sessionsUsed}/{client.sessionsTotal} used
                </div>
                <div className="flex justify-start md:justify-end">
                  <StatusPill status={client.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const isDuplicate = demoClients.some((client) => client.phone === phone.trim());

  function save() {
    if (isDuplicate) {
      setDuplicate(true);
      setStep(1);
      return;
    }
    router.push('/clients/isha-sen');
  }

  return (
    <>
      <PageHeader eyebrow="Clients" title="Add Client" action={<IconButton href="/clients" icon={Users} tone="light">Client List</IconButton>} />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Panel className="p-4">
          <div className="space-y-2">
            {[
              { id: 1, title: 'Name, Phone, DOB, Gender' },
              { id: 2, title: 'Goal + Injury History' },
              { id: 3, title: 'Assign Package' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm font-semibold',
                  step === item.id ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-600',
                )}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs">{item.id}</span>
                {item.title}
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          {duplicate && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              <ShieldAlert size={16} />
              Warn: Client Exists
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" placeholder="Client name" />
              <Field label="Phone" placeholder="9876543210" value={phone} onChange={setPhone} />
              <Field label="DOB" type="date" />
              <SelectField label="Gender" options={['Female', 'Male', 'Other']} />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <Field label="Goal" placeholder="Strength, fat loss, mobility" />
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Injury History
                <textarea className="min-h-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" placeholder="Relevant injuries, restrictions, notes" />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { name: 'PT 12 Sessions', price: 'Rs. 12,000' },
                { name: 'PT 24 Sessions', price: 'Rs. 22,000' },
                { name: 'PT 36 Sessions', price: 'Rs. 31,000' },
              ].map((pkg) => (
                <button key={pkg.name} type="button" className="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-slate-400">
                  <Package size={20} className="text-teal-700" />
                  <div className="mt-3 font-bold">{pkg.name}</div>
                  <div className="text-sm text-slate-500">{pkg.price}</div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            {step > 1 && (
              <button type="button" onClick={() => setStep((value) => value - 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">
                Back
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                <Check size={16} />
                Save
              </button>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Field({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
      />
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ClientProfilePage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : demoClients[0].id;
  const client = demoClients.find((item) => item.id === id) || demoClients[0];
  const [tab, setTab] = useState<'Overview' | 'Program' | 'Progress' | 'Payments' | 'Notes'>('Overview');

  return (
    <>
      <PageHeader eyebrow="Client Profile" title={client.name} action={<IconButton href="/clients" icon={Users} tone="light">Client List</IconButton>} />

      <Panel className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-teal-600 text-lg font-bold text-white">
            {initials(client.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{client.name}</h2>
              <StatusPill status={client.status} />
            </div>
            <div className="mt-1 text-sm text-slate-500">{client.phone} | {client.goal}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">Sessions Used / Remaining</div>
            <div className="text-xl font-bold">{client.sessionsUsed} / {client.sessionsTotal - client.sessionsUsed}</div>
          </div>
        </div>
      </Panel>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {(['Overview', 'Program', 'Progress', 'Payments', 'Notes'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              'inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-semibold',
              tab === item ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="p-4">
            <h3 className="font-bold">Contact + Goal</h3>
            <dl className="mt-4 grid gap-3 text-sm">
              <Info label="Phone" value={client.phone} />
              <Info label="DOB" value={client.dob} />
              <Info label="Gender" value={client.gender} />
              <Info label="Goal" value={client.goal} />
              <Info label="Injury" value={client.injury} />
            </dl>
          </Panel>
          <Panel className="p-4">
            <h3 className="font-bold">Sessions Used / Remaining</h3>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-teal-600" style={{ width: `${(client.sessionsUsed / client.sessionsTotal) * 100}%` }} />
            </div>
            <div className="mt-3 text-sm font-semibold text-slate-600">{client.sessionsUsed} used, {client.sessionsTotal - client.sessionsUsed} remaining</div>
          </Panel>
          <Panel className="p-4">
            <h3 className="font-bold">Status Toggle</h3>
            <div className="mt-4 grid gap-2">
              {(['Active', 'Paused', 'Churned'] as const).map((item) => (
                <button key={item} type="button" className={cn('rounded-lg border px-3 py-2 text-left text-sm font-semibold', item === client.status ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white')}>
                  {item}
                </button>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'Program' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel className="p-4 lg:col-span-2">
            <h3 className="font-bold">Current Program</h3>
            <div className="mt-4 grid gap-3">
              {['Day 1: Squat pattern + pull', 'Day 2: Push + core', 'Day 3: Hinge + conditioning'].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold">{item}</div>
              ))}
            </div>
          </Panel>
          <Panel className="p-4">
            <h3 className="font-bold">Program Actions</h3>
            <div className="mt-4 grid gap-2">
              <IconButton href="/programs" icon={Dumbbell}>Assign New Program</IconButton>
              <IconButton href="/clients/isha-sen" icon={FileText} tone="light">Export PDF</IconButton>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'Progress' && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <ProgressTile icon={Ruler} title="Weight + Measurements Log" value={client.weight} />
          <ProgressTile icon={Camera} title="Progress Photos" value="8 uploads" />
          <ProgressTile icon={Activity} title="Strength PRs" value="3 this month" />
          <ProgressTile icon={ListChecks} title="Charts Over Time" value="12 weeks" />
        </div>
      )}

      {tab === 'Payments' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Panel>
            <div className="border-b border-slate-200 px-4 py-3 font-bold">Payment History</div>
            <div className="divide-y divide-slate-100">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-semibold">{transaction.id}</div>
                    <div className="text-sm text-slate-500">{transaction.date} | {transaction.mode}</div>
                  </div>
                  <div className="font-bold">{currency(transaction.amount)}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="p-4">
            <h3 className="font-bold">Current Package + Expiry</h3>
            <div className="mt-3 text-sm text-slate-600">{client.packageName}</div>
            <div className="mt-1 text-lg font-bold">{client.expiry}</div>
            <div className="mt-4">
              <IconButton href="/payments/new" icon={Receipt}>Add Payment</IconButton>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'Notes' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-4">
            <h3 className="font-bold">Session Notes</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{client.trainerNote}</p>
          </Panel>
          <Panel className="p-4">
            <h3 className="font-bold">Files: Reports, Diet PDF</h3>
            <div className="mt-4 grid gap-2">
              {['Initial assessment.pdf', 'Diet plan week 4.pdf', 'Blood report.pdf'].map((file) => (
                <div key={file} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
                  <FileText size={16} className="text-slate-500" />
                  {file}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function ProgressTile({ icon: Icon, title, value }: { icon: LucideIcon; title: string; value: string }) {
  return (
    <Panel className="p-4">
      <Icon size={20} className="text-teal-700" />
      <div className="mt-4 text-sm font-semibold text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Panel>
  );
}

function SchedulePage() {
  const [view, setView] = useState<'Day' | 'Week'>('Day');
  const [outcome, setOutcome] = useState<'Present' | 'No-Show' | 'Cancelled'>('Present');

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        action={<IconButton href="/schedule/book" icon={CalendarCheck}>Book Session</IconButton>}
      />

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {(['Day', 'Week'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={cn('rounded-md px-4 py-2 text-sm font-semibold', view === item ? 'bg-slate-950 text-white' : 'text-slate-600')}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <div className="border-b border-slate-200 px-4 py-3 font-bold">Calendar: {view}</div>
          <div className="divide-y divide-slate-100">
            {todaysSessions.map((session) => (
              <div key={session.time} className="grid gap-2 px-4 py-4 md:grid-cols-[90px_1fr_120px] md:items-center">
                <div className="font-mono text-sm font-bold">{session.time}</div>
                <div>
                  <div className="font-semibold">{session.client}</div>
                  <div className="text-sm text-slate-500">{session.focus}</div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-center text-xs font-bold text-slate-600">
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-bold">Mark Attendance</h2>
          <div className="mt-4 grid gap-2">
            {(['Present', 'No-Show', 'Cancelled'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setOutcome(item)}
                className={cn('rounded-lg border px-3 py-2 text-left text-sm font-semibold', outcome === item ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white')}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700">
            {outcome === 'Present' && 'Deduct 1 Session'}
            {outcome === 'No-Show' && 'Deduct or Waive'}
            {outcome === 'Cancelled' && 'Reschedule'}
          </div>
          {outcome === 'Cancelled' && (
            <div className="mt-3">
              <IconButton href="/schedule/book" icon={Calendar} tone="light">Pick Date + Time</IconButton>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function BookSessionPage() {
  const [clientId, setClientId] = useState(demoClients[0].id);
  const [time, setTime] = useState('18:00');
  const [checked, setChecked] = useState(false);
  const client = demoClients.find((item) => item.id === clientId) || demoClients[0];
  const slotConflict = time === '18:00';
  const noBalance = client.sessionsTotal - client.sessionsUsed <= 0;

  return (
    <>
      <PageHeader eyebrow="Schedule" title="Book Session" action={<IconButton href="/schedule" icon={Calendar} tone="light">Calendar</IconButton>} />

      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Pick Client
            <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              {demoClients.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <Field label="Pick Date" type="date" />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Pick Time
            <select value={time} onChange={(event) => { setTime(event.target.value); setChecked(false); }} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="07:00">07:00</option>
              <option value="09:30">09:30</option>
              <option value="18:00">18:00</option>
              <option value="19:30">19:30</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setChecked(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            <CheckCircle2 size={16} />
            Check Slot
          </button>
          {checked && !slotConflict && !noBalance && (
            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              <Check size={16} />
              Confirm + Save
            </button>
          )}
        </div>

        {checked && slotConflict && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Conflict Warning
          </div>
        )}
        {checked && !slotConflict && noBalance && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
            <span>No Balance - Renew?</span>
            <Link href="/payments" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-rose-700">
              Payments
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </Panel>
    </>
  );
}

function ProgramsPage({ focusBuilder = false }: { focusBuilder?: boolean }) {
  return (
    <>
      <PageHeader
        eyebrow="Programs"
        title={focusBuilder ? 'Program Builder' : 'Exercise Library, Builder, Templates'}
        action={<IconButton href="/programs/builder" icon={Plus}>Program Builder</IconButton>}
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.2fr_0.9fr]">
        <Panel>
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <BookOpen size={17} className="text-sky-700" />
            <h2 className="font-bold">Exercise Library</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {exerciseLibrary.map((exercise) => (
              <div key={exercise.name} className="px-4 py-3">
                <div className="font-semibold">{exercise.name}</div>
                <div className="text-sm text-slate-500">{exercise.muscle} | {exercise.video}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 p-4">
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
              <Plus size={16} />
              Add Custom Exercise
            </button>
          </div>
        </Panel>

        <Panel className={cn('p-4', focusBuilder && 'ring-2 ring-slate-950')}>
          <div className="flex items-center gap-2">
            <Dumbbell size={18} className="text-teal-700" />
            <h2 className="font-bold">Program Builder</h2>
          </div>
          <div className="mt-4 grid gap-4">
            <SelectField label="Days / Split" options={['3 Day Strength', '4 Day Fat Loss', '2 Day Rehab']} />
            <div className="grid gap-2">
              {['Goblet Squat - 4 sets x 10 reps - RPE 7', 'Cable Row - 3 sets x 12 reps - RPE 8', 'Pallof Press - 3 sets x 10 reps - RPE 6'].map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
                <Plus size={16} />
                Add Exercises + Sets/Reps/RPE
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                <Check size={16} />
                Save as Template
              </button>
              <Link href="/clients/isha-sen" className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white">
                <User size={16} />
                Assign to Client
              </Link>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="border-b border-slate-200 px-4 py-3 font-bold">Saved Templates</div>
          <div className="divide-y divide-slate-100">
            {templates.map((template) => (
              <div key={template.name} className="px-4 py-3">
                <div className="font-semibold">{template.name}</div>
                <div className="text-sm text-slate-500">{template.days} | {template.assigned} assigned</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function PaymentsPage() {
  const dues = demoClients.filter((client) => client.due > 0);

  return (
    <>
      <PageHeader
        eyebrow="Payments"
        title="Transactions and dues"
        action={<IconButton href="/payments/new" icon={Receipt}>Record Payment</IconButton>}
      />

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <History size={17} className="text-sky-700" />
            <h2 className="font-bold">All Transactions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="grid gap-2 px-4 py-3 md:grid-cols-[100px_1fr_120px_120px] md:items-center">
                <div className="font-mono text-sm font-bold">{transaction.id}</div>
                <div>
                  <div className="font-semibold">{transaction.client}</div>
                  <div className="text-sm text-slate-500">{transaction.date} | {transaction.mode}</div>
                </div>
                <div className="font-bold">{currency(transaction.amount)}</div>
                <div className="text-sm font-semibold text-slate-500">{transaction.status}</div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <div className="border-b border-slate-200 px-4 py-3 font-bold">Dues List</div>
            <div className="divide-y divide-slate-100">
              {dues.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <span className="font-semibold">{client.name}</span>
                  <span className="font-bold text-rose-700">{currency(client.due)}</span>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel className="p-4">
            <h2 className="font-bold">Renew Expired Package</h2>
            <div className="mt-4 grid gap-2">
              {demoClients.filter((client) => client.expiry < '2026-07-20').map((client) => (
                <Link key={client.id} href="/payments/new" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  {client.name}
                  <ChevronRight size={15} />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function RecordPaymentPage() {
  const [mode, setMode] = useState<'Cash' | 'UPI' | 'Bank'>('UPI');
  const [paymentType, setPaymentType] = useState<'Full' | 'Partial'>('Partial');

  return (
    <>
      <PageHeader eyebrow="Payments" title="Record Payment" action={<IconButton href="/payments" icon={Wallet} tone="light">All Transactions</IconButton>} />

      <Panel className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField label="Pick Client" options={demoClients.map((client) => client.name)} />
          <Field label="Amount" placeholder="12000" />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Mode: Cash / UPI / Bank
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'UPI', 'Bank'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn('h-11 rounded-lg border text-sm font-semibold', mode === item ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white')}
                >
                  {item}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold text-slate-700">Full or Partial?</div>
          <div className="flex flex-wrap gap-2">
            {(['Full', 'Partial'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPaymentType(item)}
                className={cn('rounded-lg border px-4 py-2 text-sm font-semibold', paymentType === item ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white')}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            {paymentType === 'Partial' ? <AlertCircle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
            {paymentType === 'Partial' ? 'Log Balance Due' : 'Mark Package Active'}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            <Download size={16} />
            Generate Receipt PDF
          </button>
        </div>
      </Panel>
    </>
  );
}

function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <>
      <PageHeader eyebrow="Settings" title="Trainer workspace" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="p-4">
          <h2 className="font-bold">My Profile</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Your Name" placeholder="Trainer name" />
            <Field label="Photo URL" placeholder="https://..." />
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-bold">Package Types + Pricing</h2>
          <div className="mt-4 grid gap-2">
            {[
              ['PT 12 Sessions', 'Rs. 12,000'],
              ['PT 24 Sessions', 'Rs. 22,000'],
              ['PT 36 Sessions', 'Rs. 31,000'],
            ].map(([name, price]) => (
              <div key={name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
                <span>{name}</span>
                <span>{price}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-bold">Backup / Export All Data CSV</h2>
          <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
            <Download size={16} />
            Export CSV
          </button>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-bold">Import Clients CSV</h2>
          <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">
            <Upload size={16} />
            Import CSV
          </button>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-bold">Change Password</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Current Password" type="password" />
            <Field label="New Password" type="password" />
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-bold">Logout</h2>
          <button type="button" onClick={handleLogout} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">
            <LogOut size={16} />
            Logout
          </button>
        </Panel>
      </div>
    </>
  );
}

function SetupPage() {
  const router = useRouter();
  const [done, setDone] = useState({ profile: false, packages: false, hours: false });
  const complete = done.profile && done.packages && done.hours;

  function finish() {
    if (!complete) return;
    localStorage.setItem('solo-trainer-setup-complete', 'true');
    router.replace('/');
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">One-Time Setup</div>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Set up your solo trainer workspace</h1>
        </div>

        <div className="grid gap-5">
          <SetupBlock
            icon={User}
            title="Your Name + Photo"
            done={done.profile}
            onToggle={() => setDone((value) => ({ ...value, profile: !value.profile }))}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Your Name" placeholder="Trainer name" />
              <Field label="Photo URL" placeholder="https://..." />
            </div>
          </SetupBlock>

          <SetupBlock
            icon={Package}
            title="Package Types + Pricing"
            done={done.packages}
            onToggle={() => setDone((value) => ({ ...value, packages: !value.packages }))}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Package" placeholder="PT 12 Sessions" />
              <Field label="Sessions" placeholder="12" />
              <Field label="Price" placeholder="12000" />
            </div>
          </SetupBlock>

          <SetupBlock
            icon={Clock}
            title="Working Hours"
            done={done.hours}
            onToggle={() => setDone((value) => ({ ...value, hours: !value.hours }))}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Start Time" type="time" />
              <Field label="End Time" type="time" />
              <SelectField label="Working Days" options={['Mon-Sat', 'Mon-Fri', 'Custom']} />
            </div>
          </SetupBlock>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={finish}
            disabled={!complete}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold',
              complete ? 'bg-emerald-600 text-white' : 'cursor-not-allowed bg-slate-200 text-slate-500',
            )}
          >
            <Check size={17} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupBlock({
  icon: Icon,
  title,
  done,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  done: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
          <Icon size={18} />
        </div>
        <h2 className="flex-1 font-bold">{title}</h2>
        <button
          type="button"
          onClick={onToggle}
          className={cn('inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold', done ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-700')}
        >
          {done ? <Check size={16} /> : <CircleDollarSign size={16} />}
          {done ? 'Done' : 'Mark Done'}
        </button>
      </div>
      {children}
    </Panel>
  );
}

export default function SoloTrainerApp({ screen }: { screen: SoloScreen }) {
  if (screen === 'setup') return <SetupPage />;

  const content = (() => {
    switch (screen) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <ClientsPage />;
      case 'new-client':
        return <NewClientPage />;
      case 'client-profile':
        return <ClientProfilePage />;
      case 'schedule':
        return <SchedulePage />;
      case 'book-session':
        return <BookSessionPage />;
      case 'programs':
        return <ProgramsPage />;
      case 'program-builder':
        return <ProgramsPage focusBuilder />;
      case 'payments':
        return <PaymentsPage />;
      case 'record-payment':
        return <RecordPaymentPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  })();

  return <SoloShell>{content}</SoloShell>;
}
