'use client';

import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { useAsync } from '@/lib/use-async';
import { request } from '@/lib/http';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, Cell } from 'recharts';

const RED = '#ff204e';
const GLASS = 'rgba(255,255,255,0.04)';
const GLASS_BORDER = 'rgba(255,255,255,0.07)';
const DARK = '#050505';
const glassCard = 'rounded-2xl border backdrop-blur-2xl transition-all duration-300';
const glassCardStyle = { background: GLASS, borderColor: GLASS_BORDER, boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)' as string | undefined };
const sectionTitle = 'text-[11px] font-bold uppercase tracking-[0.18em] text-white/40';

const fmtINR = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

export default function PtFinancePage() {
  const { data, loading } = useAsync<any>(
    (signal) => request('/api/pt-os/finance', { signal, cacheMs: 30000 }),
    [],
  );
  const fin = data?.data;
  if (loading && !fin) return (
    <div className="min-h-screen" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] px-4 py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(glassCard, 'h-24 animate-pulse p-5')} style={glassCardStyle} />
        ))}
      </div>
    </div>
  );
  if (!fin) return null;

  const { summary, earnings, trend, payment_methods, pending_payments } = fin;

  return (
    <div className="relative min-h-screen pb-12" style={{ background: DARK }}>
      <div className="mx-auto max-w-[1600px] space-y-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#f5f5f5' }}>PT Finance</h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Revenue, payouts & commission overview</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Month Revenue', value: fmtINR(summary?.revenue_month || 0), change: '+18%', color: RED },
            { label: 'Year Revenue', value: fmtINR(summary?.revenue_year || 0), change: '+42%', color: '#34d399' },
            { label: 'Total Revenue', value: fmtINR(summary?.revenue_total || 0), change: '', color: '#38bdf8' },
            { label: 'Pending Payout', value: fmtINR(earnings?.pending_payout || 0), change: '', color: '#fbbf24' },
          ].map((k, i) => (
            <div key={i} className={cn(glassCard, 'p-4')} style={glassCardStyle}>
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{k.label}</p>
              <p className="mt-1.5 text-xl font-black text-white">{k.value}</p>
              {k.change && <p className="mt-0.5 text-[11px] text-emerald-400 flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{k.change}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={cn(glassCard, 'lg:col-span-2 p-5')} style={glassCardStyle}>
            <p className={sectionTitle}>Revenue Trend</p>
            <div className="h-52 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(trend || []).slice(-12)}>
                  <defs><linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={RED} stopOpacity={0.3} /><stop offset="100%" stopColor={RED} stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#050505', border: `1px solid ${GLASS_BORDER}`, borderRadius: 12, fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" stroke={RED} strokeWidth={2.5} fill="url(#finGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
            <p className={sectionTitle}>Payment Methods</p>
            <div className="mt-3 space-y-2">
              {(payment_methods || []).map((pm: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-white/60">{pm.payment_method}</span>
                  <span className="text-sm font-bold text-white/80">{fmtINR(pm.total)}</span>
                </div>
              ))}
              {(!payment_methods || payment_methods.length === 0) && (
                <p className="text-xs text-white/30 py-4 text-center">No payment data</p>
              )}
            </div>
          </div>
        </div>

        {(pending_payments?.length ?? 0) > 0 && (
          <div className={cn(glassCard, 'p-5')} style={glassCardStyle}>
            <p className={sectionTitle}>Pending Payments</p>
            <div className="mt-3 space-y-1">
              {pending_payments.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-semibold text-white/90">{p.client_name}</p>
                    <p className="text-[10px] text-white/30">Due {new Date(p.due_date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-bold text-white/80">{fmtINR(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}