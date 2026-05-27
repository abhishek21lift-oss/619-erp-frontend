'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, Client } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import {
  Search, Plus, Filter, Flame, Thermometer, Snowflake,
  Phone, MessageCircle, UserCheck, ChevronRight, Zap,
  TrendingUp, Clock, Target, Users, Star, ArrowUpRight,
  LayoutGrid, List, Calendar, Sparkles, RefreshCw
} from 'lucide-react';

export default function LeadInboxPage() { return <Guard><Inner /></Guard>; }

type Temp = 'hot' | 'warm' | 'cold';

function getTemp(c: Client): Temp {
  if (!c.joining_date) return 'cold';
  const days = Math.floor((Date.now() - new Date(c.joining_date).getTime()) / 86400000);
  if (days <= 2) return 'hot';
  if (days <= 7) return 'warm';
  return 'cold';
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const SOURCE_ICONS: Record<string, string> = {
  'Instagram': '📸', 'Facebook': '📘', 'Google': '🔍', 'Referral': '🤝',
  'Walk-in': '🚶', 'WhatsApp': '💬', 'Banner / Hoarding': '🪧', 'Other': '📌',
};

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-400 to-rose-500',
  'from-pink-500 to-fuchsia-600',
  'from-amber-400 to-orange-500',
];

