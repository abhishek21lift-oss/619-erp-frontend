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

const ROLE_META: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  admin:        { label: 'Admin',        bg: '#fef9ec', color: '#92400e', dot: '#f59e0b' },
  manager:      { label: 'Manager',      bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
  trainer:      { label: 'Trainer',      bg: '#f0fdf4', color: '#065f46', dot: '#22c55e' },
  receptionist: { label: 'Receptionist', bg: '#faf5ff', color: '#6b21a8', dot: '#a855f7' },
  accountant:   { label: 'Accountant',   bg: '#fff1f2', color: '#9f1239', dot: '#f43f5e' },
};

const STATUS_META: Record<string, { bg: string; color: string; dot: string }> = {
  active:   { bg: '#f0fdf4', color: '#15803d', dot: '#22c55e' },
  inactive: { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' },
};

function AvatarGradients() {
  const gradients = [
    ['#e11d48', '#be185d'],
    ['#7c3aed', '#6d28d9'],
    ['#0ea5e9', '#0284c7'],
    ['#10b981', '#059669'],
    ['#f59e0b', '#d97706'],
  ];
  return gradients;
}

const AVATAR_GRADIENTS = AvatarGradients();

function avatarGradient(name: string) {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return `linear-gradient(135deg, ${AVATAR_GRADIENTS[idx][0]}, ${AVATAR_GRADIENTS[idx][1]})`;
}

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
  const [search, setSearch] = useState('');
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
    setTimeout(() => setSuccess(''), 2500);
  }

  async function save(s: StaffMember) {
    setSaving(s.id);
    setError('');
    try {
      await api.staff.update(s.id, { role: edits[s.id]?.role, status: edits[s.id]?.status });
      setStaff(prev => prev.map(m => m.id === s.id ? { ...m, ...edits[s.id] } : m));
      flash(`Changes saved for ${s.name}`);
    } catch (e: any) {
      setError(e.message || 'Could not save');
    } finally {
      setSaving(null);
    }
  }

  const isDirty = (s: StaffMember) =>
    edits[s.id]?.role !== s.role || edits[s.id]?.status !== (s.status || 'active');

  const filtered = staff.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalActive = staff.filter(s => (s.status || 'active') === 'active').length;

  return (
    <AppShell>
      <style>{`
        .sac-page { padding: 32px 32px 100px; max-width: 1100px; margin: 0 auto; }
        @media (max-width: 700px) { .sac-page { padding: 20px 16px 80px; } }

        /* Hero */
        .sac-hero {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 28px 28px 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        @media (max-width: 600px) { .sac-hero { flex-direction: column; } }
        .sac-hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #fff7f7; color: #c0392b;
          border: 1px solid #fecaca;
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .sac-hero-title {
          font-size: 22px; font-weight: 800; letter-spacing: -0.03em;
          color: #0f172a; line-height: 1.2;
        }
        .sac-hero-sub { font-size: 13px; color: #64748b; margin-top: 5px; }
        .sac-stats {
          display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap;
        }
        .sac-stat {
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 10px; padding: 10px 16px; min-width: 90px;
        }
        .sac-stat-val { font-size: 20px; font-weight: 800; color: #0f172a; }
        .sac-stat-lbl { font-size: 11px; color: #94a3b8; margin-top: 1px; font-weight: 500; }
        .sac-hero-right {
          background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
          border: 1px solid #fee2e2;
          border-radius: 12px; padding: 14px 18px;
          min-width: 140px; text-align: center;
        }
        .sac-hero-right-icon { font-size: 28px; margin-bottom: 6px; }
        .sac-hero-right-label { font-size: 11px; color: #e11d48; font-weight: 700; letter-spacing: 0.04em; }
        .sac-hero-right-val { font-size: 26px; font-weight: 900; color: #0f172a; margin-top: 2px; }

        /* Toolbar */
        .sac-toolbar {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 16px; flex-wrap: wrap;
        }
        .sac-search {
          flex: 1; min-width: 200px;
          background: #fff; border: 1.5px solid #e2e8f0;
          border-radius: 10px; padding: 9px 14px 9px 38px;
          font-size: 13px; color: #0f172a;
          transition: border-color 0.15s;
          outline: none;
        }
        .sac-search:focus { border-color: #e11d48; box-shadow: 0 0 0 3px #fee2e233; }
        .sac-search-wrap { position: relative; flex: 1; }
        .sac-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none;
        }
        .sac-filter-count {
          font-size: 12px; color: #64748b; white-space: nowrap;
          background: #f1f5f9; border-radius: 8px; padding: 6px 12px;
          border: 1px solid #e2e8f0;
        }

        /* Table card */
        .sac-card {
          background: #fff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .sac-table { width: 100%; border-collapse: collapse; }
        .sac-table thead tr {
          background: #f8fafc;
          border-bottom: 1.5px solid #f1f5f9;
        }
        .sac-table th {
          padding: 13px 18px;
          font-size: 11px; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.06em;
          text-align: left;
        }
        .sac-table th.center { text-align: center; }
        .sac-table tbody tr {
          border-bottom: 1px solid #f8fafc;
          transition: background 0.12s;
        }
        .sac-table tbody tr:last-child { border-bottom: none; }
        .sac-table tbody tr:hover { background: #fafafa; }
        .sac-table td { padding: 14px 18px; vertical-align: middle; }
        .sac-table td.center { text-align: center; }

        /* Avatar */
        .sac-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0;
          letter-spacing: 0.02em;
        }
        .sac-member-name { font-size: 13.5px; font-weight: 650; color: #0f172a; }
        .sac-member-email { font-size: 11.5px; color: #94a3b8; margin-top: 1px; }

        /* Badge */
        .sac-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px 3px 7px;
          border-radius: 100px;
          font-size: 11.5px; font-weight: 700;
        }
        .sac-badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        /* Selects */
        .sac-select {
          background: #f8fafc; border: 1.5px solid #e2e8f0;
          border-radius: 8px; padding: 6px 10px;
          font-size: 12.5px; color: #0f172a; font-weight: 500;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          cursor: pointer; min-width: 130px;
        }
        .sac-select:focus { border-color: #e11d48; box-shadow: 0 0 0 3px #fee2e233; }
        .sac-select:hover { border-color: #cbd5e1; }

        /* Buttons */
        .sac-btn-save {
          background: #e11d48; color: #fff;
          border: none; border-radius: 8px;
          padding: 7px 16px; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.15s;
          white-space: nowrap;
        }
        .sac-btn-save:hover:not(:disabled) {
          background: #be123c;
          box-shadow: 0 2px 8px rgba(225,29,72,0.25);
          transform: translateY(-1px);
        }
        .sac-btn-save:disabled { opacity: 0.35; cursor: default; transform: none; box-shadow: none; }
        .sac-btn-save.busy {
          background: #f43f5e;
          animation: sac-pulse 0.9s ease-in-out infinite;
        }
        @keyframes sac-pulse {
          0%,100% { opacity: 1; } 50% { opacity: 0.7; }
        }

        /* Alerts */
        .sac-alert {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 10px;
          font-size: 13px; font-weight: 500; margin-bottom: 14px;
        }
        .sac-alert.error   { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
        .sac-alert.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }

        /* Empty / skeleton */
        .sac-empty { padding: 64px 32px; text-align: center; color: #94a3b8; }
        .sac-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .sac-empty-title { font-size: 15px; font-weight: 700; color: #334155; margin-bottom: 6px; }
        .sac-empty-sub { font-size: 13px; }

        .sac-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div className="sac-page">

        {/* ── HERO ── */}
        <div className="sac-hero">
          <div>
            <div className="sac-hero-badge">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="4" fill="#e11d48" opacity="0.8"/>
              </svg>
              619 Fitness Studio
            </div>
            <div className="sac-hero-title">Staff Access Control</div>
            <div className="sac-hero-sub">Manage roles and account permissions for your team.</div>
            <div className="sac-stats">
              <div className="sac-stat">
                <div className="sac-stat-val">{staff.length}</div>
                <div className="sac-stat-lbl">Total Staff</div>
              </div>
              <div className="sac-stat">
                <div className="sac-stat-val" style={{ color: '#15803d' }}>{totalActive}</div>
                <div className="sac-stat-lbl">Active</div>
              </div>
              <div className="sac-stat">
                <div className="sac-stat-val" style={{ color: '#64748b' }}>{staff.length - totalActive}</div>
                <div className="sac-stat-lbl">Inactive</div>
              </div>
            </div>
          </div>
          <div className="sac-hero-right">
            <div className="sac-hero-right-icon">👥</div>
            <div className="sac-hero-right-label">Team Size</div>
            <div className="sac-hero-right-val">{staff.length}</div>
          </div>
        </div>

        {/* ── ALERTS ── */}
        {error   && <div className="sac-alert error">  <span>⚠</span>  {error}   </div>}
        {success && <div className="sac-alert success"><span>✓</span>  {success} </div>}

        {/* ── TOOLBAR ── */}
        <div className="sac-toolbar">
          <div className="sac-search-wrap">
            <svg className="sac-search-icon" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="sac-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <div className="sac-filter-count">
              {filtered.length} of {staff.length} shown
            </div>
          )}
        </div>

        {/* ── TABLE CARD ── */}
        <div className="sac-card">
          {loading ? (
            <div style={{ padding: '32px 18px' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                  <div className="sac-skeleton" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="sac-skeleton" style={{ height: 14, width: '40%', marginBottom: 7 }} />
                    <div className="sac-skeleton" style={{ height: 11, width: '28%' }} />
                  </div>
                  <div className="sac-skeleton" style={{ height: 30, width: 100, borderRadius: 8 }} />
                  <div className="sac-skeleton" style={{ height: 30, width: 120, borderRadius: 8 }} />
                  <div className="sac-skeleton" style={{ height: 30, width: 64, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="sac-empty">
              <div className="sac-empty-icon">{search ? '🔍' : '🔐'}</div>
              <div className="sac-empty-title">{search ? 'No results found' : 'No staff accounts yet'}</div>
              <div className="sac-empty-sub">{search ? `Nothing matches "${search}"` : 'Add your first staff member to get started.'}</div>
            </div>
          ) : (
            <table className="sac-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Current Role</th>
                  <th>Change Role</th>
                  <th className="center">Status</th>
                  <th className="center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const rm = ROLE_META[s.role] || { label: s.role, bg: '#f8fafc', color: '#475569', dot: '#94a3b8' };
                  const e  = edits[s.id] || { role: s.role, status: s.status || 'active' };
                  const sm = STATUS_META[e.status] || STATUS_META.inactive;
                  const busy = saving === s.id;
                  return (
                    <tr key={s.id}>

                      {/* Member */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <div
                            className="sac-avatar"
                            style={{ background: avatarGradient(s.name) }}
                          >
                            {initials(s.name)}
                          </div>
                          <div>
                            <div className="sac-member-name">{s.name}</div>
                            <div className="sac-member-email">{s.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Current role badge */}
                      <td>
                        <span
                          className="sac-badge"
                          style={{ background: rm.bg, color: rm.color }}
                        >
                          <span className="sac-badge-dot" style={{ background: rm.dot }} />
                          {rm.label}
                        </span>
                      </td>

                      {/* Change role */}
                      <td>
                        <select
                          className="sac-select"
                          value={e.role}
                          onChange={ev => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], role: ev.target.value } }))}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </td>

                      {/* Status */}
                      <td className="center">
                        <select
                          className="sac-select"
                          style={{ minWidth: 110 }}
                          value={e.status}
                          onChange={ev => setEdits(prev => ({ ...prev, [s.id]: { ...prev[s.id], status: ev.target.value } }))}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>

                      {/* Save */}
                      <td className="center">
                        <button
                          className={`sac-btn-save${busy ? ' busy' : ''}`}
                          onClick={() => save(s)}
                          disabled={!isDirty(s) || busy}
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
    </AppShell>
  );
}
