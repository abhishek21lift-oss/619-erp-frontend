'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, ChevronRight, Star, TrendingUp, Calendar, Dumbbell, Activity, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal, Phone, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { useAsync } from '@/lib/use-async';
import { request } from '@/lib/http';

const RED = '#ff204e';
const RED_SOFT = 'rgba(255,32,78,0.12)';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';
const DARK = '#050505';
const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = { background: GLASS, borderColor: GLASS_BORDER, boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' as string | undefined };

interface Client {
  id: string; name: string; mobile: string; email: string; gender: string; photo_url: string | null;
  assignment_id: string; assignment_status: string; sessions_total: number; sessions_used: number;
  sessions_remaining: number; start_date: string; end_date: string; health_score: number;
  adherence_pct: number; final_amount: number; amount: number;
  trainer_id: string; trainer_name: string; package_name: string; package_type: string;
  total_sessions: number; last_session: string;
}

export default function PtClientsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, loading, refetch } = useAsync<{ data: Client[]; meta: any }>(
    (signal) => request(`/api/pt-os/clients?search=${search}&status=${status}&limit=50`, { signal, cacheMs: 15000 }),
    [search, status],
  );

  const clients = data?.data || [];
  const statuses = ['active', 'completed', 'cancelled', 'expired'];

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f5f5' }}>PT Clients</h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{data?.meta?.total || clients.length} premium coaching clients</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Search className="h-3.5 w-3.5 text-white/30" />
              <input
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-xs text-white/70 outline-none w-36 placeholder:text-white/20"
              />
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setStatus('')}
            className={cn('rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all whitespace-nowrap', !status ? 'text-white' : 'text-white/40 hover:text-white/70')}
            style={!status ? { background: RED } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >All</button>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatus(s === status ? '' : s)}
              className={cn('rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all capitalize whitespace-nowrap', status === s ? 'text-white' : 'text-white/40 hover:text-white/70')}
              style={status === s ? { background: RED } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >{s}</button>
          ))}
        </div>

        <div className="grid gap-3">
          {loading && !clients.length && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn(glassCard, 'h-20 animate-pulse p-4')} style={glassCardStyle} />
          ))}
          {clients.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(glassCard, 'group relative overflow-hidden')}
              style={glassCardStyle}
            >
              <Link href={`/pt-os/clients/${client.id}`} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${RED}, #ff6b8a)` }}>
                  {client.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-center">
                  <div>
                    <p className="text-sm font-bold text-white/90 truncate">{client.name}</p>
                    <p className="text-[10px] text-white/40">{client.mobile || client.email || '—'}</p>
                  </div>
                  <div>
                    <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: `${RED_SOFT}`, color: RED }}>
                      {client.package_name || client.package_type?.replace(/_/g, ' ') || 'No package'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${client.sessions_total > 0 ? (client.sessions_used / client.sessions_total) * 100 : 0}%`, background: client.sessions_remaining > 0 ? '#34d399' : RED }} />
                    </div>
                    <span className="text-[11px] font-semibold text-white/50">{client.sessions_used}/{client.sessions_total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${client.adherence_pct || 0}%`, background: (client.adherence_pct || 0) >= 70 ? '#34d399' : (client.adherence_pct || 0) >= 40 ? '#fbbf24' : RED }} />
                    </div>
                    <span className="text-[11px] text-white/40">{client.adherence_pct || 0}%</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white/90">{client.trainer_name || 'Unassigned'}</p>
                    <p className="text-[10px] text-white/30">Trainer</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-all shrink-0" />
              </Link>
            </motion.div>
          ))}
          {!loading && clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="h-10 w-10 text-white/10" />
              <p className="text-sm text-white/30">No PT clients found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}