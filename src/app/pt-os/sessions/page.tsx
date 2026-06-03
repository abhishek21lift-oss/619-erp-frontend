'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Clock, CheckCircle2, XCircle,
  RefreshCw, Calendar, Dumbbell,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import TabBar from '@/app/pt-os/TabBar';
import { api } from '@/lib/api';

type Session = {
  id: string;
  client_id: string;
  client_name: string;
  client_mobile: string;
  trainer_id: string;
  session_date: string;
  session_time: string;
  status: string;
  notes?: string;
  duration_minutes?: number;
  session_type?: string;
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  scheduled: { label: 'Scheduled', color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', dot: '#3B82F6' },
  completed: { label: 'Completed', color: '#10B981', bg: 'rgba(16,185,129,0.08)', dot: '#10B981' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', dot: '#EF4444' },
  'no-show': { label: 'No Show', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', dot: '#F59E0B' },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  scheduled: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
  'no-show': XCircle,
};

function fmtTime(t?: string) {
  if (!t) return '—';
  try {
    const d = new Date(`2000-01-01T${t}`);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return t.slice(0, 5);
  }
}

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return d;
  }
}

export default function PTSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    setError('');
    try {
      const trainersRes = (await api.pt.trainers()) as { data: any[] };
      const trainerArr = Array.isArray(trainersRes?.data) ? trainersRes.data : [];
      const all: Session[] = [];
      for (const t of trainerArr.slice(0, 20)) {
        try {
          const sRes = (await api.pt.sessions({ trainer_id: t.id })) as { data: any[] };
          const list = Array.isArray(sRes?.data) ? sRes.data : [];
          all.push(...list.map((s: any) => ({
            id: s.id, client_id: s.client_id,
            client_name: s.client_name || '',
            client_mobile: '',
            trainer_id: s.trainer_id,
            session_date: s.date,
            session_time: s.start_time || '',
            status: s.status,
            notes: s.notes,
            session_type: s.title,
          })));
        } catch { /* skip */ }
      }
      all.sort((a, b) => (b.session_date + 'T' + (b.session_time || ''))
        .localeCompare(a.session_date + 'T' + (a.session_time || '')));
      setSessions(all);
    } catch {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  const filtered = sessions.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.client_name?.toLowerCase().includes(q) ||
      s.client_mobile?.includes(q)
    );
  });

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
                Session History
              </h1>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Track all PT sessions across trainers
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={loadSessions}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.08)] text-[#3B82F6] transition-colors hover:bg-[rgba(59,130,246,0.14)]"
            >
              <RefreshCw size={15} strokeWidth={2} className={loading ? 'animate-spin' : ''} />
            </motion.button>
          </div>

          {/* Tab Bar */}
          <TabBar />

          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-disabled)]" strokeWidth={1.5} />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by client name or mobile..."
                className="w-full h-10 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white pl-9 pr-4 text-[13px] text-[var(--text-primary)] placeholder-[#9CA3AF] outline-none transition-all duration-200 focus:border-[#3B82F6]/30 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.06)]"
              />
            </div>
            <div className="flex items-center gap-2">
              {['all', 'scheduled', 'completed', 'cancelled', 'no-show'].map(st => {
                const cfg = STATUS_STYLES[st] || { label: st, color: '#6B7280', bg: 'rgba(107,114,128,0.08)', dot: '#6B7280' };
                return (
                  <button key={st} onClick={() => setStatusFilter(st)}
                    className={
                      'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ' +
                      (statusFilter === st ? 'text-white shadow-sm' : 'text-[#6B7280] hover:bg-[rgba(0,0,0,0.04)]')
                    }
                    style={{
                      background: statusFilter === st ? cfg.color : undefined,
                    }}
                  >
                    {st === 'all' ? 'All' : cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 rounded-full border-[3px] border-[#3B82F6]/20 border-t-[#3B82F6] animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#FEF2F2] text-[#EF4444]">
                <XCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-[#EF4444]">{error}</p>
              <button onClick={loadSessions} className="mt-3 text-[13px] font-medium text-[#3B82F6] hover:underline">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-[rgba(59,130,246,0.06)] text-[#3B82F6]">
                <Calendar className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-[#6B7280]">No sessions found</p>
              <p className="mt-1 text-[12px] text-[var(--text-disabled)]">Schedule a PT session to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s, i) => {
                const cfg = STATUS_STYLES[s.status] || STATUS_STYLES.scheduled;
                const Icon = STATUS_ICONS[s.status] || Clock;
                return (
                  <motion.div
                    key={s.id || i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="group flex items-center gap-4 rounded-[14px] border border-[rgba(0,0,0,0.04)] bg-white p-4 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                  >
                    {/* Status icon */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={18} style={{ color: cfg.color }} strokeWidth={1.5} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[var(--text-primary)]">
                        {s.client_name || 'Unknown Client'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[#6B7280]">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} strokeWidth={1.5} />
                          {fmtDate(s.session_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} strokeWidth={1.5} />
                          {fmtTime(s.session_time)}
                        </span>
                        {s.session_type && (
                          <span className="flex items-center gap-1">
                            <Dumbbell size={11} strokeWidth={1.5} />
                            {s.session_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div
                      className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