function useCounter(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

function Inner() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTemp, setFilterTemp] = useState<Temp | 'all'>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    api.clients.list({}).then(r => setClients(r)).finally(() => { setLoading(false); setRefreshing(false); });
  };
  useEffect(load, []);

  const leads = useMemo(() => {
    const pool = clients.filter(c => c.status === 'lead' || !c.pt_end_date || Number(c.final_amount || 0) === 0);
    const s = search.toLowerCase();
    const filtered = s ? pool.filter(c =>
      c.name?.toLowerCase().includes(s) ||
      (c.mobile || '').includes(s) ||
      (c.interested_in || '').toLowerCase().includes(s)
    ) : pool;
    return filterTemp === 'all' ? filtered : filtered.filter(c => getTemp(c) === filterTemp);
  }, [clients, search, filterTemp]);

  const all = useMemo(() => clients.filter(c => c.status === 'lead' || !c.pt_end_date || Number(c.final_amount || 0) === 0), [clients]);
  const hot = useMemo(() => all.filter(c => getTemp(c) === 'hot'), [all]);
  const warm = useMemo(() => all.filter(c => getTemp(c) === 'warm'), [all]);
  const today = useMemo(() => all.filter(c => c.joining_date && new Date(c.joining_date).toDateString() === new Date().toDateString()), [all]);
  const converted = useMemo(() => clients.filter(c => c.pt_end_date && Number(c.final_amount || 0) > 0), [clients]);
  const convRate = clients.length > 0 ? Math.round((converted.length / clients.length) * 100) : 0;

  const cAll = useCounter(all.length);
  const cHot = useCounter(hot.length);
  const cToday = useCounter(today.length);
  const cConv = useCounter(converted.length);
  const cRate = useCounter(convRate);

  const kpis = [
    { label: 'Open Leads', value: cAll, icon: <Users size={18} />, gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/20', sub: 'Total active leads' },
    { label: 'Hot 🔥', value: cHot, icon: <Flame size={18} />, gradient: 'from-red-500 to-orange-500', glow: 'shadow-red-500/20', sub: '≤ 2 days old' },
    { label: "Today's Leads", value: cToday, icon: <Zap size={18} />, gradient: 'from-amber-400 to-orange-500', glow: 'shadow-amber-400/20', sub: 'Enquired today' },
    { label: 'Converted', value: cConv, icon: <UserCheck size={18} />, gradient: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-500/20', sub: 'Paid members' },
    { label: 'Conv. Rate', value: `${cRate}%`, icon: <TrendingUp size={18} />, gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/20', sub: 'All-time' },
    { label: 'Warm Leads', value: warm.length, icon: <Thermometer size={18} />, gradient: 'from-pink-500 to-fuchsia-600', glow: 'shadow-pink-500/20', sub: '3–7 days old' },
  ];

  return (
    <AppShell>
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }} />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />
      </div>

      <div className="relative" style={{ zIndex: 1, padding: '1.5rem 1.75rem', maxWidth: 1280, margin: '0 auto' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>Lead Inbox</h1>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginLeft: 40 }}>{all.length} total leads · {hot.length} hot · {today.length} today</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
              style={{ border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link href="/sales/enquiry"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 14px rgba(124,58,237,0.35)', transition: 'all 0.2s' }}
            >
              <Plus size={15} /> Add Enquiry
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' }}
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.8)',
                borderRadius: 20,
                padding: '1.1rem 1.25rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                cursor: 'default',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${k.gradient}`}>
                  {k.icon}
                </div>
                <ArrowUpRight size={13} style={{ color: '#94a3b8' }} />
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', color: '#0f172a', lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginTop: 4 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1" style={{ minWidth: 240, maxWidth: 380 }}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, mobile, interest…"
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(8px)', fontSize: 13, outline: 'none', color: '#0f172a',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            />
          </div>
          {/* Temp filters */}
          {(['all', 'hot', 'warm', 'cold'] as const).map(t => (
            <button key={t} onClick={() => setFilterTemp(t)}
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: filterTemp === t ? 'none' : '1px solid rgba(0,0,0,0.08)',
                background: filterTemp === t
                  ? t === 'hot' ? 'linear-gradient(135deg,#ef4444,#f97316)'
                    : t === 'warm' ? 'linear-gradient(135deg,#f59e0b,#f97316)'
                    : t === 'cold' ? 'linear-gradient(135deg,#0ea5e9,#6366f1)'
                    : 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                  : 'rgba(255,255,255,0.85)',
                color: filterTemp === t ? '#fff' : '#64748b',
                cursor: 'pointer', transition: 'all 0.18s', textTransform: 'capitalize',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {t === 'hot' ? <Flame size={12} /> : t === 'warm' ? <Thermometer size={12} /> : t === 'cold' ? <Snowflake size={12} /> : <Filter size={12} />}
              {t === 'all' ? 'All Leads' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {/* View toggle */}
          <div className="flex items-center gap-1 ml-auto" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 3 }}>
            {(['list', 'grid'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{
                  padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: view === v ? '#7c3aed' : 'transparent', color: view === v ? '#fff' : '#94a3b8',
                }}
              >
                {v === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{leads.length} leads</div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill,minmax(300px,1fr))' : '1fr' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                borderRadius: 16, padding: '1rem 1.25rem', height: 72,
                animation: 'shimmer 1.5s ease-in-out infinite',
                background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
                backgroundSize: '200% 100%',
              }} />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.7)', borderRadius: 24, border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: '#0f172a', marginBottom: 6 }}>Inbox Zero</h3>
            <p style={{ color: '#64748b', fontSize: 14 }}>All leads have been actioned. Add a new enquiry to get started.</p>
            <Link href="/sales/enquiry"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '10px 20px',
                background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
            >
              <Plus size={14} /> Add Enquiry
            </Link>
          </motion.div>
        ) : view === 'list' ? (
          /* List View */
          <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1.4fr 1fr 1fr 100px', gap: '0 1rem', padding: '0.65rem 1.25rem',
              borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(248,250,252,0.8)' }}>
              {['Lead', 'Mobile', 'Interest', 'Source', 'Added', ''].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</div>
              ))}
            </div>
            <AnimatePresence>
              {leads.map((c, i) => {
                const temp = getTemp(c);
                const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    whileHover={{ backgroundColor: 'rgba(124,58,237,0.03)' }}
                    style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1.4fr 1fr 1fr 100px', gap: '0 1rem',
                      padding: '0.85rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.04)', alignItems: 'center', cursor: 'default' }}
                  >
                    {/* Lead name + avatar + temp */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 bg-gradient-to-br ${grad}`}>
                        {getInitials(c.name || '?')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                          {c.joining_date ? `Added ${fmtDate(c.joining_date)}` : 'No date'}
                        </div>
                      </div>
                      <div style={{
                        marginLeft: 6,
                        padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: temp === 'hot' ? '#fef2f2' : temp === 'warm' ? '#fffbeb' : '#eff6ff',
                        color: temp === 'hot' ? '#dc2626' : temp === 'warm' ? '#d97706' : '#3b82f6',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {temp === 'hot' ? <Flame size={9} /> : temp === 'warm' ? <Thermometer size={9} /> : <Snowflake size={9} />}
                        {temp}
                      </div>
                    </div>
                    {/* Mobile */}
                    <div style={{ fontSize: 13, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{c.mobile || '—'}</div>
                    {/* Interest */}
                    <div style={{ fontSize: 12 }}>
                      {c.interested_in ? (
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontWeight: 600, fontSize: 11 }}>{c.interested_in}</span>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>}
                    </div>
                    {/* Source */}
                    <div style={{ fontSize: 13, color: '#475569' }}>
                      {SOURCE_ICONS[c.reference_no || 'Walk-in'] || '📌'} {c.reference_no || 'Walk-in'}
                    </div>
                    {/* Date */}
                    <div style={{ fontSize: 12, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {c.joining_date ? fmtDate(c.joining_date) : '—'}
                    </div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {c.mobile && (
                        <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noopener"
                          style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="WhatsApp"
                        >
                          <MessageCircle size={13} style={{ color: '#16a34a' }} />
                        </a>
                      )}
                      <Link href={`/clients/${c.id}`}
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#f0f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Open"
                      >
                        <ChevronRight size={13} style={{ color: '#6366f1' }} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* Grid View */
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            <AnimatePresence>
              {leads.map((c, i) => {
                const temp = getTemp(c);
                const grad = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}
                    style={{
                      background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20,
                      padding: '1.1rem 1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${grad}`}>
                          {getInitials(c.name || '?')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.mobile || '—'}</div>
                        </div>
                      </div>
                      <div style={{
                        padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                        background: temp === 'hot' ? '#fef2f2' : temp === 'warm' ? '#fffbeb' : '#eff6ff',
                        color: temp === 'hot' ? '#dc2626' : temp === 'warm' ? '#d97706' : '#3b82f6',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {temp === 'hot' ? <Flame size={9} /> : temp === 'warm' ? <Thermometer size={9} /> : <Snowflake size={9} />}
                        {temp}
                      </div>
                    </div>
                    {c.interested_in && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f0f0ff', color: '#6366f1', fontWeight: 600, fontSize: 11 }}>{c.interested_in}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                      {SOURCE_ICONS[c.reference_no || 'Walk-in'] || '📌'} {c.reference_no || 'Walk-in'} · {c.joining_date ? fmtDate(c.joining_date) : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.mobile && (
                        <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noopener"
                          style={{ flex: 1, padding: '7px 0', borderRadius: 10, background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      )}
                      <Link href={`/clients/${c.id}`}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 10, background: '#f0f0ff', color: '#6366f1', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        Open <ChevronRight size={12} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}
