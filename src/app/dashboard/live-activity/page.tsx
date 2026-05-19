'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity, ArrowRight, Bell, CheckCircle2, ChevronRight,
  CreditCard, Dumbbell, Filter, LayoutDashboard, RefreshCw,
  Search, User, UserPlus, Users, Wifi, X, Zap,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { cn } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────
type ActivityCategory = 'all' | 'checkin' | 'payment' | 'pt' | 'lead' | 'system';

interface ActivityItem {
  id: string;
  type: ActivityCategory;
  title: string;
  subtitle: string;
  time: string;
  avatar?: string;
  amount?: string;
  badge?: string;
  badgeColor?: string;
  isNew?: boolean;
}

// ─── Mock data ────────────────────────────────────────────────
const MOCK_ACTIVITIES: ActivityItem[] = [
  { id:'a1', type:'checkin',  title:'Rahul Sharma checked in',     subtitle:'Main floor · Bench area',    time:'just now', badge:'Check-in',  badgeColor:'emerald', isNew:true },
  { id:'a2', type:'payment',  title:'₹4,500 payment received',     subtitle:'Priya Mehta · Monthly plan', time:'1m ago',   badge:'Payment',  badgeColor:'sky',     amount:'₹4,500' },
  { id:'a3', type:'pt',       title:'PT Session started',          subtitle:'Arjun Patel + Trainer Rahul',time:'3m ago',   badge:'PT',       badgeColor:'violet' },
  { id:'a4', type:'checkin',  title:'Sneha Gupta checked in',      subtitle:'Cardio zone',                time:'4m ago',   badge:'Check-in', badgeColor:'emerald' },
  { id:'a5', type:'lead',     title:'New lead added',              subtitle:'Vikram Singh · Walk-in',     time:'7m ago',   badge:'Lead',     badgeColor:'amber', isNew:true },
  { id:'a6', type:'payment',  title:'₹12,000 PT renewal',          subtitle:'Deepika Nair · 3-month PT',  time:'11m ago',  badge:'Payment',  badgeColor:'sky',     amount:'₹12,000' },
  { id:'a7', type:'checkin',  title:'Anita Joshi checked in',      subtitle:'Weight training area',       time:'14m ago',  badge:'Check-in', badgeColor:'emerald' },
  { id:'a8', type:'system',   title:'Face recognition sync',       subtitle:'98 descriptors updated',     time:'18m ago',  badge:'System',   badgeColor:'rose' },
  { id:'a9', type:'pt',       title:'PT Session completed',        subtitle:'Rohit Kumar · Strength',     time:'22m ago',  badge:'PT',       badgeColor:'violet' },
  { id:'a10',type:'checkin',  title:'Kavita Rao checked in',       subtitle:'Yoga studio',                time:'25m ago',  badge:'Check-in', badgeColor:'emerald' },
  { id:'a11',type:'payment',  title:'₹2,200 collected',            subtitle:'Sanjay Dubey · Locker fee',  time:'31m ago',  badge:'Payment',  badgeColor:'sky',     amount:'₹2,200' },
  { id:'a12',type:'lead',     title:'Lead converted to member',    subtitle:'Meera Iyer · Gold plan',     time:'38m ago',  badge:'Lead',     badgeColor:'amber' },
];

const CATEGORY_TABS: { id: ActivityCategory; label: string; icon: React.ReactNode }[] = [
  { id:'all',     label:'All',      icon:<Activity size={13}/> },
  { id:'checkin', label:'Check-ins',icon:<CheckCircle2 size={13}/> },
  { id:'payment', label:'Payments', icon:<CreditCard size={13}/> },
  { id:'pt',      label:'PT',       icon:<Dumbbell size={13}/> },
  { id:'lead',    label:'Leads',    icon:<UserPlus size={13}/> },
  { id:'system',  label:'System',   icon:<Zap size={13}/> },
];

const BADGE_CLASSES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
  sky:     'bg-sky-50 text-sky-700 ring-sky-200/60',
  violet:  'bg-violet-50 text-violet-700 ring-violet-200/60',
  amber:   'bg-amber-50 text-amber-700 ring-amber-200/60',
  rose:    'bg-rose-50 text-rose-700 ring-rose-200/60',
};

const TYPE_ICON: Record<ActivityCategory, React.ReactNode> = {
  all:     <Activity size={15}/>,
  checkin: <CheckCircle2 size={15}/>,
  payment: <CreditCard size={15}/>,
  pt:      <Dumbbell size={15}/>,
  lead:    <UserPlus size={15}/>,
  system:  <Zap size={15}/>,
};

