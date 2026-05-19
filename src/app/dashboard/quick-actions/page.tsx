'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CalendarPlus, ChevronRight, ClipboardList, CreditCard,
  Dumbbell, FileText, LayoutDashboard, Pin, Salad,
  Sparkles, UserCheck, UserPlus, Users, Zap,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { cn } from '@/components/ui';

// ─── Actions config ───────────────────────────────────────────
const PRIMARY_ACTIONS = [
  {
    id:'add-member',
    label:'Add Member',
    description:'Register a new gym member and set up their subscription',
    href:'/clients/new',
    icon:<UserPlus size={28}/>,
    gradient:'from-violet-500 to-violet-700',
    glow:'rgba(124,58,237,0.25)',
    accent:'violet',
    pinned:true,
  },
  {
    id:'new-pt',
    label:'New PT Client',
    description:'Assign a personal trainer to a member and start their PT journey',
    href:'/pt/clients/new',
    icon:<Dumbbell size={28}/>,
    gradient:'from-amber-500 to-orange-600',
    glow:'rgba(245,158,11,0.25)',
    accent:'amber',
    pinned:true,
  },
  {
    id:'create-invoice',
    label:'Create Invoice',
    description:'Generate a new billing invoice for services rendered',
    href:'/sales/invoices/new',
    icon:<FileText size={28}/>,
    gradient:'from-sky-500 to-blue-600',
    glow:'rgba(14,165,233,0.25)',
    accent:'sky',
    pinned:true,
  },
  {
    id:'record-payment',
    label:'Record Payment',
    description:'Log an incoming payment and update member account balance',
    href:'/payments/new',
    icon:<CreditCard size={28}/>,
    gradient:'from-emerald-500 to-teal-600',
    glow:'rgba(16,185,129,0.25)',
    accent:'emerald',
    pinned:false,
  },
  {
    id:'schedule-session',
    label:'Schedule Session',
    description:'Book a personal training session with a specific time slot',
    href:'/pt/sessions/new',
    icon:<CalendarPlus size={28}/>,
    gradient:'from-rose-500 to-pink-600',
    glow:'rgba(244,63,94,0.25)',
    accent:'rose',
    pinned:false,
  },
  {
    id:'workout-plan',
    label:'Workout Plan',
    description:'Design a custom workout program for a member',
    href:'/pt/workout-plans/new',
    icon:<ClipboardList size={28}/>,
    gradient:'from-indigo-500 to-purple-600',
    glow:'rgba(99,102,241,0.25)',
    accent:'indigo',
    pinned:false,
  },
  {
    id:'diet-plan',
    label:'Diet Plan',
    description:'Create a personalised nutrition plan for a member',
    href:'/pt/diet-plans/new',
    icon:<Salad size={28}/>,
    gradient:'from-lime-500 to-green-600',
    glow:'rgba(132,204,22,0.25)',
    accent:'lime',
    pinned:false,
  },
  {
    id:'add-lead',
    label:'Add Lead',
    description:'Log a prospective member inquiry and begin follow-up',
    href:'/sales/leads/new',
    icon:<UserCheck size={28}/>,
    gradient:'from-cyan-500 to-sky-600',
    glow:'rgba(6,182,212,0.25)',
    accent:'cyan',
    pinned:false,
  },
  {
    id:'checkin',
    label:'Start Check-In',
    description:'Open the biometric face-recognition check-in station',
    href:'/checkin',
    icon:<Users size={28}/>,
    gradient:'from-violet-600 to-fuchsia-600',
    glow:'rgba(192,38,211,0.25)',
    accent:'fuchsia',
    pinned:false,
  },
  {
    id:'export',
    label:'Export Report',
    description:'Download financial or member data as a CSV or PDF',
    href:'/reports',
    icon:<Zap size={28}/>,
    gradient:'from-slate-600 to-slate-800',
    glow:'rgba(71,85,105,0.20)',
    accent:'slate',
    pinned:false,
  },
];

