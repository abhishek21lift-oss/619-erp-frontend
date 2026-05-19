'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Grid3X3, List, Plus, Star, TrendingUp,
  Users, Calendar, Award, ChevronRight, Edit,
  MoreHorizontal, UserCheck, Clock, Phone, Mail,
  Activity, BarChart3, Target, Zap, Filter,
} from 'lucide-react';
import Link from 'next/link';

// ── Demo data ────────────────────────────────────────────────────────
const COACHES = [
  {
    id: '1', name: 'Rahul Sharma', role: 'Head Coach', avatar: null,
    initials: 'RS', status: 'online', joinDate: 'Jan 2023',
    specializations: ['Strength', 'Powerlifting', 'HIIT'],
    clients: 18, maxClients: 20, revenue: '₹1.2L', retention: 94,
    attendance: 98, performance: 96, experience: '5 yrs',
    rating: 4.9, sessions: 142, color: '#6366f1',
  },
  {
    id: '2', name: 'Priya Mehta', role: 'Yoga & Wellness Coach', avatar: null,
    initials: 'PM', status: 'online', joinDate: 'Mar 2023',
    specializations: ['Yoga', 'Flexibility', 'Mindfulness'],
    clients: 24, maxClients: 25, revenue: '₹95K', retention: 97,
    attendance: 100, performance: 99, experience: '4 yrs',
    rating: 5.0, sessions: 189, color: '#ec4899',
  },
  {
    id: '3', name: 'Amit Verma', role: 'CrossFit Coach', avatar: null,
    initials: 'AV', status: 'away', joinDate: 'Jun 2023',
    specializations: ['CrossFit', 'Functional', 'Cardio'],
    clients: 15, maxClients: 18, revenue: '₹78K', retention: 88,
    attendance: 92, performance: 87, experience: '3 yrs',
    rating: 4.7, sessions: 98, color: '#f59e0b',
  },
  {
    id: '4', name: 'Neha Gupta', role: 'Nutrition & Fat Loss Coach', avatar: null,
    initials: 'NG', status: 'online', joinDate: 'Sep 2022',
    specializations: ['Nutrition', 'Weight Loss', 'Rehab'],
    clients: 22, maxClients: 22, revenue: '₹1.1L', retention: 95,
    attendance: 96, performance: 94, experience: '6 yrs',
    rating: 4.8, sessions: 165, color: '#10b981',
  },
  {
    id: '5', name: 'Vikram Singh', role: 'Strength & Conditioning', avatar: null,
    initials: 'VS', status: 'leave', joinDate: 'Dec 2023',
    specializations: ['Strength', 'Muscle Gain', 'Sports'],
    clients: 10, maxClients: 15, revenue: '₹55K', retention: 82,
    attendance: 78, performance: 80, experience: '2 yrs',
    rating: 4.5, sessions: 61, color: '#8b5cf6',
  },
  {
    id: '6', name: 'Sneha Patel', role: 'Pilates & Core Specialist', avatar: null,
    initials: 'SP', status: 'online', joinDate: 'Feb 2024',
    specializations: ['Pilates', 'Core', 'Flexibility'],
    clients: 14, maxClients: 20, revenue: '₹62K', retention: 91,
    attendance: 95, performance: 89, experience: '3 yrs',
    rating: 4.6, sessions: 77, color: '#06b6d4',
  },
];

const FILTERS = [
  { id: 'all',    label: 'All Coaches',     count: 6 },
  { id: 'active', label: 'Active',          count: 4 },
  { id: 'leave',  label: 'On Leave',        count: 1 },
  { id: 'top',    label: 'Top Performers',  count: 3 },
  { id: 'new',    label: 'New Coaches',     count: 2 },
];

// ── Status dot ───────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const cfg = {
    online:  { color: '#10b981', pulse: true,  label: 'Online' },
    away:    { color: '#f59e0b', pulse: false, label: 'Away' },
    leave:   { color: '#94a3b8', pulse: false, label: 'On Leave' },
    offline: { color: '#ef4444', pulse: false, label: 'Offline' },
  }[status] ?? { color: '#94a3b8', pulse: false, label: 'Unknown' };
  return (
    <span className="relative flex h-3 w-3">
      {cfg.pulse && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
          style={{ background: cfg.color }} />
      )}
      <span className="relative h-3 w-3 rounded-full"
        style={{ background: cfg.color, border: '2px solid white' }} />
    </span>
  );
}

