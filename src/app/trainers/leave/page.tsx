'use client';
import { useEffect, useState, useMemo } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api, LeaveRequest, Trainer } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

// ─── helpers ────────────────────────────────────────────────────────
function daysBetween(from: string, to: string) {
  const a = new Date(from);
  const b = new Date(to);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(diff + 1, 1);
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initials(name: string) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  sick:       { bg: '#fee2e2', color: '#b91c1c' },
  casual:     { bg: '#dbeafe', color: '#1d4ed8' },
  earned:     { bg: '#d1fae5', color: '#065f46' },
  emergency:  { bg: '#fef3c7', color: '#92400e' },
  unpaid:     { bg: '#f3e8ff', color: '#6b21a8' },
  other:      { bg: '#f1f5f9', color: 'var(--text-muted)' },
};

const LEAVE_TYPES = ['sick', 'casual', 'earned', 'emergency', 'unpaid', 'other'];

const STATUS_META = {
  pending:  { label: 'Pending',  bg: '#fef9c3', color: '#854d0e' },
  approved: { label: 'Approved', bg: '#dcfce7', color: '#14532d' },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b' },
};

export default function TrainerLeaveRequestsPage() {
  return (
    <Guard roles={['admin', 'manager']}>
      <Inner />
    </Guard>
  );
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

  // filter
  const [tab, setTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    trainer_id: '',
    leave_type: 'sick',
    from_date: '',
    to_date: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  // reject note modal
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // ─── load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
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

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2200);
  }

  // ─── approve ───────────────────────────────────────────────────────
  async function approve(lv: LeaveRequest) {
    setActing(lv.id);
    setError('');
    try {
      const res = await api.leave.approve(lv.id);
      setLeaves((prev) =>
        prev.map((r) => (r.id === lv.id ? res.leave : r)),
      );
      flash(`✓ Approved leave for ${lv.trainer_name || 'trainer'}`);
    } catch (e: any) {
      setError(e.message || 'Could not approve');
    } finally {
      setActing(null);
    }
  }

  // ─── reject ────────────────────────────────────────────────────────
  async function rejectConfirm() {
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    setError('');
    try {
      const res = await api.leave.reject(rejectTarget.id, rejectNote.trim() || undefined);
      setLeaves((prev) =>
        prev.map((r) => (r.id === rejectTarget.id ? res.leave : r)),
      );
      flash(`Rejected leave for ${rejectTarget.trainer_name || 'trainer'}`);
      setRejectTarget(null);
      setRejectNote('');
    } catch (e: any) {
      setError(e.message || 'Could not reject');
    } finally {
      setActing(null);
    }
  }

  // ─── add request ───────────────────────────────────────────────────
  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
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
    } catch (e: any) {
      setFormErr(e.message || 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── derived ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = tab === 'all' ? leaves : leaves.filter((l) => l.status === tab);
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (l) =>
          (l.trainer_name || '').toLowerCase().includes(s) ||
          (l.leave_type || '').toLowerCase().includes(s) ||
          (l.reason || '').toLowerCase().includes(s),
      );
    }
    return rows;
  }, [leaves, tab, search]);

  const kpi = {
    pending:  leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
    total:    leaves.length,
  };

  // ─── render ────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up">
          {error   && <div className="alert alert-error"   style={{ marginBottom: 12 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 12 }}>{success}</div>}

          {/* ── KPI bar ─────────────────────────────────────────── */}
          <div
            className="kpi-grid mb-3"
            style={{ gridTemplateColumns: 'repeat(4,1fr)' }}
          >
            {([
              ['Pending',  kpi.pending,  '#854d0e', '#fef9c3'],
              ['Approved', kpi.approved, '#14532d', '#dcfce7'],
              ['Rejected', kpi.rejected, '#991b1b', '#fee2e2'],
              ['Total',    kpi.total,    'var(--text)', 'transparent'],
            ] as [string, number, string, string][]).map(([label, val, color, bg]) => (
              <div
                key={label}
                className="card"
                style={{ padding: '0.9rem 1rem', textAlign: 'center', background: bg, border: 'none' }}
              >
                <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.03em' }} className="tabular">
                  {val}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4, color }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Toolbar ─────────────────────────────────────────── */}
          <div className="card" style={{ padding: '0.8rem 1.2rem', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                {(['pending', 'approved', 'rejected', 'all'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 6,
                      border: '1px solid',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      textTransform: 'capitalize',
                      fontFamily: 'inherit',
                      transition: 'all .15s',
                      background: tab === t ? 'var(--accent)' : 'transparent',
                      color: tab === t ? '#fff' : 'var(--text-muted)',
                      borderColor: tab === t ? 'var(--accent)' : 'var(--line)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <input
                className="input"
                placeholder="Search trainer / type…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 240, marginLeft: 'auto' }}
              />

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowModal(true)}
              >
                + Add Request
              </button>
            </div>
          </div>

          {/* ── Table ───────────────────────────────────────────── */}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                  Loading leave requests…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🏖️</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {tab === 'pending' ? 'No pending requests' : 'No leave requests found'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                    {tab === 'pending' ? 'All caught up — nothing to review.' : 'Try changing the filter or adding a new request.'}
                  </div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Trainer</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Reason</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      {isAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lv) => {
                      const tc = TYPE_COLORS[lv.leave_type ?? 'other'] || TYPE_COLORS.other;
                      const sm = STATUS_META[lv.status];
                      const days = lv.days ?? daysBetween(lv.from_date ?? '', lv.to_date ?? '');
                      const busy = acting === lv.id;

                      return (
                        <tr key={lv.id}>
                          {/* Trainer */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                  color: '#fff', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: 13, fontWeight: 700,
                                }}
                              >
                                {initials(lv.trainer_name || '?')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{lv.trainer_name || '—'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {lv.created_at ? fmt(lv.created_at) : 'Requested'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Type */}
                          <td>
                            <span
                              style={{
                                background: tc.bg, color: tc.color,
                                padding: '3px 10px', borderRadius: 20,
                                fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                              }}
                            >
                              {lv.leave_type}
                            </span>
                          </td>

                          {/* Duration */}
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                              {fmt(lv.from_date ?? '')}
                              {lv.from_date !== lv.to_date && (
                                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> → {fmt(lv.to_date ?? '')}</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {days} day{days !== 1 ? 's' : ''}
                            </div>
                          </td>

                          {/* Reason */}
                          <td>
                            <span style={{ fontSize: 12.5, color: 'var(--text)' }}>
                              {lv.reason || <span style={{ color: 'var(--text-faint)' }}>—</span>}
                            </span>
                            {lv.admin_note && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                Note: {lv.admin_note}
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                background: sm.bg, color: sm.color,
                                padding: '4px 12px', borderRadius: 20,
                                fontSize: 11, fontWeight: 700,
                              }}
                            >
                              {sm.label}
                            </span>
                          </td>

                          {/* Actions */}
                          {isAdmin && (
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                {lv.status !== 'approved' && (
                                  <button
                                    onClick={() => approve(lv)}
                                    disabled={busy}
                                    style={{
                                      padding: '5px 12px', borderRadius: 6, border: 'none',
                                      background: busy ? '#e2e8f0' : '#dcfce7',
                                      color: busy ? '#94a3b8' : '#14532d',
                                      fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
                                      fontFamily: 'inherit', transition: 'all .15s',
                                    }}
                                  >
                                    {busy ? '…' : '✓ Approve'}
                                  </button>
                                )}
                                {lv.status !== 'rejected' && (
                                  <button
                                    onClick={() => { setRejectTarget(lv); setRejectNote(''); }}
                                    disabled={busy}
                                    style={{
                                      padding: '5px 12px', borderRadius: 6, border: 'none',
                                      background: busy ? '#e2e8f0' : '#fee2e2',
                                      color: busy ? '#94a3b8' : '#991b1b',
                                      fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
                                      fontFamily: 'inherit', transition: 'all .15s',
                                    }}
                                  >
                                    ✕ Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Request Modal ───────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            style={{
              background: 'var(--surface)', borderRadius: 16,
              padding: 32, width: '100%', maxWidth: 480,
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>Request Leave</div>

            {formErr && (
              <div className="alert alert-error" style={{ marginBottom: 14 }}>{formErr}</div>
            )}

            <form onSubmit={submitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Trainer *</label>
                <select
                  className="input"
                  value={form.trainer_id}
                  onChange={(e) => setForm((f) => ({ ...f, trainer_id: e.target.value }))}
                  required
                >
                  <option value="">— Select trainer —</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Leave Type *</label>
                <select
                  className="input"
                  value={form.leave_type}
                  onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">From *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.from_date}
                    onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">To *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.to_date}
                    min={form.from_date}
                    onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {form.from_date && form.to_date && form.to_date >= form.from_date && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -6 }}>
                  {daysBetween(form.from_date, form.to_date)} day(s)
                </div>
              )}

              <div>
                <label className="form-label">Reason</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Optional — e.g. personal emergency, medical appointment…"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Note Modal ───────────────────────────────────── */}
      {rejectTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectTarget(null); }}
        >
          <div
            style={{
              background: 'var(--surface)', borderRadius: 16,
              padding: 28, width: '100%', maxWidth: 400,
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
              Reject Leave Request
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              {rejectTarget.trainer_name} · {rejectTarget.leave_type} · {daysBetween(rejectTarget.from_date ?? '', rejectTarget.to_date ?? '')} day(s)
            </div>
            <div>
              <label className="form-label">Rejection Reason (optional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="e.g. Insufficient coverage during this period…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                autoFocus
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#fee2e2', color: '#991b1b', border: 'none' }}
                onClick={rejectConfirm}
                disabled={!!acting}
              >
                {acting ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
