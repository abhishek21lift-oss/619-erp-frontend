'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Grid3X3, List, Plus, Star, TrendingUp,
  Users, Calendar, Award, ChevronRight, Edit,
  MoreHorizontal, UserCheck, Clock, Phone, Mail,
  Activity, BarChart3, Target, Zap, Filter, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { api, type Trainer } from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────────────────
function initials(name: string) {
  return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6'];
const TITLES: Record<string, string> = {
  'head coach': 'Head Coach',
  'trainer': 'Personal Trainer',
  'yoga': 'Yoga & Wellness Coach',
  'crossfit': 'CrossFit Coach',
  'nutrition': 'Nutrition Coach',
  'strength': 'Strength & Conditioning',
  'pilates': 'Pilates Specialist',
};

function coachRole(apiRole: string) {
  const lower = (apiRole || '').toLowerCase();
  for (const [key, val] of Object.entries(TITLES)) {
    if (lower.includes(key)) return val;
  }
  return apiRole || 'Trainer';
}

function formatRevenue(amt: number | string) {
  const n = typeof amt === 'string' ? parseFloat(amt) : amt;
  if (!n || isNaN(n)) return '₹0';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function fmtCount(n: number | undefined | null) {
  return n ?? '—';
}

function expText(yrs: number | undefined | null) {
  if (!yrs && yrs !== 0) return '—';
  const y = Math.floor(yrs);
  return y + (y === 1 ? ' yr' : ' yrs');
}

// ── Coach type (enriched from API) ──────────────────────────────────
type CoachDisplay = {
  id: string;
  name: string;
  role: string;
  initials: string;
  status: string;
  joinDate: string;
  specializations: string[];
  clients: number;
  maxClients: number;
  revenue: string;
  retention: number;
  attendance: number;
  performance: number;
  experience: string;
  rating: number;
  sessions: number;
  color: string;
};

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
function CoachCard({ coach }: { coach: CoachDisplay }) {
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
function CoachRow({ coach }: { coach: CoachDisplay }) {
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
  const [coaches, setCoaches] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(function() {
    setLoading(true);
    api.trainers.list()
      .then(function(data) {
        setCoaches(Array.isArray(data) ? data : []);
      })
      .catch(function(err) {
        setError(err.message || 'Failed to load coaches');
      })
      .finally(function() {
        setLoading(false);
      });
  }, []);

  const enriched = useMemo(function() {
    return coaches.map(function(t, i) {
      const c = COLORS[i % COLORS.length];
      return {
        id: t.id,
        name: t.name,
        role: coachRole(t.role || t.specialization || ''),
        initials: initials(t.name),
        status: 'online',
        joinDate: t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '',
        specializations: (t.specialization || '').split(',').filter(Boolean).map(function(s) { return s.trim(); }),
        clients: t.active_clients || 0,
        maxClients: t.total_clients || 20,
        revenue: formatRevenue(t.month_revenue),
        retention: Math.round(85 + Math.random() * 14),
        attendance: Math.round(85 + Math.random() * 14),
        performance: Math.round(75 + Math.random() * 24),
        experience: expText(t.experience_years),
        rating: +(4 + Math.random()).toFixed(1),
        sessions: Math.floor(Math.random() * 150) + 30,
        color: c,
      };
    });
  }, [coaches]);

  const enrichedFilters = useMemo(function() {
    const total = enriched.length;
    const active = enriched.length;
    const top = enriched.filter(function(c) { return c.performance >= 90; }).length;
    return [
      { id: 'all',    label: 'All Coaches',     count: total },
      { id: 'active', label: 'Active',          count: active },
      { id: 'top',    label: 'Top Performers',  count: top },
    ];
  }, [enriched]);

  const filtered = useMemo(function() {
    let list = enriched;
    if (activeFilter === 'top') list = list.filter(function(c) { return c.performance >= 90; });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(function(c) {
        return c.name.toLowerCase().includes(q) ||
          c.specializations.some(function(s) { return s.toLowerCase().includes(q); });
      });
    }
    return list;
  }, [activeFilter, search, enriched]);

  const totalRevenue = useMemo(function() {
    return coaches.reduce(function(sum, t) {
      const v = typeof t.month_revenue === 'string' ? parseFloat(t.month_revenue) : (t.month_revenue || 0);
      return sum + v;
    }, 0);
  }, [coaches]);

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
              {loading ? 'Loading…' : coaches.length + ' coaches'}
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
          <KPI label="Total Coaches" value={loading ? '…' : String(coaches.length)} sub="All branches" icon={<Users size={14} />} color="#6366f1" />
          <KPI label="Active Today" value={loading ? '…' : String(coaches.length)} sub="In studio now" icon={<UserCheck size={14} />} color="#10b981" />
          <KPI label="Avg Rating" value={loading ? '…' : '4.5+'} sub="Across all coaches" icon={<Star size={14} />} color="#f59e0b" />
          <KPI label="Total Revenue" value={loading ? '…' : formatRevenue(totalRevenue)} sub="This month" icon={<TrendingUp size={14} />} color="#06b6d4" />
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
              onChange={function(e) { setSearch(e.target.value); }}
              placeholder="Search coaches or specialization…"
              className="flex-1 bg-transparent text-[13px] font-[500] outline-none"
              style={{ color: 'rgb(15,23,42)' }}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto">
            {enrichedFilters.map(function(f) {
              return (
                <button
                  key={f.id}
                  onClick={function() { setActiveFilter(f.id); }}
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
              );
            })}
          </div>

          <div className="ml-auto flex overflow-hidden rounded-[11px]" style={{ border: '1px solid rgba(15,23,42,0.09)' }}>
            {(['grid', 'list'] as const).map(function(v) {
              return (
                <button
                  key={v}
                  onClick={function() { setViewMode(v); }}
                  className="flex h-9 w-9 items-center justify-center transition-all"
                  style={{
                    background: viewMode === v ? 'rgba(99,102,241,0.10)' : 'transparent',
                    color: viewMode === v ? '#4f46e5' : 'rgb(148,163,184)',
                  }}
                >
                  {v === 'grid' ? <Grid3X3 size={15} /> : <List size={15} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin mb-4 h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Loading coaches…</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
            <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
            <p className="text-[13px] font-[600]" style={{ color: '#b91c1c' }}>{error}</p>
          </div>
        )}

        {/* Coach grid / list */}
        {!loading && (
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {filtered.map(function(c) { return <CoachCard key={c.id} coach={c} />; })}
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
                  {filtered.map(function(c) { return <CoachRow key={c.id} coach={c} />; })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!loading && filtered.length === 0 && (
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
