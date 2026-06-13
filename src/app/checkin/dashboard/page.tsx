'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserCheck, UserX, Clock, AlertTriangle, Activity,
  Smartphone, Shield, Fingerprint, ScanFace, RefreshCw,
  TrendingUp,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { api } from '@/lib/api';

interface FeedEntry {
  id: string;
  memberName: string;
  checkInTime: string;
  verificationMethod: string;
  deviceName: string;
}

interface TodayStats {
  present: number;
  absent: number;
  late: number;
  active: number;
  feed: FeedEntry[];
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  'Face ID': <ScanFace size={13} />,
  'Touch ID': <Fingerprint size={13} />,
  'Fingerprint': <Fingerprint size={13} />,
  'Passkey': <Shield size={13} />,
};

const METHOD_COLORS: Record<string, string> = {
  'Face ID': '#6366f1',
  'Touch ID': '#10b981',
  'Fingerprint': '#f59e0b',
  'Passkey': '#8b5cf6',
};

export default function DashboardPage() {
  return (
    <Guard>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </Guard>
  );
}

function DashboardContent() {
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.biometricAttend.today() as any;
      setStats(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard');
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const KPI_CARDS = stats ? [
    { label: 'Present', value: stats.present, icon: <UserCheck size={20} />, color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
    { label: 'Absent', value: stats.absent, icon: <UserX size={20} />, color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
    { label: 'Late', value: stats.late, icon: <Clock size={20} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
    { label: 'Active Members', value: stats.active, icon: <Activity size={20} />, color: '#6366f1', bg: 'rgba(99,102,241,0.10)' },
  ] : [];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f0a1e 0%,#0f1a2e 25%,#1e0a2e 55%,#0f172a 100%)', padding: '36px 32px 32px', borderRadius: '0 0 36px 36px' }}>
        <div className="pointer-events-none absolute inset-0" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)' }}>
          <motion.div className="absolute -top-16 -left-8 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
            animate={{ x: [0, 25, -15, 0], y: [0, -30, 10, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute -bottom-16 -right-8 w-72 h-72 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
            animate={{ x: [0, -20, 15, 0], y: [0, 20, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="relative z-10 mx-auto" style={{ maxWidth: 1000 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center w-[48px] h-[48px] rounded-[14px]"
                style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', boxShadow: '0 8px 28px rgba(99,102,241,0.3)' }}>
                <Activity size={20} color="#fff" />
              </motion.div>
              <div>
                <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[24px] font-[860] tracking-[-0.03em]"
                  style={{ background: 'linear-gradient(135deg,#c7d2fe,#6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Attendance Dashboard
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </motion.p>
              </div>
            </div>
            <PremiumButton tone="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={fetchData} loading={loading}>
              Refresh
            </PremiumButton>
          </div>
        </div>
      </div>

      <div className="mx-auto px-5 py-6 sm:px-8" style={{ maxWidth: 1000 }}>
        {loading && !stats ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-[18px] animate-pulse" style={{ background: '#f1f5f9' }} />
              ))}
            </div>
            <div className="h-64 rounded-[22px] animate-pulse" style={{ background: '#f1f5f9' }} />
          </div>
        ) : error ? (
          <div className="rounded-[18px] p-8 text-center" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
            <div className="flex justify-center mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[12px]" style={{ background: 'rgba(239,68,68,0.10)' }}>
                <AlertTriangle size={22} style={{ color: '#ef4444' }} />
              </div>
            </div>
            <p className="text-[14px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{error}</p>
            <PremiumButton tone="primary" glow icon={<RefreshCw size={13} />} onClick={fetchData} className="mt-4">
              Retry
            </PremiumButton>
          </div>
        ) : stats ? (
          <>
            {/* KPI Cards */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {KPI_CARDS.map((kpi, i) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-[18px] p-5 relative overflow-hidden" style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}44)` }} />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: kpi.bg, color: kpi.color }}>
                      {kpi.icon}
                    </div>
                    <TrendingUp size={14} style={{ color: 'rgb(203,213,225)' }} />
                  </div>
                  <p className="text-[24px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{kpi.value}</p>
                  <p className="text-[11.5px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>{kpi.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Live Feed */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-[22px] p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
                    <Activity size={18} style={{ color: '#6366f1' }} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Live Check-In Feed</h2>
                    <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Today's check-in activity</p>
                  </div>
                </div>
                <div className="flex h-2 w-2 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}>
                  <motion.div className="h-full w-full rounded-full" style={{ background: '#10b981' }}
                    animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                </div>
              </div>

              {stats.feed.length === 0 ? (
                <div className="text-center py-10">
                  <div className="flex justify-center mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[12px]" style={{ background: 'rgba(148,163,184,0.10)' }}>
                      <Users size={22} style={{ color: 'rgb(148,163,184)' }} />
                    </div>
                  </div>
                  <p className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>No check-ins recorded today yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.feed.map((entry, i) => (
                    <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 rounded-[12px] p-3 transition-all hover:bg-slate-50"
                      style={{ border: '1px solid #f1f5f9' }}>
                      <div className="flex h-9 w-9 items-center justify-center rounded-[9px] text-[11px] font-[700]"
                        style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>
                        {entry.memberName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{entry.memberName}</p>
                        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgb(148,163,184)' }}>
                          <span style={{ color: METHOD_COLORS[entry.verificationMethod] || '#6366f1' }} className="flex items-center gap-1">
                            {METHOD_ICONS[entry.verificationMethod] || <Shield size={11} />}
                            {entry.verificationMethod}
                          </span>
                          <span>&middot;</span>
                          <Smartphone size={11} />
                          <span>{entry.deviceName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{entry.checkInTime}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  );
}
