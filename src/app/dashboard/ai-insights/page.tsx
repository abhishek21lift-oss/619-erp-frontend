'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Users,
  CreditCard, Target, Zap, ChevronRight, ArrowUpRight,
  RefreshCw, Sparkles, BarChart2, Activity, MessageSquare,
  ChevronDown, CheckCircle2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

/* ─── mock data ───────────────────────────────────────────── */
const REVENUE_DATA = [
  { month:'Nov', actual:182000, predicted:null },
  { month:'Dec', actual:204000, predicted:null },
  { month:'Jan', actual:195000, predicted:null },
  { month:'Feb', actual:221000, predicted:null },
  { month:'Mar', actual:238000, predicted:null },
  { month:'Apr', actual:251000, predicted:null },
  { month:'May', actual:243000, predicted:null },
  { month:'Jun', actual:null,   predicted:268000 },
  { month:'Jul', actual:null,   predicted:285000 },
  { month:'Aug', actual:null,   predicted:296000 },
];

const INSIGHTS = [
  {
    id:'churn', type:'warning', priority:'high',
    title:'12 members likely to churn',
    desc:'These members have not visited in 18+ days and their memberships expire within 10 days.',
    action:'View Members', actionHref:'/clients',
    icon:TrendingDown, color:'text-rose-600', bg:'from-rose-50 to-pink-50', border:'border-rose-200', dot:'bg-rose-500'
  },
  {
    id:'pt-conv', type:'success', priority:'medium',
    title:'PT conversions up 18%',
    desc:'Free trial completions have driven a strong uptick in paid personal training packages this month.',
    action:'View PT Clients', actionHref:'/clients',
    icon:TrendingUp, color:'text-emerald-600', bg:'from-emerald-50 to-teal-50', border:'border-emerald-200', dot:'bg-emerald-500'
  },
  {
    id:'revenue', type:'insight', priority:'medium',
    title:'Revenue may increase next week',
    desc:'Based on renewal patterns, ₹65,000+ in renewals are expected next week from 14 members.',
    action:'View Forecast', actionHref:'/finance/forecast',
    icon:TrendingUp, color:'text-blue-600', bg:'from-blue-50 to-sky-50', border:'border-blue-200', dot:'bg-blue-500'
  },
  {
    id:'peak', type:'warning', priority:'low',
    title:'Peak hours overloaded',
    desc:'7–8 AM sees 78% capacity utilisation. Consider staggering PT sessions during this window.',
    action:'View Attendance', actionHref:'/attendance',
    icon:Activity, color:'text-amber-600', bg:'from-amber-50 to-yellow-50', border:'border-amber-200', dot:'bg-amber-500'
  },
  {
    id:'dues', type:'alert', priority:'high',
    title:'₹84,200 in outstanding dues',
    desc:'24 members have unpaid balances. Automated WhatsApp reminders recommended.',
    action:'View Dues', actionHref:'/finance/dues',
    icon:AlertTriangle, color:'text-orange-600', bg:'from-orange-50 to-amber-50', border:'border-orange-200', dot:'bg-orange-500'
  },
  {
    id:'retention', type:'insight', priority:'medium',
    title:'Retention rate at 84% — above target',
    desc:'Monthly retention has held above 80% for 4 consecutive months. New onboarding flow is working.',
    action:'View Insights', actionHref:'/insights/renewal',
    icon:CheckCircle2, color:'text-teal-600', bg:'from-teal-50 to-cyan-50', border:'border-teal-200', dot:'bg-teal-500'
  },
];

const AI_METRICS = [
  { label:'Churn Risk Score', value:'2.4/10', status:'Low Risk', icon:Users, statusColor:'text-emerald-600', statusBg:'bg-emerald-50' },
  { label:'Revenue Confidence', value:'91%', status:'High Accuracy', icon:BarChart2, statusColor:'text-blue-600', statusBg:'bg-blue-50' },
  { label:'Retention Forecast', value:'86%', status:'+2% vs last month', icon:Target, statusColor:'text-teal-600', statusBg:'bg-teal-50' },
  { label:'PT Conversion Rate', value:'34%', status:'+18% growth', icon:Zap, statusColor:'text-violet-600', statusBg:'bg-violet-50' },
];

