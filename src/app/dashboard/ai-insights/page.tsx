'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, BarChart2, Brain,
  ChevronRight, Flame, LayoutDashboard,
  Lightbulb, Sparkles, TrendingDown, TrendingUp, Users, Zap,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import Guard from '@/components/Guard';
import { cn } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────
interface InsightCard {
  id: string;
  priority: 'critical' | 'warning' | 'positive' | 'info';
  category: string;
  title: string;
  body: string;
  metric?: string;
  metricDelta?: string;
  metricPositive?: boolean;
  action?: string;
  actionHref?: string;
  icon: React.ReactNode;
}

// ─── Mock insights ────────────────────────────────────────────
const INSIGHTS: InsightCard[] = [
  {
    id:'i1',
    priority:'critical',
    category:'Churn Risk',
    title:'12 members likely to churn',
    body:'Members who haven\'t checked in for 21+ days and have a subscription expiring in 14 days. Immediate outreach recommended.',
    metric:'12 at-risk',
    metricDelta:'+3 vs last week',
    metricPositive:false,
    action:'View members',
    actionHref:'/insights/renewal',
    icon:<AlertTriangle size={20}/>,
  },
  {
    id:'i2',
    priority:'positive',
    category:'Sales Growth',
    title:'PT conversions up 18% this month',
    body:'Trial session completions are converting to full PT packages at a higher rate. Trainer Rahul has the best conversion ratio at 74%.',
    metric:'+18%',
    metricDelta:'vs previous month',
    metricPositive:true,
    action:'View PT report',
    actionHref:'/finance/trainer-revenue',
    icon:<TrendingUp size={20}/>,
  },
  {
    id:'i3',
    priority:'positive',
    category:'Revenue Forecast',
    title:'Revenue projected to increase 22% next week',
    body:'Based on scheduled renewals, pending invoices, and historical patterns, next week shows strong revenue signals — 8 renewals and 3 PT packages due.',
    metric:'₹1.8L forecast',
    metricDelta:'+22% projected',
    metricPositive:true,
    action:'View forecast',
    actionHref:'/finance/forecast',
    icon:<BarChart2 size={20}/>,
  },
  {
    id:'i4',
    priority:'warning',
    category:'Capacity',
    title:'Peak hours overloaded — 6–8 PM slot',
    body:'Evening slots are consistently at 95%+ capacity. Consider staggered session starts or a new batch for Tuesday/Thursday to improve member experience.',
    metric:'95% capacity',
    metricDelta:'Mon–Fri 6–8 PM',
    metricPositive:false,
    action:'View attendance',
    actionHref:'/insights/traffic',
    icon:<Flame size={20}/>,
  },
  {
    id:'i5',
    priority:'info',
    category:'Retention',
    title:'Retention rate stable at 78%',
    body:'30-day rolling retention is holding steady. Members on PT plans show 91% retention vs 68% for gym-only. Cross-selling PT is the highest-impact retention lever.',
    metric:'78%',
    metricDelta:'30-day retention',
    metricPositive:true,
    action:'View retention',
    actionHref:'/insights/renewal',
    icon:<Users size={20}/>,
  },
  {
    id:'i6',
    priority:'warning',
    category:'Finance',
    title:'₹42,000 in outstanding dues — 8 members',
    body:'8 members have overdue balances averaging ₹5,250 each. 3 accounts are 30+ days overdue. Automated WhatsApp reminders can be triggered from the Engagement module.',
    metric:'₹42K',
    metricDelta:'8 accounts',
    metricPositive:false,
    action:'Send reminders',
    actionHref:'/finance/dues',
    icon:<TrendingDown size={20}/>,
  },
];

const METRICS = [
  { label:'AI Confidence',  value:'94%',     sub:'Model accuracy',      color:'violet' },
  { label:'Data Points',    value:'12,840',  sub:'Last 90 days',        color:'sky' },
  { label:'Predictions',    value:'6',       sub:'Active insights',     color:'emerald' },
  { label:'Actions Taken',  value:'18',      sub:'From AI suggestions', color:'amber' },
];