const TYPE_ICON_BG: Record<ActivityCategory, string> = {
  all:     'bg-slate-100 text-slate-500',
  checkin: 'bg-emerald-100 text-emerald-600',
  payment: 'bg-sky-100 text-sky-600',
  pt:      'bg-violet-100 text-violet-600',
  lead:    'bg-amber-100 text-amber-600',
  system:  'bg-rose-100 text-rose-600',
};

// ─── Stats ────────────────────────────────────────────────────
const LIVE_STATS = [
  { label:'Members In Gym',  value:'34',   delta:'+3',  color:'emerald', icon:<Users size={18}/> },
  { label:'Today Check-ins', value:'127',  delta:'+12', color:'sky',     icon:<CheckCircle2 size={18}/> },
  { label:'Revenue Today',   value:'₹28K', delta:'+8%', color:'violet',  icon:<CreditCard size={18}/> },
  { label:'PT Sessions',     value:'9',    delta:'+2',  color:'amber',   icon:<Dumbbell size={18}/> },
];

// ─── Page ─────────────────────────────────────────────────────
export default function LiveActivityPage() {
  return (
    <Guard>
      <LiveActivityContent />
    </Guard>
  );
}

function LiveActivityContent() {
  const [category, setCategory] = React.useState<ActivityCategory>('all');
  const [search, setSearch] = React.useState('');
  const [syncing, setSyncing] = React.useState(false);
  const [activities, setActivities] = React.useState(MOCK_ACTIVITIES);

  const filtered = activities.filter(a =>
    (category === 'all' || a.type === category) &&
    (search === '' || a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const handleRefresh = () => {
    setSyncing(true);
    setTimeout(() => {
      setActivities([...MOCK_ACTIVITIES]);
      setSyncing(false);
    }, 1200);
  };

  // Auto-refresh every 30s
  React.useEffect(() => {
    const t = setInterval(handleRefresh, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400 pt-4">
          <LayoutDashboard size={12} />
          <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
          <ChevronRight size={10} />
          <span className="text-slate-700 font-medium">Live Activity</span>
        </nav>

        {/* Page header */}
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Live</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Activity</h1>
            <p className="text-slate-500 text-sm mt-0.5">Real-time operational monitoring · auto-refreshes every 30s</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Refresh'}
            </button>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
              <Wifi size={12} className="text-emerald-500" />
              Live Sync
            </div>
          </div>
        </header>

        {/* Live stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {LIVE_STATS.map(s => (
            <div key={s.label}
              className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={cn('rounded-xl p-2', {
                'bg-emerald-50 text-emerald-600': s.color==='emerald',
                'bg-sky-50 text-sky-600': s.color==='sky',
                'bg-violet-50 text-violet-600': s.color==='violet',
                'bg-amber-50 text-amber-600': s.color==='amber',
              })}>{s.icon}</div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 leading-none mb-1">{s.label}</p>
                <p className="text-xl font-bold text-slate-900 leading-none tabular-nums">{s.value}</p>
              </div>
              <span className={cn('ml-auto text-xs font-semibold', {
                'text-emerald-600': s.color==='emerald',
                'text-sky-600': s.color==='sky',
                'text-violet-600': s.color==='violet',
                'text-amber-600': s.color==='amber',
              })}>{s.delta}</span>
            </div>
          ))}
        </div>

        {/* Filters toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          {/* Category tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1 overflow-x-auto">
            {CATEGORY_TABS.map(t => (
              <button key={t.id} onClick={() => setCategory(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150',
                  category === t.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search activity…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all">
              <Filter size={12} />
              Branch
            </button>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="relative">
          {/* timeline spine */}
          <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent hidden sm:block" />

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Bell size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 text-sm">No activity found</p>
              </div>
            ) : filtered.map((item, i) => (
              <div key={item.id}
                className={cn(
                  'group relative flex items-start gap-4 rounded-2xl bg-white border px-4 py-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 sm:pl-14',
                  item.isNew ? 'border-violet-200 ring-1 ring-violet-100' : 'border-slate-100'
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* icon dot */}
                <div className={cn(
                  'hidden sm:flex absolute left-[11px] top-[14px] h-6 w-6 items-center justify-center rounded-full ring-4 ring-white',
                  TYPE_ICON_BG[item.type]
                )}>
                  {TYPE_ICON[item.type]}
                </div>

                <div className="sm:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{background:'rgba(124,58,237,0.07)'}}>
                  <User size={15} className="text-violet-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn('text-sm font-semibold text-slate-900', item.isNew && 'text-violet-900')}>
                        {item.title}
                        {item.isNew && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">NEW</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.amount && (
                        <span className="text-sm font-bold tabular-nums text-emerald-700">{item.amount}</span>
                      )}
                      {item.badge && (
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', BADGE_CLASSES[item.badgeColor ?? 'slate'])}>
                          {item.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="mt-6 text-center">
            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors">
              Load more activity <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
