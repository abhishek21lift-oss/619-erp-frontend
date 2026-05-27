'use client';
import { useEffect, useState, useMemo } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

interface StaffTarget {
  id: string;
  staff_id: string;
  staff_name: string;
  role: string;
  month: string; // 'YYYY-MM'
  target_revenue?: number;
  target_clients?: number;
  target_sessions?: number;
  achieved_revenue?: number;
  achieved_clients?: number;
  achieved_sessions?: number;
}

function pct(achieved = 0, target = 0) {
  if (!target) return 0;
  return Math.min(Math.round((achieved / target) * 100), 100);
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 100 ? '#14532d' : value >= 60 ? '#1d4ed8' : '#991b1b';
  const bg    = value >= 100 ? '#dcfce7' : value >= 60 ? '#dbeafe' : '#fee2e2';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 99, background: color, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

function initials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function StaffTargetsPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

function Inner() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [targets, setTargets] = useState<StaffTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [month, setMonth] = useState(thisMonth);

  // Add/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StaffTarget | null>(null);
  const [staff, setStaff] = useState<{ id: string; name: string; role: string }[]>([]);
  const [form, setForm] = useState({ staff_id: '', target_revenue: '', target_clients: '', target_sessions: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.staff.targets?.list({ month }).catch(() => []),
      api.staff.list().catch(() => []),
    ]).then(([tgs, st]) => {
      if (!alive) return;
      setTargets(Array.isArray(tgs) ? tgs : []);
      setStaff(Array.isArray(st) ? st : []);
    }).catch(e => alive && setError(e.message || 'Failed to load targets'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [month]);

  function flash(msg: string) { setSuccess(msg); setTimeout(() => setSuccess(''), 2200); }

  function openAdd() {
    setEditing(null);
    setForm({ staff_id: '', target_revenue: '', target_clients: '', target_sessions: '' });
    setFormErr('');
    setShowModal(true);
  }

  function openEdit(t: StaffTarget) {
    setEditing(t);
    setForm({
      staff_id: t.staff_id,
      target_revenue: t.target_revenue?.toString() || '',
      target_clients: t.target_clients?.toString() || '',
      target_sessions: t.target_sessions?.toString() || '',
    });
    setFormErr('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    if (!form.staff_id) { setFormErr('Select a staff member'); return; }
    setSubmitting(true);
    try {
      const payload = {
        staff_id: form.staff_id,
        month,
        target_revenue: form.target_revenue ? Number(form.target_revenue) : undefined,
        target_clients: form.target_clients ? Number(form.target_clients) : undefined,
        target_sessions: form.target_sessions ? Number(form.target_sessions) : undefined,
      };
      if (editing) {
        const res = await api.staff.targets?.update(editing.id, payload);
        setTargets(prev => prev.map(t => t.id === editing.id ? res.target : t));
        flash('Target updated');
      } else {
        const res = await api.staff.targets?.create(payload);
        setTargets(prev => [res.target, ...prev]);
        flash('Target set successfully');
      }
      setShowModal(false);
    } catch (e: any) {
      setFormErr(e.message || 'Could not save target');
    } finally {
      setSubmitting(false);
    }
  }

  const monthLabel = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up">

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Staff Targets</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Monthly performance targets for all staff — {monthLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="month"
                className="input"
                value={month}
                onChange={e => setMonth(e.target.value)}
                style={{ maxWidth: 160 }}
              />
              <button className="btn btn-primary" onClick={openAdd}>+ Set Target</button>
            </div>
          </div>

          {error   && <div className="alert alert-error"   style={{ marginBottom: 14 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 14 }}>{success}</div>}

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>Loading targets…</div>
              ) : targets.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No targets set for {monthLabel}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 16 }}>Click "+ Set Target" to assign monthly goals.</div>
                  <button className="btn btn-primary" onClick={openAdd}>+ Set Target</button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Revenue Target</th>
                      <th>Clients Target</th>
                      <th>Sessions Target</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                              color: '#fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 13, fontWeight: 700,
                            }}>
                              {initials(t.staff_name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.staff_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{t.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ minWidth: 160 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                            ₹{(t.achieved_revenue ?? 0).toLocaleString('en-IN')} / ₹{(t.target_revenue ?? 0).toLocaleString('en-IN')}
                          </div>
                          <ProgressBar value={pct(t.achieved_revenue, t.target_revenue)} />
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                            {t.achieved_clients ?? 0} / {t.target_clients ?? 0}
                          </div>
                          <ProgressBar value={pct(t.achieved_clients, t.target_clients)} />
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                            {t.achieved_sessions ?? 0} / {t.target_sessions ?? 0}
                          </div>
                          <ProgressBar value={pct(t.achieved_sessions, t.target_sessions)} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 12 }}
                            onClick={() => openEdit(t)}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            background: 'var(--surface)', borderRadius: 16,
            padding: 32, width: '100%', maxWidth: 480,
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
              {editing ? 'Edit Target' : 'Set Staff Target'} — {monthLabel}
            </div>

            {formErr && <div className="alert alert-error" style={{ marginBottom: 14 }}>{formErr}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Staff Member *</label>
                <select
                  className="input"
                  value={form.staff_id}
                  onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                  disabled={!!editing}
                  required
                >
                  <option value="">— Select staff —</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Revenue Target (₹)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="e.g. 50000"
                  value={form.target_revenue}
                  onChange={e => setForm(f => ({ ...f, target_revenue: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Client Target</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    placeholder="e.g. 20"
                    value={form.target_clients}
                    onChange={e => setForm(f => ({ ...f, target_clients: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Session Target</label>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    placeholder="e.g. 60"
                    value={form.target_sessions}
                    onChange={e => setForm(f => ({ ...f, target_sessions: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : editing ? 'Update Target' : 'Set Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