const PRIORITY_STYLES = {
  critical: {
    border: 'border-rose-200',
    badge:  'bg-rose-50 text-rose-700 ring-rose-200',
    icon:   'bg-rose-100 text-rose-600',
    bar:    'bg-rose-500',
    glow:   'rgba(244,63,94,0.07)',
  },
  warning: {
    border: 'border-amber-200',
    badge:  'bg-amber-50 text-amber-700 ring-amber-200',
    icon:   'bg-amber-100 text-amber-600',
    bar:    'bg-amber-500',
    glow:   'rgba(245,158,11,0.07)',
  },
  positive: {
    border: 'border-emerald-200',
    badge:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    icon:   'bg-emerald-100 text-emerald-600',
    bar:    'bg-emerald-500',
    glow:   'rgba(16,185,129,0.07)',
  },
  info: {
    border: 'border-sky-200',
    badge:  'bg-sky-50 text-sky-700 ring-sky-200',
    icon:   'bg-sky-100 text-sky-600',
    bar:    'bg-sky-500',
    glow:   'rgba(14,165,233,0.07)',
  },
};

// ─── Page ─────────────────────────────────────────────────────
export default function AIInsightsPage() {
  return (
    <Guard>
      <AIInsightsContent />
    </Guard>
  );
}

function AIInsightsContent() {
  const [filter, setFilter] = React.useState<'all'|'critical'|'warning'|'positive'|'info'>('all');

  const filtered = INSIGHTS.filter(i => filter === 'all' || i.priority === filter);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">

        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400 pt-4">
          <LayoutDashboard size={12} />
          <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
          <ChevronRight size={10} />
          <span className="text-slate-700 font-medium">AI Insights</span>
        </nav>

        {/* Hero header */}
        <header className="relative rounded-3xl overflow-hidden mb-10 px-8 py-8"
          style={{
            background:'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.06) 50%, rgba(14,165,233,0.05) 100%)',
            border:'1px solid rgba(124,58,237,0.15)',
          }}>
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage:'radial-gradient(circle at 80% 20%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.10) 0%, transparent 50%)'
          }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-200">
                <Brain size={26} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Insights</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                    <Sparkles size={9} /> BETA
                  </span>
                </div>
                <p className="text-slate-500 text-sm">Predictive analytics · 619 Fitness Intelligence Engine</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {METRICS.map(m => (
                <div key={m.label} className="rounded-2xl bg-white/60 border border-white/80 backdrop-blur-sm px-3.5 py-3 text-center">
                  <p className="text-xl font-bold text-slate-900 tabular-nums">{m.value}</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-0.5">{m.label}</p>
                  <p className="text-[10px] text-slate-400">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {(['all','critical','warning','positive','info'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all',
                filter === f
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600'
              )}>
              {f === 'all' ? `All (${INSIGHTS.length})` : f}
            </button>
          ))}
        </div>

        {/* Insights grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((insight, i) => {
            const s = PRIORITY_STYLES[insight.priority];
            return (
              <div key={insight.id}
                className={cn('group relative rounded-2xl bg-white border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden', s.border)}
                style={{ background: `linear-gradient(160deg, ${s.glow}, transparent 60%)` }}
              >
                {/* priority bar */}
                <div className={cn('absolute top-0 left-0 right-0 h-0.5', s.bar)} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', s.icon)}>
                        {insight.icon}
                      </div>
                      <div>
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1', s.badge)}>
                          {insight.category}
                        </span>
                      </div>
                    </div>
                    {insight.metric && (
                      <div className="text-right shrink-0">
                        <p className={cn('text-lg font-bold tabular-nums', insight.metricPositive ? 'text-emerald-700' : 'text-rose-700')}>
                          {insight.metric}
                        </p>
                        <p className="text-[10px] text-slate-400">{insight.metricDelta}</p>
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">{insight.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{insight.body}</p>

                  {insight.action && insight.actionHref && (
                    <Link href={insight.actionHref}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors">
                      {insight.action} <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI assistant footer */}
        <div className="mt-10 rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 px-6 py-5">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb size={16} className="text-violet-600" />
            <span className="text-sm font-bold text-violet-800">619 Intelligence Engine</span>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-600">Powered by pattern analysis</span>
          </div>
          <p className="text-sm text-slate-600">
            Insights are generated from your last 90 days of operational data — check-ins, payments, PT sessions, and lead flow.
            Refresh daily for the freshest predictions.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link href="/insights/renewal"
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors">
              <Zap size={12} /> Deep Analysis
            </Link>
            <Link href="/finance/forecast"
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 transition-colors">
              Revenue Forecast
            </Link>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
