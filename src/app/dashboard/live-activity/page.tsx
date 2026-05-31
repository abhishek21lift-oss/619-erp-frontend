'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  Activity, Users, CreditCard, Dumbbell, Bell, UserPlus,
  Search, Filter, RefreshCw, ChevronRight, Wifi, Zap,
  TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowUpRight
} from 'lucide-react';

/* ─── types ───────────────────────────────────────────────── */
type Category = 'all' | 'checkin' | 'payment' | 'pt' | 'lead' | 'alert';

interface ActivityItem {
  id: string;
  category: Exclude<Category, 'all'>;
  title: string;
  subtitle: string;
  amount?: string;
  time: string;
  ago: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  dot: string;
}

/* ─── mock data ───────────────────────────────────────────── */
const MOCK: ActivityItem[] = [
  { id:'1', category:'checkin', title:'Rahul Sharma checked in', subtitle:'Main Floor · Face ID', time:'5:31 AM', ago:'1m ago', icon:Users, color:'text-emerald-600', glow:'shadow-emerald-100', dot:'bg-emerald-500' },
  { id:'2', category:'payment', title:'₹4,200 payment received', subtitle:'Priya Mehta · UPI', amount:'₹4,200', time:'5:29 AM', ago:'3m ago', icon:CreditCard, color:'text-blue-600', glow:'shadow-blue-100', dot:'bg-blue-500' },
  { id:'3', category:'pt', title:'PT Session started', subtitle:'Trainer Vikram → Ankit Joshi', time:'5:28 AM', ago:'4m ago', icon:Dumbbell, color:'text-violet-600', glow:'shadow-violet-100', dot:'bg-violet-500' },
  { id:'4', category:'lead', title:'New lead captured', subtitle:'Sneha Gupta · Walk-in', time:'5:25 AM', ago:'7m ago', icon:UserPlus, color:'text-amber-600', glow:'shadow-amber-100', dot:'bg-amber-500' },
  { id:'5', category:'checkin', title:'Amit Patel checked in', subtitle:'Main Floor · Manual', time:'5:22 AM', ago:'10m ago', icon:Users, color:'text-emerald-600', glow:'shadow-emerald-100', dot:'bg-emerald-500' },
  { id:'6', category:'alert', title:'Membership expiring soon', subtitle:'3 members expire in 2 days', time:'5:20 AM', ago:'12m ago', icon:AlertCircle, color:'text-rose-600', glow:'shadow-rose-100', dot:'bg-rose-500' },
  { id:'7', category:'payment', title:'₹7,500 payment received', subtitle:'Deepak Kumar · Cash', amount:'₹7,500', time:'5:18 AM', ago:'14m ago', icon:CreditCard, color:'text-blue-600', glow:'shadow-blue-100', dot:'bg-blue-500' },
  { id:'8', category:'pt', title:'PT Session completed', subtitle:'Trainer Nisha → Meera Singh', time:'5:10 AM', ago:'22m ago', icon:Dumbbell, color:'text-violet-600', glow:'shadow-violet-100', dot:'bg-violet-500' },
  { id:'9', category:'checkin', title:'Neha Kapoor checked in', subtitle:'Yoga Room · Face ID', time:'5:05 AM', ago:'27m ago', icon:Users, color:'text-emerald-600', glow:'shadow-emerald-100', dot:'bg-emerald-500' },
  { id:'10', category:'lead', title:'New lead captured', subtitle:'Rohan Verma · Instagram', time:'5:00 AM', ago:'32m ago', icon:UserPlus, color:'text-amber-600', glow:'shadow-amber-100', dot:'bg-amber-500' },
];

const CATS: { id: Category; label: string; icon: React.ElementType }[] = [
  { id:'all',     label:'All Activity', icon:Activity },
  { id:'checkin', label:'Check-Ins',    icon:Users },
  { id:'payment', label:'Payments',     icon:CreditCard },
  { id:'pt',      label:'PT Sessions',  icon:Dumbbell },
  { id:'lead',    label:'Leads',        icon:UserPlus },
  { id:'alert',   label:'Alerts',       icon:Bell },
];

