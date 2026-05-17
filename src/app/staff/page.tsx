'use client';
import { useEffect, useState, useMemo } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: string;
  created_at?: string;
  avatar?: string;
}

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

export default function StaffListPage() {
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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.staff.list()
      .then(data => alive && setStaff(Array.isArray(data) ? data : []))
      .catch(e => alive && setError(e.message || 'Failed to load staff'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let rows = staff;
    if (roleFilter !== 'all') rows = rows.filter(s => s.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q)
      );
    }
    return rows;
  }, [staff, search, roleFilter]);

  const roles = ['all', 'admin', 'manager', 'trainer', 'receptionist', 'accountant'];

  return (
    <AppShell>
      <div className="page-main">
        <div className="page-content fade-up">

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>Staff List</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{staff.length} staff members total</div>
            </div>
            <a href="/staff/new" className="btn btn-primary">+ Add Staff</a>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

          {/* Toolbar */}
          <div className="card" style={{ padding: '0.8rem 1.2rem', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {roles.map(r => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    style={{
                      padding: '5px 14px', borderRadius: 6, border: '1px solid',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      textTransform: 'capitalize', fontFamily: 'inherit', transition: 'all .15s',
                      background: roleFilter === r ? 'var(--accent)' : 'transparent',
                      color: roleFilter === r ? '#fff' : 'var(--text-muted)',
                      borderColor: roleFilter === r ? 'var(--accent)' : 'var(--line)',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                className="input"
                placeholder="Search name / email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: 240, marginLeft: 'auto' }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>Loading staff…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No staff found</div>
                  <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>Try a different filter or add a new staff member.</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => {
                      const rc = ROLE_COLORS[s.role] || { bg: '#f1f5f9', color: '#475569' };
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
                                {s.created_at && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Joined {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                )}
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
                          <td style={{ fontSize: 13 }}>{s.phone || <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                          <td style={{ fontSize: 13 }}>{s.email}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              background: s.status === 'inactive' ? '#fee2e2' : '#dcfce7',
                              color: s.status === 'inactive' ? '#991b1b' : '#14532d',
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            }}>
                              {s.status === 'inactive' ? 'Inactive' : 'Active'}
                            </span>
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
