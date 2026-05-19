'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight,
  Cpu, CreditCard, Dumbbell, Eye, Globe,
  LayoutDashboard, RefreshCw, Server, Shield,
  Smartphone, Users, Waves, Wifi, Zap,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { cn } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────
type SystemHealth = 'operational' | 'degraded' | 'down' | 'maintenance';

interface SystemItem {
  id: string;
  label: string;
  status: SystemHealth;
  value?: string;
  sub?: string;
  icon: React.ReactNode;
  uptime?: string;
}

// ─── Mock data ────────────────────────────────────────────────
const OCCUPANCY = {
  current: 34,
  max: 80,
  zones: [
    { name:'Weight Training',  occupancy:18, max:30, color:'violet' },
    { name:'Cardio Zone',       occupancy:9,  max:20, color:'sky' },
    { name:'Yoga Studio',       occupancy:5,  max:15, color:'emerald' },
    { name:'PT Area',           occupancy:2,  max:8,  color:'amber' },
  ]
};

const TRAINER_STATUS = [
  { name:'Rahul Singh',    status:'busy',      client:'Priya Mehta',    since:'45m' },
  { name:'Anita Gupta',   status:'available', client:'',               since:'' },
  { name:'Vikram Iyer',   status:'busy',      client:'Sanjay Patel',   since:'20m' },
  { name:'Meera Sharma',  status:'off',       client:'',               since:'' },
];

const SYSTEM_SERVICES: SystemItem[] = [
  { id:'face',  label:'Face Recognition',   status:'operational', value:'Online',     sub:'98 descriptors',     icon:<Eye size={16}/>,    uptime:'99.9%' },
  { id:'pay',   label:'Payment Gateway',    status:'operational', value:'Online',     sub:'Razorpay connected',  icon:<CreditCard size={16}/>, uptime:'99.8%' },
  { id:'api',   label:'Backend API',        status:'operational', value:'Online',     sub:'Render · 48ms avg',  icon:<Server size={16}/>, uptime:'99.7%' },
  { id:'db',    label:'Database',           status:'operational', value:'Online',     sub:'Supabase · healthy', icon:<Cpu size={16}/>,    uptime:'100%' },
  { id:'wa',    label:'WhatsApp Gateway',   status:'degraded',    value:'Slow',       sub:'Delayed ~2min',      icon:<Smartphone size={16}/>, uptime:'97.2%' },
  { id:'sync',  label:'Data Sync',          status:'operational', value:'Online',     sub:'Last sync 1m ago',   icon:<RefreshCw size={16}/>, uptime:'99.5%' },
  { id:'cdn',   label:'Media CDN',          status:'operational', value:'Online',     sub:'Vercel Edge',        icon:<Globe size={16}/>,  uptime:'100%' },
  { id:'wifi',  label:'Studio WiFi',        status:'operational', value:'Connected',  sub:'192.168.1.1',        icon:<Wifi size={16}/>,   uptime:'99.1%' },
];

const EQUIPMENT_STATUS = [
  { name:'Treadmill #1',  ok:true },
  { name:'Treadmill #2',  ok:true },
  { name:'Treadmill #3',  ok:false },
  { name:'Cross Trainer', ok:true },
  { name:'Bench Press',   ok:true },
  { name:'Squat Rack',    ok:true },
  { name:'Cable Machine', ok:true },
  { name:'Smith Machine', ok:true },
];

