'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, LeaveRequest, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CalendarCheck, CalendarX, Clock, Activity, Search, Plus, X, ChevronRight, AlertTriangle, CheckCircle, Ban, User, CalendarDays } from 'lucide-react';

function daysBetween(from: string, to: string) {
  const a = new Date(from);
  const b = new Date(to);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(diff + 1, 1);
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

import { avatarGradient, initialsAvatar } from '@/lib/avatar';

const initials = initialsAvatar;

const TYPE_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  sick:      { bg: 'rgba(239,68,68,0.12)', color: '#fca5a5', icon: '🤒' },
  casual:    { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd', icon: '😎' },
  personal:  { bg: 'rgba(99,102,241,0.12)', color: '#a5b4fc', icon: '🙋' },
  earned:    { bg: 'rgba(16,185,129,0.12)', color: '#6ee7b7', icon: '🎯' },
  emergency: { bg: 'rgba(245,158,11,0.12)', color: '#fcd34d', icon: '🚨' },
  unpaid:    { bg: 'rgba(139,92,246,0.12)', color: '#c4b5fd', icon: '📋' },
  other:     { bg: 'rgba(148,163,184,0.12)', color: '#cbd5e1', icon: '📝' },
};

const LEAVE_TYPES = ['sick', 'casual', 'personal', 'earned', 'emergency', 'unpaid', 'other'];

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', icon: <Clock size={11} /> },
  approved: { label: 'Approved', bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', icon: <CheckCircle size={11} /> },
  rejected: { label: 'Rejected', bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', icon: <Ban size={11} /> },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } }
};

export default function TrainerLeaveRequestsPage() {
  return <Guard roles={['admin', 'manager']}><Inner /></Guard>;
}

function Inner() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ trainer_id: '', leave_type: 'sick', from_date: '', to_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    Promise.all([api.leave.list(), api.trainers.list()])
      .then(([lv, tr]) => {
        if (!alive) return;
        setLeaves(Array.isArray(lv) ? lv : []);
        setTrainers(Array.isArray(tr) ? tr : []);
      })
      .catch((e) => alive && setError(e.message || 'Failed to load leave requests'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  function flash(msg: string) { setSuccess(msg); setTimeout(() => setSuccess(''), 2500); }

  async function approve(lv: LeaveRequest) {
    setActing(lv.id); setError('');
    try {
      const res = await api.leave.approve(lv.id);
      setLeaves((prev) => prev.map((r) => (r.id === lv.id ? res.leave : r)));
      flash(`Approved leave for ${lv.trainer_name || 'trainer'}`);
    } catch (e: any) { setError(e.message || 'Could not approve'); }
    finally { setActing(null); }
  }

  async function rejectConfirm() {
    if (!rejectTarget) return;
    setActing(rejectTarget.id); setError('');
    try {
      const res = await api.leave.reject(rejectTarget.id, rejectNote.trim() || undefined);
      setLeaves((prev) => prev.map((r) => (r.id === rejectTarget.id ? res.leave : r)));
      flash(`Rejected leave for ${rejectTarget.trainer_name || 'trainer'}`);
      setRejectTarget(null); setRejectNote('');
    } catch (e: any) { setError(e.message || 'Could not reject'); }
    finally { setActing(null); }
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault(); setFormErr('');
    if (!form.trainer_id) { setFormErr('Select a trainer'); return; }
    if (!form.from_date || !form.to_date) { setFormErr('Select date range'); return; }
    if (form.to_date < form.from_date) { setFormErr('To date must be ≥ From date'); return; }
    setSubmitting(true);
    try {
      const res = await api.leave.create(form);
      setLeaves((prev) => [res.leave, ...prev]);
      flash('Leave request submitted');
      setShowModal(false);
      setForm({ trainer_id: '', leave_type: 'sick', from_date: '', to_date: '', reason: '' });
    } catch (e: any) { setFormErr(e.message || 'Could not submit'); }
    finally { setSubmitting(false); }
  }

  const filtered = useMemo(() => {
    let rows = tab === 'all' ? leaves : leaves.filter((l) => l.status === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((l) =>
        (l.trainer_name || '').toLowerCase().includes(s) ||
        (l.leave_type || '').toLowerCase().includes(s) ||
        (l.reason || '').toLowerCase().includes(s));
    }
    return rows;
  }, [leaves, tab, search]);

  const kpi = {
    pending: leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
    total: leaves.length,
  };

  const TABS = [
    { key: 'pending' as const, label: 'Pending', count: kpi.pending, color: '#f59e0b' },
    { key: 'approved' as const, label: 'Approved', count: kpi.approved, color: '#10b981' },
    { key: 'rejected' as const, label: 'Rejected', count: kpi.rejected, color: '#ef4444' },
    { key: 'all' as const, label: 'All', count: kpi.total, color: '#8b5cf6' },
  ];

  return (
    <AppShell>
      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1040 30%, #0f172a 60%, #1e0a2e 100%)', padding: '48px 32px 40px', borderRadius: '0 0 40px 40px' }}>
        <motion.div style={{ position: 'absolute', top: -80, right: -40, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, 25, -15, 0], y: [0, -30, 15, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div style={{ position: 'absolute', bottom: -60, left: -30, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.1), transparent 70%)', pointerEvents: 'none' }}
          animate={{ x: [0, -20, 25, 0], y: [0, 25, -10, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6, position: 'relative', zIndex: 1 }}>
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}>
            <CalendarDays size={24} color="#fff" />
          </motion.div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fef3c7, #fcd34d, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Leave Requests</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Manage and review trainer leave applications</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {error && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#6ee7b7', marginBottom: 16 }}>
            {success}
          </motion.div>
        )}

        {/* ── KPI Grid ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Pending', value: kpi.pending, icon: <Clock size={16} />, from: '#f59e0b', to: '#d97706', glow: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.2)' },
            { label: 'Approved', value: kpi.approved, icon: <CalendarCheck size={16} />, from: '#10b981', to: '#059669', glow: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.2)' },
            { label: 'Rejected', value: kpi.rejected, icon: <CalendarX size={16} />, from: '#ef4444', to: '#dc2626', glow: 'rgba(239,68,68,0.25)', bg: 'rgba(239,68,68,0.2)' },
            { label: 'Total', value: kpi.total, icon: <Activity size={16} />, from: '#8b5cf6', to: '#7c3aed', glow: 'rgba(139,92,246,0.25)', bg: 'rgba(139,92,246,0.2)' },
          ].map((k, i) => (
            <motion.div key={k.label} variants={itemVariants}
              style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '20px 20px', background: `linear-gradient(135deg, ${k.bg}, rgba(30,27,75,0.6))`, border: '1px solid rgba(255,255,255,0.08)', boxShadow: `0 6px 24px ${k.glow}`, cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${k.glow}`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 24px ${k.glow}`; }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: `radial-gradient(circle, ${k.glow}, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)' }}>{k.label}</span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{k.icon}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{k.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Toolbar ── */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}
            style={{ borderRadius: 18, padding: '14px 18px', marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3 }}>
                {TABS.map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'capitalize',
                      fontFamily: 'inherit', transition: 'all 0.2s',
                      background: tab === t.key ? `linear-gradient(135deg, ${t.color}22, ${t.color}11)` : 'transparent',
                      color: tab === t.key ? t.color : 'rgba(255,255,255,0.4)',
                      boxShadow: tab === t.key ? `inset 0 0 0 1px ${t.color}44` : 'none',
                    }}>
                    {t.label}
                    <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: tab === t.key ? `${t.color}33` : 'rgba(255,255,255,0.06)', color: tab === t.key ? t.color : 'rgba(255,255,255,0.4)' }}>{t.count}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Search size={13} color="rgba(255,255,255,0.3)" />
                <input placeholder="Search trainer / type…" value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 500, outline: 'none', width: 200 }} />
              </div>
              <button onClick={() => setShowModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 4px 16px rgba(245,158,11,0.25)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(245,158,11,0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.25)'; }}>
                <Plus size={14} /> Add Request
              </button>
            </div>
          </motion.div>

          {/* ── Table ── */}
          <motion.div variants={itemVariants}
            style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', background: 'rgba(255,255,255,0.02)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.15)', borderTopColor: '#8b5cf6', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading leave requests…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <CalendarDays size={28} color="#fcd34d" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: 'rgba(255,255,255,0.5)' }}>
                    {tab === 'pending' ? 'No pending requests' : 'No leave requests found'}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', maxWidth: 360 }}>
                    {tab === 'pending' ? 'All caught up — nothing to review.' : 'Try changing the filter or adding a new request.'}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fcd34d' }}>Trainer</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fcd34d' }}>Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fcd34d' }}>Duration</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fcd34d' }}>Reason</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fcd34d' }}>Status</th>
                      {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fcd34d' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lv, i) => {
                      const tc = TYPE_STYLES[lv.leave_type ?? 'other'] || TYPE_STYLES.other;
                      const sm = STATUS_STYLES[lv.status];
                      const days = lv.days ?? daysBetween(lv.from_date ?? '', lv.to_date ?? '');
                      const busy = acting === lv.id;
                      return (
                        <motion.tr key={lv.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'; }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: avatarGradient(lv.trainer_name || '?'), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                {initials(lv.trainer_name || '?')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{lv.trainer_name || '—'}</div>
                                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>{lv.created_at ? fmt(lv.created_at) : 'Requested'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tc.bg, color: tc.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                              {tc.icon} {lv.leave_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                              {fmt(lv.from_date ?? '')}
                              {lv.from_date !== lv.to_date && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> → {fmt(lv.to_date ?? '')}</span>}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{days} day{days !== 1 ? 's' : ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
                              {lv.reason || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                            </span>
                            {lv.admin_note && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Note: {lv.admin_note}</div>}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: sm.bg, color: sm.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              {sm.icon} {sm.label}
                            </span>
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                {lv.status !== 'approved' && (
                                  <button onClick={() => approve(lv)} disabled={busy}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: 'none', background: busy ? 'rgba(148,163,184,0.15)' : 'rgba(16,185,129,0.15)', color: busy ? 'rgba(255,255,255,0.3)' : '#6ee7b7', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.background = 'rgba(16,185,129,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseLeave={(e) => { if (!busy) { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                                    <CheckCircle size={11} /> {busy ? '…' : 'Approve'}
                                  </button>
                                )}
                                {lv.status !== 'rejected' && (
                                  <button onClick={() => { setRejectTarget(lv); setRejectNote(''); }} disabled={busy}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: 'none', background: busy ? 'rgba(148,163,184,0.15)' : 'rgba(239,68,68,0.15)', color: busy ? 'rgba(255,255,255,0.3)' : '#fca5a5', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseLeave={(e) => { if (!busy) { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                                    <Ban size={11} /> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Add Request Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'linear-gradient(145deg, #1e1b4b, #0f172a)', borderRadius: 22, padding: 32, width: '100%', maxWidth: 500, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarDays size={20} color="#fcd34d" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>Request Leave</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Submit a new leave request for a trainer</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                  <X size={14} />
                </button>
              </div>

              {formErr && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#fca5a5', marginBottom: 16 }}>{formErr}</div>
              )}

              <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>Trainer *</label>
                  <select value={form.trainer_id} onChange={(e) => setForm((f) => ({ ...f, trainer_id: e.target.value }))} required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
                    <option value="">— Select trainer —</option>
                    {trainers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>Leave Type *</label>
                  <select value={form.leave_type} onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
                    {LEAVE_TYPES.map((t) => (<option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>From *</label>
                    <input type="date" value={form.from_date} onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))} required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>To *</label>
                    <input type="date" value={form.to_date} min={form.from_date} onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))} required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
                {form.from_date && form.to_date && form.to_date >= form.from_date && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -8, padding: '6px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', display: 'inline-block', alignSelf: 'flex-start' }}>
                    {daysBetween(form.from_date, form.to_date)} day(s)
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>Reason</label>
                  <textarea rows={3} placeholder="Optional — e.g. personal emergency, medical appointment…" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" onClick={() => setShowModal(false)}
                    style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(245,158,11,0.25)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject Note Modal ── */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'linear-gradient(145deg, #1e1b4b, #0f172a)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 420, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} color="#fca5a5" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>Reject Leave Request</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>
                    {rejectTarget.trainer_name} · {rejectTarget.leave_type} · {daysBetween(rejectTarget.from_date ?? '', rejectTarget.to_date ?? '')} day(s)
                  </p>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: 6, display: 'block' }}>Rejection Reason (optional)</label>
                <textarea rows={3} placeholder="e.g. Insufficient coverage during this period…" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setRejectTarget(null)}
                  style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={rejectConfirm} disabled={!!acting}
                  style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: acting ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(239,68,68,0.25)' }}>
                  {acting ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}