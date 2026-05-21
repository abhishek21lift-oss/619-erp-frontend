'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Dumbbell, ChevronRight, Star, TrendingUp, Activity, Trophy, IndianRupee } from 'lucide-react';
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
const sectionTitle = 'text-[11px] font-bold uppercase tracking-[0.18em] text-white/40';

interface Trainer {
  id: string; name: string; email: string; mobile: string; specialization: string;
  bio: string; photo_url: string | null; status: string; joining_date: string;
  active_clients: number; total_assignments: number; completed_sessions: number;
  sessions_this_month: number; avg_health_score: number; avg_adherence: number;
  total_earnings: number; earnings_this_month: number;
}

export default function PtTrainersPage() {
  const [search, setSearch] = useState('');
  const { data, loading } = useAsync<{ data: Trainer[] }>(
    (signal) => request(`/api/pt-os/trainers?search=${search}&limit=50`, { signal, cacheMs: 15000 }),
    [search],
  );
  const trainers = data?.data || [];

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f5f5' }}>PT Trainers</h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{trainers.length} premium trainers</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input placeholder="Search trainers..." value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-xs text-white/70 outline-none w-36 placeholder:text-white/20" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && !trainers.length && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn(glassCard, 'h-48 animate-pulse p-5')} style={glassCardStyle} />
          ))}
          {trainers.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn(glassCard, 'group relative overflow-hidden p-5 hover:-translate-y-0.5 cursor-pointer')} style={glassCardStyle}>
              <Link href={`/pt-os/trainers/${t.id}`} className="block">
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.06]" style={{ background: `radial-gradient(circle, ${RED}, transparent 70%)` }} />
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${RED}, #ff6b8a)` }}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-white/90 truncate">{t.name}</h3>
                    <p className="text-[11px] text-white/40 truncate">{t.specialization || 'General PT'}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-all shrink-0" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-lg font-black text-white">{t.active_clients}</p>
                    <p className="text-[9px] text-white/30">Clients</p>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-lg font-black text-white">{t.sessions_this_month}</p>
                    <p className="text-[9px] text-white/30">Sessions</p>
                  </div>
                  <div className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-lg font-black text-white">{t.avg_health_score}</p>
                    <p className="text-[9px] text-white/30">Health</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-white/40"><Activity className="h-3 w-3" /> {t.avg_adherence}% adherence</span>
                  <span className="font-bold text-white/80">₹{(t.earnings_this_month / 1000).toFixed(1)}K</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}