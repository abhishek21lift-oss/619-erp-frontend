'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Mail, Calendar, Dumbbell, Activity, TrendingUp, Award, IndianRupee, Star, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAsync } from '@/lib/use-async';
import { request } from '@/lib/http';
import { cn } from '@/components/ui/cn';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const RED = '#ff204e';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';
const DARK = '#050505';
const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = { background: GLASS, borderColor: GLASS_BORDER, boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' as string | undefined };

export default function TrainerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading } = useAsync<any>(
    (signal) => request(`/api/pt-os/trainers/${id}`, { signal }),
    [id],
  );
  const trainer = data?.data;

  if (loading && !trainer) return (
    <div className="min-h-screen" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1000px] px-4 py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(glassCard, 'h-20 animate-pulse p-4')} style={glassCardStyle} />
        ))}
      </div>
    </div>
  );
  if (!trainer) return null;

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-8">
        <Link href="/pt-os/trainers" className="inline-flex items-center gap-1.5 text-[11px] font-semibold transition-all hover:gap-2" style={{ color: RED }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Trainers
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn(glassCard, 'p-6')} style={glassCardStyle}>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${RED}, #ff6b8a)` }}>
              {trainer.name?.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white/90">{trainer.name}</h1>
              <p className="text-xs text-white/40 mt-0.5">{trainer.specialization || 'General PT'}</p>
              <div className="flex items-center gap-3 mt-1">
                {trainer.mobile && <span className="flex items-center gap-1 text-[11px] text-white/40"><Phone className="h-3 w-3" />{trainer.mobile}</span>}
                {trainer.email && <span className="flex items-center gap-1 text-[11px] text-white/40"><Mail className="h-3 w-3" />{trainer.email}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white">₹{(trainer.earnings_this_month / 1000).toFixed(1)}K</p>
              <p className="text-[10px] text-white/30">This Month</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Clients', value: trainer.active_clients },
            { label: 'Sessions Month', value: trainer.sessions_this_month },
            { label: 'Health Score', value: trainer.avg_health_score },
            { label: 'Adherence', value: `${trainer.avg_adherence}%` },
          ].map((s, i) => (
            <div key={i} className={cn(glassCard, 'p-4 text-center')} style={glassCardStyle}>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {(trainer.earnings?.length ?? 0) > 0 && (
          <div className={cn(glassCard, 'p-4')} style={glassCardStyle}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-3', 'text-white/40')}>Earnings History</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trainer.earnings.slice().reverse()}>
                  <defs><linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RED} stopOpacity={0.3} /><stop offset="100%" stopColor={RED} stopOpacity={0} /></linearGradient></defs>
                  <Tooltip contentStyle={{ background: '#050505', border: `1px solid ${GLASS_BORDER}`, borderRadius: 12, fontSize: 11 }} />
                  <Area type="monotone" dataKey="total" stroke={RED} strokeWidth={2} fill="url(#earnGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(trainer.clients?.length ?? 0) > 0 && (
          <div className={cn(glassCard, 'p-4')} style={glassCardStyle}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-3', 'text-white/40')}>Active Clients</p>
            <div className="space-y-1">
              {trainer.clients.slice(0, 5).map((c: any) => (
                <Link key={c.id} href={`/pt-os/clients/${c.id}`} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 rounded-full items-center justify-center text-[9px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${RED}, #ff6b8a)` }}>
                      {c.name?.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <span className="text-xs text-white/70">{c.name}</span>
                    <span className="text-[10px] text-white/30">{c.sessions_used}/{c.sessions_total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px]', (c.health_score || 0) >= 70 ? 'text-emerald-400' : (c.health_score || 0) >= 40 ? 'text-yellow-400' : 'text-red-400')}>
                      {c.health_score || '—'}
                    </span>
                    <ChevronRight className="h-3 w-3 text-white/20" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}