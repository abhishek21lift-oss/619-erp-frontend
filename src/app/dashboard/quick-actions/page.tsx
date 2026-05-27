'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  UserPlus, Dumbbell, FileText, CreditCard, CalendarPlus,
  ClipboardList, Salad, Target, ScanFace, Download,
  ChevronRight, Zap, Star, Clock, ArrowRight, Search,
  TrendingUp, Bell, Pin
} from 'lucide-react';

/* ─── types ───────────────────────────────────────────────── */
interface Action {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  tag?: string;
  pinned?: boolean;
}

/* ─── actions ─────────────────────────────────────────────── */
const ACTIONS: Action[] = [
  { id:'add-member',   label:'Add Member',        desc:'Enroll a new gym member',         icon:UserPlus,     href:'/clients/new',               color:'text-emerald-600', bg:'from-emerald-50 to-teal-50',    border:'border-emerald-100', glow:'hover:shadow-emerald-100', tag:'Popular', pinned:true },
  { id:'new-pt',       label:'New PT Client',     desc:'Assign personal trainer',         icon:Dumbbell,     href:'/clients/new',               color:'text-violet-600',  bg:'from-violet-50 to-purple-50',   border:'border-violet-100',  glow:'hover:shadow-violet-100',  tag:'Popular', pinned:true },
  { id:'invoice',      label:'Create Invoice',    desc:'Generate member invoice',         icon:FileText,     href:'/payments',                  color:'text-blue-600',    bg:'from-blue-50 to-sky-50',        border:'border-blue-100',    glow:'hover:shadow-blue-100' },
  { id:'payment',      label:'Record Payment',    desc:'Log a cash/UPI payment',          icon:CreditCard,   href:'/payments',                  color:'text-amber-600',   bg:'from-amber-50 to-yellow-50',    border:'border-amber-100',   glow:'hover:shadow-amber-100', tag:'Quick' },
  { id:'session',      label:'Schedule Session',  desc:'Book a PT or group session',      icon:CalendarPlus, href:'/appointments',              color:'text-teal-600',    bg:'from-teal-50 to-cyan-50',       border:'border-teal-100',    glow:'hover:shadow-teal-100' },
  { id:'workout',      label:'Create Workout',    desc:'Design a workout plan',           icon:ClipboardList,href:'/clients',                   color:'text-orange-600',  bg:'from-orange-50 to-amber-50',    border:'border-orange-100',  glow:'hover:shadow-orange-100' },
  { id:'diet',         label:'Create Diet Plan',  desc:'Build a nutrition program',       icon:Salad,        href:'/clients',                   color:'text-lime-600',    bg:'from-lime-50 to-green-50',      border:'border-lime-100',    glow:'hover:shadow-lime-100' },
  { id:'lead',         label:'Add Lead',          desc:'Capture a new prospect',          icon:Target,       href:'/clients/new',               color:'text-rose-600',    bg:'from-rose-50 to-pink-50',       border:'border-rose-100',    glow:'hover:shadow-rose-100', tag:'New' },
  { id:'checkin',      label:'Start Check-In',    desc:'Open face-recognition kiosk',     icon:ScanFace,     href:'/checkin',                   color:'text-indigo-600',  bg:'from-indigo-50 to-violet-50',   border:'border-indigo-100',  glow:'hover:shadow-indigo-100', tag:'Live', pinned:true },
  { id:'report',       label:'Export Report',     desc:'Download analytics PDF',          icon:Download,     href:'/reports',                   color:'text-slate-600',   bg:'from-slate-50 to-gray-50',      border:'border-slate-200',   glow:'hover:shadow-slate-100' },
];

const RECENT = ['add-member', 'payment', 'checkin'];
const AI_SUGGESTIONS = [
  { label:'Send renewal reminders', desc:'8 members expire this week', icon:Bell, color:'text-amber-600' },
  { label:'Review overdue dues', desc:'₹24,500 pending collection', icon:TrendingUp, color:'text-rose-600' },
  { label:'Schedule PT review', desc:'3 clients due for assessment', icon:Dumbbell, color:'text-violet-600' },
];

/* ─── component ───────────────────────────────────────────── */
export default function QuickActionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [hover, setHover] = useState<string | null>(null);

  const filtered = ACTIONS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.desc.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(a => a.pinned);
  const rest   = filtered.filter(a => !a.pinned);

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/20 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700">Quick Actions</span>
          </nav>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Quick Actions</h1>
              </div>
              <p className="text-sm text-slate-500">Command center for fast operations · 619 Fitness Studio</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search actions…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all shadow-sm"
            />
          </div>

          {/* Pinned / Primary Actions */}
          {pinned.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pinned</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {pinned.map(a => (
                  <ActionCard key={a.id} action={a} hover={hover} setHover={setHover} large onClick={() => router.push(a.href)} />
                ))}
              </div>
            </section>
          )}

          {/* All Actions Grid */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Actions</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {rest.map(a => (
                <ActionCard key={a.id} action={a} hover={hover} setHover={setHover} onClick={() => router.push(a.href)} />
              ))}
            </div>
          </section>

          {/* Recent + AI Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Recently Used</span>
              </div>
              <div className="space-y-2">
                {ACTIONS.filter(a => RECENT.includes(a.id)).map(a => (
                  <button
                    key={a.id}
                    onClick={() => router.push(a.href)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.bg} border ${a.border} flex items-center justify-center`}>
                      <a.icon className={`w-4 h-4 ${a.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-700">{a.label}</p>
                      <p className="text-xs text-slate-400">{a.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-gradient-to-br from-violet-50/80 to-purple-50/60 backdrop-blur-sm rounded-2xl border border-violet-200/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-violet-900">AI Suggested Actions</span>
              </div>
              <div className="space-y-2">
                {AI_SUGGESTIONS.map(s => (
                  <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/80 hover:bg-white/90 transition-colors cursor-pointer">
                    <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{s.label}</p>
                      <p className="text-xs text-slate-400 truncate">{s.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </AppShell>
    </Guard>
  );
}

/* ─── sub-component ────────────────────────────────────────── */
function ActionCard({
  action, hover, setHover, onClick, large = false
}: {
  action: Action;
  hover: string | null;
  setHover: (id: string | null) => void;
  onClick: () => void;
  large?: boolean;
}) {
  const isHovered = hover === action.id;
  return (
    <button
      onMouseEnter={() => setHover(action.id)}
      onMouseLeave={() => setHover(null)}
      onClick={onClick}
      className={`relative w-full text-left rounded-2xl bg-gradient-to-br ${action.bg} border ${action.border} ${
        large ? 'p-6' : 'p-4'
      } transition-all duration-200 hover:shadow-lg ${action.glow} hover:-translate-y-0.5 group overflow-hidden`}
    >
      {/* Tag */}
      {action.tag && (
        <span className="absolute top-3 right-3 text-xs font-semibold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200/60">
          {action.tag}
        </span>
      )}
      {/* Icon */}
      <div className={`${
        large ? 'w-12 h-12 mb-4 rounded-xl' : 'w-9 h-9 mb-3 rounded-lg'
      } bg-white border ${action.border} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
        <action.icon className={`${large ? 'w-6 h-6' : 'w-4 h-4'} ${action.color}`} />
      </div>
      <p className={`font-semibold text-slate-800 ${large ? 'text-base mb-1' : 'text-sm'}`}>{action.label}</p>
      {large && <p className="text-xs text-slate-500">{action.desc}</p>}
      {/* Arrow on hover */}
      <ArrowRight className={`absolute bottom-4 right-4 w-4 h-4 text-slate-300 transition-all ${
        isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
      }`} />
    </button>
  );
}
