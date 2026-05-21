'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Search, Dumbbell, ChevronRight, Filter, Clock } from 'lucide-react';
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

const statusColors: Record<string, string> = {
  completed: '#34d399', scheduled: '#38bdf8', missed: '#f87171', cancelled: 'rgba(255,255,255,0.3)', rescheduled: '#fbbf24',
};

export default function PtSessionsPage() {
  const [status, setStatus] = useState('');
  const { data, loading } = useAsync<{ data: any[] }>(
    (signal) => request(`/api/pt-os/sessions?status=${status}&limit=50`, { signal, cacheMs: 15000 }),
    [status],
  );
  const sessions = data?.data || [];
  const statuses = ['scheduled', 'completed', 'missed', 'cancelled', 'rescheduled'];

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f5f5' }}>PT Sessions</h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{sessions.length} sessions</p>
          </div>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setStatus('')}
            className={cn('rounded-full px-3.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-all', !status ? 'text-white' : 'text-white/40 hover:text-white/70')}
            style={!status ? { background: RED } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >All</button>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatus(s === status ? '' : s)}
              className={cn('rounded-full px-3.5 py-1.5 text-[11px] font-semibold whitespace-nowrap capitalize transition-all', status === s ? 'text-white' : 'text-white/40 hover:text-white/70')}
              style={status === s ? { background: RED } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >{s}</button>
          ))}
        </div>

        <div className="space-y-2">
          {loading && !sessions.length && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn(glassCard, 'h-16 animate-pulse p-4')} style={glassCardStyle} />
          ))}
          {sessions.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className={cn(glassCard, 'p-4')} style={glassCardStyle}>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${RED_SOFT}` }}>
                  <Dumbbell className="h-4 w-4" style={{ color: RED }} />
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <div>
                    <p className="text-sm font-bold text-white/90">{s.client_name}</p>
                    <p className="text-[10px] text-white/40">{s.trainer_name}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-white/50 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(s.scheduled_at).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-white/30 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-white/40 capitalize">{s.session_type?.replace(/_/g, ' ') || 'In person'}</span>
                    {s.goal && <p className="text-[10px] text-white/30 truncate">{s.goal}</p>}
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize"
                      style={{ color: statusColors[s.status] || 'white', background: `${statusColors[s.status] || 'white'}15` }}>
                      {s.status}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {!loading && sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Calendar className="h-10 w-10 text-white/10" />
              <p className="text-sm text-white/30">No sessions found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}