const KPI = [
  { label:'Check-Ins Today', value:'47', delta:'+12%', icon:Users, color:'from-emerald-500/10 to-emerald-500/5', accent:'text-emerald-600', border:'border-emerald-100' },
  { label:'Revenue Today',   value:'₹38.4K', delta:'+8%',  icon:CreditCard, color:'from-blue-500/10 to-blue-500/5', accent:'text-blue-600', border:'border-blue-100' },
  { label:'PT Sessions',     value:'14', delta:'+5%',  icon:Dumbbell, color:'from-violet-500/10 to-violet-500/5', accent:'text-violet-600', border:'border-violet-100' },
  { label:'New Leads',       value:'6',  delta:'+2',   icon:UserPlus, color:'from-amber-500/10 to-amber-500/5', accent:'text-amber-600', border:'border-amber-100' },
];

/* ─── component ───────────────────────────────────────────── */
export default function LiveActivityPage() {
  const [cat, setCat] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [pulse, setPulse] = useState(false);
  const [lastSync, setLastSync] = useState('Just now');

  const refresh = useCallback(() => {
    setPulse(true);
    setLastSync('Just now');
    setTimeout(() => setPulse(false), 700);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const items = MOCK.filter(i =>
    (cat === 'all' || i.category === cat) &&
    (i.title.toLowerCase().includes(search.toLowerCase()) ||
     i.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Link href="/dashboard" className="hover:text-slate-700 dark:text-white/70 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 dark:text-white/70">Live Activity</span>
          </nav>

          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Live Activity</h1>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-white/50">Real-time operations monitoring · 619 Fitness Studio</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-white/40 hidden sm:block">Synced {lastSync}</span>
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 text-sm font-medium hover:bg-slate-50 dark:bg-white/5 hover:border-slate-300 transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 transition-transform ${pulse ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-white/60 shadow-sm">
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span>Live</span>
              </div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KPI.map(k => (
              <div key={k.label} className={`relative rounded-2xl bg-gradient-to-br ${k.color} border ${k.border} p-4 backdrop-blur-sm overflow-hidden`}>
                <div className="flex items-start justify-between mb-3">
                  <k.icon className={`w-5 h-5 ${k.accent}`} />
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{k.delta}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{k.value}</p>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search activity…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-white/70 placeholder:text-slate-400 dark:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {CATS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    cat === c.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:bg-white/5'
                  }`}
                >
                  <c.icon className="w-3.5 h-3.5" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-white/70">Activity Feed</span>
                <span className="text-xs text-slate-400 dark:text-white/40 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{items.length} events</span>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-white/70 transition-colors">
                <Filter className="w-3.5 h-3.5" />
                Filter
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {items.length === 0 && (
                <div className="py-16 text-center">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 dark:text-white/40">No activity found</p>
                </div>
              )}
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 dark:bg-white/5/80 transition-colors group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={`w-2 h-2 rounded-full ${item.dot} ring-4 ring-white`} />
                    {idx < items.length - 1 && <div className="w-px flex-1 mt-2 min-h-[28px] bg-slate-100 dark:bg-white/10" />}
                  </div>
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-sm ${item.glow} group-hover:scale-105 transition-transform`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white/80 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                  {/* Meta */}
                  <div className="text-right flex-shrink-0">
                    {item.amount && <p className="text-sm font-bold text-slate-800 dark:text-white/80">{item.amount}</p>}
                    <p className="text-xs text-slate-400 dark:text-white/40">{item.ago}</p>
                    <p className="text-xs text-slate-300">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label:'Peak Hour Today', value:'7:00 – 8:00 AM', icon:TrendingUp, desc:'Highest traffic window' },
              { label:'Avg Check-In Time', value:'1.4 seconds', icon:Zap, desc:'Face recognition speed' },
              { label:'Capacity Utilization', value:'62%', icon:CheckCircle2, desc:'38 / 60 slots active' },
            ].map(s => (
              <div key={s.label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <s.icon className="w-5 h-5 text-slate-400 dark:text-white/40" />
                  <ArrowUpRight className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-sm font-medium text-slate-700 dark:text-white/70 mt-0.5">{s.label}</p>
                <p className="text-xs text-slate-400 dark:text-white/40 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </AppShell>
    </Guard>
  );
}