const AI_SUGGESTIONS = [
  { label:'Send renewal reminders',  desc:'14 members expiring this week',    href:'/engagement/whatsapp',     badge:'Urgent' },
  { label:'Review outstanding dues',  desc:'₹42K pending from 8 members',     href:'/finance/dues',            badge:'Finance' },
  { label:'PT conversion follow-up',  desc:'6 trial members ready to convert', href:'/sales/leads',             badge:'Sales' },
];

const RECENT_ACTIONS = [
  { label:'Added member — Rahul Sharma',    time:'2m ago',  href:'/clients/new' },
  { label:'Recorded ₹4,500 payment',        time:'11m ago', href:'/payments/new' },
  { label:'Scheduled PT session',           time:'32m ago', href:'/pt/sessions/new' },
];

// ─── Page ─────────────────────────────────────────────────────
export default function QuickActionsPage() {
  return (
    <Guard>
      <QuickActionsContent />
    </Guard>
  );
}

function QuickActionsContent() {
  const [pinned, setPinned] = React.useState<Set<string>>(
    new Set(PRIMARY_ACTIONS.filter(a => a.pinned).map(a => a.id))
  );

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400 pt-4">
          <LayoutDashboard size={12} />
          <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
          <ChevronRight size={10} />
          <span className="text-slate-700 font-medium">Quick Actions</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-200">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quick Actions</h1>
              <p className="text-slate-500 text-sm">Mission control · fast operational shortcuts</p>
            </div>
          </div>
        </header>

        {/* AI Suggestions banner */}
        <div className="mb-8 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">AI Suggested Actions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AI_SUGGESTIONS.map(s => (
              <Link key={s.label} href={s.href}
                className="group flex items-center justify-between rounded-xl bg-white/70 border border-violet-100 px-3.5 py-2.5 hover:bg-white hover:shadow-sm hover:border-violet-300 transition-all">
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-800">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{s.badge}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Pinned */}
        {pinned.size > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Pin size={13} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pinned</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRIMARY_ACTIONS.filter(a => pinned.has(a.id)).map(action => (
                <ActionCard key={action.id} action={action} isPinned={pinned.has(action.id)}
                  onTogglePin={() => {
                    setPinned(prev => {
                      const next = new Set(prev);
                      if (next.has(action.id)) next.delete(action.id);
                      else next.add(action.id);
                      return next;
                    });
                  }} />
              ))}
            </div>
          </section>
        )}

        {/* All actions */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Actions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PRIMARY_ACTIONS.filter(a => !pinned.has(a.id)).map(action => (
              <ActionCard key={action.id} action={action} isPinned={false}
                onTogglePin={() => {
                  setPinned(prev => {
                    const next = new Set(prev);
                    next.add(action.id);
                    return next;
                  });
                }} />
            ))}
          </div>
        </section>

        {/* Recent */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Actions</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm divide-y divide-slate-50">
            {RECENT_ACTIONS.map(r => (
              <Link key={r.label} href={r.href}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <span className="text-sm font-medium text-slate-700">{r.label}</span>
                <span className="text-xs text-slate-400">{r.time}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}

// ─── Action Card ──────────────────────────────────────────────
function ActionCard({ action, isPinned, onTogglePin }: {
  action: typeof PRIMARY_ACTIONS[0];
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  return (
    <div className="group relative rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Glow bg */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 50% 0%, ${action.glow}, transparent 70%)` }} />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl text-white bg-gradient-to-br shadow-lg', action.gradient)}
            style={{ boxShadow: `0 8px 24px ${action.glow}` }}>
            {action.icon}
          </div>
          <button onClick={onTogglePin}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] transition-all',
              isPinned
                ? 'bg-violet-50 border-violet-200 text-violet-600'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-violet-200 hover:text-violet-500'
            )}>
            <Pin size={11} />
          </button>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">{action.label}</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">{action.description}</p>
        <Link href={action.href}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white bg-gradient-to-r shadow-sm hover:shadow-md transition-all duration-200',
            action.gradient
          )}>
          Open
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
