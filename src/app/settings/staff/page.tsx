'use client';
import { useEffect, useState } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
}

const ROLES = ['admin', 'manager', 'trainer', 'receptionist', 'accountant'];

function initials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin:        { bg: '#fef3c7', color: '#92400e' },
  manager:      { bg: '#dbeafe', color: '#1e40af' },
  trainer:      { bg: '#d1fae5', color: '#065f46' },
  receptionist: { bg: '#f3e8ff', color: '#6b21a8' },
  accountant:   { bg: '#fee2e2', color: '#991b1b' },
};

export default function StaffAccessControlPage() {
  return (
    <Guard>
      <Inner />
    </Guard>
  );
}

function Inner() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  // per-row edit state: id → { role, status }
  const [edits, setEdits] = useState<Record<string, { role: string; status: string }>>({});

  useEffect(() => {
    let alive = true;
    api.staff.list()
      .then(data => {
        if (!alive) return;
        const list: StaffMember[] = Array.isArray(data) ? data : [];
        setStaff(list);
        const init: Record<string, { role: string; status: string }> = {};
        list.forEach(s => { init[s.id] = { role: s.role, status: s.status || 'active' }; });
        setEdits(init);
      })
      .catch(e => alive && setError(e.message || 'Failed to load staff'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2200);
  }

  async function save(s: StaffMember) {
    setSaving(s.id);
    setError('');
    try {
      await api.staff.update(s.id, { role: edits[s.id]?.role, status: edits[s.id]?.status });
      setStaff(prev => prev.map(m => m.id === s.id ? { ...m, ...edits[s.id] } : m));
      flash(`Saved changes for ${s.name}`);
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(null);
    }
  }

  const isDirty = (s: StaffMember) =>
    edits[s.id]?.role !== s.role || edits[s.id]?.status !== (s.status || 'active');

  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up">

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Staff Access Control</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Manage roles and account status for all staff members.</div>
          </div>

          {error   && <div className="alert alert-error"   style={{ marginBottom: 14 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 14 }}>{success}</div>}

          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>Loading staff…</div>
              ) : staff.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
                  <div style={{ fontWeight: 700 }}>No staff accounts found</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Current Role</th>
                      <th>Change Role</th>
                      <th style={{ textAlign: 'center' }}>Account Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => {
                      const rc = ROLE_COLORS[s.role] || { bg: '#f1f5f9', color: '#475569' };
                      const e = edits[s.id] || { role: s.role, status: s.status || 'active' };
                      const busy = saving === s.id;
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: '#fff', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 13, fontWeight: 700,
                              }}>
                                {initials(s.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              background: rc.bg, color: rc.color,
                              padding: '3px 10px', borderRadius: 20,
                              fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                            }}>
                              {s.role}
                            </span>
                          </td>
                          <td>
                            <select
                              className="input"
                              style={{ maxWidth: 160, padding: '4px 10px', fontSize: 13 }}
                              value={e.role}
                              onChange={ev => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], role: ev.target.value } }))}
                            >
                              {ROLES.map(r => (
                                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <select
                              className="input"
                              style={{ maxWidth: 130, padding: '4px 10px', fontSize: 13 }}
                              value={e.status}
                              onChange={ev => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: ev.target.value } }))}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => save(s)}
                              disabled={!isDirty(s) || busy}
                              style={{ opacity: isDirty(s) ? 1 : 0.4 }}
                            >
                              {busy ? 'Saving…' : 'Save'}
                            </button>
                          </td>
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
    </AppShell>
  );
}
