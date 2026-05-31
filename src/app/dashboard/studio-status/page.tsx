'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  Activity, Wifi, Server, CreditCard, ScanFace,
  Users, Dumbbell, Thermometer, Zap, ShieldCheck,
  ChevronRight, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Monitor, Gauge, Radio
} from 'lucide-react';

/* ─── types ───────────────────────────────────────────────── */
type HealthStatus = 'operational' | 'degraded' | 'offline';

interface SystemItem {
  id: string;
  label: string;
  sublabel: string;
  status: HealthStatus;
  value?: string;
  icon: React.ElementType;
  lastCheck: string;
}

interface EquipmentItem {
  name: string;
  type: string;
  status: 'available' | 'in-use' | 'maintenance';
}

interface TrainerItem {
  name: string;
  status: 'available' | 'in-session' | 'break';
  current?: string;
}

/* ─── mock data ───────────────────────────────────────────── */
const SYSTEMS: SystemItem[] = [
  { id:'internet',  label:'Internet Connectivity', sublabel:'Main fiber line · 100 Mbps', status:'operational', value:'98ms', icon:Wifi, lastCheck:'1m ago' },
  { id:'backend',   label:'Backend API',           sublabel:'api.619fitness.com', status:'operational', value:'142ms', icon:Server, lastCheck:'30s ago' },
  { id:'payment',   label:'Payment Gateway',       sublabel:'Razorpay · UPI + Cards', status:'operational', value:'99.9%', icon:CreditCard, lastCheck:'2m ago' },
  { id:'biometric', label:'Face Recognition',      sublabel:'face-api.js · TF.js backend', status:'operational', value:'1.4s', icon:ScanFace, lastCheck:'5m ago' },
  { id:'camera',    label:'CCTV / Camera System',  sublabel:'4 cameras active', status:'operational', value:'4/4', icon:Monitor, lastCheck:'1m ago' },
  { id:'sync',      label:'Data Sync',             sublabel:'Cloud sync · real-time', status:'operational', value:'Live', icon:Radio, lastCheck:'10s ago' },
];

const EQUIPMENT: EquipmentItem[] = [
  { name:'Treadmill #1', type:'Cardio', status:'in-use' },
  { name:'Treadmill #2', type:'Cardio', status:'in-use' },
  { name:'Treadmill #3', type:'Cardio', status:'maintenance' },
  { name:'Treadmill #4', type:'Cardio', status:'available' },
  { name:'Cross Trainer', type:'Cardio', status:'in-use' },
  { name:'Cycle #1', type:'Cardio', status:'available' },
  { name:'Cycle #2', type:'Cardio', status:'in-use' },
  { name:'Bench Press', type:'Strength', status:'available' },
  { name:'Squat Rack', type:'Strength', status:'in-use' },
  { name:'Cable Machine', type:'Strength', status:'available' },
  { name:'Smith Machine', type:'Strength', status:'in-use' },
  { name:'Leg Press', type:'Strength', status:'available' },
];

const TRAINERS: TrainerItem[] = [
  { name:'Vikram Singh',  status:'in-session', current:'Ankit Joshi — Strength' },
  { name:'Nisha Kapoor',  status:'in-session', current:'Meera Singh — Yoga' },
  { name:'Rohit Sharma',  status:'available' },
  { name:'Priya Bose',    status:'break' },
];

/* ─── helpers ────────────────────────────────────────────── */
const statusConfig: Record<HealthStatus, { label: string; dot: string; badge: string; icon: React.ElementType }> = {
  operational: { label:'Operational', dot:'bg-emerald-500', badge:'bg-emerald-50 text-emerald-700 border-emerald-200', icon:CheckCircle2 },
  degraded:    { label:'Degraded',    dot:'bg-amber-500',   badge:'bg-amber-50 text-amber-700 border-amber-200',   icon:AlertTriangle },
  offline:     { label:'Offline',     dot:'bg-rose-500',    badge:'bg-rose-50 text-rose-700 border-rose-200',     icon:AlertTriangle },
};

