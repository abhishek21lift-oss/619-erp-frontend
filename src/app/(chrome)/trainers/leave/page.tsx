'use client';
import { useEffect, useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
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
  sick:      { bg: '#fef2f2', color: '#dc2626', icon: '🤒' },
  casual:    { bg: '#f1f5f9', color: '#0067e0', icon: '😎' },
  personal:  { bg: '#f1f5f9', color: '#0067e0', icon: '🙋' },
  earned:    { bg: '#ecfdf5', color: '#10b981', icon: '🎯' },
  emergency: { bg: '#fffbeb', color: '#d97706', icon: '🚨' },
  unpaid:    { bg: '#f8fafc', color: '#0067e0', icon: '📋' },
  other:     { bg: '#f8fafc', color: '#64748b', icon: '📝' },
};

const LEAVE_TYPES = ['sick', 'casual', 'personal', 'earned', 'emergency', 'unpaid', 'other'];

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  bg: '#fef3c7', color: '#b45309', icon: <Clock size={11} /> },
  approved: { label: 'Approved', bg: '#ecfdf5', color: '#059669', icon: <CheckCircle size={11} /> },
  rejected: { label: 'Rejected', bg: '#fef2f2', color: '#b91c1c', icon: <Ban size={11} /> },
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
    { key: 'all' as const, label: 'All', count: kpi.total, color: '#0067e0' },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', padding: '48px 32px 40px', borderRadius: '0 0 40px 40px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6, position: 'relative', zIndex: 1 }}>
          <m.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}>
            <CalendarDays size={24} color="#fff" />
          </m.div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Leave Requests</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>Manage and review trainer leave applications</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {error && (
          <m.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
            {error}
          </m.div>
        )}
        {success && (
          <m.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#059669', marginBottom: 16 }}>
            {success}
          </m.div>
        )}

        {/* ── KPI Grid ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Pending',  value: kpi.pending,  icon: <Clock size={16} />,         bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
            { label: 'Approved', value: kpi.approved, icon: <CalendarCheck size={16} />,  bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
            { label: 'Rejected', value: kpi.rejected, icon: <CalendarX size={16} />,      bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
            { label: 'Total',    value: kpi.total,    icon: <Activity size={16} />,        bg: '#f8fafc', color: '#0067e0', border: '#e1efff' },
          ].map((k) => (
            <m.div key={k.label} variants={itemVariants}
              style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '20px 20px', background: k.bg, border: `1px solid ${k.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'default', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: k.color }}>{k.label}</span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color }}>{k.icon}</div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', position: 'relative', zIndex: 1 }}>{k.value}</div>
            </m.div>
          ))}
        </m.div>

        {/* ── Toolbar ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible">
          <m.div variants={itemVariants}
            style={{ borderRadius: 18, padding: '14px 18px', marginBottom: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', borderRadius: 10, padding: 3 }}>
                {TABS.map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 700, letterSpacing: '0.3px', textTransform: 'capitalize',
                      fontFamily: 'inherit', transition: 'all 0.2s',
                      background: tab === t.key ? `linear-gradient(135deg, ${t.color}22, ${t.color}11)` : 'transparent',
                      color: tab === t.key ? t.color : '#64748b',
                      boxShadow: tab === t.key ? `inset 0 0 0 1px ${t.color}44` : 'none',
                    }}>
                    {t.label}
                    <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: tab === t.key ? `${t.color}33` : '#f1f5f9', color: tab === t.key ? t.color : '#64748b' }}>{t.count}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', background: 'var(--bg-subtle)', borderRadius: 10, padding: '5px 12px', border: '1px solid var(--border)' }}>
                <Search size={13} color="#94a3b8" />
                <input placeholder="Search trainer / type…" value={search} onChange={(e) => setSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12.5, fontWeight: 500, outline: 'none', width: 200 }} />
              </div>
              <button onClick={() => setShowModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 4px 16px rgba(245,158,11,0.25)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(245,158,11,0.35)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.25)'; }}>
                <Plus size={14} /> Add Request
              </button>
            </div>
          </m.div>

          {/* ── Table ── */}
          <m.div variants={itemVariants}
            style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', background: 'var(--bg-card)' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <m.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#f59e0b', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading leave requests…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <m.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a' }}>
                    <CalendarDays size={28} color="#d97706" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-secondary)' }}>
                    {tab === 'pending' ? 'No pending requests' : 'No leave requests found'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
                    {tab === 'pending' ? 'All caught up — nothing to review.' : 'Try changing the filter or adding a new request.'}
                  </div>
                </m.div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Trainer</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Duration</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Reason</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Status</th>
                      {isAdmin && <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lv, i) => {
                      const tc = TYPE_STYLES[lv.leave_type ?? 'other'] || TYPE_STYLES.other;
                      const sm = STATUS_STYLES[lv.status];
                      const days = lv.days ?? daysBetween(lv.from_date ?? '', lv.to_date ?? '');
                      const busy = acting === lv.id;
                      return (
                        <m.tr key={lv.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', background: i % 2 === 0 ? '#f8fafc' : '#fff' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#fffbeb'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? '#f8fafc' : '#fff'; }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: avatarGradient(lv.trainer_name || '?'), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                {initials(lv.trainer_name || '?')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{lv.trainer_name || '—'}</div>
                                <div style={{ fontSize: 10.5, color: 'var(--text-disabled)' }}>{lv.created_at ? fmt(lv.created_at) : 'Requested'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tc.bg, color: tc.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                              {tc.icon} {lv.leave_type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                              {fmt(lv.from_date ?? '')}
                              {lv.from_date !== lv.to_date && <span style={{ color: 'var(--text-disabled)', fontWeight: 400 }}> → {fmt(lv.to_date ?? '')}</span>}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-disabled)', marginTop: 2 }}>{days} day{days !== 1 ? 's' : ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                              {lv.reason || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </span>
                            {lv.admin_note && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>Note: {lv.admin_note}</div>}
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
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: 'none', background: busy ? '#f1f5f9' : '#ecfdf5', color: busy ? '#94a3b8' : '#059669', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.background = '#d1fae5'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseLeave={(e) => { if (!busy) { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                                    <CheckCircle size={11} /> {busy ? '…' : 'Approve'}
                                  </button>
                                )}
                                {lv.status !== 'rejected' && (
                                  <button onClick={() => { setRejectTarget(lv); setRejectNote(''); }} disabled={busy}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8, border: 'none', background: busy ? '#f1f5f9' : '#fef2f2', color: busy ? '#94a3b8' : '#b91c1c', fontSize: 11.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                    onMouseLeave={(e) => { if (!busy) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateY(0)'; } }}>
                                    <Ban size={11} /> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </m.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </m.div>
        </m.div>
      </div>

      {/* ── Add Request Modal ── */}
      <AnimatePresence>
        {showModal && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <m.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'var(--bg-card)', borderRadius: 22, padding: 32, width: '100%', maxWidth: 500, border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a' }}>
                    <CalendarDays size={20} color="#d97706" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Request Leave</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Submit a new leave request for a trainer</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                  <X size={14} />
                </button>
              </div>

              {formErr && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#b91c1c', marginBottom: 16 }}>{formErr}</div>
              )}

              <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="leave-trainer" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Trainer *</label>
                  <select id="leave-trainer" value={form.trainer_id} onChange={(e) => setForm((f) => ({ ...f, trainer_id: e.target.value }))} required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
                    <option value="">— Select trainer —</option>
                    {trainers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
                <div>
                  <label htmlFor="leave-type" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Leave Type *</label>
                  <select id="leave-type" value={form.leave_type} onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
                    {LEAVE_TYPES.map((t) => (<option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label htmlFor="leave-from" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>From *</label>
                    <input id="leave-from" type="date" value={form.from_date} onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))} required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label htmlFor="leave-to" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>To *</label>
                    <input id="leave-to" type="date" value={form.to_date} min={form.from_date} onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))} required
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                </div>
                {form.from_date && form.to_date && form.to_date >= form.from_date && (
                  <div style={{ fontSize: 12, color: '#0067e0', marginTop: -8, padding: '6px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e1efff', display: 'inline-block', alignSelf: 'flex-start' }}>
                    {daysBetween(form.from_date, form.to_date)} day(s)
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Reason</label>
                  <textarea rows={3} placeholder="Optional — e.g. personal emergency, medical appointment…" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" onClick={() => setShowModal(false)}
                    style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(245,158,11,0.25)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── Reject Note Modal ── */}
      <AnimatePresence>
        {rejectTarget && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}>
            <m.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'var(--bg-card)', borderRadius: 22, padding: 28, width: '100%', maxWidth: 420, border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca' }}>
                  <AlertTriangle size={18} color="#b91c1c" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Reject Leave Request</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
                    {rejectTarget.trainer_name} · {rejectTarget.leave_type} · {daysBetween(rejectTarget.from_date ?? '', rejectTarget.to_date ?? '')} day(s)
                  </p>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Rejection Reason (optional)</label>
                <textarea rows={3} placeholder="e.g. Insufficient coverage during this period…" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setRejectTarget(null)}
                  style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #cbd5e1', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={rejectConfirm} disabled={!!acting}
                  style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: acting ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(239,68,68,0.25)' }}>
                  {acting ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
