'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Mail, Calendar, Dumbbell, Activity, TrendingUp, AlertCircle, Star, ChevronRight, IndianRupee } from 'lucide-react';
import Link from 'next/link';
import { useAsync } from '@/lib/use-async';
import { request } from '@/lib/http';
import { cn } from '@/components/ui/cn';

const RED = '#ff204e';
const RED_SOFT = 'rgba(255,32,78,0.12)';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';
const DARK = '#050505';
const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = { background: GLASS, borderColor: GLASS_BORDER, boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' as string | undefined };

export default function ClientProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading } = useAsync<any>(
    (signal) => request(`/api/pt-os/clients/${id}`, { signal }),
    [id],
  );

  const client = data?.data;

  if (loading && !client) return (
    <div className="min-h-screen" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1000px] px-4 py-8 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn(glassCard, 'h-20 animate-pulse p-4')} style={glassCardStyle} />
        ))}
      </div>
    </div>
  );
  if (!client) return null;

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-8">
        <Link href="/pt-os/clients" className="inline-flex items-center gap-1.5 text-[11px] font-semibold transition-all hover:gap-2" style={{ color: RED }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn(glassCard, 'p-6')} style={glassCardStyle}>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${RED}, #ff6b8a)` }}>
                      {client.name?.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white/90">{client.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {client.mobile && <span className="flex items-center gap-1 text-[11px] text-white/40"><Phone className="h-3 w-3" />{client.mobile}</span>}
                {client.email && <span className="flex items-center gap-1 text-[11px] text-white/40"><Mail className="h-3 w-3" />{client.email}</span>}
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', client.assignment_status === 'active' ? 'text-emerald-400' : 'text-white/40')} style={{ background: client.assignment_status === 'active' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)' }}>
                  {client.assignment_status}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white">{client.sessions_remaining}</p>
              <p className="text-[10px] text-white/30">Sessions Left</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={cn(glassCard, 'p-4')} style={glassCardStyle}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', 'text-white/40')}>Package</p>
            <p className="mt-1.5 text-sm font-bold text-white/90 capitalize">{client.package_name || client.package_type?.replace(/_/g, ' ') || '—'}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{client.sessions_used}/{client.sessions_total} sessions used</p>
          </div>
          <div className={cn(glassCard, 'p-4')} style={glassCardStyle}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', 'text-white/40')}>Trainer</p>
            <p className="mt-1.5 text-sm font-bold text-white/90">{client.trainer_name || 'Unassigned'}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{client.trainer_specialization || ''}</p>
          </div>
          <div className={cn(glassCard, 'p-4')} style={glassCardStyle}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider', 'text-white/40')}>Health Score</p>
            <p className="mt-1.5 text-2xl font-black text-white">{client.health_score || '—'}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{client.adherence_pct || 0}% adherence</p>
          </div>
        </div>

        {(client.sessions?.length ?? 0) > 0 && (
          <div className={cn(glassCard, 'p-4')} style={glassCardStyle}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-3', 'text-white/40')}>Recent Sessions</p>
            <div className="space-y-1">
              {client.sessions.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-3 w-3 text-white/30" />
                    <span className="text-xs text-white/70">{s.goal || 'Session'} <span className="text-white/30">— {new Date(s.scheduled_at).toLocaleDateString()}</span></span>
                  </div>
                  <span className={cn('text-[10px] font-semibold capitalize', s.status === 'completed' ? 'text-emerald-400' : s.status === 'scheduled' ? 'text-blue-400' : 'text-white/40')}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(client.insights?.length ?? 0) > 0 && (
          <div className={cn(glassCard, 'p-4')} style={glassCardStyle}>
            <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-3', 'text-white/40')}>AI Insights</p>
            <div className="space-y-2">
              {client.insights.map((i: any) => (
                <div key={i.id} className="flex items-start gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <AlertCircle className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', i.severity === 'high' ? 'text-red-400' : i.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400')} />
                  <div>
                    <p className="text-xs font-medium text-white/70">{i.title}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{i.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}