/* ─── component ───────────────────────────────────────────── */
export default function StudioStatusPage() {
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const allOperational = SYSTEMS.every(s => s.status === 'operational');
  const occupancy = 38;
  const capacity = 60;
  const pct = Math.round((occupancy / capacity) * 100);

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Link href="/dashboard" className="hover:text-slate-700 dark:text-white/70 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 dark:text-white/70">Studio Status</span>
          </nav>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-200">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Studio Status</h1>
                {allOperational ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    All Systems Operational
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Partial Degradation
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-white/50">
                Real-time health monitoring · Last updated {now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 text-sm font-medium hover:bg-slate-50 dark:bg-white/5 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Top KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'Members Active', value:`${occupancy}`, sub:`of ${capacity} capacity`, icon:Users, color:'text-emerald-600', bg:'from-emerald-50 to-teal-50', border:'border-emerald-100' },
              { label:'Trainers On Duty', value:'2/4', sub:'2 in session now', icon:Dumbbell, color:'text-violet-600', bg:'from-violet-50 to-purple-50', border:'border-violet-100' },
              { label:'System Health', value:'100%', sub:'6/6 systems up', icon:ShieldCheck, color:'text-blue-600', bg:'from-blue-50 to-sky-50', border:'border-blue-100' },
              { label:'Uptime Today', value:'99.9%', sub:'0m downtime', icon:Zap, color:'text-amber-600', bg:'from-amber-50 to-yellow-50', border:'border-amber-100' },
            ].map(k => (
              <div key={k.label} className={`rounded-2xl bg-gradient-to-br ${k.bg} border ${k.border} p-4`}>
                <k.icon className={`w-5 h-5 ${k.color} mb-3`} />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-white/70 mt-0.5">{k.label}</p>
                <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* System Health — 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white/70 flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400 dark:text-white/40" />
                System Health
              </h2>
              <div className="space-y-2">
                {SYSTEMS.map(sys => {
                  const sc = statusConfig[sys.status];
                  return (
                    <div key={sys.id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 p-4 shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
                        <sys.icon className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white/80">{sys.label}</p>
                        <p className="text-xs text-slate-400 dark:text-white/40 truncate">{sys.sublabel}</p>
                      </div>
                      {sys.value && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-700 dark:text-white/70">{sys.value}</p>
                          <p className="text-xs text-slate-400 dark:text-white/40">Last: {sys.lastCheck}</p>
                        </div>
                      )}
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold flex-shrink-0 ${sc.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${
                          sys.status === 'operational' ? 'animate-pulse' : ''
                        }`} />
                        {sc.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Equipment Status */}
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white/70 flex items-center gap-2 mt-2">
                <Dumbbell className="w-4 h-4 text-slate-400 dark:text-white/40" />
                Equipment Status
              </h2>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-slate-100">
                  {EQUIPMENT.map(eq => (
                    <div key={eq.name} className="p-3 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        eq.status === 'available' ? 'bg-emerald-400' :
                        eq.status === 'in-use' ? 'bg-blue-400' : 'bg-amber-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-white/70 truncate">{eq.name}</p>
                        <p className="text-xs text-slate-400 dark:text-white/40 capitalize">{eq.status.replace('-',' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 flex items-center gap-4">
                  {[{c:'bg-emerald-400',l:'Available'},{c:'bg-blue-400',l:'In Use'},{c:'bg-amber-400',l:'Maintenance'}].map(s=>(
                    <span key={s.l} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
                      <span className={`w-2 h-2 rounded-full ${s.c}`} />{s.l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">

              {/* Occupancy gauge */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-white/70">Live Occupancy</p>
                    <p className="text-xs text-slate-400 dark:text-white/40">Floor capacity: {capacity}</p>
                  </div>
                  <Gauge className="w-5 h-5 text-slate-400 dark:text-white/40" />
                </div>
                <div className="relative">
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">{occupancy}</span>
                    <span className="text-sm text-slate-400 dark:text-white/40 mb-1">/ {capacity} members</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct > 85 ? 'bg-rose-500' : pct > 65 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-white/40 mt-1.5">{pct}% capacity utilization</p>
                </div>
              </div>

              {/* Trainer Status */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-700 dark:text-white/70 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400 dark:text-white/40" />
                  Trainer Availability
                </p>
                <div className="space-y-3">
                  {TRAINERS.map(tr => (
                    <div key={tr.name} className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-600 dark:text-white/60">{tr.name[0]}</span>
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          tr.status === 'available' ? 'bg-emerald-500' :
                          tr.status === 'in-session' ? 'bg-blue-500' : 'bg-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-white/70">{tr.name}</p>
                        <p className="text-xs text-slate-400 dark:text-white/40 truncate">
                          {tr.status === 'in-session' ? tr.current : tr.status === 'available' ? 'Available' : 'On break'}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        tr.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                        tr.status === 'in-session' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50'
                      }`}>
                        {tr.status.replace('-',' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick health summary */}
              <div className={`rounded-2xl p-4 border ${
                allOperational
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className={`w-4 h-4 ${allOperational ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span className={`text-sm font-semibold ${allOperational ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {allOperational ? 'All systems healthy' : 'Attention needed'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  {allOperational
                    ? 'No issues detected. All critical services are running normally.'
                    : 'One or more systems need attention. Check degraded services above.'}
                </p>
              </div>

            </div>
          </div>

        </div>
      </AppShell>
    </Guard>
  );
}