type Priority = 'all' | 'high' | 'medium' | 'low';

/* ─── component ───────────────────────────────────────────── */
export default function AIInsightsPage() {
  const [filter, setFilter] = useState<Priority>('all');
  const [chat, setChat] = useState('');

  const visible = INSIGHTS.filter(i => filter === 'all' || i.priority === filter);

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Link href="/dashboard" className="hover:text-slate-700 dark:text-white/70 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-700 dark:text-white/70">AI Insights</span>
          </nav>

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">AI Insights</h1>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700">
                  <Sparkles className="w-3 h-3" />
                  Powered by AI
                </span>
              </div>
              <p className="text-sm text-slate-500">Intelligent business analytics · 619 Fitness Studio</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 text-sm font-medium hover:bg-slate-50 dark:bg-white/5 transition-all shadow-sm">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* AI Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {AI_METRICS.map(m => (
              <div key={m.label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <m.icon className="w-5 h-5 text-slate-400 dark:text-white/40" />
                  <span className={`text-xs font-semibold ${m.statusColor} ${m.statusBg} px-2 py-0.5 rounded-full`}>{m.status}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{m.value}</p>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Main content: Insights + Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Insights Feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                {(['all','high','medium','low'] as Priority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setFilter(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      filter === p
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:bg-slate-50 dark:bg-white/5'
                    }`}
                  >
                    {p === 'all' ? 'All Insights' : `${p} Priority`}
                  </button>
                ))}
              </div>

              {/* Cards */}
              {visible.map((insight, idx) => (
                <div
                  key={insight.id}
                  className={`bg-gradient-to-br ${insight.bg} border ${insight.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-white/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <insight.icon className={`w-5 h-5 ${insight.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">{insight.title}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          insight.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                          insight.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50'
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-3">{insight.desc}</p>
                      <Link
                        href={insight.actionHref}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${insight.color} hover:opacity-80 transition-opacity`}
                      >
                        {insight.action}
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">

              {/* Revenue forecast chart */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/10/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-white/70">Revenue Forecast</p>
                    <p className="text-xs text-slate-400 dark:text-white/40">6-month prediction</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={REVENUE_DATA} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                    <defs>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} labelStyle={{ fontSize:11 }} contentStyle={{ fontSize:11, borderRadius:8, border:'1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="actual" stroke="#8b5cf6" strokeWidth={2} fill="url(#actGrad)" dot={false} name="Actual" />
                    <Area type="monotone" dataKey="predicted" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 3" fill="url(#predGrad)" dot={false} name="Predicted" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50"><span className="w-3 h-0.5 bg-violet-500 inline-block rounded" />Actual</span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/50"><span className="w-3 h-0.5 bg-cyan-500 inline-block rounded border-dashed" />Predicted</span>
                </div>
              </div>

              {/* AI Assistant */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200/60 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-violet-900">Ask AI Assistant</span>
                </div>
                <div className="space-y-2 mb-3">
                  {['Why are members churning?', 'What drove PT growth?', 'Forecast next month revenue'].map(q => (
                    <button
                      key={q}
                      onClick={() => setChat(q)}
                      className="w-full text-left text-xs text-violet-700 bg-white/70 border border-violet-200/60 rounded-xl px-3 py-2 hover:bg-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={chat}
                    onChange={e => setChat(e.target.value)}
                    placeholder="Ask anything about your gym…"
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-white border border-violet-200/60 focus:outline-none focus:ring-2 focus:ring-violet-300/40 placeholder:text-violet-400 text-slate-700 dark:text-white/70"
                  />
                  <button className="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">
                    Ask
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
