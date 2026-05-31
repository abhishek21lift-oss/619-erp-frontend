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
  TrendingUp, Bell, Pin, Sparkles, Grip, Hash,
} from 'lucide-react';

interface Action {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  href: string;
  tag?: string;
  pinned?: boolean;
  category: string;
}

const ACTIONS: Action[] = [
  { id:'add-member',   label:'Add Member',      desc:'Enroll a new gym member',       icon:UserPlus,     href:'/clients/new',   tag:'Popular', pinned:true,  category:'Members' },
  { id:'new-pt',       label:'New PT Client',   desc:'Assign personal trainer',        icon:Dumbbell,     href:'/clients/new',   tag:'Popular', pinned:true,  category:'Training' },
  { id:'checkin',      label:'Start Check-In',  desc:'Open face-recognition kiosk',    icon:ScanFace,     href:'/checkin',       tag:'Live',    pinned:true,  category:'Operations' },
  { id:'invoice',      label:'Create Invoice',  desc:'Generate member invoice',         icon:FileText,     href:'/payments',                   category:'Finance' },
  { id:'payment',      label:'Record Payment',  desc:'Log a cash/UPI payment',          icon:CreditCard,   href:'/payments',      tag:'Quick',                 category:'Finance' },
  { id:'session',      label:'Schedule Session',desc:'Book a PT or group session',      icon:CalendarPlus, href:'/appointments',               category:'Training' },
  { id:'workout',      label:'Create Workout',  desc:'Design a workout plan',           icon:ClipboardList,href:'/clients',                    category:'Training' },
  { id:'diet',         label:'Create Diet Plan',desc:'Build a nutrition program',       icon:Salad,        href:'/clients',                    category:'Training' },
  { id:'lead',         label:'Add Lead',        desc:'Capture a new prospect',          icon:Target,       href:'/clients/new',   tag:'New',                   category:'Members' },
  { id:'report',       label:'Export Report',   desc:'Download analytics PDF',          icon:Download,     href:'/reports',                    category:'Operations' },
];

const RECENT = ['add-member', 'payment', 'checkin'];

const AI_SUGGESTIONS = [
  { label:'Send renewal reminders', desc:'8 members expire this week',    icon:Bell,       color:'#d97706' },
  { label:'Review overdue dues',    desc:'₹24,500 pending collection',    icon:TrendingUp, color:'#dc2626' },
  { label:'Schedule PT review',     desc:'3 clients due for assessment',  icon:Dumbbell,   color:'#7c3aed' },
];

function TagBadge({ label }: { label: string }) {
  const styles: Record<string, string> = {
    Popular: 'bg-amber-50 text-amber-700 border-amber-200/50',
    Live:    'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    Quick:   'bg-blue-50 text-blue-700 border-blue-200/50',
    New:     'bg-violet-50 text-violet-700 border-violet-200/50',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${styles[label] || 'bg-gray-50 text-gray-600 border-gray-200/50'}`}>
      <Hash size={8} />
      {label}
    </span>
  );
}

export default function QuickActionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = ACTIONS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.desc.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(a => a.pinned);
  const rest   = filtered.filter(a => !a.pinned);

  const categories = [...new Set(rest.map(a => a.category))];

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen bg-[#F5F5F7] pb-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

            {/* Header */}
            <div className="mb-8">
              <nav className="flex items-center gap-1.5 text-[13px] text-[#86868b] font-medium mb-4">
                <Link href="/dashboard" className="hover:text-[#1d1d1f] transition-colors">Dashboard</Link>
                <ChevronRight size={12} />
                <span className="text-[#1d1d1f]">Quick Actions</span>
              </nav>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.04)] mb-3">
                    <Sparkles size={12} className="text-[#dc2626]" />
                    Command Center
                  </div>
                  <h1 className="text-[28px] sm:text-[34px] font-bold tracking-[-0.03em] text-[#1d1d1f] leading-[1.1]">
                    Quick Actions
                  </h1>
                  <p className="mt-1.5 text-[14px] text-[#86868b]">Fast operations for 619 Fitness Studio</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search actions…"
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-[rgba(0,0,0,0.04)] text-[13px] text-[#1d1d1f] placeholder:text-[#86868b]/50 outline-none transition-all duration-150 focus:border-[#dc2626]/30 focus:shadow-[0_0_0_3px_rgba(220,38,38,0.06)]"
                  />
                </div>
              </div>
            </div>

            {/* Pinned */}
            {pinned.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Pin size={12} className="text-[#86868b]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">Pinned</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {pinned.map(a => (
                    <button
                      key={a.id}
                      onClick={() => router.push(a.href)}
                      className="group relative rounded-2xl bg-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 overflow-hidden"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#1d1d1f] group-hover:scale-105 transition-transform">
                          <a.icon size={20} strokeWidth={1.5} />
                        </span>
                        {a.tag && <TagBadge label={a.tag} />}
                      </div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f] mb-0.5">{a.label}</p>
                      <p className="text-[12px] text-[#86868b]">{a.desc}</p>
                      <ArrowRight size={13} className="absolute bottom-4 right-4 text-[#86868b]/40 transition-all duration-200 group-hover:text-[#dc2626] group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

              {/* All Actions */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Grip size={12} className="text-[#86868b]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">All Actions</span>
                </div>
                <div className="space-y-6">
                  {categories.map(cat => {
                    const items = rest.filter(a => a.category === cat);
                    if (!items.length) return null;
                    return (
                      <div key={cat}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]/60 mb-3">{cat}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {items.map(a => (
                            <button
                              key={a.id}
                              onClick={() => router.push(a.href)}
                              className="group rounded-xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f7] text-[#1d1d1f] group-hover:scale-105 transition-transform">
                                  <a.icon size={16} strokeWidth={1.5} />
                                </span>
                                {a.tag && <TagBadge label={a.tag} />}
                              </div>
                              <p className="text-[13px] font-semibold text-[#1d1d1f] mb-0.5">{a.label}</p>
                              <p className="text-[11px] text-[#86868b]">{a.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Recent */}
                <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={13} className="text-[#86868b]" />
                    <span className="text-[12px] font-semibold text-[#1d1d1f]">Recently Used</span>
                  </div>
                  <div className="space-y-1">
                    {ACTIONS.filter(a => RECENT.includes(a.id)).map(a => (
                      <button
                        key={a.id}
                        onClick={() => router.push(a.href)}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7] text-[#86868b] group-hover:scale-105 transition-transform">
                          <a.icon size={14} strokeWidth={1.5} />
                        </span>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{a.label}</p>
                          <p className="text-[11px] text-[#86868b] truncate">{a.desc}</p>
                        </div>
                        <ArrowRight size={12} className="text-[#86868b]/30 group-hover:text-[#dc2626] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={13} className="text-[#dc2626]" />
                    <span className="text-[12px] font-semibold text-[#1d1d1f]">AI Suggested</span>
                  </div>
                  <div className="space-y-1">
                    {AI_SUGGESTIONS.map(s => (
                      <div key={s.label} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f5f5f7] cursor-pointer">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${s.color}0a`, color: s.color }}>
                          <s.icon size={14} strokeWidth={1.5} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{s.label}</p>
                          <p className="text-[11px] text-[#86868b] truncate">{s.desc}</p>
                        </div>
                        <ArrowRight size={12} className="text-[#86868b]/30 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