const STATUS_COLORS: Record<SystemHealth, { dot:string; badge:string; label:string }> = {
  operational: { dot:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 ring-emerald-200', label:'Operational' },
  degraded:    { dot:'bg-amber-500',   badge:'bg-amber-50 text-amber-700 ring-amber-200',       label:'Degraded' },
  down:        { dot:'bg-rose-500',    badge:'bg-rose-50 text-rose-700 ring-rose-200',           label:'Down' },
  maintenance: { dot:'bg-sky-500',     badge:'bg-sky-50 text-sky-700 ring-sky-200',             label:'Maintenance' },
};

// ─── Page ─────────────────────────────────────────────────────
export default function StudioStatusPage() {
  return (
    <Guard>
      <StudioStatusContent />
    </Guard>
  );
}

function StudioStatusContent() {
  const [lastRefresh, setLastRefresh] = React.useState(new Date());
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefresh(new Date()); }, 1000);
  };

  const degradedCount = SYSTEM_SERVICES.filter(s => s.status !== 'operational').length;
  const overallHealth: SystemHealth = degradedCount === 0 ? 'operational' : degradedCount <= 1 ? 'degraded' : 'down';
  const occupancyPct = Math.round((OCCUPANCY.current / OCCUPANCY.max) * 100);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400 pt-4">
          <LayoutDashboard size={12} />
          <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
          <ChevronRight size={10} />
          <span className="text-slate-700 font-medium">Studio Status</span>
        </nav>

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', {
              'bg-emerald-100':overallHealth==='operational',
              'bg-amber-100':overallHealth==='degraded',
              'bg-rose-100':overallHealth==='down',
            })}>
              {overallHealth === 'operational'
                ? <Shield size={22} className="text-emerald-600" />
                : <AlertTriangle size={22} className={overallHealth==='degraded'?'text-amber-600':'text-rose-600'} />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Studio Status</h1>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1', STATUS_COLORS[overallHealth].badge)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', STATUS_COLORS[overallHealth].dot)} />
                  {STATUS_COLORS[overallHealth].label}
                </span>
              </div>
              <p className="text-slate-500 text-sm">
                Last updated {lastRefresh.toLocaleTimeString()} · {degradedCount === 0 ? 'All systems nominal' : `${degradedCount} issue${degradedCount>1?'s':''} detected`}
              </p>
            </div>
          </div>
          <button onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-all">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label:'In Gym Now',       value:OCCUPANCY.current.toString(), sub:`of ${OCCUPANCY.max} capacity`, color:'violet', icon:<Users size={18}/> },
            { label:'Occupancy',        value:`${occupancyPct}%`,            sub:'Floor utilization',            color:'sky',    icon:<Activity size={18}/> },
            { label:'Trainers Active',  value:TRAINER_STATUS.filter(t=>t.status==='busy').length.toString(), sub:'In session', color:'amber', icon:<Dumbbell size={18}/> },
            { label:'System Health',    value:`${SYSTEM_SERVICES.filter(s=>s.status==='operational').length}/${SYSTEM_SERVICES.length}`, sub:'Services online', color:'emerald', icon:<Zap size={18}/> },
          ].map(s => (
            <div key={s.label}
              className="relative rounded-2xl bg-white border border-slate-100 shadow-sm px-4 py-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className={cn('rounded-xl p-2', {
                'bg-violet-50 text-violet-600': s.color==='violet',
                'bg-sky-50 text-sky-600': s.color==='sky',
                'bg-amber-50 text-amber-600': s.color==='amber',
                'bg-emerald-50 text-emerald-600': s.color==='emerald',
              })}>{s.icon}</div>
              <div>
                <p className="text-[11px] font-medium text-slate-400 leading-none mb-1">{s.label}</p>
                <p className="text-xl font-bold text-slate-900 leading-none tabular-nums">{s.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Occupancy */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-900">Floor Occupancy</h2>
              <span className={cn('text-xs font-bold', occupancyPct>80?'text-rose-600':occupancyPct>60?'text-amber-600':'text-emerald-600')}>
                {occupancyPct}% full
              </span>
            </div>
            <div className="mb-5">
              <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', {
                    'bg-emerald-500': occupancyPct <= 60,
                    'bg-amber-500':   occupancyPct > 60 && occupancyPct <= 80,
                    'bg-rose-500':    occupancyPct > 80,
                  })}
                  style={{ width:`${occupancyPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-slate-400">{OCCUPANCY.current} members in gym</span>
                <span className="text-xs text-slate-400">Capacity: {OCCUPANCY.max}</span>
              </div>
            </div>
            <div className="space-y-3">
              {OCCUPANCY.zones.map(z => {
                const pct = Math.round((z.occupancy/z.max)*100);
                return (
                  <div key={z.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{z.name}</span>
                      <span className="text-xs text-slate-500">{z.occupancy}/{z.max}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', {
                          'bg-violet-500': z.color==='violet',
                          'bg-sky-500': z.color==='sky',
                          'bg-emerald-500': z.color==='emerald',
                          'bg-amber-500': z.color==='amber',
                        })}
                        style={{ width:`${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trainer availability */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-5">Trainer Availability</h2>
            <div className="space-y-3">
              {TRAINER_STATUS.map(t => (
                <div key={t.name} className="flex items-center gap-3 rounded-xl border border-slate-50 bg-slate-50/60 px-4 py-3">
                  <div className={cn('h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white', {
                    'bg-emerald-500': t.status==='available',
                    'bg-violet-500':  t.status==='busy',
                    'bg-slate-400':   t.status==='off',
                  })}>
                    {t.name.split(' ').map(p=>p[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    {t.client && <p className="text-xs text-slate-500 truncate">With {t.client} · {t.since}</p>}
                  </div>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', {
                    'bg-emerald-50 text-emerald-700': t.status==='available',
                    'bg-violet-50 text-violet-700':   t.status==='busy',
                    'bg-slate-100 text-slate-500':    t.status==='off',
                  })}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System services */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-5">System Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {SYSTEM_SERVICES.map(svc => {
              const sc = STATUS_COLORS[svc.status];
              return (
                <div key={svc.id}
                  className={cn('rounded-xl border p-4 transition-all', {
                    'border-emerald-100 bg-emerald-50/30': svc.status==='operational',
                    'border-amber-100  bg-amber-50/40':   svc.status==='degraded',
                    'border-rose-100   bg-rose-50/40':    svc.status==='down',
                  })}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', {
                      'bg-emerald-100 text-emerald-600': svc.status==='operational',
                      'bg-amber-100 text-amber-600':     svc.status==='degraded',
                      'bg-rose-100 text-rose-600':       svc.status==='down',
                    })}>{svc.icon}</div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', sc.badge)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', svc.status==='operational'?'animate-pulse':'', sc.dot)} />
                      {sc.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{svc.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{svc.sub}</p>
                  {svc.uptime && <p className="text-[10px] text-slate-400 mt-1.5">Uptime: {svc.uptime}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipment */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-5">Equipment Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EQUIPMENT_STATUS.map(eq => (
              <div key={eq.name} className={cn('flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5', {
                'border-emerald-100 bg-emerald-50/40': eq.ok,
                'border-rose-100 bg-rose-50/40': !eq.ok,
              })}>
                {eq.ok
                  ? <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  : <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                }
                <span className={cn('text-xs font-medium', eq.ok ? 'text-slate-700' : 'text-rose-700')}>{eq.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
