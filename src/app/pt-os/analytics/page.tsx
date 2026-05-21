'use client';

import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Activity, Users, Dumbbell, Target } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { useAsync } from '@/lib/use-async';
import { request } from '@/lib/http';
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, AreaChart, Area } from 'recharts';

const RED = '#ff204e';
const pkgColors = [RED, '#ff6b8a', '#ff9eb3', 'rgba(255,32,78,0.4)', '#38bdf8', '#34d399'];
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';
const DARK = '#050505';
const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = { background: GLASS, borderColor: GLASS_BORDER, boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' as string | undefined };
const sectionTitle = 'text-[11px] font-bold uppercase tracking-[0.18em] text-white/40';

export default function PtAnalyticsPage() {
  const { data, loading } = useAsync<any>(
    (signal) => request('/api/pt-os/analytics', { signal, cacheMs: 30000 }),
    [],
  );
  const a = data?.data;
  if (loading && !a) return (
    <div className="min-h-screen" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] px-4 py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(glassCard, 'h-24 animate-pulse p-5')} style={glassCardStyle} />
        ))}
      </div>
    </div>
  );
  if (!a) return null;

  const retention = a.retention || {};
  const totalRet = (retention.active || 0) + (retention.completed || 0) + (retention.cancelled || 0) + (retention.expired || 0);
  const retentionRate = totalRet > 0 ? Math.round((retention.active || 0) / totalRet * 100) : 0;

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f5f5' }}>PT Analytics</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Retention, adherence & performance insights</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Retention Rate', value: `${retentionRate}%`, color: RED },
            { label: 'Active Assignments', value: retention.active || 0, color: '#34d399' },
            { label: 'Completed', value: retention.completed || 0, color: '#38bdf8' },
            { label: 'Churned', value: (retention.cancelled || 0) + (retention.expired || 0), color: '#f87171' },
          ].map((k, i) => (
            <div key={i} className={cn(glassCard, 'p-4 text-center')} style={glassCardStyle}>
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
            <p className={sectionTitle}>Health Distribution</p>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={(a.health_distribution || []).map((h: any, i: number) => ({ ...h, color: pkgColors[i % pkgColors.length] }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" stroke="none">
                    {(a.health_distribution || []).map((_: any, i: number) => (
                      <Cell key={i} fill={pkgColors[i % pkgColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#050505', border: `1px solid ${GLASS_BORDER}`, borderRadius: 12, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1">
              {(a.health_distribution || []).map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: pkgColors[i % pkgColors.length] }} /><span className="text-white/60 capitalize">{h.health_label}</span></span>
                  <span className="font-semibold text-white/80">{h.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
            <p className={sectionTitle}>Adherence Distribution</p>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(a.adherence_distribution || [])}>
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#050505', border: `1px solid ${GLASS_BORDER}`, borderRadius: 12, fontSize: 11 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {(a.adherence_distribution || []).map((_: any, i: number) => (
                      <Cell key={i} fill={[RED, '#ff6b8a', '#fbbf24', '#34d399'][i] || RED} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
            <p className={sectionTitle}>Sessions by Type</p>
            <div className="mt-3 space-y-2">
              {(a.sessions_by_type || []).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-white/60 capitalize">{s.session_type?.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-bold text-white/80">{s.count}</span>
                </div>
              ))}
              {(!a.sessions_by_type || a.sessions_by_type.length === 0) && (
                <p className="text-xs text-white/30 py-4 text-center">No session data</p>
              )}
            </div>
          </div>

          <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
            <p className={sectionTitle}>Top Packages</p>
            <div className="mt-3 space-y-2">
              {(a.top_packages || []).slice(0, 5).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-xs font-medium text-white/70 truncate">{p.name || p.type}</p>
                    <p className="text-[10px] text-white/30">{p.assignments} assignments</p>
                  </div>
                  <span className="text-sm font-bold text-white/80">₹{(p.revenue / 1000).toFixed(0)}K</span>
                </div>
              ))}
              {(!a.top_packages || a.top_packages.length === 0) && (
                <p className="text-xs text-white/30 py-4 text-center">No package data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}