// ── Mini sparkline ────────────────────────────────────────────────────
function Sparkline({ color }: { color: string }) {
  const pts = [30, 45, 38, 60, 52, 68, 55, 75, 62, 82];
  const max = Math.max(...pts), min = Math.min(...pts);
  const h = 28, w = 80;
  const path = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * w;
    const y = h - ((p - min) / (max - min)) * h;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={path} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Coach card (grid view) ────────────────────────────────────────────
function CoachCard({ coach }: { coach: typeof COACHES[0] }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.008 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="group overflow-hidden rounded-[22px]"
      style={{
        background: 'rgba(255,255,255,0.90)',
        border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 2px 20px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${coach.color},${coach.color}88)` }} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-[16px] text-[14px] font-[800] text-white"
              style={{ background: `linear-gradient(135deg,${coach.color},${coach.color}bb)`, boxShadow: `0 4px 14px ${coach.color}35` }}>
              {coach.initials}
              <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={coach.status} /></span>
            </div>
            <div>
              <h3 className="text-[14px] font-[780] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{coach.name}</h3>
              <p className="mt-0.5 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{coach.role}</p>
            </div>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-[8px] opacity-0 transition-all group-hover:opacity-100"
            style={{ background: 'rgba(15,23,42,0.05)' }}
          >
            <MoreHorizontal size={14} style={{ color: 'rgb(100,116,139)' }} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {coach.specializations.map((s) => (
            <span key={s} className="rounded-full px-2.5 py-1 text-[10.5px] font-[650]"
              style={{ background: `${coach.color}10`, color: coach.color, border: `1px solid ${coach.color}22` }}>
              {s}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Clients',  value: `${coach.clients}/${coach.maxClients}`, icon: <Users size={11} /> },
            { label: 'Sessions', value: coach.sessions,                          icon: <Activity size={11} /> },
            { label: 'Rating',   value: coach.rating,                            icon: <Star size={11} /> },
          ].map((m) => (
            <div key={m.label} className="rounded-[11px] px-2.5 py-2 text-center"
              style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.05)' }}>
              <div className="flex items-center justify-center gap-1" style={{ color: 'rgb(148,163,184)' }}>{m.icon}</div>
              <p className="mt-1 text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>{m.value}</p>
              <p className="text-[10px]" style={{ color: 'rgb(148,163,184)' }}>{m.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-[650]" style={{ color: 'rgb(100,116,139)' }}>Performance</span>
            <span className="text-[11px] font-[750]" style={{ color: coach.color }}>{coach.performance}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(15,23,42,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${coach.performance}%`, background: `linear-gradient(90deg,${coach.color},${coach.color}99)` }} />
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>Monthly trend</p>
            <Sparkline color={coach.color} />
          </div>
          <div className="text-right">
            <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>Revenue</p>
            <p className="text-[15px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{coach.revenue}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link href={`/trainers/${coach.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[11px] py-2.5 text-[12px] font-[700] transition-all hover:brightness-95 active:scale-95"
            style={{ background: `${coach.color}12`, color: coach.color, border: `1px solid ${coach.color}22` }}>
            View Profile <ChevronRight size={12} />
          </Link>
          <Link href={`/trainers/${coach.id}/edit`}
            className="flex h-9 w-9 items-center justify-center rounded-[11px] transition-all hover:bg-black/5 active:scale-95"
            style={{ border: '1px solid rgba(15,23,42,0.09)' }}>
            <Edit size={13} style={{ color: 'rgb(100,116,139)' }} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Coach row (list view) ─────────────────────────────────────────────
function CoachRow({ coach }: { coach: typeof COACHES[0] }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 rounded-[16px] px-5 py-4 transition-all hover:bg-white/60"
      style={{ border: '1px solid transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.border = '1px solid rgba(15,23,42,0.07)')}
      onMouseLeave={(e) => (e.currentTarget.style.border = '1px solid transparent')}
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[13px] font-[800] text-white"
        style={{ background: `linear-gradient(135deg,${coach.color},${coach.color}bb)` }}>
        {coach.initials}
        <span className="absolute -bottom-0.5 -right-0.5"><StatusDot status={coach.status} /></span>
      </div>

      <div className="w-44 shrink-0">
        <p className="text-[13.5px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>{coach.name}</p>
        <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{coach.role}</p>
      </div>

      <div className="hidden flex-1 flex-wrap gap-1 lg:flex">
        {coach.specializations.slice(0, 2).map((s) => (
          <span key={s} className="rounded-full px-2 py-0.5 text-[10.5px] font-[650]"
            style={{ background: `${coach.color}10`, color: coach.color }}>{s}</span>
        ))}
      </div>

      <div className="hidden grid-cols-4 gap-6 text-center sm:grid">
        {[
          { label: 'Clients', value: `${coach.clients}/${coach.maxClients}` },
          { label: 'Rating',  value: coach.rating },
          { label: 'Attend.', value: `${coach.attendance}%` },
          { label: 'Revenue', value: coach.revenue },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-[13.5px] font-[750]" style={{ color: 'rgb(15,23,42)' }}>{s.value}</p>
            <p className="text-[10px]" style={{ color: 'rgb(148,163,184)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <Link href={`/trainers/${coach.id}`}
        className="ml-auto flex items-center gap-1 rounded-[10px] px-3.5 py-2 text-[12px] font-[700] transition-all hover:brightness-95 active:scale-95"
        style={{ background: `${coach.color}10`, color: coach.color }}>
        View <ChevronRight size={12} />
      </Link>
    </motion.div>
  );
}

// ── KPI widget ───────────────────────────────────────────────────────
function KPI({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="rounded-[18px] p-4"
      style={{
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
      }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-[700] uppercase tracking-widest" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-[9px]"
          style={{ background: `${color}12`, color }}>{icon}</div>
      </div>
      <p className="mt-2 text-[26px] font-[840] tracking-[-0.03em] leading-none" style={{ color: 'rgb(15,23,42)' }}>{value}</p>
      <p className="mt-1 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{sub}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function MyCoachesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = COACHES;
    if (activeFilter === 'active') list = list.filter((c) => c.status === 'online');
    else if (activeFilter === 'leave') list = list.filter((c) => c.status === 'leave');
    else if (activeFilter === 'top') list = list.filter((c) => c.performance >= 90);
    else if (activeFilter === 'new')
      list = list.filter((c) => c.joinDate.includes('2024') || c.joinDate.includes('Dec 2023'));
    if (search)
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.specializations.some((s) => s.toLowerCase().includes(search.toLowerCase())),
      );
    return list;
  }, [activeFilter, search]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 60%,#faf8ff 100%)' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(15,23,42,0.07)',
        }}
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-[20px] font-[880] tracking-[-0.025em]" style={{ color: 'rgb(15,23,42)' }}>My Coaches</h1>
            <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>
              {COACHES.length} coaches · {COACHES.filter((c) => c.status === 'online').length} active now
            </p>
          </div>
          <Link
            href="/trainers/add"
            className="flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[13px] font-[750] text-white transition-all hover:brightness-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.28)' }}
          >
            <Plus size={15} /> Add Coach
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
        {/* KPI strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPI label="Total Coaches" value="6"     sub="All branches"       icon={<Users size={14} />}       color="#6366f1" />
          <KPI label="Active Today"  value="4"     sub="In studio now"      icon={<UserCheck size={14} />}   color="#10b981" />
          <KPI label="Avg Rating"    value="4.75"  sub="Across all coaches" icon={<Star size={14} />}        color="#f59e0b" />
          <KPI label="Total Revenue" value="₹5.0L" sub="This month"         icon={<TrendingUp size={14} />}  color="#06b6d4" />
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div
            className="relative flex min-w-[220px] flex-1 items-center gap-2.5 rounded-[13px] px-3.5 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(15,23,42,0.08)',
              boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
            }}
          >
            <Search size={14} style={{ color: 'rgb(148,163,184)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search coaches or specialization…"
              className="flex-1 bg-transparent text-[13px] font-[500] outline-none"
              style={{ color: 'rgb(15,23,42)' }}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-[11px] px-3.5 py-2 text-[12px] font-[700] transition-all"
                style={{
                  background: activeFilter === f.id ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.75)',
                  color: activeFilter === f.id ? '#4f46e5' : 'rgb(100,116,139)',
                  border: activeFilter === f.id
                    ? '1.5px solid rgba(99,102,241,0.22)'
                    : '1.5px solid rgba(15,23,42,0.07)',
                }}
              >
                {f.label}
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-[800]"
                  style={{
                    background: activeFilter === f.id
                      ? 'rgba(99,102,241,0.15)'
                      : 'rgba(15,23,42,0.07)',
                  }}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex overflow-hidden rounded-[11px]" style={{ border: '1px solid rgba(15,23,42,0.09)' }}>
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className="flex h-9 w-9 items-center justify-center transition-all"
                style={{
                  background: viewMode === v ? 'rgba(99,102,241,0.10)' : 'transparent',
                  color: viewMode === v ? '#4f46e5' : 'rgb(148,163,184)',
                }}
              >
                {v === 'grid' ? <Grid3X3 size={15} /> : <List size={15} />}
              </button>
            ))}
          </div>
        </div>

        {/* Coach grid / list */}
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {filtered.map((c) => <CoachCard key={c.id} coach={c} />)}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden rounded-[20px]"
              style={{
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(255,255,255,0.95)',
                boxShadow: '0 2px 16px rgba(15,23,42,0.06)',
              }}
            >
              <div className="divide-y" style={{ divideColor: 'rgba(15,23,42,0.05)' } as React.CSSProperties}>
                {filtered.map((c) => <CoachRow key={c.id} coach={c} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[18px]"
              style={{ background: 'rgba(99,102,241,0.08)' }}>
              <Users size={24} style={{ color: '#6366f1' }} />
            </div>
            <p className="text-[15px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>No coaches found</p>
            <p className="mt-1 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
